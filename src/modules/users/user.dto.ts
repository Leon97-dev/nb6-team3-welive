// ==============================================
// ⭐️ 사용자 관련 DTO 정의
// ==============================================
// 1) 사용자 프로필 업데이트 DTO 정의
export interface UpdateMyProfileDto {
  currentPassword?: string;
  newPassword?: string;
  file?: Express.Multer.File;
}

// 2) 비밀번호 변경 DTO 정의
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
