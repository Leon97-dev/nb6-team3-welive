import {
  ApprovalStatus as PrismaApprovalStatus,
  ApartmentStatus,
  BoardType,
  Role,
  type Prisma,
} from '@prisma/client';
import {
  AppError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
} from '../../middlewares/error-handler';
import bcrypt from 'bcrypt';
import prisma from '../../config/prisma';
import {
  LoginDto,
  LoginResponseDto,
  SignupResponseDto,
  SignupSuperAdminDto,
  SignupAdminDto,
  SignupUserDto,
  UpdateAdminDto,
  UpdateApprovalStatusDto,
} from './auth.dto';

// ==============================================
// ⭐️ 인증 관련 레포지토리 정의
// ==============================================
// 1) 가입 승인 상태 매핑 함수 정의
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

// 2) 기본 게시판 존재 보장 함수 정의
const ensureDefaultBoards = async (apartmentId: string): Promise<void> => {
  // 2-1) 해당 아파트에 COMPLAINT, NOTICE, POLL 게시판이 모두 존재하는지 확인
  const existing = await prisma.board.findMany({
    where: {
      apartmentId,
      type: { in: [BoardType.COMPLAINT, BoardType.NOTICE, BoardType.POLL] },
    },
  });

  // 2-2) 기존 게시판 유형을 Set으로 만들어서 어떤 게시판이 존재하는지 빠르게 확인할 수 있도록 함
  const existingTypes = new Set(existing.map((b) => b.type));
  const createData: Prisma.BoardCreateManyInput[] = [];

  // 2-3) COMPLAINT, NOTICE, POLL 게시판 유형을 순회하면서, 존재하지 않는 유형이 있다면 createData 배열에 추가
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

  // 2-4) createData 배열에 추가된 게시판이 있다면, 한 번의 쿼리로 모두 생성
  if (createData.length > 0) {
    await prisma.board.createMany({ data: createData });
  }
};

// 3) 게시판 ID 매핑 함수 정의
const toBoardIdMap = (boards: Array<{ id: string; type: BoardType }>) => {
  // 3-1) 게시판 유형별 ID를 저장할 객체 초기화
  const result = {
    COMPLAINT: '',
    NOTICE: '',
    POLL: '',
  };

  // 3-2) 전달받은 게시판 배열을 순회하면서, 각 게시판의 유형에 맞게 ID를 result 객체에 저장
  for (const board of boards) {
    if (board.type === BoardType.COMPLAINT) result.COMPLAINT = board.id;
    if (board.type === BoardType.NOTICE) result.NOTICE = board.id;
    if (board.type === BoardType.POLL) result.POLL = board.id;
  }

  // 3-3) 최종적으로 게시판 유형별 ID가 담긴 객체를 반환
  return result;
};

// 4) 로그인 응답 변환 함수 정의
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
  apartment?: {
    name: string;
    boards: Array<{ id: string; type: BoardType }>;
  } | null;
}): LoginResponseDto => {
  // 4-1) 게시판 정보가 없는 경우를 대비하여 기본값으로 빈 배열을 사용
  const boards = user.apartment?.boards || [];
  const residentDong = user.building ?? null;

  // 4-2) 게시판 ID 매핑 함수를 사용하여 게시판 유형별 ID를 추출
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    username: user.username,
    contact: user.contact,
    avatar: user.profileImageUrl ?? '',
    ...(residentDong ? { residentDong } : {}),
    apartmentName: user.apartment?.name ?? '',
    isActive: user.approvalStatus === PrismaApprovalStatus.APPROVED,
    joinStatus: user.approvalStatus,
    apartmentId: user.apartmentId ?? '',
    boardIds: toBoardIdMap(boards),
  };
};

// 5) 가입 응답 변환 함수 정의
const toSignupResponse = (user: {
  id: string;
  name: string;
  email: string;
  role: Role;
  approvalStatus: PrismaApprovalStatus;
}): SignupResponseDto => {
  // 5-1) 가입 응답 DTO 구조에 맞게 필요한 필드만 추출하여 반환
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    joinStatus: user.approvalStatus,
    isActive: user.approvalStatus === PrismaApprovalStatus.APPROVED,
    role: user.role,
  };
};

// ==============================================
// ⭐️ 인증 관련 레포지토리 정의
// ==============================================
class AuthRepository {
  // 1) 일반 유저 가입 처리 함수 정의
  async signupUser(payload: SignupUserDto): Promise<SignupResponseDto> {
    // 1-1) 가입 요청한 아파트가 존재하는지, 그리고 가입 가능한 상태인지 확인
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
          select: { id: true, type: true },
        },
      },
    });

    // 1-2) 가입 요청한 아파트가 존재하지 않거나 가입 가능한 상태가 아니라면 예외 처리
    if (!apartment) {
      throw new NotFoundError('가입 가능한 아파트를 찾을 수 없습니다');
    }

    // 1-3) 해당 아파트에 기본 게시판이 모두 존재하는지 확인하고, 존재하지 않는 게시판이 있다면 생성
    const duplicated = await prisma.user.findFirst({
      where: {
        OR: [
          { username: payload.username },
          { email: payload.email },
          { contact: payload.contact },
        ],
        deletedAt: null,
      },
    });

    // 1-4) 이미 존재하는 아이디, 이메일, 연락처가 있다면 예외 처리
    if (duplicated) {
      throw new ConflictError('이미 사용중인 아이디, 이메일 또는 연락처입니다');
    }

    // 1-5) 비밀번호 해싱 처리
    const passwordHash = await bcrypt.hash(payload.password, 10);

    // 1-6) 사용자 생성 처리 (기본적으로 가입 승인 상태는 PENDING으로 설정)
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

    // 1-7) 가입한 사용자가 속한 아파트에 기본 게시판이 모두 존재하는지 확인하고, 존재하지 않는 게시판이 있다면 생성
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

    // 1-8) 가입한 사용자가 주민 명부에 존재하는 경우, 해당 사용자의 가입 승인 상태를 APPROVED로 업데이트하고, 주민 명부와 사용자 테이블을 연결
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

      // 1-9) 가입한 사용자가 주민 명부에 존재하는 경우, created 객체에도 가입 승인 상태와 isHouseholder 정보를 반영
      created.approvalStatus = PrismaApprovalStatus.APPROVED;
      created.isHouseholder = matchedRoster.isHouseholder;
    }

    // 1-10) 가입한 사용자가 속한 아파트에 기본 게시판이 모두 존재하는지 확인하고, 존재하지 않는 게시판이 있다면 생성
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

    // 1-11) 최종적으로 가입한 사용자 정보를 가입 응답 DTO 구조에 맞게 변환하여 반환
    return toSignupResponse(created);
  }

  // 2) 관리자 가입 처리 함수 정의
  async signupAdmin(payload: SignupAdminDto): Promise<SignupResponseDto> {
    // 2-1) 가입 요청한 아이디, 이메일, 연락처가 이미 존재하는지 확인
    const duplicated = await prisma.user.findFirst({
      where: {
        OR: [
          { username: payload.username },
          { email: payload.email },
          { contact: payload.contact },
        ],
        deletedAt: null,
      },
    });

    // 2-2) 이미 존재하는 아이디, 이메일, 연락처가 있다면 예외 처리
    if (duplicated) {
      throw new ConflictError('이미 사용중인 아이디, 이메일 또는 연락처입니다');
    }

    // 2-3) 비밀번호 해싱 처리
    const passwordHash = await bcrypt.hash(payload.password, 10);

    // 2-4) 트랜잭션을 사용하여 관리자 생성, 아파트 생성, 사용자와 아파트 연결, 기본 게시판 생성 작업을 원자적으로 처리
    const result = await prisma.$transaction(async (tx) => {
      // 2-4-1) 관리자 사용자 생성
      const admin = await tx.user.create({
        data: {
          username: payload.username,
          passwordHash,
          contact: payload.contact,
          name: payload.name,
          email: payload.email,
          role: Role.ADMIN,
          isRegistered: true,
          approvalStatus: PrismaApprovalStatus.PENDING,
        },
      });

      // 2-4-2) 아파트 생성 (관리자 ID를 외래키로 연결)
      const apartment = await tx.apartment.create({
        data: {
          name: payload.apartmentName,
          address: payload.apartmentAddress,
          officeNumber: payload.apartmentManagementNumber,
          description: payload.description,
          startComplexNumber: Number(payload.startComplexNumber),
          endComplexNumber: Number(payload.endComplexNumber),
          startDongNumber: Number(payload.startDongNumber),
          endDongNumber: Number(payload.endDongNumber),
          startFloorNumber: Number(payload.startFloorNumber),
          endFloorNumber: Number(payload.endFloorNumber),
          startHoNumber: Number(payload.startHoNumber),
          endHoNumber: Number(payload.endHoNumber),
          apartmentStatus: ApartmentStatus.PENDING,
          adminId: admin.id,
        },
      });

      // 2-4-3) 사용자와 아파트 연결
      await tx.user.update({
        where: { id: admin.id },
        data: { apartmentId: apartment.id },
      });

      // 2-4-4) 기본 게시판 생성
      await tx.board.createMany({
        data: [
          {
            apartmentId: apartment.id,
            type: BoardType.COMPLAINT,
            name: DEFAULT_BOARD_NAMES.COMPLAINT,
            isActive: true,
          },
          {
            apartmentId: apartment.id,
            type: BoardType.NOTICE,
            name: DEFAULT_BOARD_NAMES.NOTICE,
            isActive: true,
          },
          {
            apartmentId: apartment.id,
            type: BoardType.POLL,
            name: DEFAULT_BOARD_NAMES.POLL,
            isActive: true,
          },
        ],
      });

      return { admin, apartment };
    });

    // 2-5) 가입한 관리자가 속한 아파트에 기본 게시판이 모두 존재하는지 확인하고, 존재하지 않는 게시판이 있다면 생성
    const superAdmins = await prisma.user.findMany({
      where: {
        role: Role.SUPER_ADMIN,
        approvalStatus: PrismaApprovalStatus.APPROVED,
        deletedAt: null,
      },
      select: { id: true },
    });

    // 2-6) 가입한 관리자가 속한 아파트에 슈퍼 관리자에게 알림 생성
    if (superAdmins.length > 0) {
      await prisma.notification.createMany({
        data: superAdmins.map((user) => ({
          receiverId: user.id,
          type: 'ADMIN_SIGNUP_REQUESTED',
          title: '관리자 가입 신청',
          message: `${payload.name} 님이 관리자 회원가입을 신청했습니다.`,
        })),
      });
    }

    // 2-7) 최종적으로 가입한 관리자 정보를 가입 응답 DTO 구조에 맞게 변환하여 반환
    return toSignupResponse(result.admin);
  }

  // 3) 슈퍼 관리자 가입 처리 함수 정의
  async signupSuperAdmin(
    payload: SignupSuperAdminDto
  ): Promise<SignupResponseDto> {
    // 3-1) 가입 요청한 아이디, 이메일, 연락처가 이미 존재하는지 확인
    const duplicated = await prisma.user.findFirst({
      where: {
        OR: [
          { username: payload.username },
          { email: payload.email },
          { contact: payload.contact },
        ],
        deletedAt: null,
      },
    });

    // 3-2) 이미 존재하는 아이디, 이메일, 연락처가 있다면 예외 처리
    if (duplicated) {
      throw new ConflictError('이미 사용중인 아이디, 이메일 또는 연락처입니다');
    }

    // 3-3) 비밀번호 해싱 처리
    const passwordHash = await bcrypt.hash(payload.password, 10);

    // 3-4) 슈퍼 관리자 사용자 생성 (가입 승인 상태는 즉시 APPROVED로 설정)
    const created = await prisma.user.create({
      data: {
        username: payload.username,
        passwordHash,
        contact: payload.contact,
        name: payload.name,
        email: payload.email,
        role: Role.SUPER_ADMIN,
        isRegistered: true,
        approvalStatus: PrismaApprovalStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    // 3-5) 최종적으로 가입한 슈퍼 관리자 정보를 가입 응답 DTO 구조에 맞게 변환하여 반환
    return toSignupResponse(created);
  }

  // 4) 로그인 처리 함수 정의
  async login(
    payload: LoginDto
  ): Promise<{ user: LoginResponseDto; userId: string }> {
    // 4-1) 아이디로 사용자 조회 (삭제되지 않은 사용자 중에서)
    const user = await prisma.user.findFirst({
      where: {
        username: payload.username,
        deletedAt: null,
      },
      include: {
        apartment: {
          select: {
            name: true,
            boards: {
              where: {
                type: {
                  in: [BoardType.COMPLAINT, BoardType.NOTICE, BoardType.POLL],
                },
                isActive: true,
              },
              select: { id: true, type: true },
            },
          },
        },
      },
    });

    // 4-2) 사용자가 존재하지 않거나, 비밀번호가 일치하지 않으면 예외 처리
    if (!user) {
      throw new UnauthorizedError('아이디 또는 비밀번호가 올바르지 않습니다');
    }

    // 4-3) 입력한 비밀번호와 데이터베이스에 저장된 해시된 비밀번호를 비교
    const isMatched = await bcrypt.compare(payload.password, user.passwordHash);

    // 4-4) 비밀번호가 일치하지 않으면 예외 처리
    if (!isMatched) {
      throw new UnauthorizedError('아이디 또는 비밀번호가 올바르지 않습니다');
    }

    // 4-5) 가입 승인 상태가 APPROVED가 아닌 경우 예외 처리
    if (user.approvalStatus !== PrismaApprovalStatus.APPROVED) {
      throw new AppError(
        '가입 승인 대기 중이거나 가입이 거부된 사용자입니다',
        403
      );
    }

    // 4-6) 로그인한 사용자가 속한 아파트에 기본 게시판이 모두 존재하는지 확인하고, 존재하지 않는 게시판이 있다면 생성
    let boards = user.apartment?.boards || [];

    if (user.apartmentId) {
      await ensureDefaultBoards(user.apartmentId);
      boards = await prisma.board.findMany({
        where: {
          apartmentId: user.apartmentId,
          isActive: true,
          type: { in: [BoardType.COMPLAINT, BoardType.NOTICE, BoardType.POLL] },
        },
        select: { id: true, type: true },
      });
    }

    // 4-7) 최종적으로 로그인한 사용자 정보를 로그인 응답 DTO 구조에 맞게 변환하여 반환
    return {
      user: toLoginResponse({
        ...user,
        apartment: user.apartment
          ? { name: user.apartment.name, boards }
          : null,
      }),
      userId: user.id,
    };
  }

  // 5) 로그아웃 처리 함수 정의
  async logoutBySession(sessionId: string): Promise<void> {
    // 5-1) 세션 ID에 해당하는 인증 세션이 존재하는지 확인
    await prisma.authSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // 6) 사용자 ID로 로그아웃 처리 함수 정의 (해당 사용자의 모든 세션을 무효화)
  async logoutByUser(userId: string): Promise<void> {
    // 6-1) 사용자 ID에 해당하는 모든 인증 세션을 무효화 (revokedAt 필드 업데이트)
    await prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // 7) 인증 세션 생성 처리 함수 정의
  async createSession(
    userId: string,
    refreshTokenHash: string,
    expiresAt: Date,
    meta?: {
      userAgent?: string;
      ipAddress?: string;
    }
  ) {
    // 7-1) 새로운 인증 세션 생성 (로그인 시 호출)
    return prisma.authSession.create({
      data: {
        userId,
        refreshTokenHash,
        expiresAt,
        userAgent: meta?.userAgent ?? null,
        ipAddress: meta?.ipAddress ?? null,
      },
    });
  }

  // 8) 인증 세션 갱신 처리 함수 정의 (새로운 리프레시 토큰으로 기존 세션 업데이트)
  async updateSessionToken(
    sessionId: string,
    refreshTokenHash: string,
    expiresAt: Date
  ) {
    // 8-1) 세션 ID에 해당하는 인증 세션이 존재하는지 확인하고, 리프레시 토큰과 만료 시간 업데이트
    return prisma.authSession.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash,
        expiresAt,
        revokedAt: null,
      },
    });
  }

  // 9) 인증 세션 유효성 검사 처리 함수 정의 (세션 ID와 사용자 ID로 유효한 세션 조회)
  async findValidSession(sessionId: string, userId: string) {
    // 9-1) 세션 ID와 사용자 ID에 해당하는 인증 세션이 존재하는지 확인하고, 만료되지 않고 취소되지 않은 세션 반환
    return prisma.authSession.findFirst({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  // 10) 사용자 ID로 사용자 정보 조회 처리 함수 정의
  async findUserById(userId: string) {
    // 10-1) 사용자 ID에 해당하는 사용자 정보 조회 (삭제되지 않은 사용자 중에서)
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        apartment: {
          include: {
            boards: {
              where: {
                type: {
                  in: [BoardType.COMPLAINT, BoardType.NOTICE, BoardType.POLL],
                },
                isActive: true,
              },
              select: { id: true, type: true },
            },
          },
        },
      },
    });
  }

  // 11) 관리자 정보 업데이트 처리 함수 정의
  async updateAdmin(
    adminId: string,
    payload: UpdateAdminDto
  ): Promise<{ adminId: string }> {
    // 11-1) 관리자 ID에 해당하는 관리자가 존재하는지 확인 (삭제되지 않은 사용자 중에서, 역할이 ADMIN인 사용자)
    const admin = await prisma.user.findFirst({
      where: {
        id: adminId,
        role: Role.ADMIN,
        deletedAt: null,
      },
      include: { adminApartment: true },
    });

    // 11-2) 관리자가 존재하지 않으면 예외 처리
    if (!admin) {
      throw new NotFoundError('관리자 사용자를 찾을 수 없습니다');
    }

    // 11-3) 트랜잭션을 사용하여 관리자 정보 업데이트와 아파트 정보 업데이트를 원자적으로 처리
    await prisma.$transaction([
      prisma.user.update({
        where: { id: adminId },
        data: {
          name: payload.name,
          contact: payload.contact,
          email: payload.email,
        },
      }),
      ...(admin.adminApartment
        ? [
            prisma.apartment.update({
              where: { id: admin.adminApartment.id },
              data: {
                name: payload.apartmentName,
                address: payload.apartmentAddress,
                officeNumber: payload.apartmentManagementNumber,
                description: payload.description,
              },
            }),
          ]
        : []),
    ]);

    // 11-4) 최종적으로 업데이트된 관리자 ID를 반환
    return { adminId };
  }

  // 12) 관리자 가입 승인 상태 업데이트 처리 함수 정의
  async updateAdminStatus(
    actor: Express.UserContext,
    adminId: string,
    payload: UpdateApprovalStatusDto
  ): Promise<{ adminId: string; status: UpdateApprovalStatusDto['status'] }> {
    // 12-1) 관리자 ID에 해당하는 관리자가 존재하는지 확인 (삭제되지 않은 사용자 중에서, 역할이 ADMIN인 사용자)
    const admin = await prisma.user.findFirst({
      where: {
        id: adminId,
        role: Role.ADMIN,
        deletedAt: null,
      },
      include: { adminApartment: true },
    });

    // 12-2) 관리자가 존재하지 않으면 예외 처리
    if (!admin) {
      throw new NotFoundError('관리자 사용자를 찾을 수 없습니다');
    }

    // 12-3) 트랜잭션을 사용하여 관리자 가입 승인 상태 업데이트, 아파트 승인 상태 업데이트, 슈퍼 관리자에게 알림 생성 작업을 원자적으로 처리
    const approvalStatus = toApprovalStatus(payload.status);
    const apartmentStatus =
      payload.status === 'APPROVED'
        ? ApartmentStatus.APPROVED
        : ApartmentStatus.REJECTED;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: admin.id },
        data: {
          approvalStatus,
          approvedById: actor.id,
          approvedAt: payload.status === 'APPROVED' ? new Date() : null,
        },
      }),
      ...(admin.adminApartment
        ? [
            prisma.apartment.update({
              where: { id: admin.adminApartment.id },
              data: { apartmentStatus },
            }),
          ]
        : []),
    ]);

    // 12-4) 가입 승인 상태가 업데이트된 관리자가 속한 아파트에 슈퍼 관리자가 존재하는 경우, 슈퍼 관리자에게 알림 생성
    await prisma.notification.create({
      data: {
        receiverId: admin.id,
        type:
          payload.status === 'APPROVED'
            ? 'ADMIN_SIGNUP_APPROVED'
            : 'ADMIN_SIGNUP_REJECTED',
        title: '관리자 가입 신청 결과',
        message:
          payload.status === 'APPROVED'
            ? '관리자 가입 신청이 승인되었습니다.'
            : '관리자 가입 신청이 거부되었습니다.',
      },
    });

    // 12-5) 최종적으로 업데이트된 관리자 ID와 가입 승인 상태를 반환
    return { adminId: admin.id, status: payload.status };
  }

  // 13) 모든 관리자 가입 승인 상태 일괄 업데이트 처리 함수 정의
  async updateAllAdminsStatus(
    actor: Express.UserContext,
    payload: UpdateApprovalStatusDto
  ): Promise<{
    updatedCount: number;
    status: UpdateApprovalStatusDto['status'];
  }> {
    // 13-1) 가입 승인 상태가 업데이트될 모든 관리자를 조회 (삭제되지 않은 사용자 중에서, 역할이 ADMIN인 사용자, 가입 승인 상태가 PENDING인 사용자)
    const targets = await prisma.user.findMany({
      where: {
        role: Role.ADMIN,
        approvalStatus: PrismaApprovalStatus.PENDING,
        deletedAt: null,
      },
      select: { id: true, adminApartment: { select: { id: true } } },
    });

    // 13-2) 가입 승인 상태가 업데이트될 관리자가 존재하지 않는 경우, 업데이트된 개수는 0으로 반환
    if (targets.length === 0) {
      return { updatedCount: 0, status: payload.status };
    }

    // 13-3) 트랜잭션을 사용하여 모든 관리자 가입 승인 상태 업데이트, 아파트 승인 상태 업데이트, 슈퍼 관리자에게 알림 생성 작업을 원자적으로 처리
    const userIds = targets.map((t) => t.id);
    const apartmentIds = targets
      .map((t) => t.adminApartment?.id)
      .filter((id): id is string => Boolean(id));

    const approvalStatus = toApprovalStatus(payload.status);
    const apartmentStatus =
      payload.status === 'APPROVED'
        ? ApartmentStatus.APPROVED
        : ApartmentStatus.REJECTED;

    await prisma.$transaction([
      prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: {
          approvalStatus,
          approvedById: actor.id,
          approvedAt: payload.status === 'APPROVED' ? new Date() : null,
        },
      }),
      prisma.apartment.updateMany({
        where: { id: { in: apartmentIds } },
        data: { apartmentStatus },
      }),
    ]);

    await prisma.notification.createMany({
      data: targets.map((t) => ({
        receiverId: t.id,
        type:
          payload.status === 'APPROVED'
            ? 'ADMIN_SIGNUP_APPROVED'
            : 'ADMIN_SIGNUP_REJECTED',
        title: '관리자 가입 신청 결과',
        message:
          payload.status === 'APPROVED'
            ? '관리자 가입 신청이 승인되었습니다.'
            : '관리자 가입 신청이 거부되었습니다.',
      })),
    });

    // 13-4) 최종적으로 업데이트된 관리자 수와 가입 승인 상태를 반환
    return { updatedCount: userIds.length, status: payload.status };
  }

  // 14) 관리자 삭제 처리 함수 정의 (관리자와 연결된 아파트도 함께 삭제 처리)
  async deleteAdmin(adminId: string): Promise<{ adminId: string }> {
    const admin = await prisma.user.findFirst({
      where: {
        id: adminId,
        role: Role.ADMIN,
        deletedAt: null,
      },
      include: { adminApartment: true },
    });

    // 14-2) 관리자가 존재하지 않으면 예외 처리
    if (!admin) {
      throw new NotFoundError('관리자 사용자를 찾을 수 없습니다');
    }

    // 14-3) 트랜잭션을 사용하여 관리자 삭제 처리, 아파트 삭제 처리, 아파트와 연결된 게시판 삭제 처리, 해당 관리자의 모든 인증 세션 무효화 작업을 원자적으로 처리
    await prisma.$transaction(async (tx) => {
      if (admin.adminApartment) {
        await tx.board.deleteMany({
          where: { apartmentId: admin.adminApartment.id },
        });

        await tx.apartment.update({
          where: { id: admin.adminApartment.id },
          data: { deletedAt: new Date() },
        });
      }

      await tx.authSession.updateMany({
        where: { userId: admin.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.user.update({
        where: { id: admin.id },
        data: { deletedAt: new Date() },
      });
    });

    // 14-4) 최종적으로 삭제 처리된 관리자 ID를 반환
    return { adminId: admin.id };
  }

  // 15) 가입이 거부된 모든 관리자 일괄 삭제 처리 함수 정의 (관리자와 연결된 아파트도 함께 삭제 처리)
  async cleanupRejectedAdmins(): Promise<{ cleaned: number }> {
    // 15-1) 가입이 거부된 모든 관리자를 조회 (삭제되지 않은 사용자 중에서, 역할이 ADMIN인 사용자, 가입 승인 상태가 REJECTED인 사용자)
    const rejectedAdmins = await prisma.user.findMany({
      where: {
        role: Role.ADMIN,
        approvalStatus: PrismaApprovalStatus.REJECTED,
        deletedAt: null,
      },
      select: {
        id: true,
        adminApartment: { select: { id: true } },
      },
    });

    // 15-2) 가입이 거부된 관리자가 존재하지 않는 경우, 삭제 처리된 개수는 0으로 반환
    if (rejectedAdmins.length === 0) {
      return { cleaned: 0 };
    }

    // 15-3) 트랜잭션을 사용하여 모든 가입이 거부된 관리자 삭제 처리, 아파트 삭제 처리, 아파트와 연결된 게시판 삭제 처리, 해당 관리자의 모든 인증 세션 무효화 작업을 원자적으로 처리
    const adminIds = rejectedAdmins.map((a) => a.id);
    const apartmentIds = rejectedAdmins
      .map((a) => a.adminApartment?.id)
      .filter((id): id is string => Boolean(id));

    await prisma.$transaction(async (tx) => {
      if (apartmentIds.length > 0) {
        await tx.board.deleteMany({
          where: { apartmentId: { in: apartmentIds } },
        });
        await tx.apartment.updateMany({
          where: { id: { in: apartmentIds } },
          data: { deletedAt: new Date() },
        });
      }

      await tx.authSession.updateMany({
        where: { userId: { in: adminIds }, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.user.updateMany({
        where: { id: { in: adminIds } },
        data: { deletedAt: new Date() },
      });
    });

    // 15-4) 최종적으로 삭제 처리된 관리자 수를 반환
    return { cleaned: adminIds.length };
  }

  // 16) 가입이 거부된 모든 입주민 일괄 삭제 처리 함수 정의 (해당 입주민의 모든 인증 세션 무효화)
  async cleanupRejectedResidents(
    apartmentId: string
  ): Promise<{ cleaned: number }> {
    // 16-1) 가입이 거부된 모든 입주민을 조회 (삭제되지 않은 사용자 중에서, 역할이 USER인 사용자, 가입 승인 상태가 REJECTED인 사용자, 해당 아파트에 속한 사용자)
    const rejectedUsers = await prisma.user.findMany({
      where: {
        role: Role.USER,
        apartmentId,
        approvalStatus: PrismaApprovalStatus.REJECTED,
        deletedAt: null,
      },
      select: { id: true },
    });

    // 16-2) 가입이 거부된 입주민이 존재하지 않는 경우, 삭제 처리된 개수는 0으로 반환
    if (rejectedUsers.length === 0) {
      return { cleaned: 0 };
    }

    // 16-3) 트랜잭션을 사용하여 모든 가입이 거부된 입주민 삭제 처리와 해당 입주민의 모든 인증 세션 무효화 작업을 원자적으로 처리
    const userIds = rejectedUsers.map((u) => u.id);

    await prisma.$transaction([
      prisma.authSession.updateMany({
        where: {
          userId: { in: userIds },
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      }),
      prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { deletedAt: new Date() },
      }),
    ]);

    // 16-4) 최종적으로 삭제 처리된 입주민 수를 반환
    return { cleaned: userIds.length };
  }

  // 17) 입주민 가입 승인 상태 업데이트 처리 함수 정의
  async updateResidentStatus(
    actor: Express.UserContext,
    residentId: string,
    payload: UpdateApprovalStatusDto
  ): Promise<{
    residentId: string;
    status: UpdateApprovalStatusDto['status'];
  }> {
    // 17-1) 입주민 ID에 해당하는 입주민이 존재하는지 확인 (삭제되지 않은 사용자 중에서, 역할이 USER인 사용자)
    const resident = await prisma.user.findFirst({
      where: {
        id: residentId,
        role: Role.USER,
        deletedAt: null,
      },
    });

    // 17-2) 입주민이 존재하지 않으면 예외 처리
    if (!resident) {
      throw new NotFoundError('입주민 사용자를 찾을 수 없습니다');
    }

    // 17-3) 입주민의 아파트 ID와 승인 상태를 변경하려는 관리자의 아파트 ID를 비교하여, 다른 아파트의 입주민인 경우 예외 처리
    if (
      actor.role === Role.ADMIN &&
      actor.apartmentId !== resident.apartmentId
    ) {
      throw new AppError(
        '다른 아파트의 입주민은 승인 상태를 변경할 수 없습니다',
        403
      );
    }

    // 17-4) 입주민 가입 승인 상태 업데이트 처리
    const status = toApprovalStatus(payload.status);

    // 17-5) 입주민 가입 승인 상태가 APPROVED로 변경되는 경우, approvedAt 필드에 현재 시간 저장, REJECTED로 변경되는 경우 approvedAt 필드 null 처리
    await prisma.user.update({
      where: { id: resident.id },
      data: {
        approvalStatus: status,
        approvedById: actor.id,
        approvedAt: payload.status === 'APPROVED' ? new Date() : null,
      },
    });

    await prisma.notification.create({
      data: {
        receiverId: resident.id,
        type:
          payload.status === 'APPROVED'
            ? 'RESIDENT_SIGNUP_APPROVED'
            : 'RESIDENT_SIGNUP_REJECTED',
        title: '입주민 가입 신청 결과',
        message:
          payload.status === 'APPROVED'
            ? '입주민 가입 신청이 승인되었습니다.'
            : '입주민 가입 신청이 거부되었습니다.',
      },
    });

    // 17-6) 최종적으로 업데이트된 입주민 ID와 가입 승인 상태를 반환
    return { residentId: resident.id, status: payload.status };
  }

  // 18) 모든 입주민 가입 승인 상태 일괄 업데이트 처리 함수 정의
  async updateAllResidentsStatus(
    actor: Express.UserContext,
    payload: UpdateApprovalStatusDto
  ): Promise<{
    updatedCount: number;
    status: UpdateApprovalStatusDto['status'];
  }> {
    // 18-1) 가입 승인 상태가 업데이트될 모든 입주민을 조회 (삭제되지 않은 사용자 중에서, 역할이 USER인 사용자, 가입 승인 상태가 PENDING인 사용자, 관리자가 속한 아파트에 속한 사용자)
    const where: Prisma.UserWhereInput = {
      role: Role.USER,
      approvalStatus: PrismaApprovalStatus.PENDING,
      deletedAt: null,
    };

    // 18-2) 관리자의 아파트 ID가 없는 경우 예외 처리
    if (!actor.apartmentId) {
      throw new AppError('관리자에게 아파트 정보가 없습니다', 400);
    }

    // 18-3) 관리자의 아파트 ID가 있는 경우, 해당 아파트에 속한 입주민만 조회
    where.apartmentId = actor.apartmentId;

    // 18-4) 가입 승인 상태가 업데이트될 모든 입주민 조회
    const residents = await prisma.user.findMany({
      where,
      select: { id: true },
    });

    // 18-5) 가입 승인 상태가 업데이트될 입주민이 존재하지 않는 경우, 업데이트된 개수는 0으로 반환
    if (residents.length === 0) {
      return { updatedCount: 0, status: payload.status };
    }

    // 18-6) 트랜잭션을 사용하여 모든 입주민 가입 승인 상태 업데이트 작업을 원자적으로 처리
    const residentIds = residents.map((r) => r.id);
    const status = toApprovalStatus(payload.status);

    await prisma.user.updateMany({
      where: { id: { in: residentIds } },
      data: {
        approvalStatus: status,
        approvedById: actor.id,
        approvedAt: payload.status === 'APPROVED' ? new Date() : null,
      },
    });

    await prisma.notification.createMany({
      data: residents.map((r) => ({
        receiverId: r.id,
        type:
          payload.status === 'APPROVED'
            ? 'RESIDENT_SIGNUP_APPROVED'
            : 'RESIDENT_SIGNUP_REJECTED',
        title: '입주민 가입 신청 결과',
        message:
          payload.status === 'APPROVED'
            ? '입주민 가입 신청이 승인되었습니다.'
            : '입주민 가입 신청이 거부되었습니다.',
      })),
    });

    // 18-7) 최종적으로 업데이트된 입주민 수와 가입 승인 상태를 반환
    return { updatedCount: residentIds.length, status: payload.status };
  }
}

export default new AuthRepository();
