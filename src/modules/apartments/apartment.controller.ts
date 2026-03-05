import type { Request, Response } from 'express';
import apartmentService from './apartment.service';
import type { ListApartmentsQuery } from './apartment.dto';

// ==============================================
// ⭐️ 아파트 관련 Controller
// ==============================================
class ApartmentController {
  // 1) 아파트 목록 조회 (관리자용)
  async list(req: Request, res: Response) {
    const result = await apartmentService.list(
      req.query as ListApartmentsQuery,
      req.user
    );

    res.status(200).json(result);
  }

  // 2) 아파트 목록 조회 (공개용)
  async listPublic(_req: Request, res: Response) {
    const result = await apartmentService.listPublic();

    res.status(200).json(result);
  }

  // 3) 아파트 상세 조회 (관리자용)
  async getById(req: Request, res: Response) {
    const apartmentId = String(req.params.apartmentId);
    const result = await apartmentService.getById(apartmentId, req.user);

    res.status(200).json(result);
  }

  // 4) 아파트 상세 조회 (공개용)
  async getPublicById(req: Request, res: Response) {
    const apartmentId = String(req.params.apartmentId);
    const result = await apartmentService.getPublicById(apartmentId);

    res.status(200).json(result);
  }
}

export default new ApartmentController();
