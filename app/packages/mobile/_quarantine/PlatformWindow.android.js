// @flow
import * as React from 'react';
import { Component } from 'reactxp';
import { KeyboardAvoidingView } from 'react-native';

export default class PlatformWindow extends Component {
  props: {
    children: Array<React.Node> | React.Node,
  };

  render() {
    return <KeyboardAvoidingView behavior={'position'}>{this.props.children}</KeyboardAvoidingView>;
  }
}
