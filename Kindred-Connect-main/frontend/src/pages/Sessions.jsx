import React, { useEffect, useMemo, useState } from 'react';
import { useUser } from '../context/UserContext.jsx';
import {
  subscribeConnections,
  subscribeSessions,
  updateSessionStatus,
  updateSessionWithReport,
} from '../services/firestoreService.js';
import SessionModal from '../components/SessionModal.jsx';
import TranscriptModal from '../components/TranscriptModal.jsx';
import SessionReportModal from '../components/SessionReportModal.jsx';
import MeetingRoom from '../components/MeetingRoom.jsx';
import { analyzeTranscript } from '../services/sentimentEngine.js';

const SAMPLE_FALLBACK = `Elder: Hello dear, it's so lovely to see you today! How have you been?
Orphan: Hi! I've been good, thank you. I learned a new song at school this week.
Elder: Oh wonderful! I used to love singing when I was young. What song did you learn?
Orphan: It's called "You Are My Sunshine." Do you know it?
Elder: Of course! That's one of my favorites. Shall we sing it together?
Orphan: Yes! That would be so fun!`;

export default function Sessions() {
  const { institutionId, loading: userLoading } = useUser();

  const [sessions, setSessions] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [scheduleOpen, setScheduleOpen] = useState(false);

  const [meetingSession, setMeetingSession] = useState(null);
  const [transcriptSession, setTranscriptSession] = useState(null);
  const [reportSession, setReportSession] = useState(null);
  const [reportData, setReportData] = useState(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userLoading) return;

    if (!institutionId) {
      setSessions([]);
      setConnections([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    let sessionsLoaded = false;
    let connectionsLoaded = false;

    const done = () => {
      if (sessionsLoaded && connectionsLoaded) setLoading(false);
    };

    const unsubS = subscribeSessions(
      institutionId,
      (data) => {
        setSessions(data);
        sessionsLoaded = true;
        done();
      },
      (err) => {
        setError(err?.message || 'Could not load sessions.');
        sessionsLoaded = true;
        done();
      },
    );

    const unsubC = subscribeConnections(
      institutionId,
      (data) => {
        setConnections(data);
        connectionsLoaded = true;
        done();
      },
      (err) => {
        setError(err?.message || 'Could not load connections.');
        connectionsLoaded = true;
        done();
      },
    );

    return () => {
      unsubS?.();
      unsubC?.();
    };
  }, [institutionId, userLoading]);

  const approvedConnections = useMemo(
    () => connections.filter((c) => c.status === 'approved'),
    [connections],
  );

  const completedSessionsCount = useMemo(
    () => sessions.filter((s) => s.status === 'completed').length,
    [sessions],
  );
  const ongoingSessionsCount = useMemo(
    () => sessions.filter((s) => s.status === 'ongoing').length,
    [sessions],
  );
  const scheduledSessionsCount = useMemo(
    () => sessions.filter((s) => s.status === 'scheduled').length,
    [sessions],
  );

  const statusBadge = (status) => {
    if (status === 'completed') {
      return 'inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-medium';
    }
    if (status === 'ongoing') {
      return 'inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 text-indigo-800 px-2 py-0.5 text-xs font-medium';
    }
    return 'inline-flex items-center rounded-full bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 text-xs font-medium';
  };

  const isTimeReached = (session) => {
    if (!session?.date || !session?.time) return false;
    const dt = new Date(`${session.date}T${session.time}`);
    if (Number.isNaN(dt.getTime())) return false;
    return new Date() >= dt;
  };

  const handleStartSession = async (session) => {
    if (!session?.id) return;
    setSaving(true);
    setError('');
    try {
      await updateSessionStatus(session.id, 'ongoing');
      setMeetingSession({ ...session, status: 'ongoing' });
    } catch (err) {
      setError(err?.message || 'Failed to start session.');
    } finally {
      setSaving(false);
    }
  };

  const handleEndMeeting = async (liveTranscript) => {
    const s = meetingSession;
    setMeetingSession(null);
    if (!s) return;

    const userTranscript = String(liveTranscript || '').trim();
    if (!userTranscript) {
      // Give the user a chance to paste a transcript.
      setTranscriptSession(s);
      return;
    }

    const transcript = userTranscript || SAMPLE_FALLBACK;
    const analysis = analyzeTranscript(transcript, s.compatibilityScore ?? undefined);

    setSaving(true);
    setError('');
    try {
      await updateSessionWithReport(s.id, {
        status: 'completed',
        transcript,
        emotion: analysis.emotion,
        engagementScore: analysis.engagementScore,
        reconnectRecommendation: analysis.reconnectRecommendation,
        bondStrength: analysis.bondStrength,
        reason: analysis.reason,
        polarity: analysis.polarity,
        subjectivity: analysis.subjectivity,
      });

      setReportData(analysis);
      setReportSession({ ...s, status: 'completed' });
    } catch (err) {
      setError(err?.message || 'Failed to complete session.');
    } finally {
      setSaving(false);
    }
  };

  const handleTranscriptSubmit = async (transcript) => {
    if (!transcriptSession?.id) return;
    setSaving(true);
    setError('');
    try {
      const analysis = analyzeTranscript(String(transcript || ''), transcriptSession.compatibilityScore ?? undefined);

      await updateSessionWithReport(transcriptSession.id, {
        status: 'completed',
        transcript: String(transcript || ''),
        emotion: analysis.emotion,
        engagementScore: analysis.engagementScore,
        reconnectRecommendation: analysis.reconnectRecommendation,
        bondStrength: analysis.bondStrength,
        reason: analysis.reason,
        polarity: analysis.polarity,
        subjectivity: analysis.subjectivity,
      });

      setReportData(analysis);
      setReportSession({ ...transcriptSession, status: 'completed' });
      setTranscriptSession(null);
    } catch (err) {
      setError(err?.message || 'Failed to analyze transcript.');
    } finally {
      setSaving(false);
    }
  };

  const handleViewReport = (session) => {
    if (!session) return;
    const report = {
      emotion: session.emotion,
      engagementScore: session.engagementScore ?? 0,
      reconnectRecommendation: session.reconnectRecommendation ?? 'reconsider',
      bondStrength: session.bondStrength ?? session.engagementScore ?? 0,
      reason: session.reason ?? 'Report generated from session analysis.',
      polarity: session.polarity ?? 0,
      subjectivity: session.subjectivity ?? 0,
    };
    setReportData(report);
    setReportSession(session);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Sessions</h2>
          <p className="text-sm text-slate-600">Schedule and run meeting sessions for approved connections.</p>
        </div>
        <button
          type="button"
          onClick={() => setScheduleOpen(true)}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-60"
          disabled={saving}
        >
          Schedule Session
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading sessions…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {!loading && sessions.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold text-slate-900">{sessions.length}</p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Scheduled</p>
            <p className="text-2xl font-bold text-slate-900">{scheduledSessionsCount}</p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Completed</p>
            <p className="text-2xl font-bold text-slate-900">{completedSessionsCount}</p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-indigo-100 bg-white shadow-sm">
        <table className="min-w-[980px] w-full text-xs sm:text-sm">
          <thead className="bg-indigo-50 text-slate-700">
            <tr>
              <th className="px-3 py-2 text-left">Orphan</th>
              <th className="px-3 py-2 text-left">Elder</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">Meeting</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => {
              const reached = isTimeReached(session);
              const status = session.status || 'scheduled';

              return (
                <tr key={session.id} className="border-t border-indigo-50">
                  <td className="px-3 py-2">{session.orphanName || session.orphan?.name || '-'}</td>
                  <td className="px-3 py-2">{session.elderName || session.elder?.name || '-'}</td>
                  <td className="px-3 py-2">{session.date || '-'}</td>
                  <td className="px-3 py-2">{session.time || '-'}</td>
                  <td className="px-3 py-2">
                    {status === 'scheduled' && !reached ? (
                      <span className="text-xs text-slate-500 italic">Not yet</span>
                    ) : session.meetLink ? (
                      <a
                        className="text-indigo-700 hover:underline"
                        href={session.meetLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Join
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={statusBadge(status)}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {status === 'scheduled' && reached && (
                        <button
                          type="button"
                          className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
                          onClick={() => handleStartSession(session)}
                          disabled={saving}
                        >
                          {saving && meetingSession?.id === session.id ? 'Starting…' : 'Start'}
                        </button>
                      )}
                      {status === 'ongoing' && (
                        <button
                          type="button"
                          className="rounded-lg border border-indigo-200 bg-white px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                          onClick={() => setMeetingSession(session)}
                        >
                          Rejoin
                        </button>
                      )}
                      {status === 'completed' && session.emotion && (
                        <button
                          type="button"
                          className="rounded-lg border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                          onClick={() => handleViewReport(session)}
                        >
                          Report
                        </button>
                      )}
                      {status === 'completed' && !session.emotion && (
                        <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-xs text-slate-600">
                          Done
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {!loading && sessions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-xs text-slate-500">
                  No sessions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <SessionModal
        open={scheduleOpen}
        approvedConnections={approvedConnections}
        onClose={() => setScheduleOpen(false)}
        onSubmit={() => {}}
        institutionId={institutionId || ''}
      />

      <TranscriptModal
        open={!!transcriptSession}
        session={transcriptSession}
        onClose={() => setTranscriptSession(null)}
        onSubmit={handleTranscriptSubmit}
        saving={saving}
      />

      <SessionReportModal
        open={!!reportSession}
        session={reportSession}
        report={reportData}
        onClose={() => {
          setReportSession(null);
          setReportData(null);
        }}
      />

      <MeetingRoom
        open={!!meetingSession}
        session={meetingSession}
        onClose={() => setMeetingSession(null)}
        onEndSession={handleEndMeeting}
      />
    </section>
  );
}

