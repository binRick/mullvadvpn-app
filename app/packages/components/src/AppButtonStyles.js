// @flow
import { Styles } from 'reactxp';
import palette from './palette';

export default {
  red: Styles.createViewStyle({
    backgroundColor: palette.red,
  }),
  redHover: Styles.createViewStyle({
    backgroundColor: palette.red95,
  }),
  green: Styles.createViewStyle({
    backgroundColor: palette.green,
  }),
  greenHover: Styles.createViewStyle({
    backgroundColor: palette.green90,
  }),
  blue: Styles.createViewStyle({
    backgroundColor: palette.blue80,
  }),
  blueHover: Styles.createViewStyle({
    backgroundColor: palette.blue60,
  }),
  white80: Styles.createViewStyle({
    color: palette.white80,
  }),
  white: Styles.createViewStyle({
    color: palette.white,
  }),
  icon: Styles.createViewStyle({
    position: 'absolute',
    alignSelf: 'flex-end',
    right: 8,
    marginLeft: 8,
  }),
  iconTransparent: Styles.createViewStyle({
    position: 'absolute',
    alignSelf: 'flex-end',
    right: 42,
  }),
  common: Styles.createViewStyle({
    cursor: 'default',
    paddingTop: 9,
    paddingLeft: 9,
    paddingRight: 9,
    paddingBottom: 9,
    borderRadius: 4,
    flex: 1,
    flexDirection: 'column',
    alignContent: 'center',
    justifyContent: 'center',
  }),
  label: Styles.createTextStyle({
    alignSelf: 'center',
    fontFamily: 'DINPro',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
    flex: 1,
  }),
};
