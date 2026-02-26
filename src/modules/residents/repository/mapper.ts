import {
  ApprovalStatus,
  HouseholderType,
  ResidentOccupancyStatus,
} from '@prisma/client';

const mapResidency = (status: ResidentOccupancyStatus) => {
  return status === ResidentOccupancyStatus.RESIDENCE
    ? 'RESIDENCE'
    : 'NO_RESIDENCE';
};

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
