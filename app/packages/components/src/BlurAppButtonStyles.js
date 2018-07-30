import { Styles } from 'reactxp';
import palette from './palette';

export default {
  transparent: Styles.createViewStyle({
    backgroundColor: palette.white20,
    backdropFilter: 'blur(4px)',
  }),
  transparentHover: Styles.createViewStyle({
    backgroundColor: palette.white40,
    backdropFilter: 'blur(4px)',
  }),
  redTransparent: Styles.createViewStyle({
    backgroundColor: palette.red40,
    backdropFilter: 'blur(4px)',
  }),
  redTransparentHover: Styles.createViewStyle({
    backgroundColor: palette.red45,
    backdropFilter: 'blur(4px)',
  }),
};
