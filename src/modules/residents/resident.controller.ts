import fs from 'fs/promises';
import type { Request, Response } from 'express';
import { Role } from '@prisma/client';
import {
  AppError,
  ForbiddenError,
  UnauthorizedError,
} from '../../middlewares/error-handler';
import residentService from './resident.service';
import type { ListResidentsQuery } from './resident.dto';
import {
  validateCreateResident,
  validateListResidentsQuery,
  validateUpdateResident,
} from './resident.validator';

// ==============================================
// ⭐️ 입주민 관련 Utility
// ==============================================
// 1) CSV 파일명 생성 유틸리티
const buildFileName = (prefix: string) => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${prefix}_${yyyy}${mm}${dd}_${hh}${mi}${ss}.csv`;
};

// ==============================================
// ⭐️ 입주민 관련 Controller
// ==============================================
class ResidentController {
  // 1) 입주민 목록 조회 (관리자용)
  async list(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const result = await residentService.list(
      validateListResidentsQuery(req.query) as ListResidentsQuery,
      req.user
    );

    res.status(200).json(result);
  }

  // 2) 입주민 생성 (관리자용)
  async create(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const result = await residentService.create(
      req.user,
      validateCreateResident(req.body)
    );

    res.status(201).json(result);
  }

  // 3) 사용자 ID로 입주민 생성 (관리자용)
  async createFromUser(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const userId = String(req.params.userId);
    const result = await residentService.createFromUser(req.user, userId);

    res.status(201).json(result);
  }

  // 4) CSV 파일로 입주민 일괄 등록 (관리자용)
  async importFromCsv(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    if (!req.file?.path) {
      throw new AppError('CSV 파일이 필요합니다', 400);
    }

    try {
      const result = await residentService.importFromCsv(
        req.user,
        req.file.path
      );
      res.status(201).json(result);
    } finally {
      await fs.unlink(req.file.path).catch(() => {});
    }
  }

  async downloadFile(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const csv = await residentService.downloadCsv(
      req.user,
      validateListResidentsQuery(req.query) as ListResidentsQuery
    );
    const fileName = buildFileName('입주민명부');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="residents.csv"; filename*=UTF-8''${encodeURIComponent(
        fileName
      )}`
    );

    res.status(200).send(csv);
  }

  // 6) 입주민 목록 조회 (관리자용, 템플릿 CSV 다운로드)
  async downloadTemplate(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }
    if (req.user.role !== Role.ADMIN) {
      throw new ForbiddenError('접근 권한이 없습니다');
    }

    const csv = residentService.getTemplateCsv();

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="residents.csv"; filename*=UTF-8''${encodeURIComponent(
        '입주민명부_템플릿.csv'
      )}`
    );

    res.status(200).send(csv);
  }

  // 7) 입주민 상세 조회 (관리자용)
  async getById(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const id = String(req.params.id);
    const result = await residentService.getById(req.user, id);

    res.status(200).json(result);
  }

  // 8) 입주민 정보 수정 (관리자용)
  async update(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const id = String(req.params.id);
    const result = await residentService.update(
      req.user,
      id,
      validateUpdateResident(req.body)
    );

    res.status(200).json(result);
  }

  // 9) 입주민 삭제 (관리자용)
  async remove(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const id = String(req.params.id);
    const result = await residentService.remove(req.user, id);

    res.status(200).json(result);
  }
}

export default new ResidentController();
