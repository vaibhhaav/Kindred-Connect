import React, { useMemo, useState } from 'react';
import { Button } from './ui/button.jsx';
import { Card } from './ui/card.jsx';

export default function TranscriptModal({ open, session, onClose, onSubmit, saving }) {
  const SAMPLE_TRANSCRIPTS = useMemo(
    () => [
      `Elder: Hello dear, it's so lovely to see you today! How have you been?
Orphan: Hi! I've been good, thank you. I learned a new song at school this week.
Elder: Oh wonderful! I used to love singing when I was young. What song did you learn?
Orphan: It's called "You Are My Sunshine." Do you know it?
Elder: Of course! That's one of my favorites. My mother used to sing it to me. Shall we sing it together?
Orphan: Yes! That would be so fun!
Elder: You are my sunshine, my only sunshine...
Orphan: You make me happy when skies are gray!
Elder: Beautiful! You have such a lovely voice. You remind me of my granddaughter.
Orphan: Really? Thank you! Can you tell me a story about when you were little?`,
      `Elder: Good afternoon. How are you doing today?
Orphan: I'm okay, I guess.
Elder: Just okay? Is something on your mind?
Orphan: I had a bad day at school. Some kids were mean to me.
Elder: I'm sorry to hear that. That must have felt hurtful.
Orphan: Yeah. I don't like going sometimes.
Elder: I understand. When I was young, I had difficult days too. But you know what helped me?
Orphan: What?
Elder: Finding one small thing each day that made me smile. Even on hard days.
Orphan: Like what?
Elder: Like talking to someone kind. Like you're doing right now.
Orphan: I guess that's true. Thanks for listening.`,
      `Elder: ...
Orphan: ...
Elder: So, um, how is school?
Orphan: Fine.
Elder: That's good.
Orphan: Yeah.
Elder: Do you have any hobbies?
Orphan: Not really.
Elder: I see.`,
    ],
    [],
  );

  const [transcript, setTranscript] = useState('');

  if (!open) return null;

  const orphanName = session?.orphanName || session?.orphan?.name || 'Orphan';
  const elderName = session?.elderName || session?.elder?.name || 'Elder';

  const handleUseSample = (index) => {
    setTranscript(SAMPLE_TRANSCRIPTS[index] || '');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-elevated">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Session Transcript</h3>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <p className="text-sm text-slate-600 mb-3">
          {orphanName} ↔ {elderName} · {session?.date || '-'}
        </p>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Paste or enter the session transcript</label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Enter the conversation transcript here..."
              rows={10}
              className="w-full rounded-lg border border-slate-300 p-3 text-sm font-mono text-xs focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-xs text-slate-500 text-right">{transcript.length} characters</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              Or use a sample transcript for demo:
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => handleUseSample(0)} className="text-xs">
                Positive Sample
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleUseSample(1)} className="text-xs">
                Mixed Sample
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleUseSample(2)} className="text-xs">
                Low Engagement
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            className="text-sm"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit?.(transcript)}
            disabled={!transcript.trim() || saving}
            className="text-sm font-medium"
          >
            {saving ? 'Analyzing…' : 'Analyze & Complete Session'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

