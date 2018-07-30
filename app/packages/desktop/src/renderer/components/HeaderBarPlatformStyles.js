// @flow
import { Styles } from 'reactxp';

export default {
  darwin: Styles.createViewStyle({
    paddingTop: 24,
  }),
  linux: Styles.createViewStyle({
    WebkitAppRegion: 'drag',
  }),
  settings_icon: Styles.createViewStyle({
    WebkitAppRegion: 'no-drag',
  }),
};
