// @flow
import { Styles } from 'reactxp';
import { palette } from '@mullvad/components';

export default {
  support: Styles.createViewStyle({
    backgroundColor: palette.darkBlue,
    flex: 1,
  }),
  support__container: Styles.createViewStyle({
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  }),
  support__content: Styles.createViewStyle({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  }),
  support__form: Styles.createViewStyle({
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
  }),
  support__form_row: Styles.createViewStyle({
    paddingLeft: 22,
    paddingRight: 22,
    marginBottom: 12,
  }),
  support__form_row_email: Styles.createViewStyle({
    paddingLeft: 22,
    paddingRight: 22,
    marginBottom: 12,
  }),
  support__form_row_message: Styles.createViewStyle({
    flex: 1,
    paddingLeft: 22,
    paddingRight: 22,
  }),
  support__form_message_scroll_wrap: Styles.createViewStyle({
    flex: 1,
    display: 'flex',
    borderRadius: 4,
    overflow: 'hidden',
  }),
  support__footer: Styles.createViewStyle({
    paddingTop: 16,
    paddingBottom: 16,
    paddingLeft: 24,
    paddingRight: 24,
    flexDirection: 'column',
    flex: 0,
  }),
  support__status_icon: Styles.createViewStyle({
    textAlign: 'center',
    marginBottom: 32,
  }),
  view_logs_button: Styles.createViewStyle({
    marginBottom: 16,
  }),

  support__form_email: Styles.createTextStyle({
    flex: 1,
    borderRadius: 4,
    overflow: 'hidden',
    paddingTop: 14,
    paddingLeft: 14,
    paddingRight: 14,
    paddingBottom: 14,
    fontFamily: 'Open Sans',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 26,
    color: palette.blue,
    backgroundColor: palette.white,
  }),
  support__form_message: Styles.createTextStyle({
    paddingTop: 14,
    paddingLeft: 14,
    paddingRight: 14,
    paddingBottom: 14,
    fontFamily: 'Open Sans',
    fontSize: 13,
    fontWeight: '600',
    color: palette.blue,
    backgroundColor: palette.white,
    flex: 1,
  }),
  support__sent_email: Styles.createTextStyle({
    fontWeight: '900',
    color: palette.white,
  }),
  support__status_security__secure: Styles.createTextStyle({
    fontFamily: 'Open Sans',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 4,
    color: palette.green,
  }),
  support__send_status: Styles.createTextStyle({
    fontFamily: 'DINPro',
    fontSize: 38,
    fontWeight: '900',
    maxHeight: 'calc(1.16em * 2)',
    overflow: 'visible',
    letterSpacing: -0.9,
    color: palette.white,
    marginBottom: 4,
  }),
  support__no_email_warning: Styles.createTextStyle({
    fontFamily: 'Open Sans',
    fontSize: 13,
    lineHeight: 16,
    color: palette.white80,
    marginBottom: 12,
  }),
};
