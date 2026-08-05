// ============================================================
// CORTEX GESTAO - Edge Function "notificar" (v2 - sprint 44)
// Atualizar no painel: Edge Functions -> notificar -> Code ->
// substituir TUDO por este arquivo -> Deploy updates.
// Secrets continuam os mesmos (VAPID_* e NOTIFY_SECRET).
//
// Novidade: envio DIRECIONADO (para_profile) - usado pelo aviso
// de demanda atribuida. Aviso pessoal vem LIGADO por padrao:
// so nao entrega se a pessoa desligou o tipo nas preferencias.
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
  let apenasDe: string | null = null;      // teste: so quem pediu
  let paraProfile: string | null = null;   // direcionado: so o designado
  const segredo = req.headers.get("x-notify-secret");
  if (segredo === Deno.env.get("NOTIFY_SECRET")) {
    paraProfile = body.para_profile ? String(body.para_profile) : null;
  } else {
    const jwt = (req.headers.get("authorization") || "").replace("Bearer ", "");
    const { data } = await createClient(SB_URL, ANON).auth.getUser(jwt);
    if (!data || !data.user) return new Response("nao autorizado", { status: 401, headers: cors });
    apenasDe = data.user.id;
  }

  let q = admin.from("push_inscricoes").select("id, endpoint, p256dh, auth, profile_id");
  if (apenasDe) q = q.eq("profile_id", apenasDe);
  if (paraProfile) q = q.eq("profile_id", paraProfile);
  const { data: subs } = await q;
  let lista = subs || [];

  if (!apenasDe && tipo !== "teste") {
    if (paraProfile) {
      // aviso pessoal: entrega por padrao; respeita apenas o "desligado" explicito
      const { data: off } = await admin
        .from("notificacao_preferencias").select("profile_id")
        .eq("profile_id", paraProfile).eq("tipo", tipo).eq("ativo", false);
      if ((off || []).length > 0) lista = [];
    } else {
      // aviso geral: so para quem ligou o tipo
      const { data: prefs } = await admin
        .from("notificacao_preferencias").select("profile_id")
        .eq("tipo", tipo).eq("ativo", true);
      const ok = new Set((prefs || []).map((p: { profile_id: string }) => p.profile_id));
      lista = lista.filter((s) => ok.has(s.profile_id));
    }
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
