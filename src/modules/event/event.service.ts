import type { GetEventsQuery, UpsertEventQuery } from './event.dto';
import eventRepository from './event.repository';

// ==============================================
// ⭐️ 이벤트 관련 Service
// ==============================================
class EventService {
  // 1) 이벤트 목록 조회
  getEvents(query: GetEventsQuery, actor: Express.UserContext) {
    return eventRepository.getEvents(query, actor);
  }

  // 2) 이벤트 생성/업데이트
  upsertEvent(query: UpsertEventQuery, actor: Express.UserContext) {
    return eventRepository.upsertEvent(query, actor);
  }

  // 3) 이벤트 삭제
  deleteEvent(eventId: string, actor: Express.UserContext) {
    return eventRepository.deleteEvent(eventId, actor);
  }
}

export default new EventService();
