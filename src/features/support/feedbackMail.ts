/** "iOS 18.1", "Android 15 (API 35)" … – helps to reproduce a bug, says nothing about the person. */
export function systemLabel(os: string, version?: string | number, release?: string): string {
  const known = version !== undefined && version !== '';
  if (os === 'ios') return known ? `iOS ${version}` : 'iOS';
  if (os === 'android') {
    const api = known ? ` (API ${version})` : '';
    return release ? `Android ${release}${api}` : `Android${api}`;
  }
  return os;
}

/** A mailto link with subject and pre-filled body – the mail app shows everything before sending. */
export function feedbackMailUrl(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
