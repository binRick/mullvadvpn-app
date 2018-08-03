// @flow

import React from 'react';
import { bindActionCreators } from 'redux';
import { Provider } from 'react-redux';
import { ConnectedRouter, push as pushHistory } from 'connected-react-router';
import { createMemoryHistory } from 'history';
import { webFrame, ipcRenderer } from 'electron';

import makeRoutes from './routes';
import { log } from './lib/platform';
import ReconnectionBackoff from './lib/reconnection-backoff';
import { DaemonRpc } from './lib/daemon-rpc';
import { setShutdownHandler } from './shutdown-handler';

import { NoAccountError } from './errors';

import configureStore from './redux/store';
import accountActions from './redux/account/actions';
import connectionActions from './redux/connection/actions';
import settingsActions from './redux/settings/actions';

import type { RpcCredentials } from './lib/rpc-address-file';
import type {
  DaemonRpcProtocol,
  ConnectionObserver as DaemonConnectionObserver,
} from './lib/daemon-rpc';
import type { ReduxStore } from './redux/store';
import type { AccountToken, BackendState, RelaySettingsUpdate } from './lib/daemon-rpc';
import type { ConnectionState } from './redux/connection/reducers';
import type { TrayIconType } from './tray-icon-controller';

export default class AppRenderer {
  _daemonRpc: DaemonRpcProtocol = new DaemonRpc();
  _reconnectBackoff = new ReconnectionBackoff();
  _credentials: ?RpcCredentials;
  _openConnectionObserver: ?DaemonConnectionObserver;
  _closeConnectionObserver: ?DaemonConnectionObserver;
  _memoryHistory = createMemoryHistory();
  _reduxStore: ReduxStore;
  _reduxActions: *;

  constructor() {
    const store = configureStore(null, this._memoryHistory);
    const dispatch = store.dispatch;

    this._reduxStore = store;
    this._reduxActions = {
      account: bindActionCreators(accountActions, dispatch),
      connection: bindActionCreators(connectionActions, dispatch),
      settings: bindActionCreators(settingsActions, dispatch),
      history: bindActionCreators({ push: pushHistory }, dispatch),
    };

    this._openConnectionObserver = this._daemonRpc.addOpenConnectionObserver(() => {
      this._onOpenConnection();
    });

    this._closeConnectionObserver = this._daemonRpc.addCloseConnectionObserver((error) => {
      this._onCloseConnection(error);
    });

    setShutdownHandler(async () => {
      log.info('Executing a shutdown handler');
      try {
        await this.disconnectTunnel();
        log.info('Disconnected the tunnel');
      } catch (e) {
        log.error(`Failed to shutdown tunnel: ${e.message}`);
      }
    });

    // disable pinch to zoom
    webFrame.setVisualZoomLevelLimits(1, 1);
  }

  dispose() {
    const openConnectionObserver = this._openConnectionObserver;
    const closeConnectionObserver = this._closeConnectionObserver;

    if (openConnectionObserver) {
      openConnectionObserver.unsubscribe();
      this._openConnectionObserver = null;
    }

    if (closeConnectionObserver) {
      closeConnectionObserver.unsubscribe();
      this._closeConnectionObserver = null;
    }
  }

  renderView() {
    return (
      <Provider store={this._reduxStore}>
        <ConnectedRouter history={this._memoryHistory}>
          {makeRoutes(this._reduxStore.getState, { app: this })}
        </ConnectedRouter>
      </Provider>
    );
  }

  connect() {
    this._connectToDaemon();
  }

  disconnect() {
    this._daemonRpc.disconnect();
  }

  async login(accountToken: AccountToken) {
    const actions = this._reduxActions;
    actions.account.startLogin(accountToken);

    log.debug('Attempting to login');

    try {
      const accountData = await this._daemonRpc.getAccountData(accountToken);
      await this._daemonRpc.setAccount(accountToken);

      actions.account.loginSuccessful(accountData.expiry);

      // Redirect the user after some time to allow for
      // the 'Login Successful' screen to be visible
      setTimeout(async () => {
        actions.history.push('/connect');

        try {
          log.debug('Auto-connecting the tunnel...');
          await this.connectTunnel();
        } catch (error) {
          log.error(`Failed to auto-connect the tunnel: ${error.message}`);
        }
      }, 1000);
    } catch (error) {
      log.error('Failed to log in,', error.message);

      actions.account.loginFailed(error);
    }
  }

  async _autologin() {
    const actions = this._reduxActions;
    actions.account.startLogin();

    log.debug('Attempting to log in automatically');

    try {
      const accountToken = await this._daemonRpc.getAccount();
      if (!accountToken) {
        throw new NoAccountError();
      }

      log.debug(`The daemon had an account number stored: ${accountToken}`);
      actions.account.startLogin(accountToken);

      const accountData = await this._daemonRpc.getAccountData(accountToken);
      log.debug('The stored account number still exists:', accountData);

      actions.account.loginSuccessful(accountData.expiry);
      actions.history.push('/connect');
    } catch (e) {
      log.warn('Unable to autologin,', e.message);

      actions.account.autoLoginFailed();
      actions.history.push('/');

      throw e;
    }
  }

  async logout() {
    const actions = this._reduxActions;

    try {
      await Promise.all([
        this.disconnectTunnel(),
        this._daemonRpc.setAccount(null),
        this._fetchAccountHistory(),
      ]);
      actions.account.loggedOut();
      actions.history.push('/');
    } catch (e) {
      log.info('Failed to logout: ', e.message);
    }
  }

  async connectTunnel() {
    const actions = this._reduxActions;

    try {
      const currentState = await this._daemonRpc.getState();
      if (currentState.state === 'secured') {
        log.debug('Refusing to connect as connection is already secured');
        actions.connection.connected();
      } else {
        actions.connection.connecting();
        await this._daemonRpc.connectTunnel();
      }
    } catch (error) {
      actions.connection.disconnected();
      throw error;
    }
  }

  disconnectTunnel() {
    return this._daemonRpc.disconnectTunnel();
  }

  updateRelaySettings(relaySettings: RelaySettingsUpdate) {
    return this._daemonRpc.updateRelaySettings(relaySettings);
  }

  async fetchRelaySettings() {
    const actions = this._reduxActions;
    const relaySettings = await this._daemonRpc.getRelaySettings();

    log.debug('Got relay settings from daemon', JSON.stringify(relaySettings));

    if (relaySettings.normal) {
      const payload = {};
      const normal = relaySettings.normal;
      const tunnel = normal.tunnel;
      const location = normal.location;

      if (location === 'any') {
        payload.location = 'any';
      } else {
        payload.location = location.only;
      }

      if (tunnel === 'any') {
        payload.port = 'any';
        payload.protocol = 'any';
      } else {
        const { port, protocol } = tunnel.only.openvpn;
        payload.port = port === 'any' ? port : port.only;
        payload.protocol = protocol === 'any' ? protocol : protocol.only;
      }

      actions.settings.updateRelay({
        normal: payload,
      });
    } else if (relaySettings.custom_tunnel_endpoint) {
      const custom_tunnel_endpoint = relaySettings.custom_tunnel_endpoint;
      const {
        host,
        tunnel: {
          openvpn: { port, protocol },
        },
      } = custom_tunnel_endpoint;

      actions.settings.updateRelay({
        custom_tunnel_endpoint: {
          host,
          port,
          protocol,
        },
      });
    }
  }

  async updateAccountExpiry() {
    const actions = this._reduxActions;
    try {
      const accountToken = await this._daemonRpc.getAccount();
      if (!accountToken) {
        throw new NoAccountError();
      }
      const accountData = await this._daemonRpc.getAccountData(accountToken);
      actions.account.updateAccountExpiry(accountData.expiry);
    } catch (e) {
      log.error(`Failed to update account expiry: ${e.message}`);
    }
  }

  async removeAccountFromHistory(accountToken: AccountToken): Promise<void> {
    await this._daemonRpc.removeAccountFromHistory(accountToken);
    await this._fetchAccountHistory();
  }

  async _fetchAccountHistory(): Promise<void> {
    const actions = this._reduxActions;

    const accountHistory = await this._daemonRpc.getAccountHistory();
    actions.account.updateAccountHistory(accountHistory);
  }

  async _fetchRelayLocations() {
    const actions = this._reduxActions;
    const locations = await this._daemonRpc.getRelayLocations();

    log.info('Got relay locations');

    const storedLocations = locations.countries.map((country) => ({
      name: country.name,
      code: country.code,
      hasActiveRelays: country.cities.some((city) => city.has_active_relays),
      cities: country.cities.map((city) => ({
        name: city.name,
        code: city.code,
        latitude: city.latitude,
        longitude: city.longitude,
        hasActiveRelays: city.has_active_relays,
      })),
    }));

    actions.settings.updateRelayLocations(storedLocations);
  }

  async _fetchLocation() {
    const actions = this._reduxActions;
    const location = await this._daemonRpc.getLocation();

    log.info('Got location from daemon');

    const locationUpdate = {
      ip: location.ip,
      country: location.country,
      city: location.city,
      latitude: location.latitude,
      longitude: location.longitude,
      mullvadExitIp: location.mullvad_exit_ip,
    };

    actions.connection.newLocation(locationUpdate);
  }

  async setAllowLan(allowLan: boolean) {
    const actions = this._reduxActions;
    await this._daemonRpc.setAllowLan(allowLan);
    actions.settings.updateAllowLan(allowLan);
  }

  async setAutoConnect(autoConnect: boolean) {
    const actions = this._reduxActions;
    await this._daemonRpc.setAutoConnect(autoConnect);
    actions.settings.updateAutoConnect(autoConnect);
  }

  async _fetchAllowLan() {
    const actions = this._reduxActions;
    const allowLan = await this._daemonRpc.getAllowLan();
    actions.settings.updateAllowLan(allowLan);
  }

  async _fetchAutoConnect() {
    const actions = this._reduxActions;
    const autoConnect = await this._daemonRpc.getAutoConnect();
    actions.settings.updateAutoConnect(autoConnect);
  }

  async _fetchSecurityState() {
    const securityState = await this._daemonRpc.getState();
    const connectionState = this._securityStateToConnectionState(securityState);
    this._updateConnectionState(connectionState);
  }

  async _connectToDaemon(): Promise<void> {
    let credentials;
    try {
      credentials = await this._requestCredentials();
    } catch (error) {
      log.error(`Cannot request the RPC credentials: ${error.message}`);
      return;
    }

    this._credentials = credentials;
    this._daemonRpc.connect(credentials.connectionString);
  }

  async _onOpenConnection() {
    this._reconnectBackoff.reset();

    // authenticate once connected
    const credentials = this._credentials;
    try {
      if (!credentials) {
        throw new Error('Credentials cannot be unset after connection is established.');
      }
      await this._authenticate(credentials.sharedSecret);
    } catch (error) {
      log.error(`Cannot authenticate: ${error.message}`);
    }

    // autologin
    try {
      await this._autologin();
    } catch (error) {
      if (error instanceof NoAccountError) {
        log.debug('No previously configured account set, showing window');
        ipcRenderer.send('show-window');
      } else {
        log.error(`Failed to autologin: ${error.message}`);
      }
    }

    // make sure to re-subscribe to state notifications when connection is re-established.
    try {
      await this._subscribeStateListener();
    } catch (error) {
      log.error(`Cannot subscribe for RPC notifications: ${error.message}`);
    }

    // fetch initial state
    try {
      await this._fetchInitialState();
    } catch (error) {
      log.error(`Cannot fetch initial state: ${error.message}`);
    }

    // auto connect the tunnel on startup
    // note: disabled when developing
    if (process.env.NODE_ENV !== 'development') {
      try {
        log.debug('Auto-connecting the tunnel...');
        await this.connectTunnel();
      } catch (error) {
        log.error(`Failed to auto-connect the tunnel: ${error.message}`);
      }
    }
  }

  async _onCloseConnection(error: ?Error) {
    if (error) {
      log.debug(`Lost connection to daemon: ${error.message}`);

      const recover = async () => {
        try {
          await this.connect();
        } catch (error) {
          log.error(`Failed to reconnect: ${error.message}`);
        }
      };

      this._reconnectBackoff.attempt(() => {
        recover();
      });
    }
  }

  _requestCredentials(): Promise<RpcCredentials> {
    return new Promise((resolve) => {
      ipcRenderer.once('daemon-connection-ready', (_event, credentials: RpcCredentials) => {
        resolve(credentials);
      });
      ipcRenderer.send('discover-daemon-connection');
    });
  }

  async _subscribeStateListener() {
    await this._daemonRpc.subscribeStateListener((newState, error) => {
      if (error) {
        log.error(`Received an error when processing the incoming state change: ${error.message}`);
      }

      if (newState) {
        const connectionState = this._securityStateToConnectionState(newState);

        log.debug(
          `Got new state from daemon {state: ${newState.state}, target_state: ${
            newState.target_state
          }}, translated to '${connectionState}'`,
        );

        this._updateConnectionState(connectionState);
        this._refreshStateOnChange();
      }
    });
  }

  _fetchInitialState() {
    return Promise.all([
      this._fetchSecurityState(),
      this.fetchRelaySettings(),
      this._fetchRelayLocations(),
      this._fetchAllowLan(),
      this._fetchAutoConnect(),
      this._fetchLocation(),
      this._fetchAccountHistory(),
    ]);
  }

  _updateTrayIcon(connectionState: ConnectionState) {
    const iconTypes: { [ConnectionState]: TrayIconType } = {
      connected: 'secured',
      connecting: 'securing',
    };
    const type = iconTypes[connectionState] || 'unsecured';

    ipcRenderer.send('change-tray-icon', type);
  }

  async _refreshStateOnChange() {
    try {
      await this._fetchLocation();
    } catch (error) {
      log.error(`Failed to fetch the location: ${error.message}`);
    }
  }

  _securityStateToConnectionState(backendState: BackendState): ConnectionState {
    if (backendState.state === 'unsecured' && backendState.target_state === 'secured') {
      return 'connecting';
    } else if (backendState.state === 'secured' && backendState.target_state === 'secured') {
      return 'connected';
    } else if (backendState.target_state === 'unsecured') {
      return 'disconnected';
    }
    throw new Error('Unsupported state/target state combination: ' + JSON.stringify(backendState));
  }

  _updateConnectionState(connectionState: ConnectionState) {
    const actions = this._reduxActions;
    switch (connectionState) {
      case 'connecting':
        actions.connection.connecting();
        break;
      case 'connected':
        actions.connection.connected();
        break;
      case 'disconnected':
        actions.connection.disconnected();
        break;
    }

    this._updateTrayIcon(connectionState);
  }

  async _authenticate(sharedSecret: string) {
    try {
      await this._daemonRpc.authenticate(sharedSecret);
      log.info('Authenticated with backend');
    } catch (e) {
      log.error(`Failed to authenticate with backend: ${e.message}`);
      throw e;
    }
  }
}
