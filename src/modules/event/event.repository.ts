import { Role, type Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import { AppError } from '../../middlewares/error-handler';
import type { GetEventsQuery, UpsertEventQuery } from './event.dto';

// ==============================================
// ⭐️ 이벤트 관련 Utility
// ==============================================
// 1) 이벤트 설명에서 게시글 ID 추출을 위한 접두사 정의
const POLL_EVENT_DESC_PREFIX = '__POLL_ID__:';
const COMPLAINT_EVENT_DESC_PREFIX = '__COMPLAINT_ID__:';

// 2) 연도 정보 파싱 함수
const parseYear = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1970 || parsed > 9999) {
    return fallback;
  }
  return Math.trunc(parsed);
};

// 3) 월 정보 파싱 함수
const parseMonth = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12) {
    return fallback;
  }
  return Math.trunc(parsed);
};

// 4) 아파트 ID 결정 함수
const resolveApartmentId = (
  query: GetEventsQuery,
  actor: Express.UserContext
) => {
  const requestedApartmentId = query.apartmentId?.trim();

  if (actor.role === Role.SUPER_ADMIN) {
    const superAdminApartmentId =
      requestedApartmentId || actor.apartmentId || '';

    if (!superAdminApartmentId) {
      throw new AppError('아파트 ID가 필요합니다.', 400);
    }

    return superAdminApartmentId;
  }

  if (!actor.apartmentId) {
    throw new AppError('아파트에 속한 사용자만 접근할 수 있습니다.', 403);
  }

  if (requestedApartmentId && requestedApartmentId !== actor.apartmentId) {
    throw new AppError('다른 아파트의 이벤트는 조회할 수 없습니다.', 403);
  }

  return actor.apartmentId;
};

// 5) 날짜 범위 생성 함수
const buildDateRange = (year: number, month: number) => {
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0); // ex) 2024-01-01T00:00:00.000Z
  const endDate = new Date(year, month, 0, 23, 59, 59, 999); // ex) 2024-01-31T23:59:59.999Z
  return { startDate, endDate };
};

// 6) 날짜 문자열 파싱 함수
const parseDateString = (value: string, fieldName: string): Date => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(
      `${fieldName} 필드는 유효한 날짜 문자열이어야 합니다.`,
      400
    );
  }

  return date;
};

// 7) 관리자 권한 확인 함수
const ensureAdminRole = (actor: Express.UserContext) => {
  if (actor.role !== Role.ADMIN && actor.role !== Role.SUPER_ADMIN) {
    throw new AppError('관리자 권한이 필요합니다.', 403);
  }
};

// 8) 아파트 범위 확인 함수
const ensureApartmentScope = (
  actor: Express.UserContext,
  apartmentId: string
) => {
  if (actor.role === Role.ADMIN && actor.apartmentId !== apartmentId) {
    throw new AppError('다른 아파트의 이벤트는 관리할 수 없습니다.', 403);
  }
};

// ==============================================
// ⭐️ 이벤트 관련 Repository
// ==============================================
class EventRepository {
  // 1) 이벤트 목록 조회
  async getEvents(query: GetEventsQuery, actor: Express.UserContext) {
    const now = new Date();
    const year = parseYear(query.year, now.getFullYear());
    const month = parseMonth(query.month, now.getMonth() + 1);
    const apartmentId = resolveApartmentId(query, actor);
    const { startDate, endDate } = buildDateRange(year, month);

    const where: Prisma.ApartmentScheduleWhereInput = {
      apartmentId,
      AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }],
    };

    const schedules = await prisma.apartmentSchedule.findMany({
      where,
      orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
      include: {
        notice: {
          select: {
            category: true,
            deletedAt: true,
          },
        },
      },
    });

    return schedules.map((schedules) => {
      const pollId = schedules.description?.startsWith(POLL_EVENT_DESC_PREFIX)
        ? schedules.description.slice(POLL_EVENT_DESC_PREFIX.length)
        : '';
      const complaintId = schedules.description?.startsWith(
        COMPLAINT_EVENT_DESC_PREFIX
      )
        ? schedules.description.slice(COMPLAINT_EVENT_DESC_PREFIX.length)
        : '';

      return {
        id: schedules.id,
        start: schedules.startDate.toISOString(),
        end: schedules.endDate.toISOString(),
        category:
          schedules.notice && !schedules.notice.deletedAt
            ? schedules.notice.category
            : 'ETC',
        title: schedules.title,
        type: schedules.noticeId
          ? 'NOTICE'
          : pollId
            ? 'POLL'
            : complaintId
              ? 'COMPLAINT'
              : 'NOTICE',
      };
    });
  }

  // 2) 이벤트 생성/업데이트
  async upsertEvent(query: UpsertEventQuery, actor: Express.UserContext) {
    ensureAdminRole(actor);

    const boardType = String(query.boardType || '').toUpperCase();
    const boardId = String(query.boardId || '').trim();
    const startDate = parseDateString(
      String(query.startDate || ''),
      'startDate'
    );
    const endDate = parseDateString(String(query.endDate || ''), 'endDate');

    if (endDate < startDate) {
      const notice = await prisma.notice.findFirst({
        where: {
          id: boardId,
          deletedAt: null,
        },
        select: {
          id: true,
          apartmentId: true,
          title: true,
          content: true,
        },
      });

      if (!notice) {
        throw new AppError('해당 게시글을 찾을 수 없습니다.', 404);
      }

      ensureApartmentScope(actor, notice.apartmentId);

      await prisma.apartmentSchedule.upsert({
        where: { noticeId: notice.id },
        create: {
          apartmentId: notice.apartmentId,
          noticeId: notice.id,
          title: notice.title,
          description: notice.content,
          startDate,
          endDate,
          createdById: actor.id,
        },
        update: {
          title: notice.title,
          description: notice.content,
          startDate,
          endDate,
        },
      });
      return;
    }
    if (boardType === 'POLL') {
      const poll = await prisma.poll.findFirst({
        where: {
          id: boardId,
          deletedAt: null,
        },
        select: {
          id: true,
          apartmentId: true,
          title: true,
          content: true,
        },
      });

      if (!poll) {
        throw new AppError('해당 게시글을 찾을 수 없습니다.', 404);
      }

      ensureApartmentScope(actor, poll.apartmentId);

      const description = `${POLL_EVENT_DESC_PREFIX}${poll.id}`;
      const existing = await prisma.apartmentSchedule.findFirst({
        where: {
          apartmentId: poll.apartmentId,
          noticeId: null,
          description,
        },
        select: { id: true },
      });

      if (existing) {
        await prisma.apartmentSchedule.update({
          where: { id: existing.id },
          data: {
            title: poll.title,
            startDate,
            endDate,
          },
        });
      } else {
        await prisma.apartmentSchedule.create({
          data: {
            apartmentId: poll.apartmentId,
            title: poll.title,
            description,
            startDate,
            endDate,
            createdById: actor.id,
          },
        });
      }
      return;
    }

    if (boardType === 'COMPLAINT') {
      const complaint = await prisma.complaint.findFirst({
        where: {
          id: boardId,
          deletedAt: null,
        },
        select: {
          id: true,
          apartmentId: true,
          title: true,
          content: true,
        },
      });

      if (!complaint) {
        throw new AppError('해당 게시글을 찾을 수 없습니다.', 404);
      }

      ensureApartmentScope(actor, complaint.apartmentId);

      const description = `${COMPLAINT_EVENT_DESC_PREFIX}${complaint.id}`;
      const existing = await prisma.apartmentSchedule.findFirst({
        where: {
          apartmentId: complaint.apartmentId,
          noticeId: null,
          description,
        },
        select: { id: true },
      });

      if (existing) {
        await prisma.apartmentSchedule.update({
          where: { id: existing.id },
          data: {
            title: complaint.title,
            startDate,
            endDate,
          },
        });
      } else {
        await prisma.apartmentSchedule.create({
          data: {
            apartmentId: complaint.apartmentId,
            title: complaint.title,
            description,
            startDate,
            endDate,
            createdById: actor.id,
          },
        });
      }
      return;
    }

    throw new AppError('유효하지 않은 boardType입니다.', 400);
  }

  // 3) 이벤트 삭제
  async deleteEvent(eventId: string, actor: Express.UserContext) {
    ensureAdminRole(actor);

    const event = await prisma.apartmentSchedule.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        apartmentId: true,
        noticeId: true,
        description: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!event) {
      throw new AppError('이벤트를 찾을 수 없습니다.', 404);
    }

    ensureApartmentScope(actor, event.apartmentId);

    await prisma.apartmentSchedule.delete({
      where: { id: event.id },
    });

    const pollId = event.description?.startsWith(POLL_EVENT_DESC_PREFIX)
      ? event.description.slice(POLL_EVENT_DESC_PREFIX.length)
      : undefined;
    const complaintId = event.description?.startsWith(
      COMPLAINT_EVENT_DESC_PREFIX
    )
      ? event.description.slice(COMPLAINT_EVENT_DESC_PREFIX.length)
      : undefined;

    return {
      id: event.id,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate.toISOString(),
      boardType: event.noticeId
        ? 'NOTICE'
        : pollId
          ? 'POLL'
          : complaintId
            ? 'COMPLAINT'
            : 'NOTICE',
      ...(event.noticeId ? { noticeId: event.noticeId } : {}),
      ...(pollId ? { pollId } : {}),
      ...(complaintId ? { complaintId } : {}),
    };
  }
}

export default new EventRepository();
