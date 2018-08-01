// @flow
import { createViewStyles, createTextStyles } from '../lib/styles';
import { palette } from '@mullvad/components';

export default {
  ...createViewStyles({
    connect: {
      flex: 1,
    },
    map: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 0,
      height: '100%',
      width: '100%',
    },
    container: {
      flexDirection: 'column',
      flex: 1,
      position: 'relative' /* need this for z-index to work to cover map */,
      zIndex: 1,
    },
    footer: {
      flex: 0,
      paddingBottom: 16,
      paddingLeft: 24,
      paddingRight: 24,
    },
    blocking_container: {
      width: '100%',
      position: 'absolute',
    },
    blocking_icon: {
      width: 10,
      height: 10,
      flex: 0,
      display: 'flex',
      borderRadius: 5,
      marginTop: 4,
      marginRight: 8,
      backgroundColor: palette.red,
    },
    status: {
      paddingTop: 0,
      paddingLeft: 24,
      paddingRight: 24,
      paddingBottom: 0,
      marginTop: 186,
      flex: 1,
    },
    status_icon: {
      position: 'absolute',
      alignSelf: 'center',
      width: 60,
      height: 60,
      marginTop: 94,
    },
    switch_location_button: {
      marginBottom: 16,
    },
  }),
  ...createTextStyles({
    blocking_message: {
      display: 'flex',
      flexDirection: 'row',
      fontFamily: 'Open Sans',
      fontSize: 12,
      fontWeight: '800',
      lineHeight: 17,
      paddingTop: 8,
      paddingLeft: 20,
      paddingRight: 20,
      paddingBottom: 8,
      color: palette.white60,
      backgroundColor: palette.blue,
    },
    server_label: {
      fontFamily: 'DINPro',
      fontSize: 32,
      fontWeight: '900',
      lineHeight: 44,
      letterSpacing: -0.7,
      color: palette.white,
      marginBottom: 7,
      flex: 0,
    },
    error_title: {
      fontFamily: 'DINPro',
      fontSize: 32,
      fontWeight: '900',
      lineHeight: 40,
      color: palette.white,
      marginBottom: 8,
    },
    error_message: {
      fontFamily: 'Open Sans',
      fontSize: 13,
      fontWeight: '600',
      color: palette.white,
      marginBottom: 24,
    },
    status_security: {
      fontFamily: 'Open Sans',
      fontSize: 16,
      fontWeight: '800',
      lineHeight: 22,
      marginBottom: 4,
      color: palette.white,
    },
    status_security__secure: {
      color: palette.green,
    },
    status_security__unsecured: {
      color: palette.red,
    },
    status_ipaddress: {
      fontFamily: 'Open Sans',
      fontSize: 16,
      fontWeight: '800',
      color: palette.white,
    },
    status_ipaddress__invisible: {
      opacity: 0,
    },
    status_location: {
      fontFamily: 'DINPro',
      fontSize: 38,
      fontWeight: '900',
      lineHeight: 40,
      overflow: 'hidden',
      letterSpacing: -0.9,
      color: palette.white,
      marginBottom: 4,
    },
  }),
};
