import { Router } from 'express';
import authController from './auth.controller';
import asyncHandler from '../../middlewares/async-handler';
import { Role } from '@prisma/client';
import { requireAuth, requireRoles } from '../../middlewares/auth';

const router = Router();

// ==============================================
// ⭐️ 인증 관련 Router
// ==============================================
// 1) 일반 유저 가입
router.post('/signup', asyncHandler(authController.signupUser));

// 2) 관리자 가입
router.post('/signup/admin', asyncHandler(authController.signupAdmin));

// 3) 슈퍼 관리자 가입
router.post(
  '/signup/super-admin',
  requireAuth,
  requireRoles(Role.SUPER_ADMIN),
  asyncHandler(authController.signupSuperAdmin)
);

// 4) 로그인
router.post('/login', asyncHandler(authController.login));

// 5) 로그아웃
router.post('/logout', requireAuth, asyncHandler(authController.logout));

// 6) 토큰 재발급
router.post('/refresh', asyncHandler(authController.refresh));

// 7) 관리자 정보 업데이트
router.patch(
  '/admins/:adminId',
  requireAuth,
  asyncHandler(authController.updateAdmin)
);

// 8) 관리자 가입 승인 상태 업데이트
router.patch(
  '/admins/:adminId/status',
  requireAuth,
  asyncHandler(authController.updateAdminStatus)
);

// 9) 모든 관리자 가입 승인 상태 일괄 업데이트
router.patch(
  '/admins/status',
  requireAuth,
  asyncHandler(authController.updateAllAdminsStatus)
);

// 10) 관리자 삭제
router.delete(
  '/admins/:adminId',
  requireAuth,
  asyncHandler(authController.deleteAdmin)
);

// 11) 입주민 가입 승인 상태 업데이트
router.patch(
  '/residents/:residentId/status',
  requireAuth,
  asyncHandler(authController.updateResidentStatus)
);

// 12) 모든 입주민 가입 승인 상태 일괄 업데이트
router.patch(
  '/residents/status',
  requireAuth,
  asyncHandler(authController.updateAllResidentsStatus)
);

// 13) 가입 승인 거절된 계정 정리
router.post('/cleanup', requireAuth, asyncHandler(authController.cleanup));

export default router;
