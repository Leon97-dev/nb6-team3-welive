import { z } from 'zod';
import { ValidationError } from '../../middlewares/error-handler';
import type {
  CreateResidentDto,
  ListResidentsQuery,
  UpdateResidentDto,
} from './resident.dto';

// ==============================================
// ⭐️ 입주민 관련 Schema
// ==============================================
// 1) 입주민 목록 조회 쿼리 검증
const householderSchema = z.union([
  z.literal('HOUSEHOLDER'),
  z.literal('MEMBER'),
]);

// 2) 입주민 생성 검증
const ListResidentsQuerySchema = z.object({
  page: z.string().trim().regex(/^\d+$/, 'page는 숫자여야 합니다').optional(),
  limit: z.string().trim().regex(/^\d+$/, 'limit은 숫자여야 합니다').optional(),
  isRegistered: z.union([z.literal('true'), z.literal('false')]).optional(),
  isHouseholder: householderSchema.optional(),
  residenceStatus: z
    .union([z.literal('RESIDENCE'), z.literal('NO_RESIDENCE')])
    .optional(),
  building: z.string().trim().min(1, '동 정보가 올바르지 않습니다').optional(),
  unitNumber: z
    .string()
    .trim()
    .min(1, '호 정보가 올바르지 않습니다')
    .optional(),
  keyword: z.string().trim().optional(),
});

// 3) 입주민 생성 검증
const CreateResidentSchema = z.object({
  building: z.string().trim().min(1, '동 정보가 올바르지 않습니다'),
  unitNumber: z.string().trim().min(1, '호 정보가 올바르지 않습니다'),
  contact: z.string().trim().min(1, '연락처 정보가 올바르지 않습니다'),
  name: z.string().trim().min(1, '이름을 입력해주세요'),
  isHouseholder: householderSchema,
});

// 4) 입주민 정보 수정 검증
const UpdateResidentSchema = z.object({
  building: z.string().trim().min(1, '동 정보가 올바르지 않습니다'),
  unitNumber: z.string().trim().min(1, '호 정보가 올바르지 않습니다'),
  contact: z.string().trim().min(1, '연락처 정보가 올바르지 않습니다'),
  name: z.string().trim().min(1, '이름을 입력해주세요'),
  isHouseholder: householderSchema,
});

// ==============================================
// ⭐️ 입주민 관련 Validation
// ==============================================
// 1) 공통 검증 함수
const parseOrThrow = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ValidationError(
      issue?.message || '요청 데이터가 유효하지 않습니다'
    );
  }
  return parsed.data;
};

// 2) 입주민 목록 조회 쿼리 검증 함수
export const validateListResidentsQuery = (
  input: unknown
): ListResidentsQuery => {
  const parsed = parseOrThrow(ListResidentsQuerySchema, input);
  const result: ListResidentsQuery = {};

  if (parsed.page !== undefined) result.page = parsed.page;
  if (parsed.limit !== undefined) result.limit = parsed.limit;
  if (parsed.isRegistered !== undefined)
    result.isRegistered = parsed.isRegistered;
  if (parsed.isHouseholder !== undefined)
    result.isHouseholder = parsed.isHouseholder;
  if (parsed.residenceStatus !== undefined)
    result.residenceStatus = parsed.residenceStatus;
  if (parsed.building !== undefined) result.building = parsed.building;
  if (parsed.unitNumber !== undefined) result.unitNumber = parsed.unitNumber;
  if (parsed.keyword !== undefined) result.keyword = parsed.keyword;

  return result;
};

// 3) 입주민 생성 검증 함수
export const validateCreateResident = (input: unknown): CreateResidentDto => {
  return parseOrThrow(CreateResidentSchema, input);
};

// 4) 입주민 정보 수정 검증 함수
export const validateUpdateResident = (input: unknown): UpdateResidentDto => {
  return parseOrThrow(UpdateResidentSchema, input);
};
