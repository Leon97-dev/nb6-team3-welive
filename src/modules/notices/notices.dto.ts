// ==============================================
// ⭐️ 공지사항 관련 DTO
// ==============================================
// 1) 공지사항 카테고리 타입 정의
export type NoticeCategory =
  | 'MAINTENANCE'
  | 'EMERGENCY'
  | 'COMMUNITY'
  | 'RESIDENT_VOTE'
  | 'RESIDENT_COUNCIL'
  | 'ETC';

// 2) 공지사항 목록 조회 쿼리
export interface ListNoticesQuery {
  page?: string;
  limit?: string;
  category?: NoticeCategory;
  search?: string;
  keyword?: string;
}

// 3) 공지사항 생성 (선택적 필드)
export interface CreateNoticeDto {
  userId?: string;
  boardId?: string;
  category: NoticeCategory;
  title: string;
  content: string;
  isPinned?: boolean;
  startDate?: string;
  endDate?: string;
}

// 4) 공지사항 수정 (선택적 필드)
export interface UpdateNoticeDto {
  userId?: string;
  boardId?: string;
  category?: NoticeCategory;
  title?: string;
  content?: string;
  isPinned?: boolean;
  startDate?: string;
  endDate?: string;
}
