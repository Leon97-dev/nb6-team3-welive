import type { Request, Response } from 'express';
import { AppError, UnauthorizedError } from '../../middlewares/error-handler';
import type { GetEventsQuery, UpsertEventQuery } from './event.dto';
import eventService from './event.service';

// ==============================================
// ⭐️ 이벤트 관련 Controller
// ==============================================
class EventController {
  // 1) 이벤트 목록 조회
  async getEvents(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다.');
    }

    const result = await eventService.getEvents(
      req.query as GetEventsQuery,
      req.user
    );

    res.status(200).json(result);
  }

  // 2) 이벤트 생성/업데이트
  async upsertEvent(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다.');
    }

    const query = req.query as UpsertEventQuery;
    if (
      !query.boardType ||
      !query.boardId ||
      !query.startDate ||
      !query.endDate
    ) {
      throw new AppError('필수 쿼리 파라미터가 누락되었습니다.', 400);
    }

    await eventService.upsertEvent(query, req.user);

    res.status(204).send();
  }

  // 3) 이벤트 삭제
  async deleteEvent(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다.');
    }

    const eventId = String(req.params.eventId ?? '');
    if (!eventId) {
      throw new AppError('이벤트 ID가 필요합니다.', 400);
    }

    const result = await eventService.deleteEvent(eventId, req.user);

    res.status(200).json(result);
  }
}

export default new EventController();
