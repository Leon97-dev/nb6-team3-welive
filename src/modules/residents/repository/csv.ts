import { HouseholderType } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { AppError } from '../../../middlewares/error-handler';
import {
  normalizeBuilding,
  normalizeContact,
  normalizeHouseholder,
  normalizeUnitNumber,
} from './normalizer';

// ==============================================
// ⭐️ 입주민 관련 Utility
// ==============================================
// 1) CSV 행 타입 정의 (입주민 정보)
export type CsvResidentRow = {
  building: string;
  unitNumber: string;
  name: string;
  contact: string;
  isHouseholder: HouseholderType;
};

// 2) CSV 헤더 별칭 정의 (다양한 헤더 이름 허용)
const headerAliases: Record<
  keyof Omit<CsvResidentRow, 'isHouseholder'> | 'isHouseholder',
  string[]
> = {
  building: ['building', 'dong', '동'],
  unitNumber: ['unitnumber', 'unit', 'ho', '호', '호수'],
  name: ['name', '이름'],
  contact: ['contact', 'phone', '연락처'],
  isHouseholder: [
    'ishouseholder',
    'householder',
    '거주',
    '세대구분',
    '세대주여부',
  ],
};

// 3) CSV 콘텐츠 파싱 함수 (입주민 정보 추출)
export const parseResidentsCsv = (content: string): CsvResidentRow[] => {
  const normalized = content.replace(/^\uFEFF/, '').trim();
  if (!normalized) {
    return [];
  }

  const records = parse(normalized, {
    bom: true,
    trim: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as string[][];

  if (records.length < 2) {
    return [];
  }

  const headers = (records[0] ?? []).map((header) =>
    String(header).toLowerCase().replace(/\s+/g, '')
  );

  const findHeaderIndex = (key: keyof typeof headerAliases): number => {
    const aliases = headerAliases[key];
    return headers.findIndex((header) => aliases.includes(header));
  };

  const buildingIndex = findHeaderIndex('building');
  const unitIndex = findHeaderIndex('unitNumber');
  const nameIndex = findHeaderIndex('name');
  const contactIndex = findHeaderIndex('contact');
  const householderIndex = findHeaderIndex('isHouseholder');

  if (buildingIndex < 0 || unitIndex < 0 || nameIndex < 0 || contactIndex < 0) {
    throw new AppError('CSV 헤더 형식이 올바르지 않습니다', 400);
  }

  const rows: CsvResidentRow[] = [];

  for (let i = 1; i < records.length; i += 1) {
    const values = records[i] ?? [];

    const buildingRaw = values[buildingIndex] ?? '';
    const unitRaw = values[unitIndex] ?? '';
    const nameRaw = values[nameIndex] ?? '';
    const contactRaw = values[contactIndex] ?? '';
    const householderRaw =
      householderIndex >= 0 ? (values[householderIndex] ?? '') : '';

    if (!buildingRaw || !unitRaw || !nameRaw || !contactRaw) {
      continue;
    }

    rows.push({
      building: normalizeBuilding(buildingRaw),
      unitNumber: normalizeUnitNumber(unitRaw),
      name: nameRaw.trim(),
      contact: normalizeContact(contactRaw),
      isHouseholder: normalizeHouseholder(householderRaw || 'MEMBER'),
    });
  }

  return rows;
};
