// @flow

import * as React from 'react';
import { shallow } from 'enzyme';
import Settings from '../../src/renderer/components/Settings';
import { CloseBarItem } from '../../src/renderer/components/NavigationBar';

import type { AccountReduxState } from '../../src/renderer/redux/account/reducers';
import type { SettingsReduxState } from '../../src/renderer/redux/settings/reducers';
import type { SettingsProps } from '../../src/renderer/components/Settings';

describe('components/Settings', () => {
  const loggedOutAccountState: AccountReduxState = {
    accountToken: null,
    accountHistory: [],
    expiry: null,
    status: 'none',
    error: null,
  };

  const loggedInAccountState: AccountReduxState = {
    accountToken: '1234',
    accountHistory: [],
    expiry: new Date('2038-01-01').toISOString(),
    status: 'ok',
    error: null,
  };

  const unpaidAccountState: AccountReduxState = {
    accountToken: '1234',
    accountHistory: [],
    expiry: new Date('2001-01-01').toISOString(),
    status: 'ok',
    error: null,
  };

  const settingsState: SettingsReduxState = {
    relaySettings: {
      normal: {
        location: 'any',
        protocol: 'udp',
        port: 1301,
      },
    },
    relayLocations: [],
    autoConnect: false,
    allowLan: false,
  };

  const makeProps = (
    anAccountState: AccountReduxState,
    aSettingsState: SettingsReduxState,
    mergeProps: $Shape<SettingsProps> = {},
  ): SettingsProps => {
    const defaultProps: SettingsProps = {
      account: anAccountState,
      settings: aSettingsState,
      version: '',
      onQuit: () => {},
      onClose: () => {},
      onViewAccount: () => {},
      onViewSupport: () => {},
      onViewAdvancedSettings: () => {},
      onViewPreferences: () => {},
      onExternalLink: (_type) => {},
    };
    return Object.assign({}, defaultProps, mergeProps);
  };

  it('should show quit button when logged out', () => {
    const props = makeProps(loggedOutAccountState, settingsState);
    const component = getComponent(render(props), 'settings__quit');
    expect(component).to.have.length(1);
  });

  it('should show quit button when logged in', () => {
    const props = makeProps(loggedInAccountState, settingsState);
    const component = getComponent(render(props), 'settings__quit');
    expect(component).to.have.length(1);
  });

  it('should show external links when logged out', () => {
    const props = makeProps(loggedOutAccountState, settingsState);
    const component = getComponent(render(props), 'settings__external_link');
    expect(component.length).to.be.above(0);
  });

  it('should show external links when logged in', () => {
    const props = makeProps(loggedInAccountState, settingsState);
    const component = getComponent(render(props), 'settings__external_link');
    expect(component.length).to.be.above(0);
  });

  it('should show account section when logged in', () => {
    const props = makeProps(loggedInAccountState, settingsState);
    const component = getComponent(render(props), 'settings__account');
    expect(component).to.have.length(1);
  });

  it('should hide account section when logged out', () => {
    const props = makeProps(loggedOutAccountState, settingsState);
    const elements = getComponent(render(props), 'settings__account');
    expect(elements).to.have.length(0);
  });

  it('should hide account link when not logged in', () => {
    const props = makeProps(loggedOutAccountState, settingsState);
    const elements = getComponent(render(props), 'settings__view_account');
    expect(elements).to.have.length(0);
  });

  it('should show out-of-time message for unpaid account', () => {
    const props = makeProps(unpaidAccountState, settingsState);
    const component = getComponent(render(props), 'settings__account_paid_until_subtext');
    expect(component.children().text()).to.equal('OUT OF TIME');
  });

  it('should hide out-of-time message for paid account', () => {
    const props = makeProps(loggedInAccountState, settingsState);
    const component = getComponent(render(props), 'settings__account_paid_until_subtext');
    expect(component.children().text()).not.to.equal('OUT OF TIME');
  });

  it('should call close callback', (done) => {
    const props = makeProps(loggedOutAccountState, settingsState, {
      onClose: () => done(),
    });
    const component = render(props)
      .find(CloseBarItem)
      .dive();
    component.simulate('press');
  });

  it('should call quit callback', (done) => {
    const props = makeProps(loggedOutAccountState, settingsState, {
      onQuit: () => done(),
    });
    const component = getComponent(render(props), 'settings__quit');
    component.simulate('press');
  });

  it('should call account callback', (done) => {
    const props = makeProps(loggedInAccountState, settingsState, {
      onViewAccount: () => done(),
    });
    const component = getComponent(render(props), 'settings__account_paid_until_button');
    component.simulate('press');
  });

  it('should call advanced settings callback', (done) => {
    const props = makeProps(loggedInAccountState, settingsState, {
      onViewAdvancedSettings: () => done(),
    });
    const component = getComponent(render(props), 'settings__advanced');
    component.simulate('press');
  });

  it('should call preferences callback', (done) => {
    const props = makeProps(loggedInAccountState, settingsState, {
      onViewPreferences: () => done(),
    });
    const component = getComponent(render(props), 'settings__preferences');
    component.simulate('press');
  });

  it('should call support callback', (done) => {
    const props = makeProps(loggedInAccountState, settingsState, {
      onViewSupport: () => done(),
    });
    const component = getComponent(render(props), 'settings__view_support');
    component.simulate('press');
  });

  it('should call external links callback', () => {
    const collectedExternalLinkTypes: Array<string> = [];
    const props = makeProps(loggedOutAccountState, settingsState, {
      onExternalLink: (type) => {
        collectedExternalLinkTypes.push(type);
      },
    });
    const container = getComponent(render(props), 'settings__external_link');
    container
      .find({ testName: 'settings__external_link' })
      .forEach((element) => element.simulate('press'));

    expect(collectedExternalLinkTypes).to.include.ordered.members(['faq', 'guides']);
  });
});

function render(props) {
  return shallow(<Settings {...props} />);
}

function getComponent(container, testName) {
  return container.findWhere((n) => n.prop('testName') === testName);
}
