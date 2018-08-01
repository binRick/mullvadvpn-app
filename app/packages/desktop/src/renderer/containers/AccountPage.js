// @flow

import { remote, shell } from 'electron';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { push } from 'react-router-redux';
import Account from '../components/Account';
import accountActions from '../redux/account/actions';
import { links } from '../../config';

import type { ReduxState, ReduxDispatch } from '../redux/store';
import type { SharedRouteProps } from '../routes';

const mapStateToProps = (state: ReduxState) => ({
  accountToken: state.account.accountToken,
  accountExpiry: state.account.expiry,
  expiryLocale: remote.app.getLocale(),
});
const mapDispatchToProps = (dispatch: ReduxDispatch, props: SharedRouteProps) => {
  const { copyAccountToken } = bindActionCreators(accountActions, dispatch);
  const { push: pushHistory } = bindActionCreators({ push }, dispatch);
  return {
    updateAccountExpiry: () => props.app.updateAccountExpiry(),
    onCopyAccountToken: () => copyAccountToken(),
    onLogout: () => {
      props.app.logout();
    },
    onClose: () => {
      pushHistory('/settings');
    },
    onBuyMore: () => shell.openExternal(links['purchase']),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Account);
