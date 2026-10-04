import type { InspectionStatus } from '@hawkeye/shared';

type AlarmListener = () => void;

class AlarmService {
  private isMuted: boolean = false;
  private isAlarmActive: boolean = false;
  private activeAlarmTitle: string | null = null;
  private activeBilletId: string | null = null;
  private audioCtx: AudioContext | null = null;
  private listeners: Set<AlarmListener> = new Set();
  private alarmTimeout: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('hawkeye_alarm_muted');
      this.isMuted = savedMute === 'true';
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  private playTone(freq: number, durationSec: number, type: OscillatorType = 'sawtooth', gainValue: number = 0.18) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainValue, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + durationSec);
    } catch {
      // Audio context may be blocked before first user gesture
    }
  }

  public playCriticalAlarmSound() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    // Industrial pulsed dual-tone warning buzzer: 880Hz / 660Hz burst
    [0, 0.22, 0.44].forEach((delay) => {
      setTimeout(() => {
        if (!this.isMuted && this.isAlarmActive) {
          this.playTone(880, 0.12, 'sawtooth', 0.22);
          setTimeout(() => {
            if (!this.isMuted && this.isAlarmActive) {
              this.playTone(660, 0.12, 'sawtooth', 0.20);
            }
          }, 80);
        }
      }, delay * 1000);
    });
  }

  public playWarningSound() {
    if (this.isMuted) return;
    this.playTone(600, 0.15, 'sine', 0.12);
    setTimeout(() => {
      if (!this.isMuted) {
        this.playTone(450, 0.2, 'sine', 0.10);
      }
    }, 120);
  }

  public testAlarm() {
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
    this.playTone(880, 0.15, 'sawtooth', 0.2);
    setTimeout(() => {
      this.playTone(660, 0.2, 'sawtooth', 0.18);
    }, 120);
  }

  public trigger(status: InspectionStatus, info?: { billetId: string; title: string }) {
    if (status === 'FAIL') {
      this.isAlarmActive = true;
      this.activeBilletId = info?.billetId ?? null;
      this.activeAlarmTitle = info?.title ?? 'Critical Spec Violation';
      this.notify();

      this.playCriticalAlarmSound();

      if (this.alarmTimeout) {
        window.clearTimeout(this.alarmTimeout);
      }
      // Auto-clear active siren after 6 seconds if not acknowledged
      this.alarmTimeout = window.setTimeout(() => {
        this.isAlarmActive = false;
        this.notify();
      }, 6000);
    } else if (status === 'REWORK') {
      this.playWarningSound();
    }
  }

  public acknowledgeAlarm() {
    if (this.alarmTimeout) {
      window.clearTimeout(this.alarmTimeout);
      this.alarmTimeout = null;
    }
    this.isAlarmActive = false;
    this.activeAlarmTitle = null;
    this.activeBilletId = null;
    this.notify();
  }

  public toggleMute(): boolean {
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('hawkeye_alarm_muted', String(this.isMuted));
    }
    if (this.isMuted) {
      this.acknowledgeAlarm();
    } else {
      // Short audio feedback when unmuting
      this.playTone(700, 0.1, 'sine', 0.1);
    }
    this.notify();
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsAlarmActive(): boolean {
    return this.isAlarmActive;
  }

  public getActiveAlarmInfo() {
    return {
      title: this.activeAlarmTitle,
      billetId: this.activeBilletId,
    };
  }

  public subscribe(listener: AlarmListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }
}

export const alarmService = new AlarmService();
