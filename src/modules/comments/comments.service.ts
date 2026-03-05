import type { CreateCommentDto, UpdateCommentDto } from './comments.dto';
import commentsRepository from './comments.repository';

// ==============================================
// ⭐️ 댓글 관련 Service
// ==============================================
class CommentService {
  // 1) 댓글 생성
  create(actor: Express.UserContext, payload: CreateCommentDto) {
    return commentsRepository.create(actor, payload);
  }

  // 2) 댓글 수정
  update(
    actor: Express.UserContext,
    commentId: string,
    payload: UpdateCommentDto
  ) {
    return commentsRepository.update(actor, commentId, payload);
  }

  // 3) 댓글 삭제
  remove(actor: Express.UserContext, commentId: string) {
    return commentsRepository.remove(actor, commentId);
  }
}

export default new CommentService();
