// @flow
import { Styles } from 'reactxp';
import { palette } from '@mullvad/components';

export default {
  headerbar: Styles.createViewStyle({
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    paddingRight: 12,
    backgroundColor: palette.blue,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  }),
  style_defaultDark: Styles.createViewStyle({
    backgroundColor: palette.darkBlue,
  }),
  style_error: Styles.createViewStyle({
    backgroundColor: palette.red,
  }),
  style_success: Styles.createViewStyle({
    backgroundColor: palette.green,
  }),
  container: Styles.createViewStyle({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  }),
  settings: Styles.createViewStyle({
    cursor: 'default',
    padding: 0,
  }),
  settings_icon: Styles.createViewStyle({
    color: palette.white60,
  }),
  settings_icon_hover: Styles.createViewStyle({
    color: palette.white,
  }),
  title: Styles.createTextStyle({
    fontFamily: 'DINPro',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
    letterSpacing: -0.5,
    color: palette.white60,
    marginLeft: 8,
  }),
};
