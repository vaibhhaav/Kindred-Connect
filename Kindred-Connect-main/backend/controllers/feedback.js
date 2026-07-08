// controllers/feedback.js
// Handles collection of feedback after sessions and delegates sentiment
// analysis to the ML service.
//
// Feedback schema:
// {
//   id: string,
//   session_id: string,
//   elder_id: string,
//   orphan_id: string,
//   would_connect_again: boolean,
//   feeling: string, // e.g., "happy", "curious", "neutral"
//   comment: string | null,
//   sentiment: { sentiment: string, emotions: string[] } | null,
//   createdAt: Timestamp
// }

import axios from 'axios';
import { db } from '../models/firebase.js';

const COLLECTION = 'feedback';

export const feedbackController = {
  // POST /api/feedback
  async submitFeedback(req, res, next) {
    try {
      if (!db) {
        return res
          .status(500)
          .json({ error: 'Firestore not initialized. Check backend config.' });
      }

      const {
        session_id: sessionId,
        elder_id: elderId,
        orphan_id: orphanId,
        would_connect_again: wouldConnectAgain,
        feeling,
        comment,
      } = req.body || {};

      if (!sessionId || !elderId || !orphanId || typeof wouldConnectAgain !== 'boolean') {
        return res.status(400).json({
          error:
            'session_id, elder_id, orphan_id, and would_connect_again (boolean) are required',
        });
      }

      let sentimentResult = null;
      const mlBaseUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';

      if (comment && comment.trim().length > 0) {
        try {
          const mlResponse = await axios.post(`${mlBaseUrl}/analyze-sentiment`, {
            text: comment,
          });
          sentimentResult = mlResponse.data;
        } catch (sentimentErr) {
          console.error('Sentiment analysis failed', sentimentErr);
          // Do not fail the entire request if sentiment analysis is temporarily unavailable.
        }
      }

      const now = new Date();
      const docRef = await db.collection(COLLECTION).add({
        session_id: sessionId,
        elder_id: elderId,
        orphan_id: orphanId,
        would_connect_again: Boolean(wouldConnectAgain),
        feeling: feeling || null,
        comment: comment || null,
        sentiment: sentimentResult,
        createdAt: now,
      });

      return res.status(201).json({
        id: docRef.id,
        sentiment: sentimentResult,
      });
    } catch (err) {
      return next(err);
    }
  },
};

export default feedbackController;

