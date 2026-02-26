import { Role } from '@prisma/client';
import { AppError } from '../../middlewares/error-handler';
import type {
  CreateResidentDto,
  ListResidentsQuery,
  UpdateResidentDto,
} from './resident.dto';
import residentRepository from './resident.repository';

// ==============================================
// ⭐️ 입주민 관련 Utility
// ==============================================
// 1) 관리자 권한 확인 유틸리티 (관리자만 입주민 관리 가능)
const ensureAdmin = (actor: Express.UserContext) => {
  if (actor.role !== Role.ADMIN) {
    throw new AppError('입주민 관리 권한이 없습니다', 403);
  }
};

// ==============================================
// ⭐️ 입주민 관련 Service
// ==============================================
class ResidentService {
  // 1) 입주민 목록 조회 (관리자용, 템플릿 CSV 다운로드)
  list(query: ListResidentsQuery, actor: Express.UserContext) {
    ensureAdmin(actor);
    return residentRepository.list(query, actor);
  }

  // 2) 입주민 생성 (관리자용)
  create(actor: Express.UserContext, payload: CreateResidentDto) {
    ensureAdmin(actor);
    return residentRepository.create(actor, payload);
  }

  // 3) 사용자 ID로 입주민 생성 (관리자용)
  createFromUser(actor: Express.UserContext, userId: string) {
    ensureAdmin(actor);
    return residentRepository.createFromUser(actor, userId);
  }

  // 4) CSV 파일로 입주민 일괄 등록 (관리자용)
  importFromCsv(actor: Express.UserContext, filePath: string) {
    ensureAdmin(actor);
    return residentRepository.importFromCsv(actor, filePath);
  }

  // 5) 입주민 목록 조회 (관리자용, CSV 다운로드)
  downloadCsv(actor: Express.UserContext, query: ListResidentsQuery) {
    ensureAdmin(actor);
    return residentRepository.downloadCsv(actor, query);
  }

  // 6) 입주민 목록 조회 (관리자용, 템플릿 CSV 다운로드)
  getTemplateCsv() {
    return residentRepository.getTemplateCsv();
  }

  // 7) 입주민 상세 조회 (관리자용)
  getById(actor: Express.UserContext, residentId: string) {
    ensureAdmin(actor);
    return residentRepository.getById(actor, residentId);
  }

  // 8) 입주민 정보 수정 (관리자용)
  update(
    actor: Express.UserContext,
    residentId: string,
    payload: UpdateResidentDto
  ) {
    ensureAdmin(actor);
    return residentRepository.update(actor, residentId, payload);
  }

  // 9) 입주민 삭제 (관리자용)
  remove(actor: Express.UserContext, residentId: string) {
    ensureAdmin(actor);
    return residentRepository.remove(actor, residentId);
  }
}

export default new ResidentService();
