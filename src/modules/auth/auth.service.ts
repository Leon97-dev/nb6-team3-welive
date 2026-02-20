import authRepository from './auth.repository';
import { SignUpUserDto } from './auth.dto';

class AuthService {
  signUpUser(payload: SignUpUserDto) {
    return authRepository.signUpUser(payload);
  }
}

export default new AuthService();
