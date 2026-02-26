import { Router } from 'express';
import apartmentController from './apartment.controller';
import asyncHandler from '../../middlewares/async-handler';

const router = Router();

// ==============================================
// ⭐️ 아파트 관련 라우터
// ==============================================
// 1) 아파트 목록 조회 (관리자용)
router.get('/', asyncHandler(apartmentController.list));

// 2) 아파트 목록 조회 (공개용)
router.get('/public', asyncHandler(apartmentController.listPublic));

// 3) 아파트 상세 조회 (관리자용)
router.get('/:apartmentId', asyncHandler(apartmentController.getById));

// 4) 아파트 상세 조회 (공개용)
router.get(
  '/public/:apartmentId',
  asyncHandler(apartmentController.getPublicById)
);

export default router;
