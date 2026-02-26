import { Router } from 'express';
import { upload } from '../../config/multer';
import { requireAuth } from '../../middlewares/auth';
import residentController from './resident.controller';
import asyncHandler from '../../middlewares/async-handler';

const router = Router();

// ==============================================
// ⭐️ 입주민 관련 Routes
// ==============================================
// 1) 입주민 목록 조회 (관리자용, 템플릿 CSV 다운로드)
router.get(
  '/file/template',
  requireAuth,
  asyncHandler(residentController.downloadTemplate)
);

// 2) 입주민 목록 조회 (관리자용, CSV 다운로드)
router.get('/file', requireAuth, asyncHandler(residentController.downloadFile));

// 3) CSV 파일로 입주민 일괄 등록 (관리자용)
router.post(
  '/from-file',
  requireAuth,
  upload.single('file'),
  asyncHandler(residentController.importFromCsv)
);

// 4) 사용자 ID로 입주민 생성 (관리자용)
router.post(
  '/from-users/:userId',
  requireAuth,
  asyncHandler(residentController.createFromUser)
);

// 5) 입주민 목록 조회 (관리자용)
router.get('/', requireAuth, asyncHandler(residentController.list));

// 6) 입주민 생성 (관리자용)
router.post('/', requireAuth, asyncHandler(residentController.create));

// 7) 입주민 상세 조회 (관리자용)
router.get('/:id', requireAuth, asyncHandler(residentController.getById));

// 8) 입주민 정보 수정 (관리자용)
router.patch('/:id', requireAuth, asyncHandler(residentController.update));

// 9) 입주민 삭제 (관리자용)
router.delete('/:id', requireAuth, asyncHandler(residentController.remove));

export default router;
