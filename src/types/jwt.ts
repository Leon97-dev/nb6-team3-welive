import type { JwtPayload } from 'jsonwebtoken';

// ==============================================
// ⭐️ JWT 관련 타입 정의
// ==============================================
// 1) 액세스 토큰 페이로드 타입 정의 (사용자 ID, 역할, 아파트 정보 포함)
export type TokenPayload = JwtPayload & { id: number };
