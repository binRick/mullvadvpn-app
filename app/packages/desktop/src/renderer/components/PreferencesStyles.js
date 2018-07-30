// @flow
import { Styles } from 'reactxp';
import { palette } from '@mullvad/components';

export default {
  preferences: Styles.createViewStyle({
    backgroundColor: palette.darkBlue,
    flex: 1,
  }),
  preferences__container: Styles.createViewStyle({
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  }),
  preferences__content: Styles.createViewStyle({
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
  }),
  preferences__cell: Styles.createViewStyle({
    backgroundColor: palette.blue,
    flexDirection: 'row',
    alignItems: 'center',
  }),
  preferences__cell_accessory: Styles.createViewStyle({
    marginRight: 12,
  }),
  preferences__cell_footer: Styles.createViewStyle({
    paddingTop: 8,
    paddingRight: 24,
    paddingBottom: 24,
    paddingLeft: 24,
  }),
  preferences__cell_label_container: Styles.createViewStyle({
    paddingTop: 14,
    paddingRight: 12,
    paddingBottom: 14,
    paddingLeft: 24,
    flexGrow: 1,
  }),

  preferences__cell_label: Styles.createTextStyle({
    fontFamily: 'DINPro',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
    letterSpacing: -0.2,
    color: palette.white,
  }),
  preferences__cell_footer_label: Styles.createTextStyle({
    fontFamily: 'Open Sans',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: -0.2,
    color: palette.white80,
  }),
};
