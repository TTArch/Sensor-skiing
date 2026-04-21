/**
 * Voice Coach — Text-to-Speech Coaching with Queue Management
 * Uses expo-speech to deliver real-time coaching tips.
 */

import * as Speech from 'expo-speech';

export interface VoiceCoachConfig {
  /** Minimum interval between tips in milliseconds */
  tipIntervalMs: number;
  /** Speech rate: 0.5 (slow) to 2.0 (fast). Default 1.0 */
  rate: number;
  /** Pitch: 0.5 to 2.0. Default 1.0 */
  pitch: number;
}

const DEFAULT_CONFIG: VoiceCoachConfig = {
  tipIntervalMs: 5000,
  rate: 1.0,
  pitch: 1.0,
};

/** Queue item for pending utterances */
interface QueuedUtterance {
  text: string;
  enqueuedAt: number;
}

/** Internal mutable state — module-level singleton */
let _queue: QueuedUtterance[] = [];
let _lastSpokenAt = 0;
let _config: VoiceCoachConfig = { ...DEFAULT_CONFIG };
let _isProcessing = false;
let _isEnabled = true;

/**
 * Process the next item in the queue if allowed by the interval.
 */
async function processQueue(): Promise<void> {
  if (_isProcessing || !_isEnabled) return;
  if (_queue.length === 0) return;

  const now = Date.now();
  const timeSinceLast = now - _lastSpokenAt;

  if (timeSinceLast < _config.tipIntervalMs) {
    // Not enough time has passed; try again after the remaining interval
    return;
  }

  _isProcessing = true;
  const next = _queue.shift()!;
  _lastSpokenAt = Date.now();

  try {
    await Speech.speak(next.text, {
      rate: _config.rate,
      pitch: _config.pitch,
      onDone: () => {
        _isProcessing = false;
        // Immediately process next item in queue if enough time has elapsed
        const elapsed = Date.now() - _lastSpokenAt;
        if (elapsed >= _config.tipIntervalMs && _queue.length > 0) {
          processQueue();
        }
      },
      onError: () => {
        _isProcessing = false;
      },
      onStopped: () => {
        _isProcessing = false;
      },
    });
  } catch {
    _isProcessing = false;
  }
}

/**
 * Speak coaching text immediately, bypassing the queue.
 * Respects tipIntervalMs: if called too soon after the last utterance,
 * the text is added to the queue instead.
 */
async function speak(text: string): Promise<void> {
  if (!text || text.trim().length === 0) return;

  const now = Date.now();
  const timeSinceLast = now - _lastSpokenAt;

  if (timeSinceLast < _config.tipIntervalMs) {
    // Too soon — enqueue
    enqueue(text);
    return;
  }

  // Enough time elapsed — speak immediately and drain queue after
  _lastSpokenAt = now;
  try {
    await Speech.speak(text, {
      rate: _config.rate,
      pitch: _config.pitch,
      onDone: () => {
        // After speaking, process queued items
        if (_queue.length > 0) {
          _isProcessing = false;
          processQueue();
        }
      },
      onError: () => {
        _isProcessing = false;
      },
    });
  } catch {
    // Silently handle speech errors
  }
}

/**
 * Enqueue a coaching tip for later delivery.
 */
function enqueue(text: string): void {
  if (!text || text.trim().length === 0) return;
  _queue.push({ text, enqueuedAt: Date.now() });
  // Limit queue size to prevent unbounded growth
  if (_queue.length > 10) {
    _queue = _queue.slice(-10);
  }
  processQueue();
}

/**
 * Stop all current and queued speech.
 */
async function stop(): Promise<void> {
  _queue = [];
  _isProcessing = false;
  try {
    await Speech.stop();
  } catch {
    // Ignore stop errors
  }
}

/**
 * Pause speech (if supported by the platform).
 * Falls back to stop() on platforms that do not support pause.
 */
async function pause(): Promise<void> {
  try {
    await Speech.pause?.();
  } catch {
    // Platform may not support pause — stop instead
    await stop();
  }
}

/**
 * Resume paused speech (if supported).
 */
async function resume(): Promise<void> {
  try {
    await Speech.resume?.();
  } catch {
    // Ignore
  }
}

/**
 * Check if the speech engine is currently speaking.
 */
async function isSpeaking(): Promise<boolean> {
  try {
    return await Speech.isSpeakingAsync();
  } catch {
    return false;
  }
}

/**
 * Update the voice coach configuration.
 */
function configure(config: Partial<VoiceCoachConfig>): void {
  _config = { ..._config, ...config };
}

/**
 * Enable or disable the voice coach.
 */
function setEnabled(enabled: boolean): void {
  _isEnabled = enabled;
  if (!enabled) {
    stop();
  }
}

/**
 * Get the current queue depth.
 */
function queueDepth(): number {
  return _queue.length;
}

/**
 * Clear the queue without stopping current speech.
 */
function clearQueue(): void {
  _queue = [];
}

export const voiceCoach = {
  speak,
  enqueue,
  stop,
  pause,
  resume,
  isSpeaking,
  configure,
  setEnabled,
  queueDepth,
  clearQueue,
  DEFAULT_CONFIG,
};

export default voiceCoach;
