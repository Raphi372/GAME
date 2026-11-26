/**
 * Provider details for the privacy notice ("Verantwortliche Stelle" / "Controller").
 *
 * Fill in before the store release (see docs/store/README.md), one line each, e.g.
 * `'Firma GmbH\nMusterstraße 1\n12345 Musterstadt\nDeutschland\nkontakt@example.com'`.
 * As long as `providerContact` is `null`, the privacy screen shows a placeholder and a
 * visible draft note – a build in that state must not be submitted to the stores.
 */
export const LEGAL: { providerContact: string | null } = {
  providerContact: null,
};
