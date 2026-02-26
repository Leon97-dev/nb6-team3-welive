import {
  ApprovalStatus,
  HouseholderType,
  Role,
  type Prisma,
} from '@prisma/client';
import { normalizeDigits } from './normalizer';

export const tryLinkUserWithRoster = async (
  tx: Prisma.TransactionClient,
  roster: {
    id: string;
    apartmentId: string;
    name: string;
    contact: string;
    building: string;
    unitNumber: string;
    isHouseholder: HouseholderType;
    userId: string | null;
  }
): Promise<boolean> => {
  const candidateUsers = await tx.user.findMany({
    where: {
      apartmentId: roster.apartmentId,
      role: Role.USER,
      deletedAt: null,
      name: roster.name,
      building: roster.building,
      unitNumber: roster.unitNumber,
    },
    select: {
      id: true,
      contact: true,
      approvalStatus: true,
    },
  });

  const matchedUser = candidateUsers.find(
    (user) => normalizeDigits(user.contact) === normalizeDigits(roster.contact)
  );

  if (!matchedUser) {
    return false;
  }

  await tx.user.update({
    where: { id: matchedUser.id },
    data: {
      isRegistered: true,
      approvalStatus: ApprovalStatus.APPROVED,
      approvedAt: new Date(),
      isHouseholder: roster.isHouseholder,
      building: roster.building,
      unitNumber: roster.unitNumber,
      contact: roster.contact,
      apartmentId: roster.apartmentId,
    },
  });

  if (roster.userId !== matchedUser.id) {
    await tx.residentRoster.update({
      where: { id: roster.id },
      data: { userId: matchedUser.id },
    });
  }

  return true;
};
