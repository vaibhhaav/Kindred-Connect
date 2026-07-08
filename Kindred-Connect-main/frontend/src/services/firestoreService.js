import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../components/firebase.js';

// Firestore realtime services used by the enhanced UI.
// This keeps the frontend feature-rich and avoids relying on REST endpoints
// that may be missing/incomplete in the current backend.

function createdAtToMillis(createdAt) {
  if (!createdAt) return 0;
  if (typeof createdAt?.toMillis === 'function') return createdAt.toMillis();
  // Firestore Timestamp-like shape
  if (typeof createdAt?.seconds === 'number') {
    return createdAt.seconds * 1000 + (createdAt.nanoseconds || 0) / 1e6;
  }
  if (createdAt instanceof Date) return createdAt.getTime();
  if (typeof createdAt === 'number') return createdAt;
  return 0;
}

// ── Connections ──────────────────────────────────────────────

export function subscribeConnections(institutionId, callback, onError) {
  if (!institutionId) return () => {};

  // Avoid `orderBy('createdAt')` here to prevent Firestore composite-index errors.
  // We sort client-side instead.
  const q = query(collection(db, 'connections'), where('institutionId', '==', institutionId));

  return onSnapshot(
    q,
    (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => createdAtToMillis(b.createdAt) - createdAtToMillis(a.createdAt));
      callback(data);
    },
    (err) => onError?.(err),
  );
}

export async function createConnectionDoc({
  orphanId,
  orphanName,
  elderId,
  elderName,
  compatibilityScore,
  institutionId,
}) {
  const docRef = await addDoc(collection(db, 'connections'), {
    orphanId,
    orphanName,
    elderId,
    elderName,
    compatibilityScore: compatibilityScore ?? null,
    institutionId,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateConnectionStatusDoc(id, status) {
  return updateDoc(doc(db, 'connections', id), {
    status,
    updatedAt: serverTimestamp(),
  });
}

// ── Sessions ──────────────────────────────────────────────

export function subscribeSessions(institutionId, callback, onError) {
  if (!institutionId) return () => {};

  // Avoid composite-index requirement by sorting client-side.
  const q = query(collection(db, 'sessions'), where('institutionId', '==', institutionId));

  return onSnapshot(
    q,
    (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => createdAtToMillis(b.createdAt) - createdAtToMillis(a.createdAt));
      callback(data);
    },
    (err) => onError?.(err),
  );
}

export async function createSessionDoc({
  connectionId,
  orphanId,
  elderId,
  orphanName,
  elderName,
  date,
  time,
  meetLink,
  compatibilityScore,
  institutionId,
}) {
  const roomId = `kindered-${connectionId}-${Date.now()}`;
  const defaultMeetLink = `https://meet.jit.si/${roomId}`;
  const finalMeetLink = meetLink || defaultMeetLink;

  const docRef = await addDoc(collection(db, 'sessions'), {
    connectionId,
    orphanId,
    elderId,
    orphanName,
    elderName,
    date,
    time,
    meetLink: finalMeetLink,
    compatibilityScore,
    status: 'scheduled',
    institutionId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateSessionWithReport(id, report) {
  return updateDoc(doc(db, 'sessions', id), {
    ...report,
    updatedAt: serverTimestamp(),
  });
}

export async function updateSessionStatus(id, status) {
  return updateSessionWithReport(id, { status });
}

// ── Feedback ──────────────────────────────────────────────

export function subscribeFeedback(institutionId, callback, onError) {
  if (!institutionId) return () => {};

  // Avoid composite-index requirement by sorting client-side.
  const q = query(collection(db, 'feedback'), where('institutionId', '==', institutionId));

  return onSnapshot(
    q,
    (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => createdAtToMillis(b.createdAt) - createdAtToMillis(a.createdAt));
      callback(data);
    },
    (err) => onError?.(err),
  );
}

export async function submitFeedbackDoc({
  sessionId,
  emotion,
  engagementScore,
  reconnect,
  notes,
  institutionId,
}) {
  const docRef = await addDoc(collection(db, 'feedback'), {
    sessionId,
    emotion,
    engagementScore,
    reconnect,
    notes: notes || '',
    institutionId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

// ── Stats helpers ────────────────────────────────────────────

export async function getCollectionCount(colName, institutionId) {
  if (!institutionId) return 0;
  const q = query(collection(db, colName), where('institutionId', '==', institutionId));
  const snap = await getDocs(q);
  return snap.size;
}

