// ==============================================
// ⭐️ 이벤트 관련 DTO
// ==============================================
// 1) 이벤트 목록 조회 DTO 정의
export interface GetEventsQuery {
  year?: string;
  month?: string;
  apartmentId?: string;
}

// 2) 이벤트 생성/업데이트 DTO 정의
export interface UpsertEventQuery {
  boardType?: 'NOTICE' | 'POLL' | 'COMPLAINT' | string;
  boardId?: string;
  startDate?: string;
  endDate?: string;
}
