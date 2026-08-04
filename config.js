// ============================================================
// CORTEX GESTAO - CONFIGURACAO
// Chaves do projeto Supabase (anon key e publica por natureza;
// a protecao dos dados e feita pela RLS no banco).
// ============================================================

window.CORTEX_CFG = {
  SUPABASE_URL: "https://vznjdgofvjbyivqkygvx.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6bmpkZ29mdmpieWl2cWt5Z3Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NjE2OTUsImV4cCI6MjEwMTQzNzY5NX0.Mf-doEHFJWuL8dFVzjFz7chLRW7MGfu_-LdSZMww5qY",
};

// Limpeza automatica: remove barras e sufixos colados por engano
// (ex.: /rest/v1, /auth/v1), licao aprendida nos projetos anteriores.
(function () {
  var u = String(window.CORTEX_CFG.SUPABASE_URL || "").trim();
  u = u.replace(/\/+$/, "").replace(/\/(rest|auth|storage|realtime)\/v1.*$/i, "");
  window.CORTEX_CFG.SUPABASE_URL = u;
  window.CORTEX_CFG.SUPABASE_ANON_KEY = String(window.CORTEX_CFG.SUPABASE_ANON_KEY || "").trim();
})();
