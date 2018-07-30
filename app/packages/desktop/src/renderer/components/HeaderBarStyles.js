// @flow
import { createTextStyles, createViewStyles } from '../lib/styles';
import { palette } from '@mullvad/components';

export default {
  ...createViewStyles({
    headerbar: {
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 12,
      paddingRight: 12,
      backgroundColor: palette.blue,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    style_defaultDark: {
      backgroundColor: palette.darkBlue,
    },
    style_error: {
      backgroundColor: palette.red,
    },
    style_success: {
      backgroundColor: palette.green,
    },
    container: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
    },
    settings: {
      cursor: 'default',
      padding: 0,
    },
    settings_icon: {
      color: palette.white60,
    },
    settings_icon_hover: {
      color: palette.white,
    },
  }),
  ...createTextStyles({
    title: {
      fontFamily: 'DINPro',
      fontSize: 24,
      fontWeight: '900',
      lineHeight: 30,
      letterSpacing: -0.5,
      color: palette.white60,
      marginLeft: 8,
    },
  }),
};
