import type { Request, Response } from 'express';
import {
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from '../../middlewares/error-handler';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
} from './auth.token';
import authService from './auth.service';
import type {
  SignupSuperAdminDto,
  SignupAdminDto,
  SignupUserDto,
} from './auth.dto';
import {
  validateLogin,
  validateSignupAdmin,
  validateSignupSuperAdmin,
  validateSignupUser,
  validateUpdateAdmin,
  validateUpdateApprovalStatus,
} from './auth.validator';

// ==============================================
// ⭐️ 인증 관련 Utility
// ==============================================
// 1) 필수 요청 파라미터 추출 및 검증 함수 정의
const getRequiredParam = (value: unknown, name: string): string => {
  const parsed = String(value ?? '').trim();

  if (!parsed) {
    throw new ValidationError(`${name}은(는) 필수입니다`);
  }

  return parsed;
};

// 2) 역할 기반 접근 제어 함수 정의
const ensureGuest = (req: Request): void => {
  if (req.user) {
    throw new ForbiddenError('이미 인증된 사용자입니다');
  }
};

// ==============================================
// ⭐️ 인증 관련 Controller
// ==============================================
class AuthController {
  // 1) 일반 유저 가입 처리 함수 정의
  async signupUser(req: Request, res: Response) {
    ensureGuest(req);
    const payload = validateSignupUser(req.body) as SignupUserDto;
    const result = await authService.signupUser(payload);

    res.status(201).json(result);
  }

  // 2) 관리자 가입 처리 함수 정의
  async signupAdmin(req: Request, res: Response) {
    ensureGuest(req);
    const payload = validateSignupAdmin(req.body) as SignupAdminDto;
    const result = await authService.signupAdmin(payload);

    res.status(201).json(result);
  }

  // 3) 슈퍼 관리자 가입 처리 함수 정의
  async signupSuperAdmin(req: Request, res: Response) {
    const payload = validateSignupSuperAdmin(req.body) as SignupSuperAdminDto;
    const result = await authService.signupSuperAdmin(payload);

    res.status(201).json(result);
  }

  // 4) 로그인 처리 함수 정의
  async login(req: Request, res: Response) {
    const payload = validateLogin(req.body);
    const { user, accessToken, refreshToken } = await authService.login(
      payload,
      req
    );

    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, accessCookieOptions);
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, refreshCookieOptions);

    res.status(200).json(user);
  }

  // 5) 로그아웃 처리 함수 정의
  async logout(req: Request, res: Response) {
    await authService.logout(req);

    res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });

    res.status(204).send();
  }

  // 6) 토큰 재발급 처리 함수 정의
  async refresh(req: Request, res: Response) {
    const { accessToken, refreshToken } = await authService.refresh(req);

    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, accessCookieOptions);
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, refreshCookieOptions);

    res.status(200).json({ message: '작업이 성공적으로 완료되었습니다' });
  }

  // 7) 관리자 정보 업데이트 처리 함수 정의
  async updateAdmin(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const adminId = getRequiredParam(req.params.adminId, 'adminId');
    const payload = validateUpdateAdmin(req.body);
    await authService.updateAdmin(req.user, adminId, payload);

    res.status(200).json({ message: '작업이 성공적으로 완료되었습니다' });
  }

  // 8) 관리자 가입 승인 상태 업데이트 처리 함수 정의
  async updateAdminStatus(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const adminId = getRequiredParam(req.params.adminId, 'adminId');
    const payload = validateUpdateApprovalStatus(req.body);
    await authService.updateAdminStatus(req.user, adminId, payload);

    res.status(200).json({ message: '작업이 성공적으로 완료되었습니다' });
  }

  // 9) 모든 관리자 가입 승인 상태 일괄 업데이트 처리 함수 정의
  async updateAllAdminsStatus(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const payload = validateUpdateApprovalStatus(req.body);
    await authService.updateAllAdminsStatus(req.user, payload);

    res.status(200).json({ message: '작업이 성공적으로 완료되었습니다' });
  }

  // 10) 관리자 삭제 처리 함수 정의
  async deleteAdmin(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const adminId = getRequiredParam(req.params.adminId, 'adminId');
    await authService.deleteAdmin(req.user, adminId);

    res.status(200).json({ message: '작업이 성공적으로 완료되었습니다' });
  }

  // 11) 가입 승인 거절된 계정 정리 처리 함수 정의
  async cleanup(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    await authService.cleanupRejectedAccounts(req.user);

    res.status(200).json({ message: '작업이 성공적으로 완료되었습니다' });
  }

  // 12) 입주민 상태 업데이트 처리 함수 정의
  async updateResidentStatus(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const residentId = getRequiredParam(req.params.residentId, 'residentId');
    const payload = validateUpdateApprovalStatus(req.body);
    await authService.updateResidentStatus(req.user, residentId, payload);

    res.status(200).json({ message: '작업이 성공적으로 완료되었습니다' });
  }

  // 13) 모든 입주민 상태 일괄 업데이트 처리 함수 정의
  async updateAllResidentsStatus(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const payload = validateUpdateApprovalStatus(req.body);
    await authService.updateAllResidentsStatus(req.user, payload);

    res.status(200).json({ message: '작업이 성공적으로 완료되었습니다' });
  }
}

export default new AuthController();
