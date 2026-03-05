import {
  BoardType,
  ComplaintStatus,
  NotificationType,
  Role,
  type Prisma,
} from '@prisma/client';
import prisma from '../../config/prisma';
import { AppError, NotFoundError } from '../../middlewares/error-handler';
import { resolvePagination } from '../../utils/pagination';
import { isAdminRole } from '../../utils/roles';
import type {
  CreateComplaintDto,
  ListComplaintsQuery,
  UpdateComplaintDto,
  UpdateComplaintStatusDto,
} from './complaints.dto';

// ==============================================
// ⭐️ 민원 관련 Utility
// ==============================================
// 1) 문자열을 ComplaintStatus 타입으로 변환하는 함수
const toComplaintStatus = (value: string): ComplaintStatus => {
  if (value === ComplaintStatus.PENDING) return ComplaintStatus.PENDING;
  if (value === ComplaintStatus.IN_PROGRESS) return ComplaintStatus.IN_PROGRESS;
  if (value === ComplaintStatus.RESOLVED || value === 'COMPLETED')
    return ComplaintStatus.RESOLVED;
  if (value === ComplaintStatus.REJECTED || value === 'REJECTED')
    return ComplaintStatus.REJECTED;

  throw new AppError('유효하지 않은 상태 값입니다', 400);
};

// 2) Prisma의 Complaint 모델을 민원 목록 아이템 형태로 변환하는 함수
const toListItem = (complaint: {
  id: string;
  authorId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  viewsCount: number;
  commentsCount: number;
  status: ComplaintStatus;
  building: string | null;
  unitNumber: string | null;
  author: { name: string };
}) => ({
  complaintId: complaint.id,
  userId: complaint.authorId,
  title: complaint.title,
  writerName: complaint.author.name,
  createdAt: complaint.createdAt.toISOString(),
  updatedAt: complaint.updatedAt.toISOString(),
  isPublic: complaint.isPublic,
  viewsCount: complaint.viewsCount,
  commentsCount: complaint.commentsCount,
  status: complaint.status,
  dong: complaint.building ?? '',
  ho: complaint.unitNumber ?? '',
});

// 3) Prisma의 Complaint 모델과 관련 댓글 데이터를 민원 상세 응답 형태로 변환하는 함수
const toDetailResponse = (
  complaint: {
    id: string;
    authorId: string;
    title: string;
    content: string;
    isPublic: boolean;
    viewsCount: number;
    commentsCount: number;
    status: ComplaintStatus;
    building: string | null;
    unitNumber: string | null;
    createdAt: Date;
    updatedAt: Date;
    board: { type: BoardType } | null;
    author: { name: string };
  },
  comments: Array<{
    id: string;
    authorId: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    author: { name: string };
  }>,
  viewsCount: number
) => ({
  complaintId: complaint.id,
  userId: complaint.authorId,
  title: complaint.title,
  writerName: complaint.author.name,
  createdAt: complaint.createdAt.toISOString(),
  updatedAt: complaint.updatedAt.toISOString(),
  isPublic: complaint.isPublic,
  viewsCount,
  commentsCount: complaint.commentsCount,
  status: complaint.status,
  dong: complaint.building ?? '',
  ho: complaint.unitNumber ?? '',
  content: complaint.content,
  boardType: complaint.board?.type ?? BoardType.COMPLAINT,
  comments: comments.map((comment) => ({
    id: comment.id,
    userId: comment.authorId,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    writerName: comment.author.name,
  })),
});

// ==============================================
// ⭐️ 민원 관련 Repository
// ==============================================
class ComplaintRepository {
  // 1) 민원 목록 조회
  async list(query: ListComplaintsQuery, actor?: Express.UserContext) {
    const { limit, skip } = resolvePagination(query, {
      defaultPage: 1,
      defaultLimit: 20,
    });

    const filters: Prisma.ComplaintWhereInput[] = [{ deletedAt: null }];

    if (query.status) filters.push({ status: toComplaintStatus(query.status) });
    if (query.isPublic) filters.push({ isPublic: query.isPublic === 'true' });
    if (query.dong) filters.push({ building: query.dong });
    if (query.ho) filters.push({ unitNumber: query.ho });
    if (query.keyword) {
      filters.push({
        OR: [
          {
            title: { contains: query.keyword, mode: 'insensitive' },
          },
          {
            content: { contains: query.keyword, mode: 'insensitive' },
          },
        ],
      });
    }

    if (actor?.apartmentId) {
      filters.push({ apartmentId: actor.apartmentId });
    } else {
      filters.push({ isPublic: true });
    }

    if (actor?.role === Role.USER) {
      filters.push({
        OR: [{ isPublic: true }, { authorId: actor.id }],
      });
    }

    const where: Prisma.ComplaintWhereInput = {
      AND: filters,
    };

    const [complaints, totalCount] = await prisma.$transaction([
      prisma.complaint.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { name: true },
          },
        },
      }),
      prisma.complaint.count({ where }),
    ]);

    return {
      complaints: complaints.map(toListItem),
      totalCount,
    };
  }

  // 2) 민원 생성
  async create(actor: Express.UserContext, payload: CreateComplaintDto) {
    if (!actor.id) {
      throw new AppError('로그인이 필요합니다.', 401);
    }

    const user = await prisma.user.findFirst({
      where: {
        id: actor.id,
        deletedAt: null,
      },
      select: {
        id: true,
        apartmentId: true,
        building: true,
        unitNumber: true,
      },
    });

    if (!user || !user.apartmentId) {
      throw new AppError('유효하지 않은 사용자입니다.', 400);
    }

    const board = await prisma.board.findFirst({
      where: {
        id: payload.boardId,
        apartmentId: user.apartmentId,
        type: BoardType.COMPLAINT,
        isActive: true,
      },
    });

    if (!board) {
      throw new NotFoundError('유효하지 않은 게시판입니다.');
    }

    const complaint = await prisma.complaint.create({
      data: {
        apartmentId: user.apartmentId,
        boardId: payload.boardId,
        authorId: user.id,
        title: payload.title,
        content: payload.content,
        isPublic: payload.isPublic,
        ...(payload.status
          ? { status: toComplaintStatus(payload.status) }
          : {}),
        building: user.building,
        unitNumber: user.unitNumber,
      },
    });

    const apartment = await prisma.apartment.findUnique({
      where: { id: user.apartmentId },
      select: { adminId: true },
    });

    if (apartment?.adminId && apartment.adminId !== user.id) {
      await prisma.notification.create({
        data: {
          receiverId: apartment.adminId,
          type: NotificationType.COMPLAINT_CREATED,
          title: '신규 민원 등록',
          message: `${payload.title} 민원이 등록되었습니다.`,
          relatedBoardType: BoardType.COMPLAINT,
          relatedBoardId: complaint.id,
        },
      });
    }

    return {
      message: '정상적으로 등록 처리되었습니다.',
    };
  }

  // 3) 민원 상세 조회
  async getById(id: string, actor?: Express.UserContext) {
    const complaint = await prisma.complaint.findFirst({
      where: { id, deletedAt: null },
      include: {
        board: {
          select: { type: true },
        },
        author: {
          select: { name: true },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundError('민원을 찾을 수 없습니다.');
    }

    const isOwner = actor?.id === complaint.authorId;
    const isAdmin = actor ? isAdminRole(actor.role) : false;

    if (
      actor?.role === Role.ADMIN &&
      actor.apartmentId &&
      actor.apartmentId !== complaint.apartmentId
    ) {
      throw new AppError('접근 권한이 없습니다.', 403);
    }

    if (!complaint.isPublic && !isOwner && !isAdmin) {
      throw new AppError('접근 권한이 없습니다.', 403);
    }

    await prisma.complaint.update({
      where: { id: complaint.id },
      data: { viewsCount: { increment: 1 } },
    });

    const comments = await prisma.comment.findMany({
      where: {
        boardType: BoardType.COMPLAINT,
        boardId: complaint.id,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
    });

    return toDetailResponse(complaint, comments, complaint.viewsCount + 1);
  }

  // 4) 민원 업데이트
  async update(
    actor: Express.UserContext,
    id: string,
    payload: UpdateComplaintDto
  ) {
    const complaint = await prisma.complaint.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        authorId: true,
        status: true,
        apartmentId: true,
      },
    });

    if (!complaint) {
      throw new NotFoundError('민원을 찾을 수 없습니다.');
    }

    const isOwner = actor.id === complaint.authorId;
    const isAdmin = isAdminRole(actor.role);

    if (!isOwner && !isAdmin) {
      throw new AppError('접근 권한이 없습니다.', 403);
    }

    if (isOwner && complaint.status !== ComplaintStatus.PENDING) {
      throw new AppError('처리 중인 민원은 수정할 수 없습니다.', 400);
    }

    if (
      actor.role === Role.ADMIN &&
      actor.apartmentId !== complaint.apartmentId
    ) {
      throw new AppError('접근 권한이 없습니다.', 403);
    }

    const updated = await prisma.complaint.update({
      where: { id: complaint.id },
      data: {
        title: payload.title,
        content: payload.content,
        isPublic: payload.isPublic,
      },
      include: {
        author: {
          select: { name: true },
        },
      },
    });

    return toListItem(updated);
  }

  // 5) 민원 상태 업데이트
  async updateStatus(
    actor: Express.UserContext,
    id: string,
    payload: UpdateComplaintStatusDto
  ) {
    if (!isAdminRole(actor.role)) {
      throw new AppError('접근 권한이 없습니다.', 403);
    }

    const complaint = await prisma.complaint.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        authorId: true,
        apartmentId: true,
      },
    });

    if (!complaint) {
      throw new NotFoundError('민원을 찾을 수 없습니다.');
    }

    if (
      actor.role === Role.ADMIN &&
      actor.apartmentId !== complaint.apartmentId
    ) {
      throw new AppError('접근 권한이 없습니다.', 403);
    }

    const nextStatus = toComplaintStatus(payload.status);

    await prisma.complaint.update({
      where: { id: complaint.id },
      data: { status: nextStatus },
    });

    await prisma.notification.create({
      data: {
        receiverId: complaint.authorId,
        type: NotificationType.COMPLAINT_STATUS_CHANGED,
        title: '민원 처리 상태 변경',
        message: `민원 처리 상태가 ${nextStatus}로 변경되었습니다.`,
        relatedBoardType: BoardType.COMPLAINT,
        relatedBoardId: complaint.id,
      },
    });

    const updated = await prisma.complaint.findFirst({
      where: {
        id: complaint.id,
        deletedAt: null,
      },
      include: {
        board: {
          select: { type: true },
        },
        author: {
          select: { name: true },
        },
      },
    });

    if (!updated) {
      throw new NotFoundError('민원을 찾을 수 없습니다.');
    }

    const comments = await prisma.comment.findMany({
      where: {
        boardType: BoardType.COMPLAINT,
        boardId: updated.id,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { name: true },
        },
      },
    });

    return toDetailResponse(updated, comments, updated.viewsCount);
  }

  // 6) 민원 삭제
  async remove(actor: Express.UserContext, id: string) {
    const complaint = await prisma.complaint.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        authorId: true,
        status: true,
        apartmentId: true,
      },
    });

    if (!complaint) {
      throw new NotFoundError('민원을 찾을 수 없습니다.');
    }

    const isOwner = actor.id === complaint.authorId;
    const isAdmin = isAdminRole(actor.role);

    if (!isOwner && !isAdmin) {
      throw new AppError('접근 권한이 없습니다.', 403);
    }

    if (isOwner && complaint.status !== ComplaintStatus.PENDING) {
      throw new AppError('처리 중인 민원은 삭제할 수 없습니다.', 400);
    }

    if (
      actor.role === Role.ADMIN &&
      actor.apartmentId !== complaint.apartmentId
    ) {
      throw new AppError('접근 권한이 없습니다.', 403);
    }

    await prisma.complaint.update({
      where: { id: complaint.id },
      data: { deletedAt: new Date() },
    });

    return { message: '정상적으로 삭제 처리되었습니다.' };
  }
}

export default new ComplaintRepository();
