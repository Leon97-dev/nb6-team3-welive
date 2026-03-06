import { AppError } from '../../middlewares/error-handler';
import { isAdminRole } from '../../utils/roles';
import type {
  CreateNoticeDto,
  UpdateNoticeDto,
  ListNoticesQuery,
} from './notices.dto';
import noticesRepository from './notices.repository';

// ==============================================
// ⭐️ 공지사항 관련 Utility
// ==============================================
// 1) 공지사항 관리자 권한 확인 함수
const ensureNoticeAdmin = (actor: Express.UserContext) => {
  if (!isAdminRole(actor.role)) {
    throw new AppError('공지사항을 관리할 권한이 없습니다.', 403);
  }
};

// ==============================================
// ⭐️ 공지사항 관련 Service
// ==============================================
class NoticeService {
  // 1) 공지사항 목록 조회
  list(query: ListNoticesQuery, actor?: Express.UserContext) {
    return noticesRepository.list(query, actor);
  }

  // 2) 공지사항 상세 조회
  getById(noticeId: string, actor?: Express.UserContext) {
    return noticesRepository.getById(noticeId, actor);
  }

  // 3) 공지사항 생성
  create(actor: Express.UserContext, payload: CreateNoticeDto) {
    ensureNoticeAdmin(actor);
    return noticesRepository.create(actor, payload);
  }

  // 4) 공지사항 수정
  update(
    actor: Express.UserContext,
    noticeId: string,
    payload: UpdateNoticeDto
  ) {
    ensureNoticeAdmin(actor);
    return noticesRepository.update(actor, noticeId, payload);
  }

  // 5) 공지사항 삭제
  remove(actor: Express.UserContext, noticeId: string) {
    ensureNoticeAdmin(actor);
    return noticesRepository.remove(actor, noticeId);
  }
}

export default new NoticeService();
