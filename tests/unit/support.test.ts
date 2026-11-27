import { helpPageUrl, resolveSupportEmail, resolveWebsiteUrl, SUPPORT } from '@/config/support';
import { feedbackMailUrl, systemLabel } from '@/features/support/feedbackMail';

describe('help and feedback settings', () => {
  it('stay off until the website and the contact are filled in', () => {
    // The repository ships without provider details and website address.
    expect(SUPPORT).toEqual({ websiteUrl: null, email: null });
  });

  it('take the support address first, otherwise the e-mail in the provider details', () => {
    const provider = 'Beispiel GmbH\nBeispielweg 1\n12345 Beispielstadt\nhallo@example.com';
    expect(resolveSupportEmail('hilfe@example.com', provider)).toBe('hilfe@example.com');
    expect(resolveSupportEmail(null, provider)).toBe('hallo@example.com');
    expect(resolveSupportEmail('  ', provider)).toBe('hallo@example.com');
    expect(resolveSupportEmail('kein-mail', provider)).toBeNull();
    expect(resolveSupportEmail(null, 'Beispiel GmbH\nohne E-Mail')).toBeNull();
    expect(resolveSupportEmail(null, null)).toBeNull();
  });

  it('only accept an https address for the website', () => {
    expect(resolveWebsiteUrl('https://example.github.io/GAME/')).toBe('https://example.github.io/GAME');
    expect(resolveWebsiteUrl('http://example.com')).toBeNull();
    expect(resolveWebsiteUrl('javascript:alert(1)')).toBeNull();
    expect(resolveWebsiteUrl(null)).toBeNull();
    expect(helpPageUrl('https://spicynight.example', 'es')).toBe('https://spicynight.example/es/support/');
  });

  it('describe the system without anything personal', () => {
    expect(systemLabel('ios', '18.1')).toBe('iOS 18.1');
    expect(systemLabel('android', 35, '15')).toBe('Android 15 (API 35)');
    expect(systemLabel('android', 35)).toBe('Android (API 35)');
    expect(systemLabel('web', '')).toBe('web');
    // Without a version (never on a phone, but in tests) nothing reads "undefined".
    expect(systemLabel('ios', undefined)).toBe('iOS');
    expect(systemLabel('android', undefined, '15')).toBe('Android 15');
    expect(systemLabel('android', '')).toBe('Android');
  });

  it('build a mail link with encoded subject and body', () => {
    expect(feedbackMailUrl('hallo@example.com', 'SPICY NIGHT – Feedback', 'Zeile 1\nZeile 2 & mehr')).toBe(
      'mailto:hallo@example.com?subject=SPICY%20NIGHT%20%E2%80%93%20Feedback&body=Zeile%201%0AZeile%202%20%26%20mehr',
    );
  });
});
