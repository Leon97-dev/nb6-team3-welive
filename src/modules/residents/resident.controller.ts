import fs from 'fs/promises';
import type { Request, Response } from 'express';
import { Role } from '@prisma/client';
import {
  AppError,
  ForbiddenError,
  UnauthorizedError,
} from '../../middlewares/error-handler';
import { residentsService } from './resident.service';
import type {
  CreateResidentDto,
  ListResidentsQuery,
  UpdateResidentDto,
} from './resident.dto';

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

export const residentsController = {
  async list(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const result = await residentsService.list(
      req.query as ListResidentsQuery,
      req.user
    );
    res.status(200).json(result);
  },

  async create(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const result = await residentsService.create(
      req.user,
      req.body as CreateResidentDto
    );
    res.status(201).json(result);
  },

  async createFromUser(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const userId = String(req.params.userId);
    const result = await residentsService.createFromUser(req.user, userId);
    res.status(201).json(result);
  },

  async importFromCsv(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    if (!req.file?.path) {
      throw new AppError('CSV 파일이 필요합니다', 400);
    }

    try {
      const result = await residentsService.importFromCsv(
        req.user,
        req.file.path
      );
      res.status(201).json(result);
    } finally {
      await fs.unlink(req.file.path).catch(() => {});
    }
  },

  async downloadFile(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const csv = await residentsService.downloadCsv(
      req.user,
      req.query as ListResidentsQuery
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
  },

  async downloadTemplate(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }
    if (req.user.role !== Role.ADMIN) {
      throw new ForbiddenError('접근 권한이 없습니다');
    }

    const csv = residentsService.getTemplateCsv();

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="residents.csv"; filename*=UTF-8''${encodeURIComponent(
        '입주민명부_템플릿.csv'
      )}`
    );
    res.status(200).send(csv);
  },

  async getById(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const id = String(req.params.id);
    const result = await residentsService.getById(req.user, id);
    res.status(200).json(result);
  },

  async update(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const id = String(req.params.id);
    const result = await residentsService.update(
      req.user,
      id,
      req.body as UpdateResidentDto
    );
    res.status(200).json(result);
  },

  async remove(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const id = String(req.params.id);
    const result = await residentsService.remove(req.user, id);
    res.status(200).json(result);
  },
};
