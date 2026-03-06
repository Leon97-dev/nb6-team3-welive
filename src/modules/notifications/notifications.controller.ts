import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../middlewares/error-handler';
import { logger } from '../../utils/logger';
import notificationsService from './notifications.service';

// ==============================================
// ⭐️ 알림 관련 Controller
// ==============================================
class NotificationController {
  // 1) 알림 SSE 연결
  async sse(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다.');
    }

    res.setHeader('Content-Type', 'text/event-stream: charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    res.write('retry: 10000\n\n');

    const userId = req.user.id;
    const sentIds = new Set<string>();

    const emitAlarm = (payload: unknown) => {
      res.write(`event: alarm\n`);
      res.write(
        `data: ${JSON.stringify({ type: 'alarm', data: payload })}\n\n`
      );
    };

    const initial = await notificationsService.getUnread(userId);
    if (initial.length > 0) {
      initial.forEach((notification) =>
        sentIds.add(notification.notificationId)
      );
      emitAlarm(initial);
    }

    const pollInterval = setInterval(async () => {
      try {
        const unread = await notificationsService.getUnread(userId);
        const fresh = unread.filter(
          (notification) => !sentIds.has(notification.notificationId)
        );

        if (fresh.length > 0) {
          fresh.forEach((notification) =>
            sentIds.add(notification.notificationId)
          );
          emitAlarm(fresh);
        }
      } catch (error) {
        logger.error('알림 SSE 폴링 중 오류 발생', { error });
      }
    }, 30000);

    const keepAliveInterval = setInterval(() => {
      res.write(': keep-alive\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(pollInterval);
      clearInterval(keepAliveInterval);
      res.end();
    });
  }

  async markAsRead(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다.');
    }

    const notificationId = String(req.params.notificationId);
    const result = await notificationsService.markAsRead(
      req.user.id,
      notificationId
    );

    res.status(200).json(result);
  }
}

export default new NotificationController();
