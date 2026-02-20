import type { Role } from '@prisma/client';

// ==============================================
// ⭐️ 인증 관련 DTO (Data Transfer Object) 정의
// ==============================================
// 1) 가입 승인 상태 타입 정의 (가입 승인 상태를 나타내는 문자열 리터럴 타입)
export type ApprovalStatus = 'APPROVED' | 'REJECTED';
export type JoinStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEED_UPDATE';

// 2) 일반 유저 가입 DTO 정의 (일반 유저 가입에 필요한 필드 포함)
export interface SignUpUserDto {
  username: string;
  password: string;
  contact: string;
  name: string;
  email: string;
  role: 'USER';
  apartmentName: string;
  apartmentDong: string;
  apartmentHo: string;
}

// 3) 관리자 가입 DTO 정의 (관리자 가입에 필요한 필드 포함)
export interface SignUpAdminDto {
  username: string;
  password: string;
  passwordConfirm: string;
  contact: string;
  name: string;
  email: string;
  apartmentName: string;
  apartmentAddress: string;
  apartmentManagementNumber: string;
  description: string;
  startComplexNumber: string;
  endComplexNumber: string;
  startDongNumber: string;
  endDongNumber: string;
  startFloorNumber: string;
  endFloorNumber: string;
  startHoNumber: string;
  endHoNumber: string;
  role: 'ADMIN';
}

// 4) 로그인 DTO 정의 (로그인에 필요한 필드 포함)
export interface LoginDto {
  username: string;
  password: string;
}

// 5) 관리자 정보 업데이트 DTO 정의 (관리자 정보 업데이트에 필요한 필드 포함)
export interface UpdateAdminDto {
  contact: string;
  name: string;
  email: string;
  description: string;
  apartmentName: string;
  apartmentAddress: string;
  apartmentManagementNumber: string;
}

// 6) 가입 승인 상태 업데이트 DTO 정의 (가입 승인 상태 업데이트에 필요한 필드 포함)
export interface UpdateApprovalStatusDto {
  status: ApprovalStatus;
}

// 7) 로그인 응답 DTO 정의 (로그인 성공 시 반환되는 데이터 구조 정의)
export interface LoginResponseDto {
  id: string;
  name: string;
  email: string;
  role: Role;
  username: string;
  contact: string;
  avatar: string;
  residentDong?: string;
  isActive: boolean;
  joinStatus: JoinStatus;
  apartmentId: string;
  boardIds: {
    COMPLAINT: string;
    NOTICE: string;
    POLL: string;
  };
}
