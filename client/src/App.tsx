import { useCallback, useEffect, useRef, useState } from 'react';
import { useMediaStream } from './hooks/useMediaStream';
import {
  speakCloud,
  speakLocal,
  stopSpeaking,
  useSpeechRecognition,
} from './hooks/useSpeechRecognition';
import { captureFrame, createCostStats, type CostStats } from './utils/frameCapture';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  hasVision?: boolean;
  tokens?: number;
}

type TtsMode = 'local' | 'cloud';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionActive, setSessionActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [apiReady, setApiReady] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [ttsMode, setTtsMode] = useState<TtsMode>('local');
  const [costStats, setCostStats] = useState<CostStats>(createCostStats());

  const costStatsRef = useRef(costStats);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false);
  const lastFrameRef = useRef<string | null>(null);

  const { videoRef, error: mediaError, isActive, start: startMedia, stop: stopMedia, toggleVideo, toggleAudio } =
    useMediaStream({ video: true, audio: true });

  const sendMessage = useCallback(
    async (text: string, withVision = true) => {
      if (!text.trim() || processingRef.current) return;

      processingRef.current = true;
      setIsProcessing(true);
      setError(null);

      let imageToSend: string | null = null;
      if (withVision && videoRef.current && videoEnabled) {
        const frame = captureFrame(videoRef.current);
        if (frame) {
          if (frame === lastFrameRef.current) {
            setCostStats((s) => {
              const next = { ...s, framesSkipped: s.framesSkipped + 1 };
              costStatsRef.current = next;
              return next;
            });
          } else {
            lastFrameRef.current = frame;
            imageToSend = frame;
            setCostStats((s) => {
              const next = { ...s, framesCaptured: s.framesCaptured + 1 };
              costStatsRef.current = next;
              return next;
            });
          }
        }
      }

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text.trim(),
        hasVision: Boolean(imageToSend),
      };
      setMessages((prev) => [...prev, userMsg]);

      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text.trim(),
            image: imageToSend,
            history,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '请求失败');

        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.reply,
          tokens: data.usage?.totalTokens,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        setCostStats((s) => {
          const next = {
            ...s,
            apiCalls: s.apiCalls + 1,
            totalTokens: s.totalTokens + (data.usage?.totalTokens ?? 0),
          };
          costStatsRef.current = next;
          return next;
        });

        setIsSpeaking(true);
        stopSpeaking();
        if (ttsMode === 'cloud') {
          try {
            await speakCloud(data.reply);
          } catch {
            await speakLocal(data.reply);
          }
        } else {
          await speakLocal(data.reply);
        }
        setIsSpeaking(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : '对话失败');
      } finally {
        processingRef.current = false;
        setIsProcessing(false);
      }
    },
    [messages, videoRef, videoEnabled, ttsMode],
  );

  const handleSpeechResult = useCallback(
    (result: { transcript: string; isFinal: boolean }) => {
      if (result.isFinal && sessionActive && micEnabled) {
        sendMessage(result.transcript, true);
      }
    },
    [sessionActive, micEnabled, sendMessage],
  );

  const { isListening, interimTranscript, isSupported: speechSupported, start: startSpeech, stop: stopSpeech } =
    useSpeechRecognition({
      onResult: handleSpeechResult,
    });

  const startSession = async () => {
    await startMedia();
    setSessionActive(true);
    if (speechSupported && micEnabled) {
      startSpeech();
    }
  };

  const stopSession = () => {
    stopSpeech();
    stopSpeaking();
    stopMedia();
    setSessionActive(false);
    setIsSpeaking(false);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      sendMessage(textInput, true);
      setTextInput('');
    }
  };

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setApiReady(d.hasApiKey))
      .catch(() => setApiReady(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript]);

  useEffect(() => {
    if (sessionActive && micEnabled && speechSupported) {
      startSpeech();
    } else {
      stopSpeech();
    }
  }, [sessionActive, micEnabled, speechSupported, startSpeech, stopSpeech]);

  const displayError = error || mediaError;

  return (
    <div className="app">
      <header className="header">
        <h1>
          <span>👁️</span> AI 视觉对话助手
        </h1>
        <div className="settings-row">
          <label>
            语音合成：
            <select value={ttsMode} onChange={(e) => setTtsMode(e.target.value as TtsMode)}>
              <option value="local">浏览器（免费）</option>
              <option value="cloud">云端 OpenAI（高质量）</option>
            </select>
          </label>
          <span>
            API：
            {apiReady === null ? '检测中' : apiReady ? '✓ 已配置' : '✗ 未配置'}
          </span>
        </div>
      </header>

      <main className="main">
        <section className="panel">
          <div className="panel-header">
            <span>摄像头画面</span>
            {sessionActive && (
              <div className="toggle-group">
                <button
                  className={`toggle-btn ${videoEnabled ? 'on' : ''}`}
                  onClick={() => {
                    const next = !videoEnabled;
                    setVideoEnabled(next);
                    toggleVideo(next);
                  }}
                >
                  📷 画面 {videoEnabled ? '开' : '关'}
                </button>
                <button
                  className={`toggle-btn ${micEnabled ? 'on' : ''}`}
                  onClick={() => {
                    const next = !micEnabled;
                    setMicEnabled(next);
                    toggleAudio(next);
                  }}
                >
                  🎤 麦克风 {micEnabled ? '开' : '关'}
                </button>
              </div>
            )}
          </div>

          <div className="video-container">
            {isActive ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted />
                <div className="video-overlay">
                  {isListening && micEnabled && (
                    <span className="badge listening">正在聆听…</span>
                  )}
                  {isSpeaking && <span className="badge speaking">AI 正在说话</span>}
                  {isProcessing && <span className="badge">思考中…</span>}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="icon">📹</div>
                <p>点击「开始对话」开启摄像头与麦克风</p>
              </div>
            )}
          </div>

          <div className="controls">
            {!sessionActive ? (
              <button className="btn btn-primary" onClick={startSession}>
                ▶ 开始对话
              </button>
            ) : (
              <>
                <button className="btn btn-danger" onClick={stopSession}>
                  ⏹ 结束对话
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={isProcessing}
                  onClick={() => sendMessage('请描述一下你看到的画面', true)}
                >
                  📸 分析当前画面
                </button>
              </>
            )}
            {!speechSupported && (
              <span style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>
                当前浏览器不支持语音识别，请使用文字输入
              </span>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <span>对话记录</span>
            <span className={`status-dot ${sessionActive ? 'active' : 'inactive'}`} />
          </div>

          {displayError && <div className="error-banner">{displayError}</div>}

          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="icon">💬</div>
                <p>开始对话后，直接说话或输入文字</p>
                <p style={{ fontSize: '0.85rem' }}>
                  AI 会结合摄像头画面与语音内容回复
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`message ${msg.role}`}>
                  {msg.content}
                  {msg.hasVision && <div className="vision-tag">含画面截图</div>}
                  {msg.tokens != null && (
                    <div className="meta">{msg.tokens} tokens</div>
                  )}
                </div>
              ))
            )}
            {isProcessing && (
              <div className="message assistant">
                <span className="loading-dots">正在回复</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            {sessionActive && interimTranscript && (
              <div className="interim-text">🎤 {interimTranscript}</div>
            )}
            <form className="input-row" onSubmit={handleTextSubmit}>
              <input
                type="text"
                placeholder={sessionActive ? '输入文字消息…' : '请先开始对话'}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                disabled={!sessionActive || isProcessing}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!sessionActive || isProcessing || !textInput.trim()}
              >
                发送
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="stats-bar">
        <span>
          API 调用：<strong>{costStats.apiCalls}</strong> 次
        </span>
        <span>
          画面捕获：<strong>{costStats.framesCaptured}</strong> 帧
        </span>
        <span>
          跳过重复帧：<strong>{costStats.framesSkipped}</strong>
        </span>
        <span>
          累计 Token：<strong>{costStats.totalTokens}</strong>
        </span>
      </footer>
    </div>
  );
}
