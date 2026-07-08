import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSpeechTranscription } from '../hooks/useSpeechTranscription.js';
import { Button } from './ui/button.jsx';
import { Card } from './ui/card.jsx';

export default function MeetingRoom({ open, session, onClose, onEndSession }) {
  const [joined, setJoined] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes
  const timerRef = useRef(null);

  const { transcript, isListening, start, stop, supported } = useSpeechTranscription();

  useEffect(() => {
    if (!open) {
      setJoined(false);
      setTimeLeft(30 * 60);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!joined) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          const finalTranscript = stop();
          onEndSession?.(finalTranscript);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [joined, stop, onEndSession]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const { embedUrl, meetUrl } = useMemo(() => {
    if (!session?.meetLink) return { embedUrl: '', meetUrl: '' };
    const meetUrlLocal = session.meetLink;
    const roomName = String(meetUrlLocal).replace('https://meet.jit.si/', '');
    const embedded = `https://meet.jit.si/${roomName}#config.prejoinPageEnabled=false&config.startWithAudioMuted=true`;
    return { embedUrl: embedded, meetUrl: meetUrlLocal };
  }, [session?.meetLink]);

  const handleJoin = () => {
    setJoined(true);
    if (supported) start();
  };

  const handleEnd = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const finalTranscript = stop();
    onEndSession?.(finalTranscript);
  };

  if (!open || !session) return null;

  const orphanName = session.orphanName || session.orphan?.name || 'Orphan';
  const elderName = session.elderName || session.elder?.name || 'Elder';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700 font-semibold">
            V
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">
              Session: {orphanName} ↔ {elderName}
            </div>
            <div className="text-xs text-slate-500">
              {session.date || '-'} · {session.time || '-'}
            </div>
          </div>
          <span className="ml-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-100">
            Live
          </span>
          {joined && (
            <span className="ml-1 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-700 border border-slate-200">
              {formatTime(timeLeft)}
            </span>
          )}
          {joined && (
            <span className="ml-1 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200">
              {isListening ? 'Recording' : 'Not recording'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {meetUrl && (
            <a
              href={meetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Open in Tab
            </a>
          )}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="text-xs h-8"
            onClick={handleEnd}
          >
            End Session
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-8"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>

      {/* Live transcript ticker */}
      {joined && transcript && (
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 max-h-20 overflow-y-auto">
          <p className="text-xs text-slate-600 font-mono leading-relaxed">
            <span className="font-semibold text-slate-800">Live Transcript:</span> {String(transcript).slice(-300)}
          </p>
        </div>
      )}

      {/* Meeting Area */}
      {!joined ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md p-8 text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold">
              {String(orphanName || 'O').slice(0, 1)}
              {String(elderName || 'E').slice(0, 1)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Session Lobby</h3>
              <p className="text-sm text-slate-600 mt-1">
                {orphanName} & {elderName}
              </p>
            </div>
            <p className="text-sm text-slate-600">
              Click below to join the video meeting. The session uses Jitsi Meet — no downloads required.
            </p>
            {supported ? (
              <p className="text-xs text-indigo-700">
                Live transcription will start when you join.
              </p>
            ) : (
              <p className="text-xs text-rose-600">
                Your browser doesn't support live transcription. A sample transcript will be used.
              </p>
            )}
            <Button
              type="button"
              onClick={handleJoin}
              className="w-full"
              size="lg"
              disabled={!embedUrl}
            >
              Join Meeting
            </Button>
          </Card>
        </div>
      ) : (
        <div className="flex-1">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
              title="Jitsi Meeting"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-600">
              Missing meeting link.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

