import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { parseSms, importSmsExpenses, autoSyncSms } from '../controllers/sms.controller';

const router = Router();

router.use(authenticate);

router.post('/parse', parseSms);
router.post('/import', importSmsExpenses);
router.post('/auto-sync', autoSyncSms);

export default router;
