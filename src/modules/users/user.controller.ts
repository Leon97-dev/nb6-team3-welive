import type { Request, Response } from 'express';
import userService from './user.service';
import type { ChangePasswordDto, UpdateMyProfileDto } from './user.dto';
import { AppError, UnauthorizedError } from '../../middlewares/error-handler';

// ==============================================
// ⭐️ 사용자 관련 컨트롤러 정의
// ==============================================
class UserController {
  // 1) 내 프로필 업데이트
  async updateMe(req: Request, res: Response) {
    // 1-1) 로그인 여부 확인
    if (!req.user?.id) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    // 1-2) 요청 데이터 검증 및 DTO 변환
    const payload: UpdateMyProfileDto = {};

    if (typeof req.body.currentPassword === 'string') {
      payload.currentPassword = req.body.currentPassword;
    }

    if (typeof req.body.newPassword === 'string') {
      payload.newPassword = req.body.newPassword;
    }

    if (req.file) {
      payload.file = req.file;
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await userService.updateMe(req.user.id, payload, baseUrl);

    // 1-3) 업데이트 결과 반환
    res.status(200).json(result);
  }

  // 2) 비밀번호 변경
  async changePassword(req: Request, res: Response) {
    // 2-1) 로그인 여부 확인
    if (!req.user?.id) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    // 2-2) 요청 데이터 검증
    const { currentPassword, newPassword } =
      req.body as Partial<ChangePasswordDto>;

    if (
      typeof currentPassword !== 'string' ||
      typeof newPassword !== 'string'
    ) {
      throw new AppError('현재 비밀번호와 새 비밀번호를 입력해주세요', 400);
    }

    const result = await userService.changePassword(req.user.id, {
      currentPassword,
      newPassword,
    });

    // 2-3) 비밀번호 변경 결과 반환
    res.status(200).json(result);
  }
}

export default new UserController();
