import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import notificationsController from './notifications.controller';
import asyncHandler from '../../middlewares/async-handler';

const router = Router();

// ==============================================
// ⭐️ 알림 관련 Router
// ==============================================
// 1) 읽지 않은 알림 목록 조회
router.get('/unread', requireAuth, asyncHandler(notificationsController.sse));

// 2) 알림 읽음 처리
router.patch(
  '/:notificationId/read',
  requireAuth,
  asyncHandler(notificationsController.markAsRead)
);

export default router;
