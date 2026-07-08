// middleware/auth.js
// Handles admin authentication & authorization for the REST API.
//
// Flow:
// 1. Frontend signs in admin using Firebase Auth (email/password).
// 2. Frontend calls POST /api/login with the Firebase ID token.
// 3. This backend verifies the ID token via Firebase Admin SDK, checks
//    that the user has the `admin` custom claim set to true.
// 4. If valid, backend issues its own short-lived JWT used for all
//    subsequent admin-only API calls (Authorization: Bearer <token>).

import jwt from 'jsonwebtoken';
import { firebaseAuth } from '../models/firebase.js';

const ADMIN_ROLE = 'admin';

// Signs a backend JWT after Firebase auth is verified.
export function signBackendToken(firebaseUser) {
  const payload = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    role: ADMIN_ROLE,
  };

  const expiresIn = '2h';

  return jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', {
    expiresIn,
  });
}

// Verifies a Firebase ID token and checks the admin claim.
export async function verifyFirebaseAdminIdToken(idToken) {
  if (!firebaseAuth) {
    const error = new Error(
      'Firebase not initialized. Check your service account environment variables.',
    );
    error.status = 500;
    throw error;
  }

  const decoded = await firebaseAuth.verifyIdToken(idToken);

  if (!decoded.admin) {
    const error = new Error('User is not authorized as admin.');
    error.status = 403;
    throw error;
  }

  return decoded;
}

// Express middleware that validates the backend JWT and ensures admin role.
export function requireAdminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length)
      : null;

    if (!token) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    // Dev-only backward compatibility for older frontend builds that stored
    // a non-JWT placeholder token in localStorage.
    if (
      process.env.NODE_ENV !== 'production' &&
      token === 'fake-admin-jwt-token-12345'
    ) {
      req.admin = {
        uid: 'admin123',
        email: 'admin@kindredconnect.com',
        role: ADMIN_ROLE,
      };
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');

    if (decoded.role !== ADMIN_ROLE) {
      return res.status(403).json({ error: 'Forbidden: admin access required' });
    }

    // Attach user to request for downstream handlers (auditing, logging, etc.)
    req.admin = {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role,
    };

    return next();
  } catch (err) {
    console.error('JWT verification failed', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

