/* Global test setup: mocks for native modules that have no JS implementation in Jest. */
import { Dimensions } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    seekTo: jest.fn(() => Promise.resolve()),
    release: jest.fn(),
    volume: 1,
  })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Rigid: 'rigid', Soft: 'soft' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

/*
 * Tests render in a phone-sized window (the layout most players see). Jest's default
 * window (750 × 1334) would count as a tablet; tests for the tablet layout set it themselves.
 */
const phoneWindow = { ...Dimensions.get('window'), width: 390, height: 844 };
Dimensions.set({ window: phoneWindow, screen: phoneWindow });
