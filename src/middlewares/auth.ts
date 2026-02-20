import type { Request, Response, NextFunction } from 'express';
import type { Role } from '@prisma/client';
import {
  ACCESS_TOKEN_COOKIE,
  verifyAccessToken,
} from '../modules/auth/auth.token';
import { ForbiddenError, UnauthorizedError } from './error-handler';

// ===============================================
// ⭐️ 인증 미들웨어 정의 (선택적 인증, 인증 필수, 역할 기반 접근 제어)
// ===============================================
// 1) 선택적 인증 미들웨어 (토큰이 있으면 인증 처리, 없으면 익명 사용자로 처리)
export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // 1-1) Authorization 헤더에서 Bearer 토큰 추출 시도
  const authHeader = req.header('authorization');

  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : undefined;

  const token = req.cookies?.[ACCESS_TOKEN_COOKIE] || bearerToken;

  // 1-2) 토큰이 존재하면 검증하여 사용자 정보 설정, 검증 실패 시 무시 (익명 사용자로 처리)
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = {
        id: payload.sub,
        role: payload.role,
        apartmentId: payload.apartmentId ?? null,
        building: payload.building ?? null,
      };
    } catch {}
  } else {
    // 1-3) 토큰이 없는 경우, x-user-id와 x-user-role 헤더에서 사용자 정보 추출 (테스트 및 디버깅 용도)
    const userId = req.header('x-user-id');
    const role = req.header('x-user-role') as Role | undefined;

    // 1-4) 사용자 정보가 존재하면 req.user에 설정, 없으면 req.user 삭제 (익명 사용자로 처리)
    req.user = {
      id: userId || '',
      role: role ?? 'USER',
    };

    if (!userId) {
      delete req.user;
    }
  }
  next();
};

// ===============================================
// ⭐️ 인증 필수 미들웨어 정의 (인증된 사용자만 접근 허용)
// ===============================================
// 1) 인증 필수 미들웨어 (인증된 사용자만 접근 허용, 인증 실패 시 401 Unauthorized 에러 반환)
export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // 1-1) 인증된 사용자 여부 확인, 인증되지 않은 경우 401 Unauthorized 에러 반환
  if (!req.user) {
    next(new UnauthorizedError('로그인이 필요합니다'));
    return;
  }
  next();
};

// 2) 역할 기반 접근 제어 미들웨어 (인증된 사용자 중 특정 역할만 접근 허용, 권한 부족 시 403 Forbidden 에러 반환)
export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    // 2-1) 인증된 사용자 여부 확인, 인증되지 않은 경우 401 Unauthorized 에러 반환
    if (!req.user) {
      next(new UnauthorizedError('로그인이 필요합니다'));
      return;
    }

    // 2-2) 사용자 역할이 허용된 역할 목록에 포함되어 있는지 확인, 포함되지 않은 경우 403 Forbidden 에러 반환
    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError('접근 권한이 없습니다'));
      return;
    }
    next();
  };
