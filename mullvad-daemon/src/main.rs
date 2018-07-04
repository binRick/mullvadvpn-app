//! # License
//!
//! Copyright (C) 2017  Amagicom AB
//!
//! This program is free software: you can redistribute it and/or modify it under the terms of the
//! GNU General Public License as published by the Free Software Foundation, either version 3 of
//! the License, or (at your option) any later version.

#[macro_use]
extern crate chan;
extern crate chrono;
#[macro_use]
extern crate clap;
#[macro_use]
extern crate error_chain;
extern crate futures;
#[cfg(unix)]
extern crate libc;
#[macro_use]
extern crate log;

#[macro_use]
extern crate serde;
extern crate serde_json;

extern crate jsonrpc_core;
#[macro_use]
extern crate jsonrpc_macros;
extern crate jsonrpc_pubsub;
extern crate jsonrpc_ws_server;
extern crate rand;
extern crate tokio_core;
extern crate tokio_timer;
extern crate uuid;

extern crate mullvad_ipc_client;
extern crate mullvad_paths;
extern crate mullvad_rpc;
extern crate mullvad_types;
extern crate talpid_core;
extern crate talpid_ipc;
extern crate talpid_types;

#[cfg(windows)]
#[macro_use]
extern crate windows_service;

mod account_history;
mod cli;
mod geoip;
mod logging;
mod management_interface;
mod relays;
mod rpc_address_file;
mod rpc_uniqueness_check;
mod settings;
mod shutdown;
mod system_service;
mod tunnel_state_machine;
mod version;

use error_chain::ChainedError;
use futures::Future;
use jsonrpc_core::futures::sync::oneshot::Sender as OneshotSender;

use management_interface::{BoxFuture, ManagementInterfaceServer, TunnelCommand};
use mullvad_rpc::{AccountsProxy, AppVersionProxy, HttpHandle};
use tunnel_state_machine::{TunnelParameters, TunnelRequest, TunnelStateInfo};

use mullvad_types::account::{AccountData, AccountToken};
use mullvad_types::location::GeoIpLocation;
use mullvad_types::relay_constraints::{RelaySettings, RelaySettingsUpdate};
use mullvad_types::relay_list::{Relay, RelayList};
use mullvad_types::states::{DaemonState, SecurityState, TargetState};
use mullvad_types::version::{AppVersion, AppVersionInfo};

use std::net::IpAddr;
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

use talpid_core::firewall::{Firewall, FirewallProxy, SecurityPolicy};
use talpid_core::mpsc::IntoSender;
use talpid_types::net::TunnelOptions;


error_chain!{
    errors {
        LogError(msg: &'static str) {
            description("Error setting up log")
            display("Error setting up log: {}", msg)
        }
        NoCacheDir {
            description("Unable to create cache directory")
        }
        DaemonIsAlreadyRunning {
            description("Another instance of the daemon is already running")
        }
        TunnelError(msg: &'static str) {
            description("Error in the tunnel monitor")
            display("Tunnel monitor error: {}", msg)
        }
        ManagementInterfaceError(msg: &'static str) {
            description("Error in the management interface")
            display("Management interface error: {}", msg)
        }
        FirewallError {
            description("Firewall error")
        }
        InvalidSettings(msg: &'static str) {
            description("Invalid settings")
            display("Invalid Settings: {}", msg)
        }
        NoRelay {
            description("Found no valid relays to connect to")
        }
    }
}

static MAX_RELAY_CACHE_AGE: Duration = Duration::from_secs(3600);
static RELAY_CACHE_UPDATE_TIMEOUT: Duration = Duration::from_millis(3000);

const DAEMON_LOG_FILENAME: &str = "daemon.log";


/// All events that can happen in the daemon. Sent from various threads and exposed interfaces.
pub enum DaemonEvent {
    /// Tunnel has changed state.
    TunnelStateChange(TunnelStateInfo),
    /// An event coming from the JSONRPC-2.0 management interface.
    ManagementInterfaceEvent(TunnelCommand),
    /// Triggered if the server hosting the JSONRPC-2.0 management interface dies unexpectedly.
    ManagementInterfaceExited(talpid_ipc::Result<()>),
    /// Daemon shutdown triggered by a signal, ctrl-c or similar.
    TriggerShutdown,
}

impl From<TunnelStateInfo> for DaemonEvent {
    fn from(tunnel_state_info: TunnelStateInfo) -> Self {
        DaemonEvent::TunnelStateChange(tunnel_state_info)
    }
}

impl From<TunnelCommand> for DaemonEvent {
    fn from(tunnel_command: TunnelCommand) -> Self {
        DaemonEvent::ManagementInterfaceEvent(tunnel_command)
    }
}


struct Daemon {
    tunnel_requests: chan::Sender<TunnelRequest>,
    security_state: SecurityState,
    last_broadcasted_state: DaemonState,
    target_state: TargetState,
    shutdown: bool,
    shutdown_complete: bool,
    rx: mpsc::Receiver<DaemonEvent>,
    tx: mpsc::Sender<DaemonEvent>,
    management_interface_broadcaster: management_interface::EventBroadcaster,
    settings: settings::Settings,
    accounts_proxy: AccountsProxy<HttpHandle>,
    version_proxy: AppVersionProxy<HttpHandle>,
    http_handle: mullvad_rpc::rest::RequestSender,
    tokio_remote: tokio_core::reactor::Remote,
    relay_selector: relays::RelaySelector,
    firewall: FirewallProxy,
    current_relay: Option<Relay>,
    log_dir: Option<PathBuf>,
    resource_dir: PathBuf,
}

impl Daemon {
    pub fn new(
        log_dir: Option<PathBuf>,
        resource_dir: PathBuf,
        cache_dir: PathBuf,
    ) -> Result<Self> {
        ensure!(
            !rpc_uniqueness_check::is_another_instance_running(),
            ErrorKind::DaemonIsAlreadyRunning
        );

        let mut rpc_manager = mullvad_rpc::MullvadRpcFactory::with_cache_dir(&cache_dir);

        let (rpc_handle, http_handle, tokio_remote) =
            mullvad_rpc::event_loop::create(move |core| {
                let handle = core.handle();
                let rpc = rpc_manager.new_connection_on_event_loop(&handle);
                let http = mullvad_rpc::rest::create_http_client(&handle);
                let remote = core.remote();
                (rpc, http, remote)
            }).chain_err(|| "Unable to initialize network event loop")?;
        let rpc_handle = rpc_handle.chain_err(|| "Unable to create RPC client")?;
        let http_handle = http_handle.chain_err(|| "Unable to create HTTP client")?;

        let relay_selector =
            Self::create_relay_selector(rpc_handle.clone(), &resource_dir, &cache_dir);

        let (tx, rx) = mpsc::channel();
        let (tunnel_requests, tunnel_state_events) = tunnel_state_machine::spawn();
        Self::forward_tunnel_state_changes(tunnel_state_events, tx.clone());

        let target_state = TargetState::Unsecured;
        let management_interface_broadcaster =
            Self::start_management_interface(tx.clone(), cache_dir.clone())?;

        Ok(Daemon {
            tunnel_requests,
            security_state: SecurityState::Unsecured,
            target_state,
            last_broadcasted_state: DaemonState {
                state: SecurityState::Unsecured,
                target_state,
            },
            shutdown: false,
            shutdown_complete: false,
            rx,
            tx,
            management_interface_broadcaster,
            settings: settings::Settings::load().chain_err(|| "Unable to read settings")?,
            accounts_proxy: AccountsProxy::new(rpc_handle.clone()),
            version_proxy: AppVersionProxy::new(rpc_handle),
            http_handle,
            tokio_remote,
            relay_selector,
            firewall: FirewallProxy::new(&cache_dir).chain_err(|| ErrorKind::FirewallError)?,
            current_relay: None,
            log_dir,
            resource_dir,
        })
    }

    fn create_relay_selector(
        rpc_handle: mullvad_rpc::HttpHandle,
        resource_dir: &Path,
        cache_dir: &Path,
    ) -> relays::RelaySelector {
        let mut relay_selector = relays::RelaySelector::new(rpc_handle, &resource_dir, cache_dir);
        if let Ok(elapsed) = relay_selector.get_last_updated().elapsed() {
            if elapsed > MAX_RELAY_CACHE_AGE {
                if let Err(e) = relay_selector.update(RELAY_CACHE_UPDATE_TIMEOUT) {
                    error!("Unable to update relay cache: {}", e.display_chain());
                }
            }
        }
        relay_selector
    }

    fn forward_tunnel_state_changes(
        state_events: chan::Receiver<TunnelStateInfo>,
        daemon_events: mpsc::Sender<DaemonEvent>,
    ) {
        thread::spawn(move || {
            for state_event in state_events {
                let daemon_event = DaemonEvent::TunnelStateChange(state_event);
                if daemon_events.send(daemon_event).is_err() {
                    break;
                }
            }
            trace!("tunnel state listener stopped");
        });
    }

    // Starts the management interface and spawns a thread that will process it.
    // Returns a handle that allows notifying all subscribers on events.
    fn start_management_interface(
        event_tx: mpsc::Sender<DaemonEvent>,
        cache_dir: PathBuf,
    ) -> Result<management_interface::EventBroadcaster> {
        let multiplex_event_tx = IntoSender::from(event_tx.clone());
        let server = Self::start_management_interface_server(multiplex_event_tx, cache_dir)?;
        let event_broadcaster = server.event_broadcaster();
        Self::spawn_management_interface_wait_thread(server, event_tx);
        Ok(event_broadcaster)
    }

    fn start_management_interface_server(
        event_tx: IntoSender<TunnelCommand, DaemonEvent>,
        cache_dir: PathBuf,
    ) -> Result<ManagementInterfaceServer> {
        let shared_secret = uuid::Uuid::new_v4().to_string();

        let server = ManagementInterfaceServer::start(event_tx, shared_secret.clone(), cache_dir)
            .chain_err(|| ErrorKind::ManagementInterfaceError("Failed to start server"))?;
        info!(
            "Mullvad management interface listening on {}",
            server.address()
        );

        rpc_address_file::write(server.address(), &shared_secret).chain_err(|| {
            ErrorKind::ManagementInterfaceError("Failed to write RPC connection info to file")
        })?;
        Ok(server)
    }

    fn spawn_management_interface_wait_thread(
        server: ManagementInterfaceServer,
        exit_tx: mpsc::Sender<DaemonEvent>,
    ) {
        thread::spawn(move || {
            let result = server.wait();
            error!("Mullvad management interface shut down");
            let _ = exit_tx.send(DaemonEvent::ManagementInterfaceExited(result));
        });
    }

    /// Consume the `Daemon` and run the main event loop. Blocks until an error happens or a
    /// shutdown event is received.
    pub fn run(mut self) -> Result<()> {
        while let Ok(event) = self.rx.recv() {
            self.handle_event(event)?;
            if self.shutdown_complete {
                break;
            }
        }
        Ok(())
    }

    fn handle_event(&mut self, event: DaemonEvent) -> Result<()> {
        use DaemonEvent::*;
        match event {
            TunnelStateChange(state_info) => self.handle_tunnel_state_change(state_info),
            ManagementInterfaceEvent(event) => self.handle_management_interface_event(event),
            ManagementInterfaceExited(result) => self.handle_management_interface_exited(result),
            TriggerShutdown => self.handle_trigger_shutdown_event(),
        }
    }

    fn handle_tunnel_state_change(&mut self, tunnel_state_info: TunnelStateInfo) -> Result<()> {
        use self::TunnelStateInfo::*;

        debug!("Tunnel state info: {:?}", tunnel_state_info);

        match tunnel_state_info {
            NotConnected => {
                self.reset_security_policy()?;

                if self.shutdown {
                    self.shutdown_complete = true;
                }
            }
            Connecting(relay) => {
                let allow_lan = self.settings.get_allow_lan();

                self.set_security_policy(SecurityPolicy::Connecting {
                    relay_endpoint: relay.to_endpoint(),
                    allow_lan,
                })?;
            }
            Connected(relay, ref metadata) => {
                let allow_lan = self.settings.get_allow_lan();

                self.set_security_policy(SecurityPolicy::Connected {
                    relay_endpoint: relay.to_endpoint(),
                    tunnel: metadata.clone(),
                    allow_lan,
                })?
            }
            Exiting | Restarting => {
                // Keep current security policy
            }
        }

        self.security_state = match tunnel_state_info {
            NotConnected | Connecting(_) => SecurityState::Unsecured,
            Connected(..) | Restarting | Exiting => SecurityState::Secured,
        };

        self.broadcast_state();

        Ok(())
    }

    fn handle_management_interface_event(&mut self, event: TunnelCommand) -> Result<()> {
        use TunnelCommand::*;
        match event {
            SetTargetState(state) => self.on_set_target_state(state),
            GetState(tx) => Ok(self.on_get_state(tx)),
            GetCurrentLocation(tx) => Ok(self.on_get_current_location(tx)),
            GetAccountData(tx, account_token) => Ok(self.on_get_account_data(tx, account_token)),
            GetRelayLocations(tx) => Ok(self.on_get_relay_locations(tx)),
            SetAccount(tx, account_token) => self.on_set_account(tx, account_token),
            GetAccount(tx) => Ok(self.on_get_account(tx)),
            UpdateRelaySettings(tx, update) => self.on_update_relay_settings(tx, update),
            SetAllowLan(tx, allow_lan) => self.on_set_allow_lan(tx, allow_lan),
            GetAllowLan(tx) => Ok(self.on_get_allow_lan(tx)),
            SetOpenVpnMssfix(tx, mssfix_arg) => self.on_set_openvpn_mssfix(tx, mssfix_arg),
            GetTunnelOptions(tx) => self.on_get_tunnel_options(tx),
            GetRelaySettings(tx) => Ok(self.on_get_relay_settings(tx)),
            GetVersionInfo(tx) => Ok(self.on_get_version_info(tx)),
            GetCurrentVersion(tx) => Ok(self.on_get_current_version(tx)),
            Shutdown => self.handle_trigger_shutdown_event(),
        }
    }

    fn on_set_target_state(&mut self, new_target_state: TargetState) -> Result<()> {
        if !self.shutdown {
            self.set_target_state(new_target_state)
        } else {
            warn!("Ignoring target state change request due to shutdown");
            Ok(())
        }
    }

    fn on_get_state(&self, tx: OneshotSender<DaemonState>) {
        Self::oneshot_send(tx, self.last_broadcasted_state, "current state");
    }

    fn on_get_current_location(&self, tx: OneshotSender<GeoIpLocation>) {
        if let Some(ref relay) = self.current_relay {
            let location = relay.location.as_ref().cloned().unwrap();
            let geo_ip_location = GeoIpLocation {
                ip: IpAddr::V4(relay.ipv4_addr_exit),
                country: location.country,
                city: Some(location.city),
                latitude: location.latitude,
                longitude: location.longitude,
                mullvad_exit_ip: true,
            };
            Self::oneshot_send(tx, geo_ip_location, "current location");
        } else {
            let http_handle = self.http_handle.clone();
            self.tokio_remote.spawn(move |_| {
                geoip::send_location_request(http_handle)
                    .map(move |location| Self::oneshot_send(tx, location, "current location"))
                    .map_err(|e| {
                        warn!("Unable to fetch GeoIP location: {}", e.display_chain());
                    })
            });
        }
    }

    fn on_get_account_data(
        &mut self,
        tx: OneshotSender<BoxFuture<AccountData, mullvad_rpc::Error>>,
        account_token: AccountToken,
    ) {
        let rpc_call = self
            .accounts_proxy
            .get_expiry(account_token)
            .map(|expiry| AccountData { expiry });
        Self::oneshot_send(tx, Box::new(rpc_call), "account data")
    }

    fn on_get_relay_locations(&mut self, tx: OneshotSender<RelayList>) {
        Self::oneshot_send(
            tx,
            self.relay_selector.get_locations().clone(),
            "relay locations",
        );
    }


    fn on_set_account(
        &mut self,
        tx: OneshotSender<()>,
        account_token: Option<String>,
    ) -> Result<()> {
        let save_result = self.settings.set_account_token(account_token);

        match save_result.chain_err(|| "Unable to save settings") {
            Ok(account_changed) => {
                Self::oneshot_send(tx, (), "set_account response");
                if account_changed {
                    info!("Initiating tunnel restart because the account token changed");
                    self.restart_tunnel()?;
                }
            }
            Err(e) => error!("{}", e.display_chain()),
        }
        Ok(())
    }

    fn on_get_version_info(
        &mut self,
        tx: OneshotSender<BoxFuture<AppVersionInfo, mullvad_rpc::Error>>,
    ) {
        let current_version = version::CURRENT.to_owned();
        let fut = self
            .version_proxy
            .latest_app_version()
            .join(
                self.version_proxy
                    .is_app_version_supported(&current_version),
            )
            .map(|(latest_versions, is_supported)| AppVersionInfo {
                current_is_supported: is_supported,
                latest: latest_versions,
            });
        Self::oneshot_send(tx, Box::new(fut), "get_version_info response");
    }

    fn on_get_current_version(&mut self, tx: OneshotSender<AppVersion>) {
        let current_version = version::CURRENT.to_owned();
        Self::oneshot_send(tx, current_version, "get_current_version response");
    }

    fn on_get_account(&self, tx: OneshotSender<Option<String>>) {
        Self::oneshot_send(tx, self.settings.get_account_token(), "current account")
    }

    fn on_update_relay_settings(
        &mut self,
        tx: OneshotSender<()>,
        update: RelaySettingsUpdate,
    ) -> Result<()> {
        let save_result = self.settings.update_relay_settings(update);

        match save_result.chain_err(|| "Unable to save settings") {
            Ok(changed) => {
                Self::oneshot_send(tx, (), "update_relay_settings response");

                if changed {
                    info!("Initiating tunnel restart because the relay settings changed");
                    self.restart_tunnel()?;
                }
            }
            Err(e) => error!("{}", e.display_chain()),
        }

        Ok(())
    }

    fn on_get_relay_settings(&self, tx: OneshotSender<RelaySettings>) {
        Self::oneshot_send(tx, self.settings.get_relay_settings(), "relay settings")
    }

    fn on_set_allow_lan(&mut self, tx: OneshotSender<()>, allow_lan: bool) -> Result<()> {
        let save_result = self.settings.set_allow_lan(allow_lan);
        match save_result.chain_err(|| "Unable to save settings") {
            Ok(settings_changed) => {
                if settings_changed {
                    // Force security policy to be reset
                    self.poll_tunnel();
                }
                Self::oneshot_send(tx, (), "set_allow_lan response");
            }
            Err(e) => error!("{}", e.display_chain()),
        }
        Ok(())
    }

    fn on_get_allow_lan(&self, tx: OneshotSender<bool>) {
        Self::oneshot_send(tx, self.settings.get_allow_lan(), "allow lan")
    }

    fn on_set_openvpn_mssfix(
        &mut self,
        tx: OneshotSender<()>,
        mssfix_arg: Option<u16>,
    ) -> Result<()> {
        let save_result = self.settings.set_openvpn_mssfix(mssfix_arg);
        match save_result.chain_err(|| "Unable to save settings") {
            Ok(_) => Self::oneshot_send(tx, (), "set_openvpn_mssfix response"),
            Err(e) => error!("{}", e.display_chain()),
        };
        Ok(())
    }

    fn on_get_tunnel_options(&self, tx: OneshotSender<TunnelOptions>) -> Result<()> {
        let tunnel_options = self.settings.get_tunnel_options().clone();
        Self::oneshot_send(tx, tunnel_options, "get_tunnel_options response");
        Ok(())
    }

    fn oneshot_send<T>(tx: OneshotSender<T>, t: T, msg: &'static str) {
        if let Err(_) = tx.send(t) {
            warn!("Unable to send {} to management interface client", msg);
        }
    }

    fn handle_management_interface_exited(&self, result: talpid_ipc::Result<()>) -> Result<()> {
        let error = ErrorKind::ManagementInterfaceError("Server exited unexpectedly");
        match result {
            Ok(()) => Err(error.into()),
            Err(e) => Err(e).chain_err(|| error),
        }
    }

    fn handle_trigger_shutdown_event(&mut self) -> Result<()> {
        self.shutdown = true;
        self.kill_tunnel();
        self.poll_tunnel();

        Ok(())
    }

    fn broadcast_state(&mut self) {
        let new_daemon_state = DaemonState {
            state: self.security_state,
            target_state: self.target_state,
        };
        if self.last_broadcasted_state != new_daemon_state {
            self.last_broadcasted_state = new_daemon_state;
            self.management_interface_broadcaster
                .notify_new_state(new_daemon_state);
        }
    }

    /// Set the target state of the client. If it changed trigger the operations needed to
    /// progress towards that state.
    fn set_target_state(&mut self, new_state: TargetState) -> Result<()> {
        if new_state != self.target_state {
            debug!("Target state {:?} => {:?}", self.target_state, new_state);
            self.target_state = new_state;
            self.broadcast_state();
            self.apply_target_state()
        } else {
            Ok(())
        }
    }

    fn apply_target_state(&mut self) -> Result<()> {
        match self.target_state {
            TargetState::Secured => {
                debug!("Triggering tunnel start");
                if let Err(e) = self.start_tunnel().chain_err(|| "Failed to start tunnel") {
                    error!("{}", e.display_chain());
                    self.current_relay = None;
                    self.management_interface_broadcaster.notify_error(&e);
                    self.set_target_state(TargetState::Unsecured)?;
                }
            }
            TargetState::Unsecured => self.kill_tunnel(),
        }

        Ok(())
    }

    fn start_tunnel(&mut self) -> Result<()> {
        let parameters = self.build_tunnel_parameters()?;

        self.tunnel_requests.send(TunnelRequest::Start(parameters));

        Ok(())
    }

    fn restart_tunnel(&mut self) -> Result<()> {
        let parameters = self.build_tunnel_parameters()?;

        self.tunnel_requests
            .send(TunnelRequest::Restart(parameters));

        Ok(())
    }

    fn poll_tunnel(&mut self) {
        self.tunnel_requests.send(TunnelRequest::PollStateInfo)
    }

    fn kill_tunnel(&mut self) {
        self.tunnel_requests.send(TunnelRequest::Close)
    }

    fn build_tunnel_parameters(&mut self) -> Result<TunnelParameters> {
        let endpoint = match self.settings.get_relay_settings() {
            RelaySettings::CustomTunnelEndpoint(custom_relay) => custom_relay
                .to_tunnel_endpoint()
                .chain_err(|| ErrorKind::NoRelay)?,
            RelaySettings::Normal(constraints) => {
                let (relay, tunnel_endpoint) = self
                    .relay_selector
                    .get_tunnel_endpoint(&constraints)
                    .chain_err(|| ErrorKind::NoRelay)?;
                self.current_relay = Some(relay);
                tunnel_endpoint
            }
        };

        let account_token = self
            .settings
            .get_account_token()
            .ok_or(ErrorKind::InvalidSettings("No account token"))?;

        Ok(TunnelParameters {
            endpoint,
            options: self.settings.get_tunnel_options().clone(),
            log_dir: self.log_dir.clone(),
            resource_dir: self.resource_dir.clone(),
            account_token,
        })
    }

    pub fn shutdown_handle(&self) -> DaemonShutdownHandle {
        DaemonShutdownHandle {
            tx: self.tx.clone(),
        }
    }

    fn set_security_policy(&mut self, policy: SecurityPolicy) -> Result<()> {
        debug!("Set security policy: {:?}", policy);
        self.firewall
            .apply_policy(policy)
            .chain_err(|| ErrorKind::FirewallError)
    }

    fn reset_security_policy(&mut self) -> Result<()> {
        debug!("Reset security policy");
        self.firewall
            .reset_policy()
            .chain_err(|| ErrorKind::FirewallError)
    }
}

struct DaemonShutdownHandle {
    tx: mpsc::Sender<DaemonEvent>,
}

impl DaemonShutdownHandle {
    pub fn shutdown(&self) {
        let _ = self.tx.send(DaemonEvent::TriggerShutdown);
    }
}

impl Drop for Daemon {
    fn drop(self: &mut Daemon) {
        if let Err(e) =
            rpc_address_file::remove().chain_err(|| "Unable to clean up rpc address file")
        {
            error!("{}", e.display_chain());
        }
    }
}


fn main() {
    ::std::process::exit(match run() {
        Ok(_) => 0,
        Err(error) => {
            if let &ErrorKind::LogError(_) = error.kind() {
                eprintln!("{}", error.display_chain());
            } else {
                error!("{}", error.display_chain());
            }
            1
        }
    });
}

fn run() -> Result<()> {
    let config = cli::get_config();
    let log_dir = if config.log_to_file {
        Some(
            mullvad_paths::log_dir()
                .chain_err(|| ErrorKind::LogError("Unable to get log directory"))?,
        )
    } else {
        None
    };
    let log_file = log_dir.as_ref().map(|dir| dir.join(DAEMON_LOG_FILENAME));

    logging::init_logger(
        config.log_level,
        log_file.as_ref(),
        config.log_stdout_timestamps,
    ).chain_err(|| ErrorKind::LogError("Unable to initialize logger"))?;
    log_version();
    if let Some(ref log_dir) = log_dir {
        info!("Logging to {}", log_dir.display());
    }

    run_platform(config)
}

#[cfg(windows)]
fn run_platform(config: cli::Config) -> Result<()> {
    if config.run_as_service {
        system_service::run()
    } else {
        if config.register_service {
            let install_result =
                system_service::install_service().chain_err(|| "Unable to install the service");
            if install_result.is_ok() {
                println!("Installed the service.");
            }
            install_result
        } else {
            run_standalone(config)
        }
    }
}

#[cfg(not(windows))]
fn run_platform(config: cli::Config) -> Result<()> {
    run_standalone(config)
}

fn run_standalone(config: cli::Config) -> Result<()> {
    if !running_as_admin() {
        warn!("Running daemon as a non-administrator user, clients might refuse to connect");
    }

    let daemon = create_daemon(config)?;

    let shutdown_handle = daemon.shutdown_handle();
    shutdown::set_shutdown_signal_handler(move || shutdown_handle.shutdown())
        .chain_err(|| "Unable to attach shutdown signal handler")?;

    daemon.run()?;

    info!("Mullvad daemon is quitting");
    thread::sleep(Duration::from_millis(500));
    Ok(())
}

fn create_daemon(config: cli::Config) -> Result<Daemon> {
    let log_dir = if config.log_to_file {
        Some(mullvad_paths::log_dir().chain_err(|| "Unable to get log directory")?)
    } else {
        None
    };
    let resource_dir = mullvad_paths::get_resource_dir();
    let cache_dir = mullvad_paths::cache_dir().chain_err(|| "Unable to get cache dir")?;

    Daemon::new(log_dir, resource_dir, cache_dir).chain_err(|| "Unable to initialize daemon")
}

fn log_version() {
    info!(
        "Starting {} - {} {}",
        env!("CARGO_PKG_NAME"),
        version::CURRENT,
        version::COMMIT_DATE,
    )
}

#[cfg(unix)]
fn running_as_admin() -> bool {
    let uid = unsafe { libc::getuid() };
    uid == 0
}

#[cfg(windows)]
fn running_as_admin() -> bool {
    // TODO: Check if user is administrator correctly on Windows.
    true
}
