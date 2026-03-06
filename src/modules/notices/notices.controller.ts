import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../middlewares/error-handler';
import noticesService from './notices.service';
import type {
  CreateNoticeDto,
  ListNoticesQuery,
  UpdateNoticeDto,
} from './notices.dto';

// ==============================================
// ⭐️ 공지사항 관련 Controller
// ==============================================
class NoticeController {
  // 1) 공지사항 목록 조회
  async list(req: Request, res: Response) {
    const result = await noticesService.list(
      req.query as ListNoticesQuery,
      req.user
    );

    res.json(result);
  }

  // 2) 공지사항 상세 조회
  async getById(req: Request, res: Response) {
    const noticeId = String(req.params.noticeId);
    const result = await noticesService.getById(noticeId, req.user);

    res.json(result);
  }

  // 3) 공지사항 생성
  async create(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다.');
    }

    const result = await noticesService.create(
      req.user,
      req.body as CreateNoticeDto
    );

    res.status(201).json(result);
  }

  // 4) 공지사항 수정
  async update(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다.');
    }

    const noticeId = String(req.params.noticeId);
    const result = await noticesService.update(
      req.user,
      noticeId,
      req.body as UpdateNoticeDto
    );

    res.status(200).json(result);
  }

  // 5) 공지사항 삭제
  async remove(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다.');
    }

    const noticeId = String(req.params.noticeId);
    const result = await noticesService.remove(req.user, noticeId);

    res.status(200).send(result);
  }
}

export default new NoticeController();
