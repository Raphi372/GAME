import { createRef } from 'react';
import type { ViewInstance } from 'react-native';

import * as webShare from '@/features/share/shareImage.web';

type ShareModule = typeof import('@/features/share/shareImage');

const card = createRef<ViewInstance>();

// The share module remembers the loaded native modules and the last picture: every test
// gets fresh copies of it and of the mocks from jest.setup.ts.
let share: ShareModule;
let sharing: jest.Mocked<typeof import('expo-sharing')>;
let viewShot: jest.Mocked<typeof import('react-native-view-shot')>;

beforeEach(() => {
  jest.resetModules();
  share = jest.requireActual<ShareModule>('@/features/share/shareImage');
  sharing = jest.requireMock('expo-sharing');
  viewShot = jest.requireMock('react-native-view-shot');
});

describe('sharing the result picture', () => {
  it('captures the card as a PNG and hands it to the share menu', async () => {
    expect(share.canShareResultImage()).toBe(true);

    await share.shareResultImage(card, 'Ergebnis teilen');

    expect(viewShot.captureRef).toHaveBeenCalledWith(card, { format: 'png', quality: 1, result: 'tmpfile' });
    expect(sharing.shareAsync).toHaveBeenCalledWith('file:///tmp/ReactNative/result.png', {
      mimeType: 'image/png',
      UTI: 'public.png',
      dialogTitle: 'Ergebnis teilen',
    });
    // Android may still be reading the file – it stays until the next share.
    expect(viewShot.releaseCapture).not.toHaveBeenCalled();
  });

  it('deletes the previous picture before the next one and when the summary closes', async () => {
    viewShot.captureRef.mockResolvedValueOnce('file:///tmp/first.png').mockResolvedValueOnce('file:///tmp/second.png');

    await share.shareResultImage(card, 'Share');
    await share.shareResultImage(card, 'Share');
    expect(viewShot.releaseCapture).toHaveBeenCalledTimes(1);
    expect(viewShot.releaseCapture).toHaveBeenLastCalledWith('file:///tmp/first.png');

    share.releaseResultImage();
    expect(viewShot.releaseCapture).toHaveBeenLastCalledWith('file:///tmp/second.png');
    share.releaseResultImage();
    expect(viewShot.releaseCapture).toHaveBeenCalledTimes(2);
  });

  it('passes on a failed capture without opening the share menu', async () => {
    viewShot.captureRef.mockRejectedValueOnce(new Error('capture failed'));
    await expect(share.shareResultImage(card, 'Share')).rejects.toThrow('capture failed');
    expect(sharing.shareAsync).not.toHaveBeenCalled();
  });

  it('is unavailable in the web build', async () => {
    expect(webShare.canShareResultImage()).toBe(false);
    await expect(webShare.shareResultImage()).rejects.toThrow('not available on the web');
    expect(() => webShare.releaseResultImage()).not.toThrow();
  });

  // Last: replaces the shared mock of expo-sharing for this file.
  it('is unavailable in a development build without the native modules', async () => {
    jest.resetModules();
    jest.doMock('expo-sharing', () => {
      throw new Error("Cannot find native module 'ExpoSharing'");
    });
    const withoutModules = jest.requireActual<ShareModule>('@/features/share/shareImage');

    expect(withoutModules.canShareResultImage()).toBe(false);
    await expect(withoutModules.shareResultImage(card, 'Share')).rejects.toThrow('not available');
    expect(() => withoutModules.releaseResultImage()).not.toThrow();
  });
});
