import { BoardType } from '@prisma/client';
import prisma from '../../config/prisma';
import { NotFoundError } from '../../middlewares/error-handler';

// ==============================================
// ⭐️ 알림 관련 Utility
// ==============================================
type NotificationEntity = {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  relatedBoardType: BoardType | null;
  relatedBoardId: string | null;
};

const toNotificationPayload = (notification: NotificationEntity) => {
  const complaintId =
    notification.relatedBoardType === BoardType.COMPLAINT
      ? (notification.relatedBoardId ?? undefined)
      : undefined;
  const noticeId =
    notification.relatedBoardType === BoardType.NOTICE
      ? (notification.relatedBoardId ?? undefined)
      : undefined;
  const pollId =
    notification.relatedBoardType === BoardType.POLL
      ? (notification.relatedBoardId ?? undefined)
      : undefined;

  return {
    notificationId: notification.id,
    content: notification.message,
    notificationType: notification.type,
    notifiedAt: notification.createdAt.toISOString(),
    isChecked: notification.isRead,
    ...(complaintId ? { complaintId } : {}),
    ...(noticeId ? { noticeId } : {}),
    ...(pollId ? { pollId } : {}),
  };
};

// ==============================================
// ⭐️ 알림 관련 Repository
// ==============================================
class NotificationRepository {
  // 1) 특정 사용자에 대한 읽지 않은 알림 목록 조회
  async getUnread(receiverId: string) {
    const notifications = await prisma.notification.findMany({
      where: {
        receiverId,
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        type: true,
        message: true,
        isRead: true,
        createdAt: true,
        relatedBoardType: true,
        relatedBoardId: true,
      },
    });

    return notifications.map(toNotificationPayload);
  }

  // 2) 알림을 읽음 처리
  async markAsRead(receiverId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        receiverId,
      },
      select: { id: true },
    });

    if (!notification) {
      throw new NotFoundError('알림을 찾을 수 없습니다.');
    }

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      select: {
        id: true,
        type: true,
        message: true,
        isRead: true,
        createdAt: true,
        relatedBoardType: true,
        relatedBoardId: true,
      },
    });

    return toNotificationPayload(updated);
  }
}

export default new NotificationRepository();
