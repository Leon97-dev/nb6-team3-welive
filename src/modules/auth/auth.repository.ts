import {
  ApprovalStatus as PrismaApprovalStatus,
  ApartmentStatus,
  BoardType,
  Role,
  type Prisma,
} from '@prisma/client';
import {
  LoginDto,
  LoginResponseDto,
  SignUpAdminDto,
  SignUpUserDto,
  UpdateAdminDto,
  UpdateApprovalStatusDto,
} from './auth.dto';
import prisma from '../../config/prisma';
import {
  AppError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
} from '../../middlewares/error-handler';
import bcrypt from 'bcrypt';

const DEFAULT_BOARD_NAMES: Record<BoardType, string> = {
  COMPLAINT: '민원 게시판',
  NOTICE: '공지사항 게시판',
  POLL: '주민 투표 게시판',
};

const toApprovalStatus = (
  status: UpdateApprovalStatusDto['status']
): PrismaApprovalStatus => {
  return status === 'APPROVED'
    ? PrismaApprovalStatus.APPROVED
    : PrismaApprovalStatus.REJECTED;
};

const ensureDefaultBoards = async (apartmentId: string): Promise<void> => {
  const existing = await prisma.board.findMany({
    where: {
      apartmentId,
      type: { in: [BoardType.COMPLAINT, BoardType.NOTICE, BoardType.POLL] },
    },
  });

  const existingTypes = new Set(existing.map((b) => b.type));
  const createData: Prisma.BoardCreateManyInput[] = [];

  for (const type of [BoardType.COMPLAINT, BoardType.NOTICE, BoardType.POLL]) {
    if (!existingTypes.has(type)) {
      createData.push({
        apartmentId,
        type,
        name: DEFAULT_BOARD_NAMES[type],
        isActive: true,
      });
    }
  }

  if (createData.length > 0) {
    await prisma.board.createMany({ data: createData });
  }
};

const toBoardIdMap = (boards: Array<{ id: string; type: BoardType }>) => {
  const result = {
    COMPLAINT: '',
    NOTICE: '',
    POLL: '',
  };

  for (const board of boards) {
    if (board.type === BoardType.COMPLAINT) result.COMPLAINT = board.id;
    if (board.type === BoardType.NOTICE) result.NOTICE = board.id;
    if (board.type === BoardType.POLL) result.POLL = board.id;
  }

  return result;
};

const toLoginResponse = (user: {
  id: string;
  name: string;
  email: string;
  role: Role;
  username: string;
  contact: string;
  profileImageUrl: string | null;
  building: string | null;
  approvalStatus: PrismaApprovalStatus;
  apartmentId: string | null;
  apartment?: { boards: Array<{ id: string; type: BoardType }> } | null;
}): LoginResponseDto => {
  const boards = user.apartment?.boards || [];
  const residentDong = user.building ?? null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    username: user.username,
    contact: user.contact,
    avatar: user.profileImageUrl ?? '',
    ...(residentDong ? { residentDong } : {}),
    isActive: user.approvalStatus === PrismaApprovalStatus.APPROVED,
    joinStatus: user.approvalStatus,
    apartmentId: user.apartmentId ?? '',
    boardIds: toBoardIdMap(boards),
  };
};

class AuthRepository {
  async signUpUser(payload: SignUpUserDto) {
    const apartment = await prisma.apartment.findFirst({
      where: {
        name: payload.apartmentName,
        apartmentStatus: ApartmentStatus.APPROVED,
        deletedAt: null,
      },
      include: {
        boards: {
          where: {
            type: {
              in: [BoardType.COMPLAINT, BoardType.NOTICE, BoardType.POLL],
            },
          },
          select: {
            id: true,
            type: true,
          },
        },
      },
    });

    if (!apartment) {
      throw new NotFoundError('가입 가능한 아파트를 찾을 수 없습니다');
    }

    const duplicated = await prisma.user.findFirst({
      where: {
        OR: [{ email: payload.email }, { username: payload.username }],
        deletedAt: null,
      },
    });

    if (duplicated) {
      throw new ConflictError('이미 사용중인 아이디 또는 이메일입니다');
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    const created = await prisma.user.create({
      data: {
        username: payload.username,
        passwordHash,
        contact: payload.contact,
        name: payload.name,
        email: payload.email,
        role: Role.USER,
        apartmentId: apartment.id,
        building: payload.apartmentDong,
        unitNumber: payload.apartmentHo,
        isRegistered: true,
        approvalStatus: PrismaApprovalStatus.PENDING,
      },
      include: {
        apartment: {
          include: {
            boards: {
              select: { id: true, type: true },
            },
          },
        },
      },
    });

    const matchedRoster = await prisma.residentRoster.findFirst({
      where: {
        apartmentId: apartment.id,
        name: payload.name,
        contact: payload.contact,
        building: payload.apartmentDong,
        unitNumber: payload.apartmentHo,
        deletedAt: null,
      },
    });

    if (matchedRoster) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: created.id },
          data: {
            approvalStatus: PrismaApprovalStatus.APPROVED,
            approvedAt: new Date(),
            isHouseholder: matchedRoster.isHouseholder,
          },
        }),
        prisma.residentRoster.update({
          where: { id: matchedRoster.id },
          data: { userId: created.id },
        }),
      ]);

      created.approvalStatus = PrismaApprovalStatus.APPROVED;
      created.isHouseholder = matchedRoster.isHouseholder;
    }

    if (apartment.adminId) {
      await prisma.notification.create({
        data: {
          receiverId: apartment.adminId,
          type: 'RESIDENT_SIGNUP_REQUESTED',
          title: '입주민 가입 신청',
          message: `${payload.name} 님이 회원가입을 신청했습니다.`,
        },
      });
    }

    return toLoginResponse(created);
  }
}

export default new AuthRepository();
