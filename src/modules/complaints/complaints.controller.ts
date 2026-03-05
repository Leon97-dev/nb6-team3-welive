import type { Request, Response } from 'express';
import ComplaintService from './complaints.service';
import type {
  CreateComplaintDto,
  ListComplaintsQuery,
  UpdateComplaintDto,
  UpdateComplaintStatusDto,
} from './complaints.dto';
import { UnauthorizedError } from '../../middlewares/error-handler';

// ==============================================
// ⭐️ 민원 관련 Controller
// ==============================================
class ComplaintController {
  // 1) 민원 목록 조회
  async list(req: Request, res: Response) {
    const result = await ComplaintService.list(
      req.query as ListComplaintsQuery,
      req.user
    );

    res.status(200).json(result);
  }

  // 2) 민원 생성
  async create(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다.');
    }

    const result = await ComplaintService.create(
      req.user,
      req.body as CreateComplaintDto
    );

    res.status(201).json(result);
  }

  // 3) 민원 상세 조회
  async getById(req: Request, res: Response) {
    const id = String(req.params.id);
    const result = await ComplaintService.getById(id, req.user);

    res.status(200).json(result);
  }

  // 4) 민원 업데이트
  async update(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다.');
    }

    const id = String(req.params.id);
    const result = await ComplaintService.update(
      req.user,
      id,
      req.body as UpdateComplaintDto
    );

    res.status(200).json(result);
  }

  // 5) 민원 상태 업데이트
  async updateStatus(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다.');
    }

    const id = String(req.params.id);
    const result = await ComplaintService.updateStatus(
      req.user,
      id,
      req.body as UpdateComplaintStatusDto
    );

    res.status(200).json(result);
  }

  // 6) 민원 삭제
  async remove(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다.');
    }

    const id = String(req.params.id);
    const result = await ComplaintService.remove(req.user, id);

    res.status(200).json(result);
  }
}

export default new ComplaintController();
