import { AppError } from '../../middlewares/error-handler';
import { isAdminRole } from '../../utils/roles';
import type {
  CreateComplaintDto,
  ListComplaintsQuery,
  UpdateComplaintDto,
  UpdateComplaintStatusDto,
} from './complaints.dto';
import ComplaintRepository from './complaints.repository';

// ==============================================
// ⭐️ 민원 관련 Service
// ==============================================
class ComplaintService {
  // 1) 민원 목록 조회
  list(query: ListComplaintsQuery, actor?: Express.UserContext) {
    return ComplaintRepository.list(query, actor);
  }

  // 2) 민원 생성
  create(actor: Express.UserContext, payload: CreateComplaintDto) {
    return ComplaintRepository.create(actor, payload);
  }

  // 3) 민원 업데이트
  getById(id: string, actor?: Express.UserContext) {
    return ComplaintRepository.getById(id, actor);
  }

  // 4) 민원 업데이트
  update(actor: Express.UserContext, id: string, payload: UpdateComplaintDto) {
    return ComplaintRepository.update(actor, id, payload);
  }

  // 5) 민원 상태 업데이트
  updateStatus(
    actor: Express.UserContext,
    id: string,
    payload: UpdateComplaintStatusDto
  ) {
    if (!isAdminRole(actor.role)) {
      throw new AppError('권한이 없습니다.', 403);
    }

    return ComplaintRepository.updateStatus(actor, id, payload);
  }

  // 6) 민원 삭제
  remove(actor: Express.UserContext, id: string) {
    return ComplaintRepository.remove(actor, id);
  }
}

export default new ComplaintService();
