import express from 'express';
import {
  checkYouthProfile,
  createYouthProfile,
  getYouthProfile,
  updateYouthProfile
} from '../controllers/youthProfilesController.js';

const router = express.Router();

// Check if youth profile exists
router.post('/check', checkYouthProfile);

// Create new youth profile
router.post('/', createYouthProfile);

// Get youth profile by ID
router.get('/:youth_id', getYouthProfile);

// Update youth profile
router.put('/:youth_id', updateYouthProfile);

export default router;
