/*
 * Web build (browser demo): no image capture – react-native-view-shot would need
 * html2canvas there, so the share button stays hidden. Builds for the README screenshots
 * show it anyway (`EXPO_PUBLIC_SHARE_PREVIEW=1`, see `npm run docs:screenshots`); sharing
 * itself then reports an error.
 */

export function canShareResultImage(): boolean {
  return process.env.EXPO_PUBLIC_SHARE_PREVIEW === '1';
}

export function releaseResultImage(): void {}

export async function shareResultImage(): Promise<void> {
  throw new Error('Sharing images is not available on the web.');
}
