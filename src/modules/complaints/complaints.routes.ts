import { Router } from 'express';
import ComplaintController from './complaints.controller';
import { requireAuth } from '../../middlewares/auth';
import asyncHandler from '../../middlewares/async-handler';

const router = Router();

// ==============================================
// ⭐️ 민원 관련 Router
// ==============================================
// 1) 민원 목록 조회
router.get('/', asyncHandler(ComplaintController.list));

// 2) 민원 생성
router.post('/', requireAuth, asyncHandler(ComplaintController.create));

// 3) 민원 상세 조회
router.get('/:id', asyncHandler(ComplaintController.getById));

// 4) 민원 업데이트
router.put('/:id', requireAuth, asyncHandler(ComplaintController.update));

// 5) 민원 상태 업데이트
router.patch(
  '/:id/status',
  requireAuth,
  asyncHandler(ComplaintController.updateStatus)
);

// 6) 민원 삭제
router.delete('/:id', requireAuth, asyncHandler(ComplaintController.remove));

export default router;
