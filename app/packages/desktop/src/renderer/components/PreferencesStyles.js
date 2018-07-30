// @flow
import { createViewStyles, createTextStyles } from '../lib/styles';
import { palette } from '@mullvad/components';

export default {
  ...createViewStyles({
    preferences: {
      backgroundColor: palette.darkBlue,
      flex: 1,
    },
    preferences__container: {
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
    },
    preferences__content: {
      flexDirection: 'column',
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 'auto',
    },
    preferences__cell: {
      backgroundColor: palette.blue,
      flexDirection: 'row',
      alignItems: 'center',
    },
    preferences__cell_accessory: {
      marginRight: 12,
    },
    preferences__cell_footer: {
      paddingTop: 8,
      paddingRight: 24,
      paddingBottom: 24,
      paddingLeft: 24,
    },
    preferences__cell_label_container: {
      paddingTop: 14,
      paddingRight: 12,
      paddingBottom: 14,
      paddingLeft: 24,
      flexGrow: 1,
    },
  }),
  ...createTextStyles({
    preferences__cell_label: {
      fontFamily: 'DINPro',
      fontSize: 20,
      fontWeight: '900',
      lineHeight: 26,
      letterSpacing: -0.2,
      color: palette.white,
    },
    preferences__cell_footer_label: {
      fontFamily: 'Open Sans',
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 20,
      letterSpacing: -0.2,
      color: palette.white80,
    },
  }),
};
