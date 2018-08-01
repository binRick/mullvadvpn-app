// @flow
import moment from 'moment';
import * as React from 'react';
import { Component, View } from 'reactxp';
import { AppButton, Img } from '@mullvad/components';
import { Layout, Container } from './Layout';
import NavigationBar, { CloseBarItem } from './NavigationBar';
import SettingsHeader, { HeaderTitle } from './SettingsHeader';
import * as Cell from './Cell';
import CustomScrollbars from './CustomScrollbars';
import styles from './SettingsStyles';

import type { AccountReduxState } from '../redux/account/reducers';
import type { SettingsReduxState } from '../redux/settings/reducers';

export type SettingsProps = {
  account: AccountReduxState,
  settings: SettingsReduxState,
  version: string,
  onQuit: () => void,
  onClose: () => void,
  onViewAccount: () => void,
  onViewSupport: () => void,
  onViewPreferences: () => void,
  onViewAdvancedSettings: () => void,
  onExternalLink: (type: string) => void,
};

export default class Settings extends Component<SettingsProps> {
  render() {
    return (
      <Layout>
        <Container>
          <View style={styles.settings}>
            <NavigationBar>
              <CloseBarItem action={this.props.onClose} />
            </NavigationBar>

            <View style={styles.settings__container}>
              <SettingsHeader>
                <HeaderTitle>Settings</HeaderTitle>
              </SettingsHeader>

              <CustomScrollbars style={styles.settings__scrollview} autoHide={true}>
                <View style={styles.settings__content}>
                  <View>
                    {this._renderTopButtons()}
                    {this._renderMiddleButtons()}
                    {this._renderBottomButtons()}
                  </View>
                  {this._renderQuitButton()}
                </View>
              </CustomScrollbars>
            </View>
          </View>
        </Container>
      </Layout>
    );
  }

  _renderTopButtons() {
    const isLoggedIn = this.props.account.status === 'ok';
    if (!isLoggedIn) {
      return null;
    }

    let isOutOfTime = false,
      formattedExpiry = '';
    const expiryIso = this.props.account.expiry;

    if (isLoggedIn && expiryIso) {
      const expiry = moment(this.props.account.expiry);
      isOutOfTime = expiry.isSameOrBefore(moment());
      formattedExpiry = (expiry.fromNow(true) + ' left').toUpperCase();
    }

    return (
      <View>
        <View style={styles.settings_account} testName="settings__account">
          {isOutOfTime ? (
            <Cell.CellButton
              onPress={this.props.onViewAccount}
              testName="settings__account_paid_until_button">
              <Cell.Label>Account</Cell.Label>
              <Cell.SubText
                testName="settings__account_paid_until_subtext"
                style={styles.settings__account_paid_until_Label__error}>
                OUT OF TIME
              </Cell.SubText>
              <Img height={12} width={7} source="icon-chevron" />
            </Cell.CellButton>
          ) : (
            <Cell.CellButton
              onPress={this.props.onViewAccount}
              testName="settings__account_paid_until_button">
              <Cell.Label>Account</Cell.Label>
              <Cell.SubText testName="settings__account_paid_until_subtext">
                {formattedExpiry}
              </Cell.SubText>
              <Img height={12} width={7} source="icon-chevron" />
            </Cell.CellButton>
          )}
        </View>

        <Cell.CellButton onPress={this.props.onViewPreferences} testName="settings__preferences">
          <Cell.Label>Preferences</Cell.Label>
          <Img height={12} width={7} source="icon-chevron" />
        </Cell.CellButton>

        <Cell.CellButton onPress={this.props.onViewAdvancedSettings} testName="settings__advanced">
          <Cell.Label>Advanced</Cell.Label>
          <Img height={12} width={7} source="icon-chevron" />
        </Cell.CellButton>
        <View style={styles.settings__cell_spacer} />
      </View>
    );
  }

  _renderMiddleButtons() {
    return (
      <View>
        <Cell.CellButton
          onPress={this.props.onExternalLink.bind(this, 'download')}
          testName="settings__version">
          <Cell.Label>App version</Cell.Label>
          <Cell.SubText>{this._formattedVersion()}</Cell.SubText>
          <Img height={16} width={16} source="icon-extLink" />
        </Cell.CellButton>
        <View style={styles.settings__cell_spacer} />
      </View>
    );
  }

  _formattedVersion() {
    // the version in package.json has to be semver, but we use a YEAR.release-channel
    // version scheme. in package.json we thus have to write YEAR.release.X-channel and
    // this function is responsible for removing .X part.
    return this.props.version
      .replace('.0-', '-') // remove the .0 in 2018.1.0-beta9
      .replace(/\.0$/, ''); // remove the .0 in 2018.1.0
  }

  _renderBottomButtons() {
    return (
      <View>
        <Cell.CellButton
          onPress={this.props.onExternalLink.bind(this, 'faq')}
          testName="settings__external_link">
          <Cell.Label>FAQs</Cell.Label>
          <Img height={16} width={16} source="icon-extLink" />
        </Cell.CellButton>

        <Cell.CellButton
          onPress={this.props.onExternalLink.bind(this, 'guides')}
          testName="settings__external_link">
          <Cell.Label>Guides</Cell.Label>
          <Img height={16} width={16} source="icon-extLink" />
        </Cell.CellButton>

        <Cell.CellButton onPress={this.props.onViewSupport} testName="settings__view_support">
          <Cell.Label>Report a problem</Cell.Label>
          <Img height={12} width={7} source="icon-chevron" />
        </Cell.CellButton>
      </View>
    );
  }

  _renderQuitButton() {
    return (
      <View style={styles.settings__footer}>
        <AppButton.RedButton onPress={this.props.onQuit} testName="settings__quit">
          <AppButton.Label>Quit app</AppButton.Label>
        </AppButton.RedButton>
      </View>
    );
  }
}
