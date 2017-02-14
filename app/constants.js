import Enum from './lib/enum';

const LoginState = Enum('none', 'connecting', 'failed', 'ok');

module.exports = {
  createAccountURL: 'https://mullvad.net/account/create/',
  LoginState
};