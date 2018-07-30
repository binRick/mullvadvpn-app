// @flow
import { Styles } from 'reactxp';
import { palette } from '@mullvad/components';

export default {
  transparent: Styles.createViewStyle({
    backgroundColor: palette.white20,
  }),
  transparentHover: Styles.createViewStyle({
    backgroundColor: palette.white40,
  }),
  redTransparent: Styles.createViewStyle({
    backgroundColor: palette.red40,
  }),
  redTransparentHover: Styles.createViewStyle({
    backgroundColor: palette.red45,
  }),
};
