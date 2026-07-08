// routes/users.js
// Wires profile-related controller actions to REST endpoints.

import express from 'express';
import { usersController } from '../controllers/users.js';

const router = express.Router();

// POST /api/users - create elder/orphan profile
router.post('/', usersController.createProfile);

// GET /api/users - list/search profiles
router.get('/', usersController.listProfiles);

export default router;

