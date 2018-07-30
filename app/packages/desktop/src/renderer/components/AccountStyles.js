// @flow
import { createViewStyles, createTextStyles } from '../lib/styles';
import { palette } from '@mullvad/components';

export default {
  ...createViewStyles({
    account: {
      backgroundColor: palette.darkBlue,
      flex: 1,
    },
    account__container: {
      flexDirection: 'column',
      flex: 1,
      paddingBottom: 48,
    },
    account__scrollview: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: '100%',
    },
    account__content: {
      flexDirection: 'column',
      flexGrow: 1,
      flexShrink: 0,
      flexBasis: 'auto',
    },
    account__main: {
      marginBottom: 24,
    },
    account__row: {
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 24,
      paddingRight: 24,
      marginBottom: 24,
    },
    account__footer: {
      paddingLeft: 24,
      paddingRight: 24,
    },
    account__buy_button: {
      marginBottom: 24,
    },
  }),
  ...createTextStyles({
    account__row_label: {
      fontFamily: 'Open Sans',
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 20,
      letterSpacing: -0.2,
      color: palette.white60,
      marginBottom: 9,
    },
    account__row_value: {
      fontFamily: 'Open Sans',
      fontSize: 16,
      fontWeight: '800',
      color: palette.white,
    },
    account__out_of_time: {
      fontFamily: 'Open Sans',
      fontSize: 16,
      fontWeight: '800',
      color: palette.red,
    },
    account__footer_label: {
      fontFamily: 'Open Sans',
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 20,
      letterSpacing: -0.2,
      color: palette.white80,
    },
  }),
};
