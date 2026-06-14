import { useCallback, useEffect, useRef, useState } from 'react';

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  onResult?: (result: SpeechRecognitionResult) => void;
  onEnd?: () => void;
}

/** 端侧语音识别：使用浏览器 Web Speech API，零云端 STT 成本 */
export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const { lang = 'zh-CN', continuous = true, onResult, onEnd } = options;
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldRestartRef = useRef(false);

  useEffect(() => {
    const SR =
      window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    setIsSupported(Boolean(SR));

    if (!SR) return;

    const recognition = new SR();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }

      setInterimTranscript(interim);
      if (final) {
        onResult?.({ transcript: final.trim(), isFinal: true });
      } else if (interim) {
        onResult?.({ transcript: interim.trim(), isFinal: false });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      onEnd?.();
      if (shouldRestartRef.current) {
        try {
          recognition.start();
          setIsListening(true);
        } catch {
          /* already started */
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.warn('Speech recognition error:', event.error);
      }
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      shouldRestartRef.current = false;
      recognition.abort();
    };
  }, [lang, continuous, onResult, onEnd]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    shouldRestartRef.current = true;
    setInterimTranscript('');
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      /* already running */
    }
  }, []);

  const stop = useCallback(() => {
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  return { isListening, interimTranscript, isSupported, start, stop };
}

/** 端侧 TTS 回退：浏览器 speechSynthesis，避免每次回复都调用云端 TTS */
export function speakLocal(text: string, lang = 'zh-CN'): Promise<void> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.05;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export async function speakCloud(text: string): Promise<void> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('TTS 请求失败');

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  await new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = reject;
    audio.play();
  });
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
}
