// @flow
import { Styles } from 'reactxp';
import { palette } from '@mullvad/components';

export default {
  login_footer: Styles.createViewStyle({
    flex: 0,
    paddingTop: 16,
    paddingBottom: 24,
    paddingLeft: 24,
    paddingRight: 24,
    backgroundColor: palette.darkBlue,
  }),
  status_icon: Styles.createViewStyle({
    flex: 0,
    height: 48,
    marginBottom: 30,
    justifyContent: 'center',
  }),
  login_form: Styles.createViewStyle({
    flex: 1,
    flexDirection: 'column',
    overflow: 'visible',
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 24,
    paddingRight: 24,
    marginTop: 83,
    marginBottom: 0,
    marginRight: 0,
    marginLeft: 0,
  }),
  account_input_group: Styles.createViewStyle({
    borderWidth: 2,
    borderRadius: 8,
    borderColor: 'transparent',
  }),
  account_input_group__active: Styles.createViewStyle({
    borderColor: palette.darkBlue,
  }),
  account_input_group__inactive: Styles.createViewStyle({
    opacity: 0.6,
  }),
  account_input_group__error: Styles.createViewStyle({
    borderColor: palette.red40,
    color: palette.red,
  }),
  account_input_backdrop: Styles.createViewStyle({
    backgroundColor: palette.white,
    borderColor: palette.darkBlue,
    flexDirection: 'row',
  }),
  input_button: Styles.createViewStyle({
    flex: 0,
    borderWidth: 0,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  }),
  input_button__invisible: Styles.createViewStyle({
    backgroundColor: palette.white,
    opacity: 0,
  }),
  input_arrow: Styles.createViewStyle({
    flex: 0,
    borderWidth: 0,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    color: palette.blue20,
  }),
  input_arrow__active: Styles.createViewStyle({
    color: palette.white,
  }),
  input_arrow__invisible: Styles.createViewStyle({
    color: palette.white,
    opacity: 0,
  }),
  account_dropdown__spacer: Styles.createViewStyle({
    height: 1,
    backgroundColor: palette.darkBlue,
  }),
  account_dropdown__item: Styles.createViewStyle({
    paddingTop: 10,
    paddingRight: 12,
    paddingLeft: 12,
    paddingBottom: 12,
    marginBottom: 0,
    flexDirection: 'row',
    backgroundColor: palette.white60,
  }),
  account_dropdown__item_hover: Styles.createViewStyle({
    backgroundColor: palette.white40,
  }),
  account_dropdown__remove: Styles.createViewStyle({
    justifyContent: 'center',
    color: palette.blue40,
  }),
  account_dropdown__remove_cell_hover: Styles.createViewStyle({
    color: palette.blue60,
  }),
  account_dropdown__remove_hover: Styles.createViewStyle({
    color: palette.blue,
  }),
  account_dropdown__label_hover: Styles.createViewStyle({
    color: palette.blue,
  }),

  login_footer__prompt: Styles.createTextStyle({
    color: palette.white80,
    fontFamily: 'Open Sans',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    letterSpacing: -0.2,
    marginBottom: 8,
  }),
  title: Styles.createTextStyle({
    fontFamily: 'DINPro',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 44,
    letterSpacing: -0.7,
    color: palette.white,
    marginBottom: 7,
    flex: 0,
  }),
  subtitle: Styles.createTextStyle({
    fontFamily: 'Open Sans',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: palette.white80,
    marginBottom: 8,
  }),
  account_input_textfield: Styles.createTextStyle({
    borderWidth: 0,
    paddingTop: 10,
    paddingRight: 12,
    paddingLeft: 12,
    paddingBottom: 12,
    fontFamily: 'DINPro',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
    color: palette.blue,
    backgroundColor: 'transparent',
    flex: 1,
  }),
  account_input_textfield__inactive: Styles.createTextStyle({
    backgroundColor: palette.white60,
  }),
  account_dropdown__label: Styles.createTextStyle({
    flex: 1,
    fontFamily: 'DINPro',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
    color: palette.blue80,
    borderWidth: 0,
    textAlign: 'left',
    marginLeft: 0,
  }),
};
