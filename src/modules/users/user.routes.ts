import { Router } from 'express';
import userController from './user.controller';
import { imageUpload } from '../../config/multer';
import { requireAuth } from '../../middlewares/auth';
import asyncHandler from '../../middlewares/async-handler';

const router = Router();

// ==============================================
// ⭐️ 사용자 관련 라우터 정의
// ==============================================
// 1) 내 프로필 업데이트
router.patch(
  '/me',
  requireAuth,
  imageUpload.single('file'),
  asyncHandler(userController.updateMe)
);

// 2) 비밀번호 변경
router.patch(
  '/password',
  requireAuth,
  asyncHandler(userController.changePassword)
);

export default router;
