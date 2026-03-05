// ==============================================
// ⭐️ 민원 관련 DTO
// ==============================================
// 1) 민원 목록 조회 DTO 정의
export interface ListComplaintsQuery {
  page?: string;
  limit?: string;
  status?: string;
  isPublic?: string;
  dong?: string;
  ho?: string;
  keyword?: string;
}

// 2) 민원 생성 DTO 정의
export interface CreateComplaintDto {
  title: string;
  content: string;
  isPublic: boolean;
  boardId: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
}

// 3) 민원 업데이트 DTO 정의
export interface UpdateComplaintDto {
  title: string;
  content: string;
  isPublic: boolean;
}

// 4) 민원 상태 업데이트 DTO 정의
export interface UpdateComplaintStatusDto {
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED' | 'COMPLETED';
}
