import {
  ApprovalStatus,
  HouseholderType,
  ResidentOccupancyStatus,
} from '@prisma/client';

// ==============================================
// ⭐️ 입주민 관련 Utility
// ==============================================
// 1) 입주민 거주 상태 매핑 정의
const mapResidency = (status: ResidentOccupancyStatus) => {
  return status === ResidentOccupancyStatus.RESIDENCE
    ? 'RESIDENCE'
    : 'NO_RESIDENCE';
};

// 2) 입주민 목록 아이템 타입 정의
export type ResidentListItem = {
  id: string;
  userId: string;
  building: string;
  unitNumber: string;
  name: string;
  contact: string;
  email: string;
  approvalStatus: ApprovalStatus;
  isHouseholder?: HouseholderType;
  isRegistered: boolean;
  residenceStatus: 'RESIDENCE' | 'NO_RESIDENCE';
};

// 3) 사용자 정보에서 입주민 목록 아이템으로 변환 함수
export const toResidentRowFromUser = (user: {
  id: string;
  name: string;
  contact: string;
  email: string;
  building: string | null;
  unitNumber: string | null;
  approvalStatus: ApprovalStatus;
  isRegistered: boolean;
  isHouseholder: HouseholderType | null;
}): ResidentListItem => ({
  id: user.id,
  userId: user.id,
  building: user.building ?? '',
  unitNumber: user.unitNumber ?? '',
  name: user.name,
  contact: user.contact,
  email: user.email,
  approvalStatus: user.approvalStatus,
  ...(user.isHouseholder ? { isHouseholder: user.isHouseholder } : {}),
  isRegistered: user.isRegistered,
  residenceStatus: 'RESIDENCE' as const,
});

// 4) 거주자 명부에서 입주민 목록 아이템으로 변환 함수
export const toResidentRowFromRoster = (roster: {
  id: string;
  name: string;
  contact: string;
  building: string;
  unitNumber: string;
  isHouseholder: HouseholderType;
  residenceStatus: ResidentOccupancyStatus;
  user: {
    id: string;
    email: string;
    approvalStatus: ApprovalStatus;
    deletedAt: Date | null;
  } | null;
}): ResidentListItem => {
  const activeUser = roster.user && !roster.user.deletedAt ? roster.user : null;
  const isRegistered = Boolean(activeUser);

  return {
    id: roster.id,
    userId: activeUser?.id || '',
    building: roster.building,
    unitNumber: roster.unitNumber,
    name: roster.name,
    contact: roster.contact,
    email: activeUser?.email || '',
    approvalStatus: activeUser?.approvalStatus ?? ApprovalStatus.PENDING,
    isHouseholder: roster.isHouseholder,
    isRegistered,
    residenceStatus: mapResidency(roster.residenceStatus),
  };
};
