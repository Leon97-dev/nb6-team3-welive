// ==============================================
// ⭐️ 댓글 관련 DTO
// ==============================================
// 1) 댓글이 작성될 게시판 유형 정의
export type BoardType = 'NOTICE' | 'POLL' | 'COMPLAINT';

// 2) 댓글 생성 DTO 정의
export interface CreateCommentDto {
  boardId: string;
  boardType: BoardType;
  content: string;
}

// 3) 댓글 수정 DTO 정의
export interface UpdateCommentDto {
  boardId: string;
  boardType: BoardType;
  content: string;
}
