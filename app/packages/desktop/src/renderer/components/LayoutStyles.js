// @flow
import { createViewStyles } from '../lib/styles';
import { palette } from '@mullvad/components';

export default {
  ...createViewStyles({
    layout: {
      flexDirection: 'column',
      flex: 1,
    },
    header: {
      flex: 0,
    },
    container: {
      flex: 1,
      backgroundColor: palette.blue,
      overflow: 'hidden',
    },
  }),
};
