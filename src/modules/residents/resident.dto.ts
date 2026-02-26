// ==============================================
// ⭐️ 입주민 관련 DTO
// ==============================================
// 1) 입주민 목록 조회 쿼리
export interface ListResidentsQuery {
  page?: string;
  limit?: string;
  isRegistered?: string;
  isHouseholder?: 'HOUSEHOLDER' | 'MEMBER';
  residenceStatus?: 'RESIDENCE' | 'NO_RESIDENCE';
  building?: string;
  unitNumber?: string;
  keyword?: string;
}

// 2) 입주민 생성 DTO
export interface CreateResidentDto {
  building: string;
  unitNumber: string;
  contact: string;
  name: string;
  isHouseholder: 'HOUSEHOLDER' | 'MEMBER' | string;
}

// 3) 입주민 정보 수정 DTO
export interface UpdateResidentDto {
  building: string;
  unitNumber: string;
  contact: string;
  name: string;
  isHouseholder: 'HOUSEHOLDER' | 'MEMBER';
}
