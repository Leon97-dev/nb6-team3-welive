import { BoardType, Role, type Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import { AppError, NotFoundError } from '../../middlewares/error-handler';
import type { CreateCommentDto, UpdateCommentDto } from './comments.dto';

// ==============================================
// ⭐️ 댓글 관련 Utility
// ==============================================
// 1) 게시판 유형 변환 함수 (문자열을 BoardType으로 변환)
const toBoardType = (value: string): BoardType => {
  if (
    value === BoardType.NOTICE ||
    value === BoardType.POLL ||
    value === BoardType.COMPLAINT
  ) {
    return value;
  }
  throw new AppError('유효하지 않은 게시판 타입입니다', 400);
};

// 2) 게시판 소유자 정보 조회 함수
const getBoardOwner = async (
  db: Prisma.TransactionClient | typeof prisma,
  boardType: BoardType,
  boardId: string
) => {
  if (boardType === BoardType.NOTICE) {
    const notice = await db.notice.findFirst({
      where: { id: boardId, deletedAt: null },
      select: { id: true, apartmentId: true },
    });

    if (!notice) {
      throw new NotFoundError('공지사항을 찾을 수 없습니다');
    }

    return { apartmentId: notice.apartmentId, boardType, boardId: notice.id };
  }

  if (boardType === BoardType.POLL) {
    const poll = await db.poll.findFirst({
      where: { id: boardId, deletedAt: null },
      select: { id: true, apartmentId: true },
    });

    if (!poll) {
      throw new NotFoundError('투표를 찾을 수 없습니다');
    }
    return { apartmentId: poll.apartmentId, boardType, boardId: poll.id };
  }

  const complaint = await db.complaint.findFirst({
    where: { id: boardId, deletedAt: null },
    select: { id: true, apartmentId: true },
  });

  if (!complaint) {
    throw new NotFoundError('민원을 찾을 수 없습니다');
  }

  return {
    apartmentId: complaint.apartmentId,
    boardType,
    boardId: complaint.id,
  };
};

// 3) 댓글 수 업데이트 함수
const updateCommentsCount = async (
  db: Prisma.TransactionClient,
  boardType: BoardType,
  boardId: string,
  value: number
): Promise<void> => {
  if (boardType === BoardType.NOTICE) {
    await db.notice.update({
      where: { id: boardId },
      data: { commentsCount: { increment: value } },
    });
    return;
  }

  if (boardType === BoardType.POLL) {
    return;
  }

  await db.complaint.update({
    where: { id: boardId },
    data: { commentsCount: { increment: value } },
  });
};

// ==============================================
// ⭐️ 댓글 관련 Repository
// ==============================================
class CommentRepository {
  // 1) 댓글 생성 함수 정의
  async create(actor: Express.UserContext, payload: CreateCommentDto) {
    if (!actor.id) {
      throw new AppError('로그인이 필요합니다', 401);
    }

    const boardType = toBoardType(payload.boardType);
    const target = await getBoardOwner(prisma, boardType, payload.boardId);

    if (
      actor.role === Role.ADMIN &&
      actor.apartmentId &&
      actor.apartmentId !== target?.apartmentId
    ) {
      throw new AppError('다른 아파트 게시물에는 댓글을 달 수 없습니다', 403);
    }

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          apartmentId: target.apartmentId,
          boardType,
          boardId: payload.boardId,
          authorId: actor.id,
          content: payload.content,
        },
        include: {
          author: {
            select: {
              name: true,
            },
          },
        },
      });

      await updateCommentsCount(tx, boardType, payload.boardId, 1);
      return created;
    });

    return {
      comment: {
        id: comment.id,
        userId: comment.authorId,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        writerName: comment.author.name,
      },
      board: {
        id: target.boardId,
        boardType: target.boardType,
      },
    };
  }

  // 2) 댓글 수정 함수 정의
  async update(
    actor: Express.UserContext,
    commentId: string,
    payload: UpdateCommentDto
  ) {
    const comment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        deletedAt: null,
      },
      select: {
        id: true,
        authorId: true,
        boardType: true,
        boardId: true,
      },
    });

    if (!comment) {
      throw new NotFoundError('댓글을 찾을 수 없습니다');
    }

    const isOwner = comment.authorId === actor.id;
    const isAdmin =
      actor.role === Role.ADMIN || actor.role === Role.SUPER_ADMIN;

    if (!isOwner && !isAdmin) {
      throw new AppError('댓글 수정 권한이 없습니다', 403);
    }

    if (actor.role === Role.ADMIN && actor.apartmentId) {
      const board = await getBoardOwner(
        prisma,
        comment.boardType,
        comment.boardId
      );
      if (board.apartmentId !== actor.apartmentId) {
        throw new AppError('다른 아파트 댓글은 수정할 수 없습니다', 403);
      }
    }

    const updated = await prisma.comment.update({
      where: { id: comment.id },
      data: { content: payload.content },
      include: {
        author: {
          select: {
            name: true,
          },
        },
      },
    });

    return {
      comment: {
        id: updated.id,
        userId: updated.authorId,
        content: updated.content,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        writerName: updated.author.name,
      },
      board: {
        id: comment.boardId,
        boardType: comment.boardType,
      },
    };
  }

  // 3) 댓글 삭제 함수 정의
  async remove(actor: Express.UserContext, commentId: string) {
    const comment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        deletedAt: null,
      },
      select: {
        id: true,
        authorId: true,
        boardType: true,
        boardId: true,
      },
    });

    if (!comment) {
      throw new NotFoundError('댓글을 찾을 수 없습니다');
    }

    const isOwner = comment.authorId === actor.id;
    const isAdmin =
      actor.role === Role.ADMIN || actor.role === Role.SUPER_ADMIN;

    if (!isOwner && !isAdmin) {
      throw new AppError('댓글 삭제 권한이 없습니다', 403);
    }

    if (actor.role === Role.ADMIN && actor.apartmentId) {
      const board = await getBoardOwner(
        prisma,
        comment.boardType,
        comment.boardId
      );

      if (board.apartmentId !== actor.apartmentId) {
        throw new AppError('다른 아파트 댓글은 삭제할 수 없습니다', 403);
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.comment.update({
        where: { id: comment.id },
        data: { deletedAt: new Date() },
      });

      await updateCommentsCount(tx, comment.boardType, comment.boardId, -1);
    });

    return {
      message: '정상적으로 삭제 처리되었습니다',
    };
  }
}

export default new CommentRepository();
