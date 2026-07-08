/**
 * useSpeechTranscription.js
 *
 * Live transcription via the Web Speech API (browser-side).
 * Falls back gracefully when SpeechRecognition isn't supported.
 */

import { useCallback, useRef, useState } from 'react';

export function useSpeechTranscription() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');

  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const supported = !!SpeechRecognition;

  const start = useCallback(() => {
    if (!SpeechRecognition) return;
    if (recognitionRef.current) return; // already running

    transcriptRef.current = '';
    setTranscript('');

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let newText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          newText += res[0].transcript + ' ';
        }
      }
      if (newText) {
        transcriptRef.current += newText;
        setTranscript(transcriptRef.current);
      }
    };

    recognition.onerror = (event) => {
      // Common non-fatal errors in browsers.
      if (event?.error === 'no-speech' || event?.error === 'aborted') return;
      console.warn('SpeechRecognition error:', event?.error);
    };

    // Chrome stops listening after ~60s; restart automatically.
    recognition.onend = () => {
      if (recognitionRef.current) {
        try {
          recognition.start();
        } catch {
          // ignore "already started" errors
        }
      }
    };

    recognitionRef.current = recognition;
    setIsListening(true);

    try {
      recognition.start();
    } catch {
      // ignore start errors
    }
  }, [SpeechRecognition]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      const ref = recognitionRef.current;
      recognitionRef.current = null; // prevent auto-restart
      try {
        ref.stop();
      } catch {
        // ignore stop errors
      }
    }
    setIsListening(false);
    return transcriptRef.current;
  }, []);

  return { transcript, isListening, start, stop, supported };
}

