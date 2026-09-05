import { Router } from 'express';
import { getCategories, createCategory, updateCategory, archiveCategory } from '../controllers/category.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', getCategories);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.patch('/:id/archive', archiveCategory);

export default router;
