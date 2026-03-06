import noticesRepository from '../notices/notices.repository';
import notificationsRepository from './notifications.repository';

// ==============================================
// ⭐️ 알림 관련 Service
// ==============================================
class NotificationService {
  // 1) 특정 사용자에 대한 읽지 않은 알림 목록 조회
  getUnread(userId: string) {
    return notificationsRepository.getUnread(userId);
  }

  // 2) 알림을 읽음 처리
  markAsRead(userId: string, notificationId: string) {
    return notificationsRepository.markAsRead(userId, notificationId);
  }
}

export default new NotificationService();
