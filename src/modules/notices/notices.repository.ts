import {
  ApprovalStatus,
  BoardType,
  NoticeCategory,
  NoticeImportance,
  Role,
  type Prisma,
} from '@prisma/client';
import prisma from '../../config/prisma';
import { AppError, NotFoundError } from '../../middlewares/error-handler';
import { resolvePagination } from '../../utils/pagination';
import { isAdminRole } from '../../utils/roles';
import type {
  CreateNoticeDto,
  ListNoticesQuery,
  UpdateNoticeDto,
} from './notices.dto';

// ==============================================
// ⭐️ 공지사항 관련 Utility
// ==============================================
// 1) 공지사항 카테고리 변환
const toNoticeCategory = (value: string): NoticeCategory => {
  if (value === NoticeCategory.MAINTENANCE) return NoticeCategory.MAINTENANCE;
  if (value === NoticeCategory.EMERGENCY) return NoticeCategory.EMERGENCY;
  if (value === NoticeCategory.COMMUNITY) return NoticeCategory.COMMUNITY;
  if (value === NoticeCategory.RESIDENT_VOTE)
    return NoticeCategory.RESIDENT_VOTE;
  if (value === NoticeCategory.RESIDENT_COUNCIL)
    return NoticeCategory.RESIDENT_COUNCIL;

  throw new AppError('유효하지 않은 공지사항 카테고리입니다.', 400);
};

// 2) 날짜 문자열 파싱 및 검증
const parseDate = (value: string, fieldName: string): Date => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`유효하지 않은 날짜 형식입니다: ${fieldName}`, 400);
  }
  return parsed;
};

// 3) 공지사항 일정 검증 및 변환
const resolveSchedule = (startDate?: string, endDate?: string) => {
  const hasStart = Boolean(startDate?.trim());
  const hasEnd = Boolean(endDate?.trim());

  if (!hasStart && !hasEnd) return null; // 일정 없음
  if (!hasStart || !hasEnd) {
    throw new AppError('시작일과 종료일은 함께 제공되어야 합니다.', 400);
  }

  const start = parseDate(startDate as string, 'startDate');
  const end = parseDate(endDate as string, 'endDate');

  if (start.getTime() > end.getTime()) {
    throw new AppError('시작일은 종료일보다 이전이어야 합니다.', 400);
  }

  return { start, end };
};

// 4) 공지사항 작성 권한 검증
const ensureNoticeWritePermission = (
  actor: Express.UserContext,
  targetApartmentId: string
): void => {
  if (actor.role === Role.ADMIN && actor.apartmentId !== targetApartmentId) {
    throw new AppError(
      '관리자는 자신의 아파트에만 공지사항을 작성할 수 있습니다.',
      403
    );
  }
};

// 5) 공지사항 게시판이 속한 아파트 ID 결정
const resolveApartmentId = async (
  actor: Express.UserContext,
  boardId?: string
): Promise<string> => {
  if (boardId) {
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        type: BoardType.NOTICE,
        isActive: true,
      },
      select: { apartmentId: true },
    });

    if (!board) {
      throw new NotFoundError('공지사항 게시판을 찾을 수 없습니다.');
    }

    ensureNoticeWritePermission(actor, board.apartmentId);

    return board.apartmentId;
  }

  if (!actor.apartmentId) {
    throw new AppError('아파트 정보가 없는 사용자입니다.', 400);
  }

  return actor.apartmentId;
};

// 6) 공지사항 목록 아이템 변환
const toListItem = (notice: {
  id: string;
  authorId: string;
  category: NoticeCategory;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  viewsCount: number;
  commentsCount: number;
  isPinned: boolean;
  author: { name: string };
}) => ({
  noticeId: notice.id,
  userId: notice.authorId,
  category: notice.category,
  title: notice.title,
  writerName: notice.author.name,
  createdAt: notice.createdAt.toISOString(),
  updatedAt: notice.updatedAt.toISOString(),
  viewsCount: notice.viewsCount,
  commentsCount: notice.commentsCount,
  isPinned: notice.isPinned,
});

// ==============================================
// ⭐️ 공지사항 관련 Repository
// ==============================================
class NoticeRepository {
  // 1) 공지사항 목록 조회
  async list(query: ListNoticesQuery, actor?: Express.UserContext) {
    const { limit, skip } = resolvePagination(query, {
      defaultPage: 1,
      defaultLimit: 11,
    });

    const filters: Prisma.NoticeWhereInput[] = [{ deletedAt: null }];

    if (actor?.apartmentId) {
      filters.push({ apartmentId: actor.apartmentId });
    }

    if (query.category) {
      filters.push({ category: toNoticeCategory(query.category) });
    }

    const search = query.search?.trim() || query.keyword?.trim();
    if (search) {
      filters.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.NoticeWhereInput = { AND: filters };

    const [notices, totalCount] = await prisma.$transaction([
      prisma.notice.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          author: {
            select: { name: true },
          },
        },
      }),
      prisma.notice.count({ where }),
    ]);

    return {
      notices: notices.map(toListItem),
      totalCount,
    };
  }

  // 2) 공지사항 상세 조회
  async getById(noticeId: string, actor?: Express.UserContext) {
    const notice = await prisma.notice.findFirst({
      where: {
        id: noticeId,
        deletedAt: null,
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
        schedule: {
          select: { startDate: true, endDate: true },
        },
      },
    });

    if (!notice) {
      throw new NotFoundError('공지사항을 찾을 수 없습니다.');
    }

    if (
      actor &&
      actor.role !== Role.SUPER_ADMIN &&
      actor.apartmentId &&
      actor.apartmentId !== notice.apartmentId
    ) {
      throw new AppError('공지사항에 접근할 권한이 없습니다.', 403);
    }

    await prisma.notice.update({
      where: { id: notice.id },
      data: { viewsCount: { increment: 1 } },
    });

    const comments = await prisma.comment.findMany({
      where: {
        boardType: BoardType.NOTICE,
        boardId: notice.id,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      noticeId: notice.id,
      userId: notice.authorId,
      category: notice.category,
      title: notice.title,
      writerName: notice.author.name,
      createdAt: notice.createdAt.toISOString(),
      updatedAt: notice.updatedAt.toISOString(),
      viewsCount: notice.viewsCount + 1, // 조회수는 이미 증가된 상태로 반환
      commentsCount: notice.commentsCount,
      isPinned: notice.isPinned,
      content: notice.content,
      boardName: '공지사항',
      comments: comments.map((comments) => ({
        id: comments.id,
        userId: comments.authorId,
        content: comments.content,
        createdAt: comments.createdAt.toISOString(),
        updatedAt: comments.updatedAt.toISOString(),
        writerName: comments.author.name,
      })),
    };
  }

  // 3) 공지사항 생성
  async create(actor: Express.UserContext, payload: CreateNoticeDto) {
    if (!isAdminRole(actor.role)) {
      throw new AppError('공지사항을 작성할 권한이 없습니다.', 403);
    }

    const apartmentId = await resolveApartmentId(actor, payload.boardId);
    ensureNoticeWritePermission(actor, apartmentId);

    if (!payload.title?.trim() || !payload.content?.trim()) {
      throw new AppError('제목과 내용은 필수입니다.', 400);
    }

    const category = toNoticeCategory(payload.category);
    const schedule = resolveSchedule(payload.startDate, payload.endDate);

    const notice = await prisma.$transaction(async (tx) => {
      const created = await tx.notice.create({
        data: {
          apartmentId,
          authorId: actor.id,
          title: payload.title,
          content: payload.content,
          category,
          isPinned: payload.isPinned ?? false,
          importance: payload.isPinned
            ? NoticeImportance.IMPORTANT
            : NoticeImportance.NORMAL,
        },
      });

      if (schedule) {
        await tx.apartmentSchedule.create({
          data: {
            apartmentId,
            noticeId: created.id,
            title: payload.title,
            description: payload.content,
            startDate: schedule.start,
            endDate: schedule.end,
            createdById: actor.id,
          },
        });
      }
      return created;
    });

    const receivers = await prisma.user.findMany({
      where: {
        apartmentId,
        role: Role.USER,
        approvalStatus: ApprovalStatus.APPROVED,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (receivers.length > 0) {
      const notificationData = receivers
        .filter((receiver) => receiver.id !== actor.id)
        .map((receiver) => ({
          receiverId: receiver.id,
          type: 'NOTICE_CREATED' as const,
          title: '공지사항 등록',
          message: `새로운 공지사항이 등록되었습니다: ${payload.title}`,
          relatedBoardType: BoardType.NOTICE,
          relatedBoardId: notice.id,
        }));

      if (notificationData.length > 0) {
        await prisma.notification.createMany({
          data: notificationData,
        });
      }
    }

    return { message: '정상적으로 등록 처리되었습니다' };
  }

  // 4) 공지사항 수정
  async update(
    actor: Express.UserContext,
    noticeId: string,
    payload: UpdateNoticeDto
  ) {
    if (!isAdminRole(actor.role)) {
      throw new AppError('공지사항을 수정할 권한이 없습니다.', 403);
    }

    const notice = await prisma.notice.findFirst({
      where: {
        id: noticeId,
        deletedAt: null,
      },
      include: {
        schedule: {
          select: { id: true },
        },
      },
    });

    if (!notice) {
      throw new NotFoundError('공지사항을 찾을 수 없습니다.');
    }

    ensureNoticeWritePermission(actor, notice.apartmentId);

    const nextTitle = payload.title?.trim() || notice.title;
    const nextContent = payload.content?.trim() || notice.content;

    const category = payload.category
      ? toNoticeCategory(payload.category)
      : notice.category;
    const isPinned = payload.isPinned ?? notice.isPinned;
    const schedule = resolveSchedule(payload.startDate, payload.endDate);

    await prisma.$transaction(async (tx) => {
      await tx.notice.update({
        where: { id: notice.id },
        data: {
          title: nextTitle,
          content: nextContent,
          category,
          isPinned,
          importance: isPinned
            ? NoticeImportance.IMPORTANT
            : NoticeImportance.NORMAL,
        },
      });

      if (schedule) {
        if (notice.schedule?.id) {
          await tx.apartmentSchedule.update({
            where: { id: notice.schedule.id },
            data: {
              title: nextTitle,
              description: nextContent,
              startDate: schedule.start,
              endDate: schedule.end,
            },
          });
        } else {
          await tx.apartmentSchedule.create({
            data: {
              apartmentId: notice.apartmentId,
              noticeId: notice.id,
              title: nextTitle,
              description: nextContent,
              startDate: schedule.start,
              endDate: schedule.end,
              createdById: actor.id,
            },
          });
        }
      } else if (notice.schedule?.id) {
        await tx.apartmentSchedule.delete({
          where: { id: notice.schedule.id },
        });
      }
    });

    const updated = await prisma.notice.findFirst({
      where: {
        id: notice.id,
        deletedAt: null,
      },
      include: {
        author: {
          select: { name: true },
        },
      },
    });

    if (!updated) {
      throw new NotFoundError('공지사항을 찾을 수 없습니다.');
    }

    return toListItem(updated);
  }

  // 5) 공지사항 삭제
  async remove(actor: Express.UserContext, noticeId: string) {
    if (!isAdminRole(actor.role)) {
      throw new AppError('공지사항을 삭제할 권한이 없습니다.', 403);
    }

    const notice = await prisma.notice.findFirst({
      where: {
        id: noticeId,
        deletedAt: null,
      },
      include: {
        schedule: {
          select: { id: true },
        },
      },
    });

    if (!notice) {
      throw new NotFoundError('공지사항을 찾을 수 없습니다.');
    }

    ensureNoticeWritePermission(actor, notice.apartmentId);

    await prisma.$transaction(async (tx) => {
      await tx.notice.update({
        where: { id: notice.id },
        data: { deletedAt: new Date() },
      });

      await tx.comment.updateMany({
        where: {
          boardType: BoardType.NOTICE,
          boardId: notice.id,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });

      if (notice.schedule?.id) {
        await tx.apartmentSchedule.delete({
          where: { id: notice.schedule.id },
        });
      }
    });

    return { message: '정상적으로 삭제 처리되었습니다' };
  }
}

export default new NoticeRepository();
