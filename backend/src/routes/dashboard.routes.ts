import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', getDashboardSummary);

export default router;
