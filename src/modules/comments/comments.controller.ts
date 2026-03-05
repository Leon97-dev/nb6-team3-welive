import type { Request, Response } from 'express';
import commentsService from './comments.service';
import type { CreateCommentDto, UpdateCommentDto } from './comments.dto';
import { UnauthorizedError } from '../../middlewares/error-handler';

// ==============================================
// ⭐️ 댓글 관련 Controller
// ==============================================
class CommentController {
  // 1) 댓글 생성
  async create(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const result = await commentsService.create(
      req.user,
      req.body as CreateCommentDto
    );

    res.status(201).json(result);
  }

  // 2) 댓글 수정
  async update(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const commentId = String(req.params.commentId);
    const result = await commentsService.update(
      req.user,
      commentId,
      req.body as UpdateCommentDto
    );

    res.status(200).json(result);
  }

  // 3) 댓글 삭제
  async remove(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const commentId = String(req.params.commentId);
    const result = await commentsService.remove(req.user, commentId);

    res.status(200).json(result);
  }
}

export default new CommentController();
