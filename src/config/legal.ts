import legal from './legal.json';

/**
 * Provider details ("Verantwortliche Stelle" / "Controller") for the privacy screen in the
 * app and for the website (privacy policy and imprint, `npm run site:build`).
 *
 * Fill in `providerContact` in `src/config/legal.json` before the store release (see
 * docs/store/README.md), one line each, e.g.
 * `"Firma GmbH\nMusterstraße 1\n12345 Musterstadt\nDeutschland\nkontakt@example.com"`.
 * As long as it is `null`, the privacy screen shows a placeholder and a visible draft note
 * and the website is built as a draft – neither may be published like that.
 */
export const LEGAL: { providerContact: string | null } = {
  providerContact: legal.providerContact,
};
