import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ENV, env } from '../../config/env';
import type { Role } from '@prisma/client';

// ===============================================
// ⭐️ 토큰 관련 Utility
// ===============================================
// 1) 토큰 이름 상수 정의 (재사용 편의성)
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

// 2) 토큰 페이로드 타입 정의 (타입 안정성 확보)
export interface AccessTokenPayload {
  sub: string; // 사용자 ID
  role: Role; // 사용자 역할
  apartmentId: string | null; // 아파트 ID (선택적)
  building: string | null; // 동 (선택적)
}

export interface RefreshTokenPayload {
  sub: string; // 사용자 ID
  sid: string; // 세션 ID (고유 식별자)
  type: 'refresh'; // 토큰 유형 명시
}

// 3) 토큰 만료 시간 계산 함수 (유연한 설정 지원)
const parseDurationToMs = (value: string): number => {
  // 3-1) 숫자와 단위를 추출하는 정규 표현식 (예: '15m' -> 15, 'm')
  const match = value.match(/^(\d+)([smhd])$/i);

  // 3-2) 형식이 올바르지 않은 경우 기본값으로 15분 반환 (900,000ms)
  if (!match) {
    return 15 * 60 * 1000;
  }

  // 3-3) 숫자와 단위를 추출하여 밀리초로 변환
  const amount = Number(match[1] ?? 0); // ex) '15M'에서 15 추출
  const unit = (match[2] ?? '').toLowerCase(); // ex) 'M' -> 'm' 추출

  // 3-4) 단위에 따른 밀리초 계산
  if (unit === 's') return amount * 1000; // 1초 = 1,000ms
  if (unit === 'm') return amount * 60 * 1000; // 1분 = 60,000ms
  if (unit === 'h') return amount * 60 * 60 * 1000; // 1시간 = 3,600,000ms
  if (unit === 'd') return amount * 24 * 60 * 60 * 1000; // 1일 = 86,400,000ms

  // 3-5) 단위가 인식되지 않는 경우 기본값으로 15분 반환
  return 15 * 60 * 1000;
};

// 4) 토큰 만료 시간 상수 정의 (환경 변수 기반)
export const accessTokenMaxAgeMs = parseDurationToMs(ENV.ACCESS_EXPIRES_IN);
export const refreshTokenMaxAgeMs = parseDurationToMs(ENV.REFRESH_EXPIRES_IN);

// 5) 만료 시간 설정을 위한 유틸리티 함수 (환경 변수에서 문자열로 설정된 경우 처리)
const asExpiresIn = (
  value: string
): NonNullable<jwt.SignOptions['expiresIn']> => {
  return (value as NonNullable<jwt.SignOptions['expiresIn']>) || '15m';
};

// 6) JWT 라이브러리에서 사용할 만료 시간 상수 정의 (환경 변수 기반)
const accessExpiresIn = asExpiresIn(ENV.ACCESS_EXPIRES_IN);
const refreshExpiresIn = asExpiresIn(ENV.REFRESH_EXPIRES_IN);

// ==============================================
// ⭐️ 토큰 생성 및 검증 Functions
// ==============================================
// 1) 액세스 토큰 생성 함수 (페이로드와 시크릿을 사용하여 JWT 생성)
export const createAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, ENV.ACCESS_SECRET, {
    expiresIn: accessExpiresIn,
  });

// 2) 리프레시 토큰 생성 함수 (페이로드와 시크릿을 사용하여 JWT 생성)
export const createRefreshToken = (payload: RefreshTokenPayload): string =>
  jwt.sign(payload, ENV.REFRESH_SECRET, {
    expiresIn: refreshExpiresIn,
  });

// 3) 액세스 토큰 검증 함수 (토큰과 시크릿을 사용하여 JWT 검증)
export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, ENV.ACCESS_SECRET) as AccessTokenPayload;

// 4) 리프레시 토큰 검증 함수 (토큰과 시크릿을 사용하여 JWT 검증)
export const verifyRefreshToken = (token: string): RefreshTokenPayload =>
  jwt.verify(token, ENV.REFRESH_SECRET) as RefreshTokenPayload;

// 5) 토큰 해싱 함수 (토큰을 SHA-256으로 해싱하여 저장 시 보안 강화)
export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

// ==============================================
// ⭐️ 쿠키 옵션 정의 (보안 및 유연성 고려)
// ==============================================
// 1) 보안 설정 (프로덕션 환경에서는 secure 옵션 활성화)
const secure = env.cookieSecure;

// 2) 액세스 토큰 쿠키 옵션 정의 (HTTPOnly, Secure, SameSite 설정)
export const accessCookieOptions = {
  httpOnly: true,
  secure,
  sameSite: secure ? ('none' as const) : ('lax' as const),
  maxAge: accessTokenMaxAgeMs,
  path: '/',
};

// 3) 리프레시 토큰 쿠키 옵션 정의 (HTTPOnly, Secure, SameSite 설정)
export const refreshCookieOptions = {
  httpOnly: true,
  secure,
  sameSite: secure ? ('none' as const) : ('lax' as const),
  maxAge: refreshTokenMaxAgeMs,
  path: '/',
};
