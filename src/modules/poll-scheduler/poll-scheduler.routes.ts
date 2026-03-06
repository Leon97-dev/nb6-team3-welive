import { Router } from 'express';

const router = Router();

// ==============================================
// ⭐️ 투표 스케줄러 관련 Router
// ==============================================
// 1) 헬스 체크
router.get('/ping', (_req, res) => {
  res.status(200).json({ message: 'Poll scheduler is running.' });
});

export default router;
