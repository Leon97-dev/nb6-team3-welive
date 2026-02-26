import { HouseholderType } from '@prisma/client';
import { AppError } from '../../../middlewares/error-handler';

// ==============================================
// ⭐️ 입주민 관련 Utility
// ==============================================
// 1) 숫자만 추출하는 함수 (동, 호수, 연락처 등에서 숫자만 추출)
export const normalizeDigits = (value: string): string =>
  value.replace(/\D/g, '');

// 2) 동 정보 정규화 함수 (숫자만 추출, 필수)
export const normalizeBuilding = (value: string): string => {
  const normalized = normalizeDigits(value);
  if (!normalized) {
    throw new AppError('동 정보가 올바르지 않습니다', 400);
  }

  return normalized;
};

// 3) 호수 정보 정규화 함수 (숫자만 추출, 필수)
export const normalizeUnitNumber = (value: string): string => {
  const normalized = normalizeDigits(value);
  if (!normalized) {
    throw new AppError('호 정보가 올바르지 않습니다', 400);
  }

  return normalized;
};

// 4) 연락처 정보 정규화 함수 (숫자만 추출, 필수)
export const normalizeContact = (value: string): string => {
  const normalized = normalizeDigits(value);
  if (!normalized) {
    throw new AppError('연락처 정보가 올바르지 않습니다', 400);
  }

  return normalized;
};

// 5) 세대주 여부 정규화 함수 (세대주/세대원 구분, 필수)
export const normalizeHouseholder = (value: string): HouseholderType => {
  const normalized = value.trim().toUpperCase();
  if (normalized.includes('세대주') || normalized === 'HOUSEHOLDER') {
    return HouseholderType.HOUSEHOLDER;
  }

  return HouseholderType.MEMBER;
};
