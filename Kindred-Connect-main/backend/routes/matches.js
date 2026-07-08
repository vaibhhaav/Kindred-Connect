// routes/matches.js
// Match recommendation endpoints (admin-only, protected by JWT middleware).

import express from 'express';
import { matchesController } from '../controllers/matches.js';

const router = express.Router();

// POST /api/matches - request ML-based match recommendations
router.post('/', matchesController.getMatches);

// POST /api/matches/auto-match - auto-match elders to orphans
router.post('/auto-match', matchesController.autoMatchAll);

export default router;

