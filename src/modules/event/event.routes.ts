import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import eventController from './event.controller';
import asyncHandler from '../../middlewares/async-handler';

const router = Router();

// ==============================================
// ⭐️ 이벤트 관련 Router
// ==============================================
// 1) 이벤트 목록 조회
router.get('/', requireAuth, asyncHandler(eventController.getEvents));

// 2) 이벤트 생성/업데이트
router.post('/', requireAuth, asyncHandler(eventController.upsertEvent));

// 3) 이벤트 삭제
router.delete(
  '/:eventId',
  requireAuth,
  asyncHandler(eventController.deleteEvent)
);

export default router;
