/**
 * @name JWT-Types
 * @category Common
 * @description
 * JWT 토큰의 페이로드에 대한 타입 선언입니다.
 * @warning
 * 건들 필요 없습니다.
 */

import type { JwtPayload } from 'jsonwebtoken';

export type TokenPayload = JwtPayload & { id: number };
