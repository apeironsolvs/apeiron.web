/* ==========================================================================
   Apeiron Solutions — Configuration
   PUBLIC settings only (contact email, optional endpoint URL). Never put secrets here.
   ========================================================================== */
export const CONFIG = {
  email: 'hello@apeiron.example', // TODO: replace with real contact address before launch
  endpoint: '/api/enquiries'    // Our own API (server/). If it is unreachable the form falls back to the visitor's email app.
};

if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
