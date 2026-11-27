import type { RefObject } from 'react';
import type { ViewInstance } from 'react-native';

type ViewShotModule = typeof import('react-native-view-shot');
type SharingModule = typeof import('expo-sharing');

interface ShareModules {
  viewShot: ViewShotModule;
  sharing: SharingModule;
}

let modules: ShareModules | null | undefined;
/** The image of the last share – deleted before the next one and when the summary closes. */
let lastImage: string | null = null;

/**
 * Loaded on first use instead of at the top: expo-sharing needs its native module as soon
 * as it is imported, and a development build without it should only hide the feature.
 */
function loadModules(): ShareModules | null {
  if (modules !== undefined) return modules;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharing = require('expo-sharing') as SharingModule;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const viewShot = require('react-native-view-shot') as ViewShotModule;
    modules = { sharing, viewShot };
  } catch {
    modules = null;
  }
  return modules;
}

/** Whether this build can turn the result into an image and hand it to the share menu. */
export function canShareResultImage(): boolean {
  return loadModules() !== null;
}

/** Deletes the image of the last share from the app's temporary files. */
export function releaseResultImage(): void {
  const image = lastImage;
  lastImage = null;
  if (!image) return;
  try {
    loadModules()?.viewShot.releaseCapture(image);
  } catch {
    // The system clears temporary files anyway.
  }
}

/**
 * Renders the result card into a PNG in the app's temporary files and opens the system
 * share menu with it. Nothing is uploaded: where the image goes, the player decides there.
 */
export async function shareResultImage(card: RefObject<ViewInstance | null>, dialogTitle: string): Promise<void> {
  const loaded = loadModules();
  if (!loaded) throw new Error('Sharing images is not available in this build.');
  releaseResultImage();
  const image = await loaded.viewShot.captureRef(card, { format: 'png', quality: 1, result: 'tmpfile' });
  // Kept until the next share or until the summary closes: on Android the receiving app
  // may still be reading the file when the share menu reports back.
  lastImage = image;
  await loaded.sharing.shareAsync(image, { mimeType: 'image/png', UTI: 'public.png', dialogTitle });
}
