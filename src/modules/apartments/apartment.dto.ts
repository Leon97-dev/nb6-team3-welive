// ==============================================
// ⭐️ 아파트 관련 DTO
// ==============================================
// 1) 아파트 등록 DTO 정의 (아파트 등록에 필요한 필드 포함)
export interface ListApartmentsQuery {
  name?: string;
  address?: string;
  searchKeyword?: string;
  apartmentStatus?: 'APPROVED' | 'PENDING' | 'REJECTED';
  page?: string;
  limit?: string;
}
