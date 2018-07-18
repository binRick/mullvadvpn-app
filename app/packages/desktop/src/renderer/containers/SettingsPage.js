// @flow

import { remote, shell } from 'electron';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { push } from 'react-router-redux';
import Settings from '../components/Settings';
import { links } from '../../config';

import type { ReduxState, ReduxDispatch } from '../redux/store';
import type { SharedRouteProps } from '../routes';

const mapStateToProps = (state: ReduxState) => ({
  account: state.account,
  settings: state.settings,
  version: remote.app.getVersion(),
});
const mapDispatchToProps = (dispatch: ReduxDispatch, _props: SharedRouteProps) => {
  const { push: pushHistory } = bindActionCreators({ push }, dispatch);
  return {
    onQuit: () => remote.app.quit(),
    onClose: () => pushHistory('/connect'),
    onViewAccount: () => pushHistory('/settings/account'),
    onViewSupport: () => pushHistory('/settings/support'),
    onViewPreferences: () => pushHistory('/settings/preferences'),
    onViewAdvancedSettings: () => pushHistory('/settings/advanced'),
    onExternalLink: (type) => shell.openExternal(links[type]),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Settings);
