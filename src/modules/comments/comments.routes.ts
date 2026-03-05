import { Router } from 'express';
import commentsController from './comments.controller';
import { requireAuth } from '../../middlewares/auth';
import asyncHandler from '../../middlewares/async-handler';

const router = Router();

// ==============================================
// ⭐️ 댓글 관련 Router
// ==============================================
// 1) 댓글 생성
router.post('/', requireAuth, asyncHandler(commentsController.create));

// 2) 댓글 수정
router.patch(
  '/:commentId',
  requireAuth,
  asyncHandler(commentsController.update)
);

// 3) 댓글 삭제
router.delete(
  '/:commentId',
  requireAuth,
  asyncHandler(commentsController.remove)
);

export default router;
