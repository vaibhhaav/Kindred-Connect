// controllers/sessions.js
// Handles scheduling and listing of video call sessions between matched pairs.
//
// Session schema:
// {
//   id: string,
//   elder_id: string,
//   orphan_id: string,
//   scheduled_at: string (ISO datetime),
//   duration_minutes: number,
//   video_link: string,
//   createdAt: Timestamp
// }

import crypto from 'crypto';
import { db } from '../models/firebase.js';

const COLLECTION = 'sessions';

// Simple Jitsi-style room generator (no external API required).
function generateVideoLink() {
  const base = process.env.VIDEO_BASE_URL || 'https://meet.jit.si';
  const room = `kindred-connect-${crypto.randomBytes(6).toString('hex')}`;
  return `${base}/${room}`;
}

export const sessionsController = {
  // POST /api/sessions
  async createSession(req, res, next) {
    try {
      if (!db) {
        return res
          .status(500)
          .json({ error: 'Firestore not initialized. Check backend config.' });
      }

      const {
        elder_id: elderId,
        orphan_id: orphanId,
        scheduled_at: scheduledAt,
        duration_minutes: durationMinutes = 60,
      } = req.body || {};

      if (!elderId || !orphanId || !scheduledAt) {
        return res.status(400).json({
          error: 'elder_id, orphan_id, and scheduled_at are required',
        });
      }

      const scheduledDate = new Date(scheduledAt);
      if (Number.isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ error: 'scheduled_at must be valid ISO date' });
      }

      const videoLink = generateVideoLink();
      const now = new Date();

      const docRef = await db.collection(COLLECTION).add({
        elder_id: elderId,
        orphan_id: orphanId,
        scheduled_at: scheduledDate.toISOString(),
        duration_minutes: Number(durationMinutes),
        video_link: videoLink,
        createdAt: now,
      });

      return res.status(201).json({
        id: docRef.id,
        video_link: videoLink,
      });
    } catch (err) {
      return next(err);
    }
  },

  // GET /api/sessions
  // Optional query:
  // - elder_id
  // - orphan_id
  async listSessions(req, res, next) {
    try {
      if (!db) {
        return res
          .status(500)
          .json({ error: 'Firestore not initialized. Check backend config.' });
      }

      const { elder_id: elderId, orphan_id: orphanId } = req.query;

      let query = db.collection(COLLECTION);

      if (elderId) {
        query = query.where('elder_id', '==', elderId);
      }
      if (orphanId) {
        query = query.where('orphan_id', '==', orphanId);
      }

      const snapshot = await query.get();
      const sessions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return res.json({ sessions });
    } catch (err) {
      return next(err);
    }
  },
};

export default sessionsController;

