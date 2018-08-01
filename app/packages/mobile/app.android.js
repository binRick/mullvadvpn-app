// @flow

import log from 'electron-log';
import * as React from 'react';
import RX, { Component } from 'reactxp';
import { Provider } from 'react-redux';
import { Router } from 'react-router-redux';
import { createMemoryHistory } from 'history';
import makeRoutes from './routes';
import configureStore from './redux/store';
import { Backend, NoAccountError } from './lib/backend';
import { DeviceEventEmitter } from 'react-native';
import { MobileAppBridge } from 'NativeModules';
import { Dimensions } from 'react-native';

const initialState = null;
const memoryHistory = createMemoryHistory();
const store = configureStore(initialState, memoryHistory);

//////////////////////////////////////////////////////////////////////////
// Backend
//////////////////////////////////////////////////////////////////////////
const backend = new Backend(store);

DeviceEventEmitter.addListener('com.mullvad.daemon-connection-ready', async (_event, args) => {
  backend.setCredentials(args.credentials);
  backend.sync();
  try {
    await backend.autologin();
    await backend.fetchRelaySettings();
    await backend.fetchSecurityState();
    await backend.connectTunnel();
  } catch (e) {
    if (e instanceof NoAccountError) {
      log.debug('No previously configured account set, showing window');
      MobileAppBridge.showWindow();
    }
  }
});

MobileAppBridge.startBackend()
  .then((_response) => {
    return;
  })
  .catch((e) => {
    log.error('Failed starting backend:', e);
  });

const _isPortrait = () => {
  const dim = RX.UserInterface.measureWindow();
  return dim.height >= dim.width;
};

export default class App extends Component {
  constructor() {
    super();

    this.state = {
      orientation: _isPortrait() ? 'portrait' : 'landscape',
    };

    Dimensions.addEventListener('change', () => {
      this.setState({
        orientation: _isPortrait() ? 'portrait' : 'landscape',
      });
    });
  }

  render() {
    return (
      <Provider store={store}>
        <Router history={memoryHistory}>{makeRoutes(store.getState, { backend })}</Router>
      </Provider>
    );
  }
}
