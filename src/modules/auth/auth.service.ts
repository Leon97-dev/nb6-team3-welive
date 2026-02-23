import type { Request } from 'express';
import { Role } from '@prisma/client';
import { AppError, UnauthorizedError } from '../../middlewares/error-handler';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  accessCookieOptions,
  accessTokenMaxAgeMs,
  createAccessToken,
  createRefreshToken,
  hashToken,
  refreshCookieOptions,
  refreshTokenMaxAgeMs,
  verifyRefreshToken,
} from './auth.token';
import authRepository from './auth.repository';
import type {
  LoginDto,
  SignupAdminDto,
  SignupUserDto,
  SignupSuperAdminDto,
  UpdateAdminDto,
  UpdateApprovalStatusDto,
} from './auth.dto';

// ==============================================
// ⭐️ 인증 관련 서비스 정의
// ==============================================
// 1) 클라이언트 메타 정보 추출 함수 정의 (클라이언트의 User-Agent와 IP 주소를 추출하여 반환)
const addMs = (base: Date, ms: number) => new Date(base.getTime() + ms);

const extractClientMeta = (
  req: Request
): { userAgent?: string; ipAddress?: string } => {
  const meta: { userAgent?: string; ipAddress?: string } = {};
  const userAgent = req.get('user-agent');
  const ipAddress =
    (req.headers['x-forwarded-for'] as string | undefined)
      ?.split(',')[0]
      ?.trim() || req.ip;

  if (userAgent) {
    meta.userAgent = userAgent;
  }

  if (ipAddress) {
    meta.ipAddress = ipAddress;
  }

  return meta;
};

// 2) 역할 기반 접근 제어 함수 정의 (현재 인증된 사용자의 역할이 필요한 역할과 일치하는지 확인하여, 일치하지 않으면 예외 처리)
const ensureRole = (
  actor: Express.UserContext,
  role: Role,
  message: string
): void => {
  if (actor.role !== role) {
    throw new AppError(message, 403);
  }
};

// ==============================================
// ⭐️ 인증 관련 서비스 클래스 정의
// ==============================================
class AuthService {
  // 1) 일반 유저 가입 처리 함수 정의
  signupUser(payload: SignupUserDto) {
    return authRepository.signupUser(payload);
  }

  // 2) 관리자 가입 처리 함수 정의
  signupAdmin(payload: SignupAdminDto) {
    return authRepository.signupAdmin(payload);
  }

  // 3) 슈퍼 관리자 가입 처리 함수 정의
  signupSuperAdmin(payload: SignupSuperAdminDto) {
    return authRepository.signupSuperAdmin(payload);
  }

  // 4) 로그인 처리 함수 정의
  async login(payload: LoginDto, req: Request) {
    // 4-1) 입력한 아이디를 기반으로 사용자를 조회
    const { user, userId } = await authRepository.login(payload);

    // 4-2) 세션 생성 - 로그인 시마다 고유한 세션을 생성하여 관리 (세션 ID, 만료 시간, 클라이언트 메타 정보 포함)
    const session = await authRepository.createSession(
      userId,
      'pending-hash',
      addMs(new Date(), refreshTokenMaxAgeMs),
      extractClientMeta(req)
    );

    // 4-3) 로그인 성공 시, 새로운 리프레시 토큰 생성 및 세션에 저장, 액세스 토큰 생성 후 반환
    const refreshToken = createRefreshToken({
      sub: userId,
      sid: session.id,
      type: 'refresh',
    });

    // 4-4) 생성된 리프레시 토큰을 해시하여 세션에 저장 (보안 강화)
    await authRepository.updateSessionToken(
      session.id,
      hashToken(refreshToken),
      addMs(new Date(), refreshTokenMaxAgeMs)
    );

    // 4-5) 액세스 토큰 생성 (사용자 ID, 역할, 아파트 ID, 동 정보 포함)
    const accessToken = createAccessToken({
      sub: user.id,
      role: user.role,
      apartmentId: user.apartmentId || null,
      building: user.residentDong || null,
    });

    // 4-6) 최종적으로 사용자 정보, 액세스 토큰, 리프레시 토큰을 반환
    return { user, accessToken, refreshToken };
  }

  // 5) 로그아웃 처리 함수 정의
  async logout(req: Request) {
    // 5-1) 클라이언트에서 전달된 리프레시 토큰을 쿠키에서 추출 (로그아웃 시, 해당 토큰을 무효화하여 세션 종료 처리) - 리프레시 토큰이 없는 경우에도 현재 인증된 사용자가 있다면 해당 사용자의 모든 세션을 무효화하여 강제 로그아웃 처리
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as
      | string
      | undefined;

    // 5-2) 리프레시 토큰이 존재하는 경우, 해당 토큰을 검증하여 유효한 세션이 존재한다면 해당 세션을 무효화 처리 (로그아웃 처리) - 리프레시 토큰이 유효하지 않은 경우에도 현재 인증된 사용자가 있다면 해당 사용자의 모든 세션을 무효화하여 강제 로그아웃 처리
    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        await authRepository.logoutBySession(payload.sid);
        return;
      } catch {}
    }

    // 5-3) 리프레시 토큰이 없는 경우 또는 리프레시 토큰이 유효하지 않은 경우에도 현재 인증된 사용자가 있다면 해당 사용자의 모든 세션을 무효화하여 강제 로그아웃 처리
    if (req.user?.id) {
      await authRepository.logoutByUser(req.user.id);
    }
  }

  // 6) 토큰 갱신 처리 함수 정의
  async refresh(req: Request) {
    // 6-1) 클라이언트에서 전달된 리프레시 토큰을 쿠키에서 추출 (토큰 갱신 시, 클라이언트가 보유한 리프레시 토큰을 기반으로 새로운 액세스 토큰과 리프레시 토큰을 발급하여 반환) - 리프레시 토큰이 제공되지 않은 경우 예외 처리
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as
      | string
      | undefined;

    if (!refreshToken) {
      throw new UnauthorizedError('리프레시 토큰이 제공되지 않았습니다');
    }

    // 6-2) 제공된 리프레시 토큰을 검증하여 유효한 페이로드를 추출 (리프레시 토큰이 유효하지 않은 경우 예외 처리) - 리프레시 토큰이 유효하지 않은 경우 예외 처리
    const payload = verifyRefreshToken(refreshToken);

    // 6-3) 검증된 페이로드를 기반으로 세션 조회 - 세션이 존재하지 않거나, 세션이 만료되었거나, 세션에 저장된 리프레시 토큰 해시와 제공된 리프레시 토큰의 해시가 일치하지 않는 경우 예외 처리 - 사용자 정보가 존재하지 않거나, 사용자가 삭제된 경우 예외 처리
    const session = await authRepository.findValidSession(
      payload.sid,
      payload.sub
    );

    if (!session) {
      throw new UnauthorizedError('유효한 세션이 존재하지 않습니다');
    }

    // 6-4) 세션에 저장된 리프레시 토큰 해시와 입력된 리프레시 토큰의 해시가 일치하지 않는 경우 예외 처리 (리프레시 토큰이 유효하지 않은 경우 예외 처리)
    const tokenHash = hashToken(refreshToken);

    if (session.refreshTokenHash !== tokenHash) {
      throw new UnauthorizedError('리프레시 토큰이 유효하지 않습니다');
    }

    // 6-5) 세션이 유효한 경우, 해당 세션과 연결된 사용자 정보를 조회하여 반환 (사용자 정보가 존재하지 않거나, 사용자가 삭제된 경우 예외 처리) - 사용자 정보가 존재하지 않거나, 사용자가 삭제된 경우 예외 처리
    const user = await authRepository.findUserById(payload.sub);

    if (!user || user.deletedAt) {
      throw new UnauthorizedError('사용자를 찾을 수 없습니다');
    }

    // 6-6) 새로운 리프레시 토큰 생성 및 세션에 저장 (기존 세션을 기반으로 새로운 리프레시 토큰을 생성하여 세션에 저장) - 새로운 리프레시 토큰을 생성하여 세션에 저장
    const newRefreshToken = createRefreshToken({
      sub: user.id,
      sid: session.id,
      type: 'refresh',
    });

    // 6-7) 생성된 새로운 리프레시 토큰을 해시하여 세션에 저장 (보안 강화) - 생성된 새로운 리프레시 토큰을 해시하여 세션에 저장
    await authRepository.updateSessionToken(
      session.id,
      hashToken(newRefreshToken),
      addMs(new Date(), refreshTokenMaxAgeMs)
    );

    // 6-8) 새로운 액세스 토큰 생성 (사용자 ID, 역할, 아파트 ID, 동 정보 포함) - 새로운 액세스 토큰 생성
    const accessToken = createAccessToken({
      sub: user.id,
      role: user.role,
      apartmentId: user.apartmentId || null,
      building: user.building || null,
    });

    // 6-9) 최종적으로 사용자 정보, 새로운 액세스 토큰, 새로운 리프레시 토큰을 반환 - 최종적으로 사용자 정보, 새로운 액세스 토큰, 새로운 리프레시 토큰을 반환
    return { accessToken, refreshToken: newRefreshToken };
  }

  // 7) 관리자 정보 업데이트 처리 함수 정의
  updateAdmin(
    actor: Express.UserContext,
    adminId: string,
    payload: UpdateAdminDto
  ) {
    // 7-1) 현재 인증된 사용자의 역할이 슈퍼 관리자(SUPER_ADMIN)인지 확인하여, 슈퍼 관리자만 관리자 정보 업데이트를 수행할 수 있도록 역할 기반 접근 제어 적용 - 현재 인증된 사용자의 역할이 슈퍼 관리자(SUPER_ADMIN)인지 확인하여, 슈퍼 관리자만 관리자 정보 업데이트를 수행할 수 있도록 역할 기반 접근 제어 적용
    ensureRole(
      actor,
      Role.SUPER_ADMIN,
      '관리자 정보 업데이트는 슈퍼 관리자만 수행할 수 있습니다'
    );

    // 7-2) 관리자 정보 업데이트 처리 - 관리자 ID와 업데이트할 정보를 기반으로 관리자 정보를 업데이트하여 반환 (관리자 정보 업데이트는 슈퍼 관리자만 수행할 수 있도록 역할 기반 접근 제어 적용) - 관리자 정보 업데이트 처리
    return authRepository.updateAdmin(adminId, payload);
  }

  // 8) 가입 승인 상태 업데이트 처리 함수 정의
  updateAdminStatus(
    actor: Express.UserContext,
    adminId: string,
    payload: UpdateApprovalStatusDto
  ) {
    // 8-1) 현재 인증된 사용자의 역할이 슈퍼 관리자(SUPER_ADMIN)인지 확인하여, 슈퍼 관리자만 가입 승인 상태 업데이트를 수행할 수 있도록 역할 기반 접근 제어 적용 - 현재 인증된 사용자의 역할이 슈퍼 관리자(SUPER_ADMIN)인지 확인하여, 슈퍼 관리자만 가입 승인 상태 업데이트를 수행할 수 있도록 역할 기반 접근 제어 적용
    ensureRole(
      actor,
      Role.SUPER_ADMIN,
      '가입 승인 상태 업데이트는 슈퍼 관리자만 수행할 수 있습니다'
    );

    // 8-2) 가입 승인 상태 업데이트 처리 - 관리자 ID와 업데이트할 승인 상태를 기반으로 해당 관리자의 가입 승인 상태를 업데이트하여 반환 (가입 승인 상태 업데이트는 슈퍼 관리자만 수행할 수 있도록 역할 기반 접근 제어 적용) - 가입 승인 상태 업데이트 처리
    return authRepository.updateAdminStatus(actor, adminId, payload);
  }

  // 9) 가입 승인 상태 일괄 업데이트 처리 함수 정의
  updateAllAdminsStatus(
    actor: Express.UserContext,
    payload: UpdateApprovalStatusDto
  ) {
    // 9-1) 현재 인증된 사용자의 역할이 슈퍼 관리자(SUPER_ADMIN)인지 확인하여, 슈퍼 관리자만 가입 승인 상태 일괄 업데이트를 수행할 수 있도록 역할 기반 접근 제어 적용 - 현재 인증된 사용자의 역할이 슈퍼 관리자(SUPER_ADMIN)인지 확인하여, 슈퍼 관리자만 가입 승인 상태 일괄 업데이트를 수행할 수 있도록 역할 기반 접근 제어 적용
    ensureRole(
      actor,
      Role.SUPER_ADMIN,
      '가입 승인 상태 일괄 업데이트는 슈퍼 관리자만 수행할 수 있습니다'
    );

    // 9-2) 가입 승인 상태 일괄 업데이트 처리 - 업데이트할 승인 상태를 기반으로 모든 관리자의 가입 승인 상태를 일괄 업데이트하여 반환 (가입 승인 상태 일괄 업데이트는 슈퍼 관리자만 수행할 수 있도록 역할 기반 접근 제어 적용) - 가입 승인 상태 일괄 업데이트 처리
    return authRepository.updateAllAdminsStatus(actor, payload);
  }

  // 10) 관리자 삭제 처리 함수 정의 (관리자와 연결된 아파트도 함께 삭제 처리)
  deleteAdmin(actor: Express.UserContext, adminId: string) {
    // 10-1) 현재 인증된 사용자의 역할이 슈퍼 관리자(SUPER_ADMIN)인지 확인하여, 슈퍼 관리자만 관리자 삭제를 수행할 수 있도록 역할 기반 접근 제어 적용 - 현재 인증된 사용자의 역할이 슈퍼 관리자(SUPER_ADMIN)인지 확인하여, 슈퍼 관리자만 관리자 삭제를 수행할 수 있도록 역할 기반 접근 제어 적용
    ensureRole(
      actor,
      Role.SUPER_ADMIN,
      '관리자 삭제는 슈퍼 관리자만 수행할 수 있습니다'
    );

    // 10-2) 관리자 삭제 처리 - 관리자 ID를 기반으로 해당 관리자를 삭제 처리하여 반환 (관리자와 연결된 아파트도 함께 삭제 처리, 관리자 삭제는 슈퍼 관리자만 수행할 수 있도록 역할 기반 접근 제어 적용) - 관리자 삭제 처리
    return authRepository.deleteAdmin(adminId);
  }

  // 11) 가입이 거부된 계정 정리 처리 함수 정의
  cleanupRejectedAccounts(actor: Express.UserContext) {
    // 11-1) 현재 인증된 사용자의 역할이 관리자(ADMIN) 이상인지 확인하여, 관리자 이상만 가입이 거부된 계정 정리 작업을 수행할 수 있도록 역할 기반 접근 제어 적용 - 현재 인증된 사용자의 역할이 관리자(ADMIN) 이상인지 확인하여, 관리자 이상만 가입이 거부된 계정 정리 작업을 수행할 수 있도록 역할 기반 접근 제어 적용
    if (actor.role === Role.SUPER_ADMIN) {
      return authRepository.cleanupRejectedAdmins();
    }

    // 11-2) 현재 인증된 사용자의 역할이 관리자(ADMIN)인 경우, 해당 관리자가 관리하는 아파트에 가입이 거부된 입주민 계정들을 정리하는 작업 수행 (가입이 거부된 계정 정리 작업은 관리자 이상만 수행할 수 있도록 역할 기반 접근 제어 적용) - 현재 인증된 사용자의 역할이 관리자(ADMIN)인 경우, 해당 관리자가 관리하는 아파트에 가입이 거부된 입주민 계정들을 정리하는 작업 수행
    if (actor.role === Role.ADMIN) {
      if (!actor.apartmentId) {
        throw new AppError(
          '아파트 정보가 없는 관리자는 가입 거부된 계정 정리 작업을 수행할 수 없습니다',
          400
        );
      }

      return authRepository.cleanupRejectedResidents(actor.apartmentId);
    }

    // 11-3) 현재 인증된 사용자의 역할이 관리자(ADMIN) 미만인 경우, 가입이 거부된 계정 정리 작업을 수행할 수 없도록 예외 처리
    return new AppError(
      '가입 거부된 계정 정리 작업은 관리자 이상만 수행할 수 있습니다',
      403
    );
  }

  // 12) 입주민 승인 상태 업데이트 처리 함수 정의
  updateResidentStatus(
    actor: Express.UserContext,
    residentId: string,
    payload: UpdateApprovalStatusDto
  ) {
    // 12-1) 현재 인증된 사용자의 역할이 관리자(ADMIN)인지 확인하여, 관리자만 입주민 승인 상태 업데이트를 수행할 수 있도록 역할 기반 접근 제어 적용 - 현재 인증된 사용자의 역할이 관리자(ADMIN)인지 확인하여, 관리자만 입주민 승인 상태 업데이트를 수행할 수 있도록 역할 기반 접근 제어 적용
    ensureRole(
      actor,
      Role.ADMIN,
      '입주민 승인 상태 업데이트는 관리자만 수행할 수 있습니다'
    );

    // 12-2) 입주민 승인 상태 업데이트 처리 - 입주민 ID와 업데이트할 승인 상태를 기반으로 해당 입주민의 승인 상태를 업데이트하여 반환 (입주민 승인 상태 업데이트는 관리자만 수행할 수 있도록 역할 기반 접근 제어 적용) - 입주민 승인 상태 업데이트 처리
    return authRepository.updateResidentStatus(actor, residentId, payload);
  }

  // 13) 입주민 승인 상태 일괄 업데이트 처리 함수 정의
  updateAllResidentsStatus(
    actor: Express.UserContext,
    payload: UpdateApprovalStatusDto
  ) {
    // 13-1) 현재 인증된 사용자의 역할이 관리자(ADMIN)인지 확인하여, 관리자만 입주민 승인 상태 일괄 업데이트를 수행할 수 있도록 역할 기반 접근 제어 적용 - 현재 인증된 사용자의 역할이 관리자(ADMIN)인지 확인하여, 관리자만 입주민 승인 상태 일괄 업데이트를 수행할 수 있도록 역할 기반 접근 제어 적용
    ensureRole(
      actor,
      Role.ADMIN,
      '입주민 승인 상태 일괄 업데이트는 관리자만 수행할 수 있습니다'
    );

    // 13-2) 입주민 승인 상태 일괄 업데이트 처리 - 업데이트할 승인 상태를 기반으로 모든 입주민의 승인 상태를 일괄 업데이트하여 반환 (입주민 승인 상태 일괄 업데이트는 관리자만 수행할 수 있도록 역할 기반 접근 제어 적용) - 입주민 승인 상태 일괄 업데이트 처리
    return authRepository.updateAllResidentsStatus(actor, payload);
  }

  // 14) 쿠키 이름 및 옵션 반환 함수 정의
  getCookieNames() {
    return {
      access: ACCESS_TOKEN_COOKIE,
      refresh: REFRESH_TOKEN_COOKIE,
      accessMaxAge: accessTokenMaxAgeMs,
      refreshMaxAge: refreshTokenMaxAgeMs,
      accessCookieOptions,
      refreshCookieOptions,
    };
  }
}

export default new AuthService();
