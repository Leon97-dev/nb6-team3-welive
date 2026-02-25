/**
 * @name Express-Types
 * @category Common
 * @description
 * Express의 Request 객체에 사용자 정보를 추가하기 위한 타입 선언입니다.
 * @warning
 * 건들 필요 없습니다.
 */

import 'express';
import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface UserContext {
      id: string;
      role: Role;
      apartmentId?: string | null;
      building?: string | null;
    }

    interface Request {
      user?: UserContext;
      requestId?: string;
    }
  }
}

export {};
