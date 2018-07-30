// @flow
import { Styles } from 'reactxp';
import { palette } from '@mullvad/components';

export default {
  layout: Styles.createViewStyle({
    flexDirection: 'column',
    flex: 1,
  }),
  header: Styles.createViewStyle({
    flex: 0,
  }),
  container: Styles.createViewStyle({
    flex: 1,
    backgroundColor: palette.blue,
    overflow: 'hidden',
  }),
};
