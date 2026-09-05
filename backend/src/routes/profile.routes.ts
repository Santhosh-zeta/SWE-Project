import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profile.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', getProfile);
router.put('/', updateProfile);

export default router;
