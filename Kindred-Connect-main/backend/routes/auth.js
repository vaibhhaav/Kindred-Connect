// routes/auth.js
// Handles admin login using Firebase ID tokens and backend-issued JWTs.
//
// Endpoint:
// POST /api/login
// Body: { idToken: string }
// Response: { token: string, admin: { uid, email } }

import express from 'express';
import { signBackendToken, verifyFirebaseAdminIdToken } from '../middleware/auth.js';

export const authRouter = express.Router();

authRouter.post('/login', async (req, res) => {
  try {
    const { idToken } = req.body || {};

    if (!idToken) {
      return res.status(400).json({ error: 'idToken is required' });
    }

    const decoded = await verifyFirebaseAdminIdToken(idToken);

    const backendToken = signBackendToken({
      uid: decoded.uid,
      email: decoded.email,
    });

    return res.json({
      token: backendToken,
      admin: {
        uid: decoded.uid,
        email: decoded.email,
      },
    });
  } catch (err) {
    console.error('Error in /api/login', err);
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Login failed' });
  }
});

export default authRouter;

