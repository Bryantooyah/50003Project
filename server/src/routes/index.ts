import { Router } from 'express'
import healthRouter from './health'
import analyseRouter from './analyse'
import adminRouter from './admin';
import authRouter from './auth';
import ocrRouter from './ocr';

const router = Router();

router.use('/health', healthRouter);
router.use('/analyse', analyseRouter);
router.use('/admin', adminRouter);
router.use('/auth', authRouter);
router.use('/ocr', ocrRouter);

export default router;
