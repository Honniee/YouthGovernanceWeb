import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getSystemNotice, updateSystemNotice } from '../controllers/systemNoticeController.js';

const router = express.Router();

// Public GET for website banner; PUT remains authenticated for admin changes
router.get('/', getSystemNotice);
router.put('/', authenticateToken, updateSystemNotice);

export default router;



