import { HouseholderType } from '@prisma/client';
import { AppError } from '../../../middlewares/error-handler';

export const normalizeDigits = (value: string): string => value.replace(/\D/g, '');

export const normalizeBuilding = (value: string): string => {
  const normalized = normalizeDigits(value);
  if (!normalized) {
    throw new AppError('동 정보가 올바르지 않습니다', 400);
  }

  return normalized;
};

export const normalizeUnitNumber = (value: string): string => {
  const normalized = normalizeDigits(value);
  if (!normalized) {
    throw new AppError('호 정보가 올바르지 않습니다', 400);
  }

  return normalized;
};

export const normalizeContact = (value: string): string => {
  const normalized = normalizeDigits(value);
  if (!normalized) {
    throw new AppError('연락처 정보가 올바르지 않습니다', 400);
  }

  return normalized;
};

export const normalizeHouseholder = (value: string): HouseholderType => {
  const normalized = value.trim().toUpperCase();
  if (normalized.includes('세대주') || normalized === 'HOUSEHOLDER') {
    return HouseholderType.HOUSEHOLDER;
  }

  return HouseholderType.MEMBER;
};
