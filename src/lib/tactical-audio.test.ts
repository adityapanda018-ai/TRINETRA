import { describe, it, expect } from 'vitest';
import { tacticalAudio } from './tactical-audio';

describe('TacticalAudioEngine', () => {
  it('initializes in safe state without throwing in headless Node environment', () => {
    expect(typeof tacticalAudio.isMuted()).toBe('boolean');
    expect(typeof tacticalAudio.getVolume()).toBe('number');
  });

  it('toggles mute state reliably', () => {
    const initial = tacticalAudio.isMuted();
    const toggled = tacticalAudio.toggleMute();
    expect(toggled).toBe(!initial);
    expect(tacticalAudio.isMuted()).toBe(!initial);
    tacticalAudio.setMuted(initial); // restore
  });

  it('clamps volume bounds between 0 and 1', () => {
    tacticalAudio.setVolume(1.5);
    expect(tacticalAudio.getVolume()).toBe(1.0);
    tacticalAudio.setVolume(-0.5);
    expect(tacticalAudio.getVolume()).toBe(0.0);
    tacticalAudio.setVolume(0.25);
    expect(tacticalAudio.getVolume()).toBe(0.25);
  });

  it('sound calls gracefully no-op without browser AudioContext in tests', () => {
    expect(() => {
      tacticalAudio.playSonarPing();
      tacticalAudio.playRadarSweep();
      tacticalAudio.playTacticalAlert();
      tacticalAudio.playRadioSquelch();
      tacticalAudio.playTargetLock();
      tacticalAudio.playUiClick();
    }).not.toThrow();
  });
});
