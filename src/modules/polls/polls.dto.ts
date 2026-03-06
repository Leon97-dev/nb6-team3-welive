// ==============================================
// ⭐️ 투표 관련 DTO
// ==============================================
// 1) 투표 상태 타입 정의
export type PollStatus = 'PENDING' | 'IN_PROGRESS' | 'CLOSED';

// 2) 투표 옵션 DTO
export interface PollOptionDto {
  title: string;
}

// 3) 투표 생성 DTO
export interface CreatePollDto {
  boardId: string;
  status?: PollStatus;
  title: string;
  content: string;
  buildingPermission: number;
  startDate: string;
  endDate: string;
  options: PollOptionDto[];
}

// 4) 투표 목록 조회 쿼리
export interface ListPollsQuery {
  page?: string;
  limit?: string;
  buildingPermission?: string;
  status?: PollStatus;
  keyword?: string;
}

// 5) 투표 수정 DTO
export interface UpdatePollDto {
  title: string;
  content: string;
  buildingPermission: number;
  startDate: string;
  endDate: string;
  status: PollStatus;
  options: PollOptionDto[];
}
