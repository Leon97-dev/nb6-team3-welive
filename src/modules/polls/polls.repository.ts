import {
  BoardType,
  NoticeCategory,
  NoticeImportance,
  PollStatus,
  PollTargetType,
  Role,
  type Prisma,
} from '@prisma/client';
import prisma from '../../config/prisma';
import { AppError, NotFoundError } from '../../middlewares/error-handler';
import { resolvePagination } from '../../utils/pagination';
import { isAdminRole } from '../../utils/roles';
import type { CreatePollDto, ListPollsQuery, UpdatePollDto } from './polls.dto';
import de from 'zod/v4/locales/de.js';

// ==============================================
// ⭐️ 투표 관련 Utility
// ==============================================
// 1) 투표 상태 변환
const toPollStatus = (value: string): PollStatus => {
  if (value === PollStatus.PENDING) return PollStatus.PENDING;
  if (value === PollStatus.IN_PROGRESS) return PollStatus.IN_PROGRESS;
  if (value === PollStatus.CLOSED) return PollStatus.CLOSED;
  throw new AppError('유효하지 않은 투표 상태입니다', 400);
};

// 2) 투표 대상 유형 변환
const toDate = (value: string, fieldName: string): Date => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`${fieldName} 형식이 올바르지 않습니다`, 400);
  }
  return parsed;
};

// 3) 투표 수정 가능 여부 판단
const canModifyPoll = (pollStartDate: Date): boolean => {
  return pollStartDate.getTime() > Date.now();
};

// 4) 사용자 건물 번호 추출
const getActorBuildingNumber = (actor: Express.UserContext): number => {
  const raw = actor.building ?? '';
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

// 5) 사용자 투표 접근 권한 판단
const canUserAccessPoll = (
  poll: {
    targetType: PollTargetType;
    buildingPermission: number;
  },
  actor: Express.UserContext
): boolean => {
  if (actor.role !== Role.USER) return true;
  if (poll.targetType === PollTargetType.ALL || poll.buildingPermission === 0)
    return true;

  const dong = getActorBuildingNumber(actor);
  return dong > 0 && poll.buildingPermission === dong;
};

// 6) 투표 날짜 유효성 검사
const validatePollDates = (startDate: Date, endDate: Date): void => {
  if (startDate.getTime() >= endDate.getTime()) {
    throw new AppError('투표 종료일은 시작일보다 이후여야 합니다', 400);
  }
};

// 7) 투표 옵션 유효성 검사
const validatePollOptions = (options: Array<{ title: string }>) => {
  if (options.length < 2) {
    throw new AppError('투표 선택지는 최소 2개 이상이어야 합니다', 400);
  }

  const normalized = options
    .map((option) => option.title.trim())
    .filter(Boolean);
  if (normalized.length < 2) {
    throw new AppError('유효한 투표 선택지를 2개 이상 입력해주세요', 400);
  }
};

// 8) 투표 결과 공지사항 내용 생성
const buildPollResultNoticeContent = (poll: {
  title: string;
  content: string;
  startDate: Date;
  endDate: Date;
  options: Array<{
    title: string;
    voteCount: number;
  }>;
}): string => {
  const totalVotes = poll.options.reduce(
    (sum, option) => sum + option.voteCount,
    0
  );
  const topVoteCount = Math.max(
    0,
    ...poll.options.map((option) => option.voteCount)
  );
  const winners = poll.options
    .filter((option) => option.voteCount === topVoteCount && topVoteCount > 0)
    .map((option) => option.title);

  const resultSummary =
    winners.length === 0
      ? '득표 결과: 참여 없음'
      : `최다 득표: ${winners.join(', ')} (${topVoteCount}표)`;

  const optionLines = poll.options
    .map((option) => `- ${option.title}: ${option.voteCount}표`)
    .join('\n');

  return [
    `[투표 종료] ${poll.title}`,
    '',
    poll.content,
    '',
    `투표 기간: ${poll.startDate.toISOString()} ~ ${poll.endDate.toISOString()}`,
    `총 투표 수: ${totalVotes}표`,
    resultSummary,
    '',
    '[선택지별 득표]',
    optionLines,
  ].join('\n');
};

// 9) 특정 투표 자동 종료 및 결과 공지사항 게시 (단일 투표)
const closePollAndPublishNotice = async (pollId: string): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    const poll = await tx.poll.findFirst({
      where: {
        id: pollId,
        deletedAt: null,
      },
      select: {
        id: true,
        apartmentId: true,
        authorId: true,
        title: true,
        content: true,
        status: true,
        startDate: true,
        endDate: true,
        options: {
          orderBy: [{ voteCount: 'desc' }, { sortOrder: 'asc' }],
          select: {
            title: true,
            voteCount: true,
          },
        },
      },
    });

    if (!poll) {
      return;
    }

    const now = Date.now();
    if (poll.status === PollStatus.CLOSED || poll.endDate.getTime() >= now) {
      return;
    }

    await tx.poll.update({
      where: { id: poll.id },
      data: { status: PollStatus.CLOSED },
    });

    const existingNotice = await tx.notice.findUnique({
      where: { pollId: poll.id },
      select: { id: true, deletedAt: true },
    });

    if (!existingNotice) {
      await tx.notice.create({
        data: {
          apartmentId: poll.apartmentId,
          authorId: poll.authorId,
          pollId: poll.id,
          title: `[투표 결과] ${poll.title}`,
          content: buildPollResultNoticeContent(poll),
          category: NoticeCategory.RESIDENT_VOTE,
          importance: NoticeImportance.NORMAL,
        },
      });
      return;
    }

    if (existingNotice.deletedAt) {
      await tx.notice.update({
        where: { id: existingNotice.id },
        data: { deletedAt: null },
      });
    }
  });
};

// 10) 특정 투표 자동 종료 (아파트 단위)
const closeExpiredPollsForApartment = async (
  apartmentId?: string
): Promise<void> => {
  const where: Prisma.PollWhereInput = {
    deletedAt: null,
    status: { not: PollStatus.CLOSED },
    endDate: { lt: new Date() },
  };

  if (apartmentId) {
    where.apartmentId = apartmentId;
  }

  const expiredPolls = await prisma.poll.findMany({
    where,
    select: { id: true },
    take: 100,
  });

  for (const poll of expiredPolls) {
    await closePollAndPublishNotice(poll.id);
  }
};

// 11) 특정 투표 자동 활성화 (아파트 단위)
const activateStartedPollsForApartment = async (
  apartmentId?: string
): Promise<void> => {
  const where: Prisma.PollWhereInput = {
    deletedAt: null,
    status: PollStatus.PENDING,
    startDate: { lte: new Date() },
    endDate: { gt: new Date() },
  };

  if (apartmentId) {
    where.apartmentId = apartmentId;
  }

  await prisma.poll.updateMany({
    where,
    data: { status: PollStatus.IN_PROGRESS },
  });
};

// 12) 특정 투표 자동 활성화 (단일 투표)
const activateStartedPoll = async (pollId: string): Promise<void> => {
  await prisma.poll.updateMany({
    where: {
      id: pollId,
      deletedAt: null,
      status: PollStatus.PENDING,
      startDate: { lte: new Date() },
      endDate: { gt: new Date() },
    },
    data: { status: PollStatus.IN_PROGRESS },
  });
};

// ==============================================
// ⭐️ 투표 관련 Repository
// ==============================================
class PollRepository {
  // 1) 투표 생성
  async create(actor: Express.UserContext, payload: CreatePollDto) {
    if (!isAdminRole(actor.role)) {
      throw new AppError('투표 생성 권한이 없습니다', 403);
    }

    if (!actor.apartmentId) {
      throw new AppError('아파트 정보가 없는 사용자입니다', 400);
    }

    const startDate = toDate(payload.startDate, 'startDate');
    const endDate = toDate(payload.endDate, 'endDate');
    validatePollDates(startDate, endDate);
    validatePollOptions(payload.options);

    const board = await prisma.board.findFirst({
      where: {
        id: payload.boardId,
        apartmentId: actor.apartmentId,
        type: BoardType.POLL,
        isActive: true,
      },
    });

    if (!board) {
      throw new NotFoundError('투표 게시판 정보를 찾을 수 없습니다');
    }

    const buildingPermission = Number(payload.buildingPermission) || 0;

    await prisma.poll.create({
      data: {
        apartmentId: actor.apartmentId,
        boardId: payload.boardId,
        authorId: actor.id,
        title: payload.title,
        content: payload.content,
        status: payload.status
          ? toPollStatus(payload.status)
          : PollStatus.IN_PROGRESS,
        startDate,
        endDate,
        buildingPermission,
        targetType:
          buildingPermission === 0
            ? PollTargetType.ALL
            : PollTargetType.BUILDING,
        options: {
          create: payload.options.map((option, index) => ({
            title: option.title,
            sortOrder: index,
          })),
        },
      },
    });

    return {
      message: '정상적으로 등록 처리되었습니다',
    };
  }

  // 2) 투표 목록 조회
  async list(query: ListPollsQuery, actor?: Express.UserContext) {
    const { limit, skip } = resolvePagination(query, {
      defaultPage: 1,
      defaultLimit: 11,
    });

    await activateStartedPollsForApartment(actor?.apartmentId ?? undefined);
    await closeExpiredPollsForApartment(actor?.apartmentId ?? undefined);

    const filters: Prisma.PollWhereInput[] = [{ deletedAt: null }];

    if (actor?.apartmentId) {
      filters.push({ apartmentId: actor.apartmentId });
    }

    if (query.buildingPermission !== undefined) {
      const buildingPermission = Number(query.buildingPermission);
      if (!Number.isFinite(buildingPermission)) {
        throw new AppError('buildingPermission 값이 올바르지 않습니다', 400);
      }
      filters.push({ buildingPermission });
    }

    if (query.status) {
      filters.push({ status: toPollStatus(query.status) });
    }

    if (query.keyword) {
      filters.push({
        OR: [
          {
            title: {
              contains: query.keyword,
              mode: 'insensitive',
            },
          },
          {
            content: {
              contains: query.keyword,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    if (actor?.role === Role.USER) {
      const dong = getActorBuildingNumber(actor);
      filters.push({
        OR: [
          { targetType: PollTargetType.ALL },
          { buildingPermission: 0 },
          { buildingPermission: dong },
        ],
      });
    }

    const where: Prisma.PollWhereInput = {
      AND: filters,
    };

    const [polls, totalCount] = await prisma.$transaction([
      prisma.poll.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.poll.count({ where }),
    ]);

    return {
      polls: polls.map((poll) => ({
        pollId: poll.id,
        userId: poll.author.id,
        title: poll.title,
        writerName: poll.author.name,
        buildingPermission: poll.buildingPermission,
        createdAt: poll.createdAt.toISOString(),
        updatedAt: poll.updatedAt.toISOString(),
        startDate: poll.startDate.toISOString(),
        endDate: poll.endDate.toISOString(),
        status: poll.status,
      })),
      totalCount,
    };
  }

  // 3) 투표 상세 조회
  async getById(pollId: string, actor?: Express.UserContext) {
    await activateStartedPoll(pollId);
    await closePollAndPublishNotice(pollId);

    const poll = await prisma.poll.findFirst({
      where: {
        id: pollId,
        deletedAt: null,
      },
      include: {
        board: {
          select: {
            name: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        options: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            title: true,
            voteCount: true,
          },
        },
      },
    });

    if (!poll) {
      throw new NotFoundError('투표 정보를 찾을 수 없습니다');
    }

    if (actor?.apartmentId && actor.apartmentId !== poll.apartmentId) {
      throw new AppError('다른 아파트 투표는 조회할 수 없습니다', 403);
    }

    if (actor && !canUserAccessPoll(poll, actor)) {
      throw new AppError('투표 권한이 없습니다', 403);
    }

    return {
      pollId: poll.id,
      userId: poll.author.id,
      title: poll.title,
      writerName: poll.author.name,
      buildingPermission: poll.buildingPermission,
      createdAt: poll.createdAt.toISOString(),
      updatedAt: poll.updatedAt.toISOString(),
      startDate: poll.startDate.toISOString(),
      endDate: poll.endDate.toISOString(),
      status: poll.status,
      content: poll.content,
      boardName: poll.board.name,
      options: poll.options,
    };
  }

  // 4) 투표 수정
  async update(
    actor: Express.UserContext,
    pollId: string,
    payload: UpdatePollDto
  ) {
    if (!isAdminRole(actor.role)) {
      throw new AppError('투표 수정 권한이 없습니다', 403);
    }

    const poll = await prisma.poll.findFirst({
      where: {
        id: pollId,
        deletedAt: null,
      },
      select: {
        id: true,
        apartmentId: true,
        startDate: true,
      },
    });

    if (!poll) {
      throw new NotFoundError('투표 정보를 찾을 수 없습니다');
    }

    if (actor.role === Role.ADMIN && actor.apartmentId !== poll.apartmentId) {
      throw new AppError('다른 아파트 투표는 수정할 수 없습니다', 403);
    }

    if (!canModifyPoll(poll.startDate)) {
      throw new AppError('투표 시작 이후에는 수정할 수 없습니다', 400);
    }

    const startDate = toDate(payload.startDate, 'startDate');
    const endDate = toDate(payload.endDate, 'endDate');
    validatePollDates(startDate, endDate);
    validatePollOptions(payload.options);

    const buildingPermission = Number(payload.buildingPermission) || 0;

    await prisma.$transaction(async (tx) => {
      await tx.poll.update({
        where: { id: poll.id },
        data: {
          title: payload.title,
          content: payload.content,
          startDate,
          endDate,
          status: toPollStatus(payload.status),
          buildingPermission,
          targetType:
            buildingPermission === 0
              ? PollTargetType.ALL
              : PollTargetType.BUILDING,
        },
      });

      await tx.pollOption.deleteMany({
        where: {
          pollId: poll.id,
        },
      });

      await tx.pollOption.createMany({
        data: payload.options.map((option, index) => ({
          pollId: poll.id,
          title: option.title,
          sortOrder: index,
        })),
      });

      await tx.pollVote.deleteMany({
        where: {
          pollId: poll.id,
        },
      });
    });

    return { pollId: poll.id };
  }

  // 5) 투표 삭제
  async remove(actor: Express.UserContext, pollId: string) {
    if (!isAdminRole(actor.role)) {
      throw new AppError('투표 삭제 권한이 없습니다', 403);
    }

    const poll = await prisma.poll.findFirst({
      where: {
        id: pollId,
        deletedAt: null,
      },
      select: {
        id: true,
        apartmentId: true,
        startDate: true,
      },
    });

    if (!poll) {
      throw new NotFoundError('투표 정보를 찾을 수 없습니다');
    }

    if (actor.role === Role.ADMIN && actor.apartmentId !== poll.apartmentId) {
      throw new AppError('다른 아파트 투표는 삭제할 수 없습니다', 403);
    }

    if (!canModifyPoll(poll.startDate)) {
      throw new AppError('투표 시작 이후에는 삭제할 수 없습니다', 400);
    }

    await prisma.poll.update({
      where: { id: poll.id },
      data: {
        deletedAt: new Date(),
      },
    });

    return { pollId: poll.id };
  }

  // 6) 투표 참여
  async vote(actor: Express.UserContext, optionId: string) {
    if (!actor.id) {
      throw new AppError('로그인이 필요합니다', 401);
    }

    const option = await prisma.pollOption.findFirst({
      where: {
        id: optionId,
      },
      include: {
        poll: {
          select: {
            id: true,
            apartmentId: true,
            status: true,
            startDate: true,
            endDate: true,
            targetType: true,
            buildingPermission: true,
          },
        },
      },
    });

    if (!option) {
      throw new NotFoundError('투표 옵션을 찾을 수 없습니다');
    }

    await activateStartedPoll(option.poll.id);
    await closePollAndPublishNotice(option.poll.id);

    const refreshedPoll = await prisma.poll.findUnique({
      where: { id: option.poll.id },
      select: {
        id: true,
        apartmentId: true,
        status: true,
        startDate: true,
        endDate: true,
        targetType: true,
        buildingPermission: true,
      },
    });

    if (!refreshedPoll) {
      throw new NotFoundError('투표 정보를 찾을 수 없습니다');
    }

    if (actor.apartmentId && actor.apartmentId !== refreshedPoll.apartmentId) {
      throw new AppError('다른 아파트 투표에는 참여할 수 없습니다', 403);
    }

    if (!canUserAccessPoll(refreshedPoll, actor)) {
      throw new AppError('투표 권한이 없습니다', 403);
    }

    const now = Date.now();
    if (
      refreshedPoll.status !== PollStatus.IN_PROGRESS ||
      refreshedPoll.startDate.getTime() > now ||
      refreshedPoll.endDate.getTime() < now
    ) {
      throw new AppError('현재 투표 가능한 상태가 아닙니다', 400);
    }

    const existingVote = await prisma.pollVote.findFirst({
      where: {
        pollId: option.pollId,
        userId: actor.id,
      },
    });

    if (existingVote) {
      throw new AppError('이미 투표한 항목이 있습니다', 409);
    }

    await prisma.$transaction([
      prisma.pollVote.create({
        data: {
          pollId: option.pollId,
          optionId: option.id,
          userId: actor.id,
        },
      }),
      prisma.pollOption.update({
        where: { id: option.id },
        data: { voteCount: { increment: 1 } },
      }),
    ]);

    const updatedOption = await prisma.pollOption.findUnique({
      where: { id: option.id },
      select: {
        id: true,
        title: true,
        voteCount: true,
      },
    });

    if (!updatedOption) {
      throw new NotFoundError('투표 옵션을 찾을 수 없습니다');
    }

    const options = await prisma.pollOption.findMany({
      where: { pollId: option.pollId },
      orderBy: [{ voteCount: 'desc' }, { sortOrder: 'asc' }],
      select: {
        id: true,
        title: true,
        voteCount: true,
      },
    });

    const winnerOption = options[0] ?? updatedOption;

    return {
      message: '투표가 완료되었습니다',
      updatedOption: {
        id: updatedOption.id,
        title: updatedOption.title,
        votes: updatedOption.voteCount,
      },
      winnerOption: {
        id: winnerOption.id,
        title: winnerOption.title,
        votes: winnerOption.voteCount,
      },
      options: options.map((item) => ({
        id: item.id,
        title: item.title,
        votes: item.voteCount,
      })),
    };
  }

  // 7) 투표 취소
  async unvote(actor: Express.UserContext, optionId: string) {
    if (!actor.id) {
      throw new AppError('로그인이 필요합니다', 401);
    }

    const option = await prisma.pollOption.findFirst({
      where: {
        id: optionId,
      },
      include: {
        poll: {
          select: {
            id: true,
            apartmentId: true,
            status: true,
            startDate: true,
            endDate: true,
            targetType: true,
            buildingPermission: true,
          },
        },
      },
    });

    if (!option) {
      throw new NotFoundError('투표 옵션을 찾을 수 없습니다');
    }

    await activateStartedPoll(option.poll.id);
    await closePollAndPublishNotice(option.poll.id);

    const refreshedPoll = await prisma.poll.findUnique({
      where: { id: option.poll.id },
      select: {
        id: true,
        apartmentId: true,
        status: true,
        startDate: true,
        endDate: true,
        targetType: true,
        buildingPermission: true,
      },
    });

    if (!refreshedPoll) {
      throw new NotFoundError('투표 정보를 찾을 수 없습니다');
    }

    if (actor.apartmentId && actor.apartmentId !== refreshedPoll.apartmentId) {
      throw new AppError('다른 아파트 투표는 취소할 수 없습니다', 403);
    }

    if (!canUserAccessPoll(refreshedPoll, actor)) {
      throw new AppError('투표 권한이 없습니다', 403);
    }

    const now = Date.now();
    if (
      refreshedPoll.status !== PollStatus.IN_PROGRESS ||
      refreshedPoll.startDate.getTime() > now ||
      refreshedPoll.endDate.getTime() < now
    ) {
      throw new AppError('현재 투표 취소 가능한 상태가 아닙니다', 400);
    }

    const vote = await prisma.pollVote.findFirst({
      where: {
        pollId: option.pollId,
        userId: actor.id,
      },
      select: {
        id: true,
        optionId: true,
      },
    });

    if (!vote) {
      throw new NotFoundError('취소할 투표 내역이 없습니다');
    }

    await prisma.$transaction([
      prisma.pollVote.delete({ where: { id: vote.id } }),
      prisma.pollOption.update({
        where: { id: vote.optionId },
        data: {
          voteCount: { decrement: 1 },
        },
      }),
    ]);

    const updatedOption = await prisma.pollOption.findUnique({
      where: { id: vote.optionId },
      select: {
        id: true,
        title: true,
        voteCount: true,
      },
    });

    if (!updatedOption) {
      throw new NotFoundError('투표 옵션을 찾을 수 없습니다');
    }

    return {
      message: '투표가 취소되었습니다',
      updatedOption: {
        id: updatedOption.id,
        title: updatedOption.title,
        votes: updatedOption.voteCount,
      },
    };
  }
}

export default new PollRepository();
