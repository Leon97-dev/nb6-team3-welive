import { z } from 'zod';
import { ValidationError } from '../../middlewares/error-handler';
import type {
  LoginDto,
  SignupAdminDto,
  SignupSuperAdminDto,
  SignupUserDto,
  UpdateAdminDto,
  UpdateApprovalStatusDto,
} from './auth.dto';

// ==============================================
// ⭐️ 인증 관련 유효성 검사 정의
// ==============================================
// 1) 공통 유효성 검사 스키마 정의
const phoneRegex = /^01[0-9]{8,9}$/; // 한국 휴대폰 번호 형식 (01012345678 또는 0111234567)

// 2) 일반 유저 가입 유효성 검사 스키마 정의
const SignupUserSchema = z.object({
  username: z.string().trim().min(1, '아이디는 필수입니다'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
  contact: z
    .string()
    .trim()
    .regex(phoneRegex, '연락처 형식이 올바르지 않습니다'),
  name: z.string().trim().min(1, '이름은 필수입니다'),
  email: z.email('이메일 형식이 올바르지 않습니다'),
  apartmentName: z.string().trim().min(1, '아파트명은 필수입니다'),
  apartmentDong: z.string().trim().min(1, '동 번호는 필수입니다'),
  apartmentHo: z.string().trim().min(1, '호 번호는 필수입니다'),
  role: z.literal('USER'),
});

// 3) 관리자 가입 유효성 검사 스키마 정의
const SignupAdminSchema = z
  .object({
    username: z.string().trim().min(1, '아이디는 필수입니다'),
    password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
    passwordConfirm: z
      .string()
      .min(8, '비밀번호 확인은 최소 8자 이상이어야 합니다')
      .optional(),
    contact: z
      .string()
      .trim()
      .regex(phoneRegex, '연락처 형식이 올바르지 않습니다'),
    name: z.string().trim().min(1, '이름은 필수입니다'),
    email: z.email('이메일 형식이 올바르지 않습니다'),
    apartmentName: z.string().trim().min(1, '아파트명은 필수입니다'),
    apartmentAddress: z.string().trim().min(1, '아파트 주소는 필수입니다'),
    apartmentManagementNumber: z
      .string()
      .trim()
      .min(1, '아파트 관리소 번호는 필수입니다'),
    description: z.string().trim().min(1, '아파트 설명은 필수입니다'),
    startComplexNumber: z.string().trim().min(1, '단지 시작 번호는 필수입니다'),
    endComplexNumber: z.string().trim().min(1, '단지 끝 번호는 필수입니다'),
    startDongNumber: z.string().trim().min(1, '동 시작 번호는 필수입니다'),
    endDongNumber: z.string().trim().min(1, '동 끝 번호는 필수입니다'),
    startFloorNumber: z.string().trim().min(1, '층 시작 번호는 필수입니다'),
    endFloorNumber: z.string().trim().min(1, '층 끝 번호는 필수입니다'),
    startHoNumber: z.string().trim().min(1, '호 시작 번호는 필수입니다'),
    endHoNumber: z.string().trim().min(1, '호 끝 번호는 필수입니다'),
    role: z.literal('ADMIN'),
  })
  .refine(
    (value) =>
      !value.passwordConfirm || value.password === value.passwordConfirm,
    {
      message: '비밀번호와 비밀번호 확인이 일치하지 않습니다',
      path: ['passwordConfirm'],
    }
  );

// 4) 슈퍼 관리자 가입 유효성 검사 스키마 정의
const SignupSuperAdminSchema = z.object({
  username: z.string().trim().min(1, '아이디는 필수입니다'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
  contact: z
    .string()
    .trim()
    .regex(phoneRegex, '연락처 형식이 올바르지 않습니다'),
  name: z.string().trim().min(1, '이름은 필수입니다'),
  email: z.email('이메일 형식이 올바르지 않습니다'),
  role: z.literal('SUPER_ADMIN'),
  joinStatus: z.literal('APPROVED'),
});

// 5) 로그인 유효성 검사 스키마 정의
const LoginSchema = z.object({
  username: z.string().trim().min(1, '아이디는 필수입니다'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
});

// 6) 관리자 정보 업데이트 유효성 검사 스키마 정의
const UpdateAdminSchema = z.object({
  name: z.string().trim().min(1, '이름은 필수입니다'),
  contact: z
    .string()
    .trim()
    .regex(phoneRegex, '연락처 형식이 올바르지 않습니다'),
  email: z.email('이메일 형식이 올바르지 않습니다'),
  description: z.string().trim().min(1, '아파트 설명은 필수입니다'),
  apartmentName: z.string().trim().min(1, '아파트명은 필수입니다'),
  apartmentAddress: z.string().trim().min(1, '아파트 주소는 필수입니다'),
  apartmentManagementNumber: z
    .string()
    .trim()
    .min(1, '아파트 관리소 번호는 필수입니다'),
});

// 7) 가입 승인 상태 업데이트 유효성 검사 스키마 정의
const UpdateApprovalStatusSchema = z.object({
  status: z.union([z.literal('APPROVED'), z.literal('REJECTED')]),
});

// ==============================================
// ⭐️ 인증 관련 유효성 검사 함수 정의
// ==============================================
// 1) 공통 유효성 검사 함수 정의
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

// 2) 일반 유저 가입 유효성 검사 함수 정의
export const validateSignupUser = (input: unknown): SignupUserDto => {
  return parseOrThrow(SignupUserSchema, input);
};

// 3) 관리자 가입 유효성 검사 함수 정의
export const validateSignupAdmin = (input: unknown): SignupAdminDto => {
  return parseOrThrow(SignupAdminSchema, input);
};

// 4) 슈퍼 관리자 가입 유효성 검사 함수 정의
export const validateSignupSuperAdmin = (
  input: unknown
): SignupSuperAdminDto => {
  return parseOrThrow(SignupSuperAdminSchema, input);
};

// 5) 로그인 유효성 검사 함수 정의
export const validateLogin = (input: unknown): LoginDto => {
  return parseOrThrow(LoginSchema, input);
};

// 6) 관리자 정보 업데이트 유효성 검사 함수 정의
export const validateUpdateAdmin = (input: unknown): UpdateAdminDto => {
  return parseOrThrow(UpdateAdminSchema, input);
};

// 7) 가입 승인 상태 업데이트 유효성 검사 함수 정의
export const validateUpdateApprovalStatus = (
  input: unknown
): UpdateApprovalStatusDto => {
  return parseOrThrow(UpdateApprovalStatusSchema, input);
};
