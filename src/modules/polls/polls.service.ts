import { Role } from '@prisma/client';
import { AppError } from '../../middlewares/error-handler';
import { isAdminRole } from '../../utils/roles';
import type { CreatePollDto, ListPollsQuery, UpdatePollDto } from './polls.dto';
import pollsRepository from './polls.repository';

// ==============================================
// ⭐️ 투표 관련 Utility
// ==============================================
// 1) 투표 관리자 권한 확인 함수
const ensurePollAdmin = (actor: Express.UserContext) => {
  if (!isAdminRole(actor.role)) {
    throw new AppError('투표 관리 권한이 없습니다', 403);
  }
};

// 2) 투표 참여 권한 확인 함수
const ensureResidentVoter = (actor: Express.UserContext) => {
  if (actor.role !== Role.USER) {
    throw new AppError('투표 참여 권한이 없습니다', 403);
  }
};

// ==============================================
// ⭐️ 투표 관련 Service
// ==============================================
class PollService {
  // 1) 투표 생성
  create(actor: Express.UserContext, payload: CreatePollDto) {
    ensurePollAdmin(actor);
    return pollsRepository.create(actor, payload);
  }

  // 2) 투표 목록 조회
  list(query: ListPollsQuery, actor?: Express.UserContext) {
    return pollsRepository.list(query, actor);
  }

  // 3) 투표 상세 조회
  getById(pollId: string, actor?: Express.UserContext) {
    return pollsRepository.getById(pollId, actor);
  }

  // 4) 투표 수정
  update(actor: Express.UserContext, pollId: string, payload: UpdatePollDto) {
    ensurePollAdmin(actor);
    return pollsRepository.update(actor, pollId, payload);
  }

  // 5) 투표 삭제
  remove(actor: Express.UserContext, pollId: string) {
    ensurePollAdmin(actor);
    return pollsRepository.remove(actor, pollId);
  }

  // 6) 투표 참여
  vote(actor: Express.UserContext, optionId: string) {
    ensureResidentVoter(actor);
    return pollsRepository.vote(actor, optionId);
  }

  // 7) 투표 취소
  unvote(actor: Express.UserContext, optionId: string) {
    ensureResidentVoter(actor);
    return pollsRepository.unvote(actor, optionId);
  }
}

export default new PollService();
