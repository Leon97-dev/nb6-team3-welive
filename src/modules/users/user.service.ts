import type { ChangePasswordDto, UpdateMyProfileDto } from './user.dto';
import userRepository from './user.repository';

// ==============================================
// ⭐️ 사용자 관련 서비스 정의
// ==============================================
class UserService {
  // 1) 내 프로필 업데이트
  updateMe(userId: string, payload: UpdateMyProfileDto, baseUrl: string) {
    return userRepository.updateMe(userId, payload, baseUrl);
  }

  // 2) 비밀번호 변경
  changePassword(userId: string, payload: ChangePasswordDto) {
    return userRepository.changePassword(userId, payload);
  }
}

export default new UserService();
