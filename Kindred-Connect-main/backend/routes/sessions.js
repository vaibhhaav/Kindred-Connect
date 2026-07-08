// routes/sessions.js
// Wires session scheduling controller to Express routes.

import express from 'express';
import { sessionsController } from '../controllers/sessions.js';

const router = express.Router();

// POST /api/sessions - schedule a new session
router.post('/', sessionsController.createSession);

// GET /api/sessions - list sessions (optionally filtered)
router.get('/', sessionsController.listSessions);

export default router;

