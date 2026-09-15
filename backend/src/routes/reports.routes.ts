import { Router } from 'express';
import { getMonthlyReport } from '../controllers/reports.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);
router.get('/monthly', getMonthlyReport);
export default router;
