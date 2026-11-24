import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

export type SoundKind = 'reveal' | 'tap' | 'level' | 'pass';

const SOURCES: Record<SoundKind, number> = {
  reveal: require('../../assets/sounds/reveal.wav'),
  tap: require('../../assets/sounds/tap.wav'),
  level: require('../../assets/sounds/level.wav'),
  pass: require('../../assets/sounds/pass.wav'),
};

const players: Partial<Record<SoundKind, AudioPlayer>> = {};
let audioModeConfigured = false;

async function configureAudioMode() {
  if (audioModeConfigured) return;
  audioModeConfigured = true;
  // Respect the silent switch and never interrupt music that is already playing at the party.
  await setAudioModeAsync({
    playsInSilentMode: false,
    interruptionMode: 'mixWithOthers',
    shouldPlayInBackground: false,
  });
}

function getPlayer(kind: SoundKind): AudioPlayer {
  const existing = players[kind];
  if (existing) return existing;
  const player = createAudioPlayer(SOURCES[kind]);
  player.volume = 0.6;
  players[kind] = player;
  return player;
}

/** Plays a short UI sound effect. Never throws. */
export async function playSound(kind: SoundKind): Promise<void> {
  try {
    await configureAudioMode();
    const player = getPlayer(kind);
    await player.seekTo(0);
    player.play();
  } catch {
    // Sound effects are optional – ignore failures (e.g. no audio output).
  }
}

/** Frees native audio resources (e.g. when the app is being torn down). */
export function releaseSounds(): void {
  for (const kind of Object.keys(players) as SoundKind[]) {
    players[kind]?.release();
    delete players[kind];
  }
}
