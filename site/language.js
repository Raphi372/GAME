/* Root page: open the site in the visitor's language (German, English or Spanish). */
(() => {
  const supported = ['de', 'en', 'es'];
  const preferred = window.navigator.languages || [window.navigator.language || ''];
  const match = preferred
    .map((language) => String(language).slice(0, 2).toLowerCase())
    .find((code) => supported.includes(code));
  window.location.replace(`${match || 'en'}/`);
})();
