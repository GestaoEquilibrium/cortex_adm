// ============================================================
// CORTEX GESTAO - APP (FASE 1)
// Login + shell + sidebar flutuante + painel + auditoria
// ============================================================

const { useState, useEffect, useMemo, useCallback } = React;

const CFG = window.CORTEX_CFG || {};
const CONFIG_OK =
  CFG.SUPABASE_URL &&
  CFG.SUPABASE_ANON_KEY &&
  CFG.SUPABASE_URL.indexOf("COLE_AQUI") === -1 &&
  CFG.SUPABASE_ANON_KEY.indexOf("COLE_AQUI") === -1;

const sb = CONFIG_OK ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : null;

// ------------------------------------------------------------
// Registro dos modulos (id = chave usada na tabela permissoes)
// ------------------------------------------------------------
const MODULOS = [
  { id: "painel",        rotulo: "Painel",         icone: "ti-layout-dashboard", cor: "var(--laranja-texto)", fundo: "var(--tint)",        status: "ativo" },
  { id: "arquivos",      rotulo: "Arquivos",       icone: "ti-folder",           cor: "var(--laranja-texto)", fundo: "var(--tint)",        status: "proximo" },
  { id: "modelos",       rotulo: "Modelos",        icone: "ti-file-text",        cor: "var(--ambar)",         fundo: "var(--ambar-bg)",    status: "proximo" },
  { id: "rh",            rotulo: "RH e equipe",    icone: "ti-users",            cor: "var(--roxo)",          fundo: "var(--roxo-bg)",     status: "fase2" },
  { id: "salas",         rotulo: "Salas",          icone: "ti-door",             cor: "var(--teal)",          fundo: "var(--teal-bg)",     status: "fase2" },
  { id: "pee",           rotulo: "PEE",            icone: "ti-book",             cor: "var(--rosa)",          fundo: "var(--rosa-bg)",     status: "fase2" },
  { id: "relatorios",    rotulo: "Relatórios",     icone: "ti-chart-bar",        cor: "var(--verde)",         fundo: "var(--verde-bg)",    status: "fase3" },
  { id: "auditoria",     rotulo: "Auditoria",      icone: "ti-history",          cor: "var(--sec)",           fundo: "#EFE9E2",            status: "ativo" },
  { id: "outros_cortex", rotulo: "Outros CORTEX",  icone: "ti-external-link",    cor: "var(--azul)",          fundo: "var(--azul-bg)",     status: "ativo" },
  { id: "instrucoes",    rotulo: "Instruções",     icone: "ti-info-circle",      cor: "#0369A1",              fundo: "#E0F2FE",            status: "ativo" },
  { id: "configuracoes", rotulo: "Configurações",  icone: "ti-settings",         cor: "var(--sec)",           fundo: "#F1EDE8",            status: "ativo" },
];

const STATUS_CHIP = {
  proximo: { texto: "próxima entrega", fundo: "var(--tint)", cor: "var(--laranja-texto)" },
  fase2:   { texto: "fase 2",          fundo: "var(--azul-bg)", cor: "var(--azul)" },
  fase3:   { texto: "fase 3",          fundo: "#F1EDE8", cor: "var(--sec)" },
};

// ------------------------------------------------------------
// Auxiliares
// ------------------------------------------------------------
function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function dataExtenso() {
  const t = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function iniciais(nome) {
  if (!nome) return "?";
  const p = nome.trim().split(/\s+/);
  return ((p[0] || "")[0] + ((p[1] || "")[0] || "")).toUpperCase();
}

function primeiroNome(nome) {
  return (nome || "").trim().split(/\s+/)[0] || "";
}

const NOMES_PERFIL = { Direcao: "Direção", Coordenacao: "Coordenação", Recepcao: "Recepção" };
function exibirPerfil(nome) {
  return NOMES_PERFIL[nome] || nome || "sem perfil";
}

function urlAbsoluta(u) {
  const t = String(u || "").trim();
  if (!t) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return t;
  return "https://" + t;
}

function tempoRelativo(ts) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return "agora mesmo";
  const m = Math.floor(s / 60);
  if (m < 60) return "há " + m + " min";
  const h = Math.floor(m / 60);
  if (h < 24) return "há " + h + (h === 1 ? " hora" : " horas");
  const d = Math.floor(h / 24);
  if (d < 30) return "há " + d + (d === 1 ? " dia" : " dias");
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(ts));
}

const VERBOS = {
  insert: "criou", update: "editou", delete: "apagou",
  visualizar: "visualizou", baixar: "baixou", exportar: "exportou",
  login: "entrou no sistema", logout: "saiu do sistema",
};

const ICONES_ACAO = {
  insert: "ti-plus", update: "ti-edit", delete: "ti-trash",
  visualizar: "ti-eye", baixar: "ti-download", exportar: "ti-file-export",
  login: "ti-login-2", logout: "ti-logout",
};

function registrarEvento(acao, modulo, entidade, entidadeId, detalhes) {
  if (!sb) return;
  sb.rpc("registrar_evento", {
    p_acao: acao,
    p_modulo: modulo || null,
    p_entidade: entidade || null,
    p_entidade_id: entidadeId || null,
    p_detalhes: detalhes || {},
  }).then(() => {}).catch(() => {});
}

// Nivel efetivo de um modulo para o usuario logado.
function nivelModulo(ctx, moduloId) {
  if (!ctx || !ctx.profile) return "oculto";
  if (ctx.acessoTotal) return "editar";
  const regra = (ctx.permissoes || []).find((p) => p.modulo === moduloId && !p.aba);
  return regra ? regra.nivel : "oculto";
}

// ------------------------------------------------------------
// Marca
// ------------------------------------------------------------
function Asterisco({ tam = 20 }) {
  return (
    <svg className="logo-marca" width={tam} height={tam} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" stroke="#F97316" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function Carregando({ texto }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, background: "var(--fundo)" }}>
      <div style={{ animation: "girar 1.1s linear infinite", lineHeight: 0 }}><Asterisco tam={30} /></div>
      <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>{texto || "Carregando"}</div>
    </div>
  );
}

// ------------------------------------------------------------
// Telas de excecao
// ------------------------------------------------------------
function TelaConfigPendente() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--fundo)", padding: 20 }}>
      <div className="card-fl anim-sobe" style={{ maxWidth: 460, padding: "30px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Asterisco tam={22} />
          <span style={{ fontWeight: 700, fontSize: 17 }}>CORTEX <span style={{ color: "var(--laranja-escuro)" }}>Gestão</span></span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Falta conectar o banco</div>
        <p style={{ fontSize: 13.5, color: "var(--sec)", lineHeight: 1.6 }}>
          Abra o arquivo <span style={{ fontFamily: "'JetBrains Mono', monospace", background: "var(--tint)", color: "var(--laranja-texto)", padding: "1px 6px", borderRadius: 6, fontSize: 12 }}>config.js</span> e
          cole a Project URL e a anon key do seu projeto Supabase (Settings, API). Depois recarregue esta página.
        </p>
      </div>
    </div>
  );
}

function TelaSemPerfil({ profile, aoSair }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--fundo)", padding: 20 }}>
      <div className="card-fl anim-sobe" style={{ maxWidth: 440, padding: "30px 32px", textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: "var(--tint)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <i className="ti ti-lock" style={{ fontSize: 24, color: "var(--laranja-texto)" }} aria-hidden="true"></i>
        </div>
        <div style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 8 }}>Quase lá, {primeiroNome(profile && profile.nome) || "colega"}</div>
        <p style={{ fontSize: 13.5, color: "var(--sec)", lineHeight: 1.6, marginBottom: 18 }}>
          Seu cadastro foi criado, mas a Direção ainda não atribuiu um perfil de acesso para você.
          Assim que isso acontecer, os módulos aparecem aqui.
        </p>
        <button className="btn-contorno" onClick={aoSair}><i className="ti ti-logout" style={{ fontSize: 15 }} aria-hidden="true"></i>Sair</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Login
// ------------------------------------------------------------
function TelaLogin() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) {
      const m = String(error.message || "");
      if (m.indexOf("Invalid login credentials") !== -1) setErro("E-mail ou senha incorretos.");
      else if (m.indexOf("Email not confirmed") !== -1) setErro("E-mail ainda não confirmado. Fale com a Direção.");
      else setErro("Não foi possível entrar: " + m);
      setEnviando(false);
      return;
    }
    registrarEvento("login", "sistema");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(900px 480px at 15% -10%, #FFF1E7 0%, rgba(255,241,231,0) 60%), var(--fundo)", padding: 20 }}>
      <div className="card-fl anim-sobe" style={{ width: "100%", maxWidth: 400, padding: "34px 34px 28px" }}>
        <div className="logo-area" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Asterisco tam={26} />
          <span style={{ fontWeight: 700, fontSize: 20 }}>CORTEX <span style={{ color: "var(--laranja-escuro)" }}>Gestão</span></span>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>Sistema administrativo do Grupo Equilibrium</p>

        <form onSubmit={entrar}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--sec)", marginBottom: 6 }}>E-mail</label>
          <input className="campo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@equilibrium.com" autoComplete="username" required style={{ marginBottom: 14 }} />

          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--sec)", marginBottom: 6 }}>Senha</label>
          <input className="campo" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Sua senha" autoComplete="current-password" required style={{ marginBottom: erro ? 12 : 22 }} />

          {erro && (
            <div className="anim-pop" style={{ background: "var(--vermelho-bg)", color: "var(--vermelho)", fontSize: 12.5, fontWeight: 500, padding: "9px 12px", borderRadius: 9, marginBottom: 16, display: "flex", alignItems: "center", gap: 7 }}>
              <i className="ti ti-alert-circle" style={{ fontSize: 15 }} aria-hidden="true"></i>{erro}
            </div>
          )}

          <button className="btn-primaria" type="submit" disabled={enviando} style={{ width: "100%", justifyContent: "center", padding: "12px 18px" }}>
            {enviando ? "Entrando..." : "Entrar"}
            {!enviando && <i className="ti ti-arrow-right" style={{ fontSize: 16 }} aria-hidden="true"></i>}
          </button>
        </form>

        <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 20, textAlign: "center" }}>
          Acesso criado pela Direção · toda atividade fica registrada
        </p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Sidebar flutuante (3 estados: exp, rail, oculta)
// ------------------------------------------------------------
function Sidebar({ ctx, pagina, setPagina, estado, setEstado, aoSair }) {
  const visiveis = MODULOS.filter((m) => nivelModulo(ctx, m.id) !== "oculto");
  const principais = visiveis.filter((m) => m.id !== "configuracoes");
  const config = visiveis.find((m) => m.id === "configuracoes");

  function Item({ m }) {
    const ativo = pagina === m.id;
    return (
      <div
        className={"item-menu" + (ativo ? " on" : "")}
        onClick={() => setPagina(m.id)}
        title={estado === "rail" ? m.rotulo : undefined}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") setPagina(m.id); }}
      >
        <i className={"ti " + m.icone} style={{ fontSize: 18, flex: "none" }} aria-hidden="true"></i>
        <span className="rotulo">{m.rotulo}</span>
      </div>
    );
  }

  return (
    <React.Fragment>
      {estado === "oculta" && (
        <div className="quadradinho" onClick={() => setEstado("exp")} role="button" aria-label="Abrir menu" tabIndex={0}
             onKeyDown={(e) => { if (e.key === "Enter") setEstado("exp"); }}>
          <Asterisco tam={20} />
        </div>
      )}

      <aside className={"sb" + (estado === "rail" ? " rail" : "") + (estado === "oculta" ? " oculta" : "")}>
        <div className="logo-area" style={{ display: "flex", alignItems: "center", gap: 9, padding: "2px 8px 10px", minHeight: 34 }}>
          <Asterisco tam={20} />
          <span className="rotulo" style={{ fontWeight: 700, fontSize: 15.5 }}>CORTEX <span style={{ color: "var(--laranja-escuro)" }}>Gestão</span></span>
        </div>

        <div style={{ display: "flex", gap: 6, padding: "0 6px 10px", flexWrap: "wrap" }}>
          <button className="btn-fantasma" onClick={() => setEstado(estado === "rail" ? "exp" : "rail")}
                  aria-label={estado === "rail" ? "Expandir menu" : "Minimizar menu"}>
            <i className={"ti " + (estado === "rail" ? "ti-layout-sidebar-left-expand" : "ti-layout-sidebar-left-collapse")} style={{ fontSize: 16 }} aria-hidden="true"></i>
          </button>
          <button className="btn-fantasma" onClick={() => setEstado("oculta")} aria-label="Fechar menu">
            <i className="ti ti-x" style={{ fontSize: 16 }} aria-hidden="true"></i>
          </button>
        </div>

        {principais.map((m) => <Item key={m.id} m={m} />)}

        <div style={{ flex: 1, minHeight: 12 }}></div>

        {config && <Item m={config} />}

        <div className="user-card" title={ctx.profile.nome}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--grad)", color: "#fff", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", boxShadow: "0 2px 8px rgba(249,115,22,.28)" }}>
            {iniciais(ctx.profile.nome)}
          </div>
          <div className="rotulo" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ctx.profile.nome}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exibirPerfil(ctx.perfilNome)}</div>
          </div>
          <button className="btn-fantasma" onClick={aoSair} aria-label="Sair" title="Sair" style={{ width: 28, height: 28, flex: "none" }}>
            <i className="ti ti-logout" style={{ fontSize: 15 }} aria-hidden="true"></i>
          </button>
        </div>
      </aside>
    </React.Fragment>
  );
}

// ------------------------------------------------------------
// Topo
// ------------------------------------------------------------
function Topo({ ctx }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{saudacao()}, {primeiroNome(ctx.profile.nome)}</div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{dataExtenso()} · perfil {exibirPerfil(ctx.perfilNome)}</div>
    </div>
  );
}

// ------------------------------------------------------------
// Painel
// ------------------------------------------------------------
function PaginaPainel({ ctx, setPagina }) {
  const [contagens, setContagens] = useState(null);
  const [atividade, setAtividade] = useState(null);
  const podeAuditoria = nivelModulo(ctx, "auditoria") !== "oculto";

  useEffect(() => {
    let vivo = true;
    async function carregar() {
      const alvos = [
        { chave: "pastas", tabela: "pastas" },
        { chave: "arquivos", tabela: "arquivos" },
        { chave: "modelos", tabela: "modelos" },
        { chave: "pessoas", tabela: "profiles" },
      ];
      const resultado = {};
      await Promise.all(alvos.map(async (a) => {
        try {
          const { count, error } = await sb.from(a.tabela).select("*", { count: "exact", head: true });
          resultado[a.chave] = error ? null : count;
        } catch (e) { resultado[a.chave] = null; }
      }));
      if (vivo) setContagens(resultado);

      if (podeAuditoria) {
        const { data } = await sb.from("auditoria").select("id,user_nome,acao,modulo,entidade,created_at").order("created_at", { ascending: false }).limit(6);
        if (vivo) setAtividade(data || []);
      }
    }
    carregar();
    return () => { vivo = false; };
  }, []);

  const kpis = [
    { rotulo: "Pastas no drive", chave: "pastas", icone: "ti-folder", cor: "var(--laranja-texto)", fundo: "var(--tint)" },
    { rotulo: "Arquivos", chave: "arquivos", icone: "ti-file", cor: "var(--azul)", fundo: "var(--azul-bg)" },
    { rotulo: "Modelos prontos", chave: "modelos", icone: "ti-file-text", cor: "var(--ambar)", fundo: "var(--ambar-bg)" },
    { rotulo: "Pessoas cadastradas", chave: "pessoas", icone: "ti-users", cor: "var(--roxo)", fundo: "var(--roxo-bg)" },
  ];

  const atalhos = MODULOS.filter((m) => m.id !== "painel" && nivelModulo(ctx, m.id) !== "oculto");

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 14 }}>
        {kpis.map((k, i) => (
          <div key={k.chave} className="card-fl anim-sobe" style={{ padding: "14px 16px", animationDelay: (i * 60) + "ms" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: k.fundo, color: k.cor, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <i className={"ti " + k.icone} style={{ fontSize: 17 }} aria-hidden="true"></i>
            </div>
            <div style={{ fontSize: 12, color: "var(--sec)", fontWeight: 500 }}>{k.rotulo}</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>
              {contagens ? (contagens[k.chave] === null ? "—" : contagens[k.chave]) : "…"}
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--sec)", margin: "18px 2px 10px" }}>Módulos</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 14 }}>
        {atalhos.map((m, i) => (
          <div key={m.id} className="card-fl clicavel anim-sobe" onClick={() => setPagina(m.id)} style={{ padding: "13px 15px", animationDelay: (i * 45) + "ms" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: m.fundo, color: m.cor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={"ti " + m.icone} style={{ fontSize: 16 }} aria-hidden="true"></i>
              </div>
              {STATUS_CHIP[m.status] && (
                <span className="chip" style={{ background: STATUS_CHIP[m.status].fundo, color: STATUS_CHIP[m.status].cor }}>{STATUS_CHIP[m.status].texto}</span>
              )}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{m.rotulo}</div>
          </div>
        ))}
      </div>

      {podeAuditoria && (
        <div className="card-fl anim-sobe" style={{ padding: "14px 16px", animationDelay: "180ms" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 13.5 }}>Atividade recente</span>
            <button className="btn-fantasma" style={{ width: "auto", padding: "0 10px", height: 28, fontSize: 12, fontWeight: 600 }} onClick={() => setPagina("auditoria")}>ver tudo</button>
          </div>
          {!atividade && <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "8px 0" }}>Carregando…</div>}
          {atividade && atividade.length === 0 && <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "8px 0" }}>Ainda não há registros. Cada ação no sistema vai aparecer aqui.</div>}
          {atividade && atividade.map((a) => (
            <div key={a.id} className="linha-hover" style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 4px", borderTop: "1px solid var(--linha-suave)", fontSize: 12.5, color: "var(--sec)" }}>
              <i className={"ti " + (ICONES_ACAO[a.acao] || "ti-point")} style={{ fontSize: 15, color: "var(--laranja-texto)", flex: "none" }} aria-hidden="true"></i>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span style={{ fontWeight: 600, color: "var(--ink)" }}>{a.user_nome || "Alguém"}</span> {VERBOS[a.acao] || a.acao} {a.entidade ? a.entidade : (a.modulo || "")}
              </span>
              <span style={{ flex: "none", color: "var(--muted)", fontSize: 11.5 }}>{tempoRelativo(a.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Auditoria
// ------------------------------------------------------------
function PaginaAuditoria() {
  const [linhas, setLinhas] = useState(null);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    let vivo = true;
    sb.from("auditoria")
      .select("id,user_nome,acao,modulo,entidade,entidade_id,created_at")
      .order("created_at", { ascending: false })
      .limit(80)
      .then(({ data }) => { if (vivo) setLinhas(data || []); });
    return () => { vivo = false; };
  }, []);

  const filtradas = useMemo(() => {
    if (!linhas) return null;
    const q = busca.trim().toLowerCase();
    if (!q) return linhas;
    return linhas.filter((l) =>
      [l.user_nome, l.acao, l.modulo, l.entidade, l.entidade_id].some((v) => String(v || "").toLowerCase().indexOf(q) !== -1)
    );
  }, [linhas, busca]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "var(--muted)" }} aria-hidden="true"></i>
          <input className="campo" style={{ paddingLeft: 36 }} placeholder="Buscar por pessoa, ação ou módulo" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <span className="chip" style={{ background: "var(--tint)", color: "var(--laranja-texto)" }}>
          <i className="ti ti-lock" style={{ fontSize: 12 }} aria-hidden="true"></i>registro imutável
        </span>
      </div>

      <div className="card-fl anim-sobe" style={{ overflow: "hidden" }}>
        {!filtradas && <div style={{ padding: 16, fontSize: 13, color: "var(--muted)" }}>Carregando…</div>}
        {filtradas && filtradas.length === 0 && (
          <div style={{ padding: "26px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
            Nenhum registro encontrado{busca ? " para essa busca" : " ainda"}.
          </div>
        )}
        {filtradas && filtradas.map((l) => (
          <div key={l.id} className="linha-hover" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--linha-suave)" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--tint)", color: "var(--laranja-texto)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              <i className={"ti " + (ICONES_ACAO[l.acao] || "ti-point")} style={{ fontSize: 15 }} aria-hidden="true"></i>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span style={{ fontWeight: 600 }}>{l.user_nome || "Alguém"}</span>{" "}
                <span style={{ color: "var(--sec)" }}>{VERBOS[l.acao] || l.acao}</span>{" "}
                {l.entidade && <span style={{ color: "var(--sec)" }}>{l.entidade}{l.entidade_id && l.entidade_id !== "?" ? " · " + String(l.entidade_id).slice(0, 8) : ""}</span>}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>
                {l.modulo || "sistema"} · {tempoRelativo(l.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Outros CORTEX
// ------------------------------------------------------------
function PaginaOutros() {
  const [links, setLinks] = useState(null);

  useEffect(() => {
    let vivo = true;
    sb.from("cortex_links").select("*").eq("ativo", true).order("ordem")
      .then(({ data }) => { if (vivo) setLinks(data || []); });
    return () => { vivo = false; };
  }, []);

  function abrir(l) {
    if (!l.url) return;
    registrarEvento("visualizar", "outros_cortex", l.nome, l.id);
    window.open(urlAbsoluta(l.url), "_blank", "noopener");
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--sec)", marginBottom: 14 }}>Atalhos para os outros sistemas do grupo. As URLs são configuradas pela Direção.</p>
      {!links && <div style={{ fontSize: 13, color: "var(--muted)" }}>Carregando…</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
        {links && links.map((l, i) => (
          <div key={l.id} className="card-fl anim-sobe" style={{ padding: "16px 17px", animationDelay: (i * 60) + "ms" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: l.cor || "var(--laranja)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 11, boxShadow: "0 3px 10px rgba(36,31,28,.15)" }}>
              <Asterisco tam={16} />
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>{l.nome}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", margin: "3px 0 13px", minHeight: 16 }}>{l.descricao || ""}</div>
            {l.url ? (
              <button className="btn-primaria" style={{ padding: "8px 14px", fontSize: 12.5 }} onClick={() => abrir(l)}>
                Abrir<i className="ti ti-external-link" style={{ fontSize: 14 }} aria-hidden="true"></i>
              </button>
            ) : (
              <span className="chip" style={{ background: "#F1EDE8", color: "var(--sec)" }}>URL não configurada</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Instrucoes
// ------------------------------------------------------------
function PaginaInstrucoes() {
  const [itens, setItens] = useState(null);

  useEffect(() => {
    let vivo = true;
    sb.from("instrucoes").select("*").order("modulo").order("ordem")
      .then(({ data }) => { if (vivo) setItens(data || []); });
    return () => { vivo = false; };
  }, []);

  const grupos = useMemo(() => {
    if (!itens) return null;
    const g = {};
    itens.forEach((i) => { (g[i.modulo] = g[i.modulo] || []).push(i); });
    return g;
  }, [itens]);

  return (
    <div>
      {!grupos && <div style={{ fontSize: 13, color: "var(--muted)" }}>Carregando…</div>}
      {grupos && Object.keys(grupos).length === 0 && (
        <div className="card-fl" style={{ padding: 20, fontSize: 13, color: "var(--muted)", textAlign: "center" }}>Nenhuma instrução cadastrada ainda.</div>
      )}
      {grupos && Object.keys(grupos).map((mod) => {
        const meta = MODULOS.find((m) => m.id === mod) || { rotulo: mod, icone: "ti-info-circle", cor: "var(--sec)", fundo: "#F1EDE8" };
        return (
          <div key={mod} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 2px 8px" }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: meta.fundo, color: meta.cor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={"ti " + meta.icone} style={{ fontSize: 14 }} aria-hidden="true"></i>
              </div>
              <span style={{ fontWeight: 700, fontSize: 13.5 }}>{meta.rotulo}</span>
            </div>
            {grupos[mod].map((it) => (
              <div key={it.id} className="card-fl anim-sobe" style={{ padding: "14px 16px", marginBottom: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 5 }}>{it.titulo}</div>
                <div style={{ fontSize: 13, color: "var(--sec)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{it.conteudo}</div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------
// Configuracoes: perfis e permissoes, pessoas, outros CORTEX
// ------------------------------------------------------------
function SegNivel({ valor, aoMudar, desabilitado }) {
  const ops = [
    { v: "oculto", r: "Oculto", cls: "on-h" },
    { v: "ver", r: "Ver", cls: "on-v" },
    { v: "editar", r: "Editar", cls: "on-e" },
  ];
  return (
    <span className="seg">
      {ops.map((o) => (
        <button key={o.v} type="button" disabled={desabilitado}
          className={"sg" + (valor === o.v ? " " + o.cls : "")}
          onClick={() => aoMudar(o.v)}>{o.r}</button>
      ))}
    </span>
  );
}

function AbaPerfis({ ctx, podeEditar }) {
  const [perfis, setPerfis] = useState(null);
  const [contagem, setContagem] = useState({});
  const [sel, setSel] = useState(null);
  const [mapa, setMapa] = useState({});
  const [orig, setOrig] = useState("{}");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [criando, setCriando] = useState(false);

  async function carregarPerfis(selecionarId) {
    const { data: ps } = await sb.from("perfis").select("*").order("acesso_total", { ascending: false }).order("nome");
    const { data: pessoas } = await sb.from("profiles").select("id, perfil_id");
    const cont = {};
    (pessoas || []).forEach((p) => { if (p.perfil_id) cont[p.perfil_id] = (cont[p.perfil_id] || 0) + 1; });
    setPerfis(ps || []);
    setContagem(cont);
    const alvo = (ps || []).find((p) => p.id === selecionarId) || (ps || [])[0] || null;
    setSel(alvo);
  }

  useEffect(() => { carregarPerfis(); }, []);

  useEffect(() => {
    if (!sel || sel.acesso_total) { setMapa({}); setOrig("{}"); return; }
    let vivo = true;
    sb.from("permissoes").select("modulo, nivel").eq("perfil_id", sel.id).is("aba", null)
      .then(({ data }) => {
        if (!vivo) return;
        const m = {};
        MODULOS.forEach((mod) => { m[mod.id] = "oculto"; });
        (data || []).forEach((r) => { m[r.modulo] = r.nivel; });
        setMapa(m);
        setOrig(JSON.stringify(m));
      });
    return () => { vivo = false; };
  }, [sel && sel.id]);

  const temMudanca = sel && !sel.acesso_total && JSON.stringify(mapa) !== orig;

  async function salvar() {
    if (!sel || salvando) return;
    setSalvando(true);
    setMsg("");
    const del = await sb.from("permissoes").delete().eq("perfil_id", sel.id).is("aba", null);
    if (del.error) { setMsg("Erro ao salvar: " + del.error.message); setSalvando(false); return; }
    const linhas = Object.keys(mapa).filter((k) => mapa[k] !== "oculto").map((k) => ({ perfil_id: sel.id, modulo: k, nivel: mapa[k] }));
    if (linhas.length) {
      const ins = await sb.from("permissoes").insert(linhas);
      if (ins.error) { setMsg("Erro ao salvar: " + ins.error.message); setSalvando(false); return; }
    }
    setOrig(JSON.stringify(mapa));
    setMsg("Permissões salvas.");
    setSalvando(false);
    setTimeout(() => setMsg(""), 3500);
  }

  async function criarPerfil() {
    const nome = novoNome.trim();
    if (!nome) return;
    const { data, error } = await sb.from("perfis").insert({ nome }).select().single();
    if (error) { setMsg("Erro ao criar: " + error.message); return; }
    setNovoNome("");
    setCriando(false);
    carregarPerfis(data.id);
  }

  async function excluirPerfil() {
    if (!sel || sel.acesso_total) return;
    if ((contagem[sel.id] || 0) > 0) { setMsg("Este perfil tem pessoas atribuídas. Mova as pessoas antes de excluir."); return; }
    if (!window.confirm('Excluir o perfil "' + sel.nome + '"?')) return;
    const { error } = await sb.from("perfis").delete().eq("id", sel.id);
    if (error) { setMsg("Erro ao excluir: " + error.message); return; }
    carregarPerfis();
  }

  if (!perfis) return <div style={{ fontSize: 13, color: "var(--muted)" }}>Carregando…</div>;

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div style={{ flex: "none", width: 200, display: "flex", flexDirection: "column", gap: 8 }}>
        {perfis.map((p) => (
          <div key={p.id} className="card-fl clicavel" onClick={() => setSel(p)}
            style={{ padding: "10px 12px", borderColor: sel && sel.id === p.id ? "var(--laranja)" : undefined, background: sel && sel.id === p.id ? "#FFF8F3" : undefined }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{exibirPerfil(p.nome)}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{contagem[p.id] || 0} {(contagem[p.id] || 0) === 1 ? "pessoa" : "pessoas"}</div>
            {p.acesso_total && <span className="chip" style={{ background: "var(--tint)", color: "var(--laranja-texto)", marginTop: 5 }}>Acesso total</span>}
          </div>
        ))}
        {podeEditar && !criando && (
          <button className="btn-contorno" onClick={() => setCriando(true)} style={{ justifyContent: "center" }}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true"></i>Novo perfil
          </button>
        )}
        {podeEditar && criando && (
          <div className="card-fl" style={{ padding: 10 }}>
            <input className="campo" style={{ padding: "8px 10px", fontSize: 13, marginBottom: 8 }} placeholder="Nome do perfil"
              value={novoNome} onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") criarPerfil(); }} autoFocus />
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn-primaria" style={{ padding: "7px 12px", fontSize: 12 }} onClick={criarPerfil}>Criar</button>
              <button className="btn-fantasma" style={{ width: "auto", padding: "0 10px" }} onClick={() => { setCriando(false); setNovoNome(""); }}>cancelar</button>
            </div>
          </div>
        )}
      </div>

      <div className="card-fl" style={{ flex: 1, minWidth: 280, padding: "12px 14px" }}>
        {!sel && <div style={{ fontSize: 13, color: "var(--muted)" }}>Selecione um perfil.</div>}
        {sel && sel.acesso_total && (
          <div style={{ padding: "18px 8px", textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: "var(--tint)", color: "var(--laranja-texto)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
              <i className="ti ti-shield-check" style={{ fontSize: 21 }} aria-hidden="true"></i>
            </div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{exibirPerfil(sel.nome)} tem acesso total</div>
            <p style={{ fontSize: 12.5, color: "var(--sec)", marginTop: 6 }}>Vê e edita todos os módulos, sempre. Não precisa de regras por módulo.</p>
          </div>
        )}
        {sel && !sel.acesso_total && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--linha-suave)", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>Permissões do perfil {exibirPerfil(sel.nome)}</span>
              {podeEditar && (
                <button className="btn-fantasma" style={{ width: "auto", padding: "0 10px", height: 28, fontSize: 12, fontWeight: 600 }} onClick={excluirPerfil}>excluir perfil</button>
              )}
            </div>
            {MODULOS.map((m) => (
              <div key={m.id} className="linha-hover" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "7px 6px", borderRadius: 9 }}>
                <span style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                  <i className={"ti " + m.icone} style={{ fontSize: 15, color: "var(--muted)", flex: "none" }} aria-hidden="true"></i>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.rotulo}</span>
                </span>
                <SegNivel valor={mapa[m.id] || "oculto"} desabilitado={!podeEditar}
                  aoMudar={(v) => setMapa({ ...mapa, [m.id]: v })} />
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, marginTop: 6, borderTop: "1px solid var(--linha-suave)", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: "var(--muted)" }}>Permissão por aba entra junto com os módulos da fase 2.</span>
              {podeEditar && (
                <button className="btn-primaria" style={{ padding: "8px 16px", fontSize: 12.5 }} disabled={!temMudanca || salvando} onClick={salvar}>
                  {salvando ? "Salvando…" : "Salvar permissões"}
                </button>
              )}
            </div>
            {msg && <div className="anim-pop" style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: msg.indexOf("Erro") === 0 ? "var(--vermelho)" : "var(--verde)" }}>{msg}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function AbaPessoas({ ctx, podeEditar }) {
  const [pessoas, setPessoas] = useState(null);
  const [perfis, setPerfis] = useState([]);
  const [msg, setMsg] = useState("");

  async function carregar() {
    const { data: ps } = await sb.from("perfis").select("id, nome, acesso_total").order("acesso_total", { ascending: false }).order("nome");
    const { data: gente } = await sb.from("profiles").select("id, nome, email, ativo, perfil_id").order("nome");
    setPerfis(ps || []);
    setPessoas(gente || []);
  }

  useEffect(() => { carregar(); }, []);

  async function mudarPerfil(p, perfilId) {
    const { error } = await sb.from("profiles").update({ perfil_id: perfilId || null }).eq("id", p.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    setMsg("");
    carregar();
  }

  async function alternarAtivo(p) {
    const { error } = await sb.from("profiles").update({ ativo: !p.ativo }).eq("id", p.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    setMsg("");
    carregar();
  }

  if (!pessoas) return <div style={{ fontSize: 13, color: "var(--muted)" }}>Carregando…</div>;

  return (
    <div>
      <div className="card-fl" style={{ overflow: "hidden" }}>
        {pessoas.map((p) => {
          const euMesmo = p.id === ctx.profile.id;
          return (
            <div key={p.id} className="linha-hover" style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 14px", borderBottom: "1px solid var(--linha-suave)", flexWrap: "wrap" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: p.ativo ? "var(--grad)" : "#D9D2CA", color: "#fff", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{iniciais(p.nome)}</div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.nome || "(sem nome)"}{euMesmo && <span style={{ fontWeight: 400, color: "var(--muted)" }}> · você</span>}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{p.email}</div>
              </div>
              <select className="campo" style={{ width: 170, padding: "7px 10px", fontSize: 12.5 }}
                value={p.perfil_id || ""} disabled={!podeEditar || euMesmo}
                title={euMesmo ? "Você não pode alterar o próprio perfil" : undefined}
                onChange={(e) => mudarPerfil(p, e.target.value)}>
                <option value="">sem perfil</option>
                {perfis.map((pf) => <option key={pf.id} value={pf.id}>{exibirPerfil(pf.nome)}</option>)}
              </select>
              <button type="button" className={"sw" + (p.ativo ? " on" : "")} disabled={!podeEditar || euMesmo}
                title={euMesmo ? "Você não pode desativar a si mesmo" : (p.ativo ? "Desativar acesso" : "Ativar acesso")}
                aria-label={p.ativo ? "Desativar acesso" : "Ativar acesso"}
                onClick={() => alternarAtivo(p)}></button>
            </div>
          );
        })}
      </div>
      {msg && <div className="anim-pop" style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: "var(--vermelho)" }}>{msg}</div>}
      <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 10 }}>
        Novos logins são criados no painel do Supabase (Authentication, Users) por enquanto; a pessoa aparece aqui na hora, aguardando perfil.
      </p>
    </div>
  );
}

function AbaLinks({ podeEditar }) {
  const [links, setLinks] = useState(null);
  const [msg, setMsg] = useState("");

  async function carregar() {
    const { data, error } = await sb.from("cortex_links").select("*").order("ordem");
    if (error) { setMsg("Sem acesso aos links (módulo Outros CORTEX)."); setLinks([]); return; }
    setLinks(data || []);
  }

  useEffect(() => { carregar(); }, []);

  function editarLocal(id, campo, valor) {
    setLinks(links.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)));
  }

  async function salvarLinha(l) {
    const { error } = await sb.from("cortex_links").update({ nome: l.nome, descricao: l.descricao, url: urlAbsoluta(l.url), cor: l.cor, ordem: Number(l.ordem) || 0, ativo: l.ativo }).eq("id", l.id);
    setMsg(error ? "Erro: " + error.message : "Link salvo.");
    if (!error) { setTimeout(() => setMsg(""), 3000); carregar(); }
  }

  async function excluir(l) {
    if (!window.confirm('Excluir o link "' + l.nome + '"?')) return;
    const { error } = await sb.from("cortex_links").delete().eq("id", l.id);
    if (!error) carregar();
  }

  async function novo() {
    const maior = (links || []).reduce((m, l) => Math.max(m, l.ordem || 0), 0);
    const { error } = await sb.from("cortex_links").insert({ nome: "Novo CORTEX", descricao: "", url: "", cor: "#F97316", ordem: maior + 1 });
    if (error) { setMsg("Erro: " + error.message); return; }
    carregar();
  }

  if (!links) return <div style={{ fontSize: 13, color: "var(--muted)" }}>Carregando…</div>;

  return (
    <div>
      {links.map((l) => (
        <div key={l.id} className="card-fl" style={{ padding: "11px 13px", marginBottom: 10, display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          <input type="color" value={l.cor || "#F97316"} disabled={!podeEditar}
            onChange={(e) => editarLocal(l.id, "cor", e.target.value)}
            style={{ width: 34, height: 34, border: "1px solid var(--linha)", borderRadius: 9, padding: 2, background: "#fff", cursor: podeEditar ? "pointer" : "default", flex: "none" }}
            aria-label="Cor do botão" />
          <input className="campo" style={{ width: 150, padding: "7px 10px", fontSize: 12.5 }} value={l.nome || ""} disabled={!podeEditar} placeholder="Nome"
            onChange={(e) => editarLocal(l.id, "nome", e.target.value)} />
          <input className="campo" style={{ flex: 1, minWidth: 180, padding: "7px 10px", fontSize: 12.5 }} value={l.url || ""} disabled={!podeEditar} placeholder="https://…"
            onChange={(e) => editarLocal(l.id, "url", e.target.value)} />
          <input className="campo" type="number" style={{ width: 62, padding: "7px 8px", fontSize: 12.5 }} value={l.ordem} disabled={!podeEditar} title="Ordem"
            onChange={(e) => editarLocal(l.id, "ordem", e.target.value)} />
          <button type="button" className={"sw" + (l.ativo ? " on" : "")} disabled={!podeEditar}
            title={l.ativo ? "Visível" : "Oculto"} aria-label={l.ativo ? "Ocultar link" : "Mostrar link"}
            onClick={() => editarLocal(l.id, "ativo", !l.ativo)}></button>
          {podeEditar && (
            <span style={{ display: "flex", gap: 5, flex: "none" }}>
              <button className="btn-primaria" style={{ padding: "7px 13px", fontSize: 12 }} onClick={() => salvarLinha(l)}>Salvar</button>
              <button className="btn-fantasma" onClick={() => excluir(l)} aria-label="Excluir link" title="Excluir">
                <i className="ti ti-trash" style={{ fontSize: 15 }} aria-hidden="true"></i>
              </button>
            </span>
          )}
        </div>
      ))}
      {podeEditar && (
        <button className="btn-contorno" onClick={novo}><i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true"></i>Novo link</button>
      )}
      {msg && <div className="anim-pop" style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: msg.indexOf("Erro") === 0 || msg.indexOf("Sem") === 0 ? "var(--vermelho)" : "var(--verde)" }}>{msg}</div>}
    </div>
  );
}

function PaginaConfiguracoes({ ctx }) {
  const [aba, setAba] = useState("perfis");
  const podeEditar = nivelModulo(ctx, "configuracoes") === "editar";
  return (
    <div>
      <div className="aba-linha">
        <div className={"aba" + (aba === "perfis" ? " on" : "")} onClick={() => setAba("perfis")}>Perfis e permissões</div>
        <div className={"aba" + (aba === "pessoas" ? " on" : "")} onClick={() => setAba("pessoas")}>Pessoas</div>
        <div className={"aba" + (aba === "links" ? " on" : "")} onClick={() => setAba("links")}>Outros CORTEX</div>
      </div>
      {aba === "perfis" && <AbaPerfis ctx={ctx} podeEditar={podeEditar} />}
      {aba === "pessoas" && <AbaPessoas ctx={ctx} podeEditar={podeEditar} />}
      {aba === "links" && <AbaLinks podeEditar={podeEditar} />}
    </div>
  );
}

// ------------------------------------------------------------
// Stub das proximas fases
// ------------------------------------------------------------
function PaginaStub({ m }) {
  const chip = STATUS_CHIP[m.status];
  const frases = {
    proximo: "Este módulo é a próxima entrega da construção. O banco já está pronto para recebê-lo.",
    fase2: "Este módulo entra na fase 2, junto com a migração dos dados dos sistemas atuais.",
    fase3: "Este módulo entra na fase 3, depois que os dados estiverem consolidados.",
  };
  return (
    <div className="card-fl anim-sobe" style={{ padding: "40px 24px", textAlign: "center", maxWidth: 520, margin: "30px auto 0" }}>
      <div style={{ width: 58, height: 58, borderRadius: 17, background: m.fundo, color: m.cor, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <i className={"ti " + m.icone} style={{ fontSize: 27 }} aria-hidden="true"></i>
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{m.rotulo}</div>
      <p style={{ fontSize: 13, color: "var(--sec)", lineHeight: 1.6, maxWidth: 380, margin: "0 auto 14px" }}>{frases[m.status] || frases.proximo}</p>
      {chip && <span className="chip" style={{ background: chip.fundo, color: chip.cor }}>{chip.texto}</span>}
    </div>
  );
}

// ------------------------------------------------------------
// Shell
// ------------------------------------------------------------
function Shell({ ctx, aoSair }) {
  const [pagina, setPagina] = useState("painel");
  const [sbEstado, setSbEstadoRaw] = useState(() => {
    const v = localStorage.getItem("cg_sidebar");
    return v === "rail" || v === "oculta" ? v : "exp";
  });

  const setSbEstado = useCallback((v) => {
    setSbEstadoRaw(v);
    try { localStorage.setItem("cg_sidebar", v); } catch (e) {}
  }, []);

  const moduloAtual = MODULOS.find((m) => m.id === pagina) || MODULOS[0];
  const nivel = nivelModulo(ctx, pagina);

  let conteudo;
  if (nivel === "oculto") {
    conteudo = <PaginaStub m={{ ...moduloAtual, status: "proximo", rotulo: "Sem acesso", icone: "ti-lock" }} />;
  } else if (pagina === "painel") {
    conteudo = <PaginaPainel ctx={ctx} setPagina={setPagina} />;
  } else if (pagina === "auditoria") {
    conteudo = <PaginaAuditoria />;
  } else if (pagina === "outros_cortex") {
    conteudo = <PaginaOutros />;
  } else if (pagina === "instrucoes") {
    conteudo = <PaginaInstrucoes />;
  } else if (pagina === "configuracoes") {
    conteudo = <PaginaConfiguracoes ctx={ctx} />;
  } else {
    conteudo = <PaginaStub m={moduloAtual} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--fundo)", display: "flex", gap: 14, padding: 14, alignItems: "stretch" }}>
      <Sidebar ctx={ctx} pagina={pagina} setPagina={setPagina} estado={sbEstado} setEstado={setSbEstado} aoSair={aoSair} />
      <main style={{ flex: 1, minWidth: 0, padding: "6px 6px 20px", paddingLeft: sbEstado === "oculta" ? 64 : 6, transition: "padding-left .3s var(--mola)" }}>
        <Topo ctx={ctx} />
        {pagina !== "painel" && (
          <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "0 0 14px" }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: moduloAtual.fundo, color: moduloAtual.cor, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className={"ti " + moduloAtual.icone} style={{ fontSize: 16 }} aria-hidden="true"></i>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{moduloAtual.rotulo}</span>
          </div>
        )}
        {conteudo}
      </main>
    </div>
  );
}

// ------------------------------------------------------------
// App
// ------------------------------------------------------------
function App() {
  const [fase, setFase] = useState("carregando"); // carregando | login | pronto
  const [ctx, setCtx] = useState(null);

  const carregarContexto = useCallback(async (userId) => {
    const { data: prof, error } = await sb
      .from("profiles")
      .select("id, nome, email, ativo, perfil_id, perfis ( nome, acesso_total )")
      .eq("id", userId)
      .single();

    if (error || !prof) {
      setCtx({ profile: null, permissoes: [], acessoTotal: false, perfilNome: null });
      setFase("pronto");
      return;
    }

    const acessoTotal = !!(prof.perfis && prof.perfis.acesso_total);
    let permissoes = [];
    if (prof.perfil_id && !acessoTotal) {
      const { data: perms } = await sb.from("permissoes").select("modulo, aba, nivel").eq("perfil_id", prof.perfil_id);
      permissoes = perms || [];
    }

    setCtx({
      profile: prof,
      permissoes,
      acessoTotal,
      perfilNome: prof.perfis ? prof.perfis.nome : null,
    });
    setFase("pronto");
  }, []);

  useEffect(() => {
    if (!CONFIG_OK) return;

    sb.auth.getSession().then(({ data }) => {
      if (data && data.session) carregarContexto(data.session.user.id);
      else setFase("login");
    });

    const { data: sub } = sb.auth.onAuthStateChange((evento, sessao) => {
      if (evento === "SIGNED_IN" && sessao) {
        setFase("carregando");
        carregarContexto(sessao.user.id);
      }
      if (evento === "SIGNED_OUT") {
        setCtx(null);
        setFase("login");
      }
    });

    return () => { if (sub && sub.subscription) sub.subscription.unsubscribe(); };
  }, [carregarContexto]);

  async function sair() {
    registrarEvento("logout", "sistema");
    await new Promise((r) => setTimeout(r, 250));
    await sb.auth.signOut();
  }

  if (!CONFIG_OK) return <TelaConfigPendente />;
  if (fase === "carregando") return <Carregando texto="Abrindo o CORTEX Gestão" />;
  if (fase === "login") return <TelaLogin />;
  if (!ctx || !ctx.profile) return <TelaSemPerfil profile={{ nome: "" }} aoSair={sair} />;
  if (!ctx.profile.ativo || (!ctx.acessoTotal && !ctx.profile.perfil_id)) {
    return <TelaSemPerfil profile={ctx.profile} aoSair={sair} />;
  }
  return <Shell ctx={ctx} aoSair={sair} />;
}

ReactDOM.createRoot(document.getElementById("raiz")).render(<App />);
