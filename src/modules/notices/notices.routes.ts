import { Router } from 'express';
import noticesController from './notices.controller';
import { requireAuth } from '../../middlewares/auth';
import asyncHandler from '../../middlewares/async-handler';

const router = Router();

// ==============================================
// ⭐️ 공지사항 관련 Router
// ==============================================
// 1) 공지사항 목록 조회
router.get('/', asyncHandler(noticesController.list));

// 2) 공지사항 상세 조회
router.get('/:noticeId', asyncHandler(noticesController.getById));

// 3) 공지사항 생성 (관리자 권한 필요)
router.post('/', requireAuth, asyncHandler(noticesController.create));

// 4) 공지사항 수정 (관리자 권한 필요)
router.patch('/:noticeId', requireAuth, asyncHandler(noticesController.update));

// 5) 공지사항 삭제 (관리자 권한 필요)
router.delete(
  '/:noticeId',
  requireAuth,
  asyncHandler(noticesController.remove)
);

export default router;
