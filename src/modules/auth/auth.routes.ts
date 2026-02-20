import { Router } from 'express';
import authController from './auth.controller';
import asyncHandler from '../../middlewares/async-handler';

const router = Router();

router.post('/signup', asyncHandler(authController.signUpUser));

export default router;
