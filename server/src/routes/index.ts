import { Router } from 'express'
import healthRouter from './health'
import analyseRouter from './analyse'

const router = Router();

router.use('/health', healthRouter);
router.use('/analyse', analyseRouter);

export default router;
