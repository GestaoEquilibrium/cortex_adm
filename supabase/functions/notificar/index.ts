// ============================================================
// CORTEX GESTAO - Edge Function "notificar"
// Criar no painel do Supabase: Edge Functions -> Deploy new
// function -> nome: notificar -> colar este arquivo inteiro.
// IMPORTANTE: desligue "Verify JWT with legacy secret" (a
// funcao valida sozinha: segredo do banco OU login do usuario).
// Secrets necessarios (aba Secrets): VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY, VAPID_SUBJECT, NOTIFY_SECRET.
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") || "mailto:wessilon@gmail.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-notify-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const body = await req.json().catch(() => ({}));
  const tipo = String(body.tipo || "teste");
  const admin = createClient(SB_URL, SERVICE);

  // Quem pode mandar: o banco (com o segredo) ou um usuario logado (teste)
  let apenasDe: string | null = null;
  const segredo = req.headers.get("x-notify-secret");
  if (segredo !== Deno.env.get("NOTIFY_SECRET")) {
    const jwt = (req.headers.get("authorization") || "").replace("Bearer ", "");
    const { data } = await createClient(SB_URL, ANON).auth.getUser(jwt);
    if (!data || !data.user) return new Response("nao autorizado", { status: 401, headers: cors });
    apenasDe = data.user.id; // teste: so os aparelhos de quem pediu
  }

  let q = admin.from("push_inscricoes").select("id, endpoint, p256dh, auth, profile_id");
  if (apenasDe) q = q.eq("profile_id", apenasDe);
  const { data: subs } = await q;
  let lista = subs || [];

  // Fora do teste, respeita as preferencias de cada pessoa
  if (!apenasDe && tipo !== "teste") {
    const { data: prefs } = await admin
      .from("notificacao_preferencias").select("profile_id")
      .eq("tipo", tipo).eq("ativo", true);
    const ok = new Set((prefs || []).map((p: { profile_id: string }) => p.profile_id));
    lista = lista.filter((s) => ok.has(s.profile_id));
  }

  const payload = JSON.stringify({
    titulo: body.titulo || "CORTEX Gestão",
    corpo: body.corpo || "Novo aviso.",
    url: body.url || "./",
    tipo,
  });

  let enviadas = 0;
  for (const s of lista) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
      enviadas++;
    } catch (e) {
      const st = e && (e as { statusCode?: number }).statusCode;
      if (st === 404 || st === 410) await admin.from("push_inscricoes").delete().eq("id", s.id);
    }
  }
  return new Response(JSON.stringify({ ok: true, enviadas }), { headers: { ...cors, "Content-Type": "application/json" } });
});
