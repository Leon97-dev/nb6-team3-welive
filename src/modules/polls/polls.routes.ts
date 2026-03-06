import { Router } from 'express';
import pollsController from './polls.controller';
import { requireAuth } from '../../middlewares/auth';
import asyncHandler from '../../middlewares/async-handler';

const router = Router();

// ==============================================
// ⭐️ 투표 관련 Router
// ==============================================
// 1) 투표 생성 (로그인 필요)
router.post('/', requireAuth, asyncHandler(pollsController.create));

// 2) 투표 목록 조회
router.get('/', asyncHandler(pollsController.list));

// 3) 투표 상세 조회
router.get('/:pollId', asyncHandler(pollsController.getById));

// 4) 투표 수정 (로그인 필요)
router.patch('/:pollId', requireAuth, asyncHandler(pollsController.update));

// 5) 투표 삭제 (로그인 필요)
router.delete('/:pollId', requireAuth, asyncHandler(pollsController.remove));

// 6) 투표 참여 (로그인 필요)
router.post('/:optionId/vote', requireAuth, asyncHandler(pollsController.vote));

// 7) 투표 취소 (로그인 필요)
router.delete(
  '/:optionId/vote',
  requireAuth,
  asyncHandler(pollsController.unvote)
);

export default router;
