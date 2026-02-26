import { Role } from '@prisma/client';
import { AppError } from '../../middlewares/error-handler';
import type {
  CreateResidentDto,
  ListResidentsQuery,
  UpdateResidentDto,
} from './resident.dto';
import { residentsRepository } from './resident.repository';

const ensureAdmin = (actor: Express.UserContext) => {
  if (actor.role !== Role.ADMIN) {
    throw new AppError('입주민 관리 권한이 없습니다', 403);
  }
};

export const residentsService = {
  list(query: ListResidentsQuery, actor: Express.UserContext) {
    ensureAdmin(actor);
    return residentsRepository.list(query, actor);
  },

  create(actor: Express.UserContext, payload: CreateResidentDto) {
    ensureAdmin(actor);
    return residentsRepository.create(actor, payload);
  },

  createFromUser(actor: Express.UserContext, userId: string) {
    ensureAdmin(actor);
    return residentsRepository.createFromUser(actor, userId);
  },

  importFromCsv(actor: Express.UserContext, filePath: string) {
    ensureAdmin(actor);
    return residentsRepository.importFromCsv(actor, filePath);
  },

  downloadCsv(actor: Express.UserContext, query: ListResidentsQuery) {
    ensureAdmin(actor);
    return residentsRepository.downloadCsv(actor, query);
  },

  getTemplateCsv() {
    return residentsRepository.getTemplateCsv();
  },

  getById(actor: Express.UserContext, residentId: string) {
    ensureAdmin(actor);
    return residentsRepository.getById(actor, residentId);
  },

  update(
    actor: Express.UserContext,
    residentId: string,
    payload: UpdateResidentDto
  ) {
    ensureAdmin(actor);
    return residentsRepository.update(actor, residentId, payload);
  },

  remove(actor: Express.UserContext, residentId: string) {
    ensureAdmin(actor);
    return residentsRepository.remove(actor, residentId);
  },
};
