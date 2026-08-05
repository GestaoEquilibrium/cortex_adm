// ============================================================
// CORTEX GESTAO - APP (FASE 1)
// Login + shell + sidebar flutuante + painel + auditoria
// ============================================================

const { useState, useEffect, useMemo, useCallback, useRef } = React;

const CFG = window.CORTEX_CFG || {};
const CONFIG_OK =
  CFG.SUPABASE_URL &&
  CFG.SUPABASE_ANON_KEY &&
  CFG.SUPABASE_URL.indexOf("COLE_AQUI") === -1 &&
  CFG.SUPABASE_ANON_KEY.indexOf("COLE_AQUI") === -1;

const sb = CONFIG_OK ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : null;
// Cliente irmao usado so para criar logins novos: nao guarda sessao e nao mexe na sua.
const sbCadastro = CONFIG_OK ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "cg_cadastro" } }) : null;

// ------------------------------------------------------------
// Registro dos modulos (id = chave usada na tabela permissoes)
// ------------------------------------------------------------
const MODULOS = [
  { id: "painel",        rotulo: "Painel",         icone: "ti-layout-dashboard", cor: "var(--marca-texto)", fundo: "var(--tint)",        status: "ativo" },
  { id: "arquivos",      rotulo: "Arquivos",       icone: "ti-folder",           cor: "var(--marca-texto)", fundo: "var(--tint)",        status: "ativo" },
  { id: "modelos",       rotulo: "Modelos",        icone: "ti-file-text",        cor: "var(--ambar)",         fundo: "var(--ambar-bg)",    status: "ativo" },
  { id: "rh",            rotulo: "RH e equipe",    icone: "ti-users",            cor: "var(--roxo)",          fundo: "var(--roxo-bg)",     status: "ativo" },
  { id: "salas",         rotulo: "Salas",          icone: "ti-door",             cor: "var(--teal)",          fundo: "var(--teal-bg)",     status: "ativo" },
  { id: "pee",           rotulo: "PEE",            icone: "ti-book",             cor: "var(--rosa)",          fundo: "var(--rosa-bg)",     status: "ativo" },
  { id: "relatorios",    rotulo: "Relatórios",     icone: "ti-chart-bar",        cor: "var(--verde)",         fundo: "var(--verde-bg)",    status: "fase3" },
  { id: "auditoria",     rotulo: "Auditoria",      icone: "ti-history",          cor: "var(--sec)",           fundo: "#E6EBF1",            status: "ativo" },
  { id: "outros_cortex", rotulo: "Outros CORTEX",  icone: "ti-external-link",    cor: "var(--azul)",          fundo: "var(--azul-bg)",     status: "ativo" },
  { id: "instrucoes",    rotulo: "Instruções",     icone: "ti-info-circle",      cor: "#0369A1",              fundo: "#E0F2FE",            status: "ativo" },
  { id: "conta",          rotulo: "Minha conta",    icone: "ti-user-circle",      cor: "var(--marca-texto)",   fundo: "var(--tint)",        status: "ativo" },
  { id: "configuracoes", rotulo: "Configurações",  icone: "ti-settings",         cor: "var(--sec)",           fundo: "#ECF1F6",            status: "ativo" },
];

const STATUS_CHIP = {
  proximo: { texto: "próxima entrega", fundo: "var(--tint)", cor: "var(--marca-texto)" },
  fase2:   { texto: "fase 2",          fundo: "var(--azul-bg)", cor: "var(--azul)" },
  fase3:   { texto: "fase 3",          fundo: "#ECF1F6", cor: "var(--sec)" },
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

function fmtBytes(n) {
  if (n === null || n === undefined) return "";
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(0) + " KB";
  return (n / 1048576).toFixed(1).replace(".", ",") + " MB";
}

function badgeTipo(nome) {
  const ext = String(nome || "").split(".").pop().toLowerCase();
  if (ext === "pdf") return { r: "PDF", bg: "var(--vermelho-bg)", cor: "var(--vermelho)" };
  if (["xls", "xlsx", "csv"].indexOf(ext) !== -1) return { r: "XLS", bg: "var(--verde-bg)", cor: "var(--verde)" };
  if (["doc", "docx"].indexOf(ext) !== -1) return { r: "DOC", bg: "var(--azul-bg)", cor: "var(--azul)" };
  if (["png", "jpg", "jpeg", "webp", "gif"].indexOf(ext) !== -1) return { r: "IMG", bg: "var(--roxo-bg)", cor: "var(--roxo)" };
  return { r: "ARQ", bg: "#ECF1F6", cor: "var(--sec)" };
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
  if (moduloId === "conta") return ctx.acessoTotal ? "editar" : "ver";
  if (ctx.acessoTotal) return "editar";
  const regra = (ctx.permissoes || []).find((p) => p.modulo === moduloId && !p.aba);
  return regra ? regra.nivel : "oculto";
}

// Nivel efetivo de uma aba: regra da aba, senao a do modulo.
function nivelAba(ctx, moduloId, aba) {
  if (!ctx || !ctx.profile) return "oculto";
  if (ctx.acessoTotal) return "editar";
  const regraAba = (ctx.permissoes || []).find((p) => p.modulo === moduloId && p.aba === aba);
  if (regraAba) return regraAba.nivel;
  return nivelModulo(ctx, moduloId);
}

// ------------------------------------------------------------
// Marca
// ------------------------------------------------------------
function Asterisco({ tam = 20 }) {
  return (
    <svg className="logo-marca" width={tam} height={tam} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" stroke="#1068B0" strokeWidth="2.6" strokeLinecap="round" fill="none" />
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
          <span style={{ fontWeight: 700, fontSize: 17 }}>CORTEX <span style={{ color: "var(--marca-escuro)" }}>Gestão</span></span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Falta conectar o banco</div>
        <p style={{ fontSize: 13.5, color: "var(--sec)", lineHeight: 1.6 }}>
          Abra o arquivo <span style={{ fontFamily: "'JetBrains Mono', monospace", background: "var(--tint)", color: "var(--marca-texto)", padding: "1px 6px", borderRadius: 6, fontSize: 12 }}>config.js</span> e
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
          <i className="ti ti-lock" style={{ fontSize: 24, color: "var(--marca-texto)" }} aria-hidden="true"></i>
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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(900px 480px at 15% -10%, #E7F2FB 0%, rgba(255,241,231,0) 60%), var(--fundo)", padding: 20 }}>
      <div className="card-fl anim-sobe" style={{ width: "100%", maxWidth: 400, padding: "34px 34px 28px" }}>
        <div className="logo-area" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Asterisco tam={26} />
          <span style={{ fontWeight: 700, fontSize: 20 }}>CORTEX <span style={{ color: "var(--marca-escuro)" }}>Gestão</span></span>
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
function Sidebar({ ctx, pagina, setPagina, estado, setEstado, aoSair, meuCard }) {
  const visiveis = MODULOS.filter((m) => nivelModulo(ctx, m.id) !== "oculto");
  const principais = visiveis.filter((m) => m.id !== "configuracoes" && m.id !== "conta");
  const config = visiveis.find((m) => m.id === "configuracoes");
  const conta = visiveis.find((m) => m.id === "conta");

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
          <span className="rotulo" style={{ fontWeight: 700, fontSize: 15.5 }}>CORTEX <span style={{ color: "var(--marca-escuro)" }}>Gestão</span></span>
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

        {conta && <Item m={conta} />}
        {config && <Item m={config} />}

        <div className="user-card" title={ctx.profile.nome}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--grad)", color: "#fff", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", boxShadow: "0 2px 8px rgba(16,104,176,.28)", overflow: "hidden", cursor: "pointer" }}
            onClick={() => setPagina("conta")} title="Minha conta" role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter") setPagina("conta"); }}>
            {meuCard && meuCard.foto_url
              ? <img src={meuCard.foto_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : iniciais(ctx.profile.nome)}
          </div>
          <div className="rotulo" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ctx.profile.nome}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exibirPerfil(ctx.perfilNome)}</div>
          </div>
          <button className="btn-fantasma" onClick={aoSair} aria-label="Sair" title="Sair" style={{ width: 28, height: 28, flex: "none" }}>
            <i className="ti ti-logout" style={{ fontSize: 15 }} aria-hidden="true"></i>
          </button>
        </div>
        <div className="rotulo" style={{ textAlign: "center", fontSize: 10, color: "var(--muted)", opacity: .65, padding: "5px 0 1px" }}>v33</div>
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
    { rotulo: "Pastas no drive", chave: "pastas", icone: "ti-folder", cor: "var(--marca-texto)", fundo: "var(--tint)" },
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
              <i className={"ti " + (ICONES_ACAO[a.acao] || "ti-point")} style={{ fontSize: 15, color: "var(--marca-texto)", flex: "none" }} aria-hidden="true"></i>
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
        <span className="chip" style={{ background: "var(--tint)", color: "var(--marca-texto)" }}>
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
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--tint)", color: "var(--marca-texto)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
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
            <div style={{ width: 34, height: 34, borderRadius: 10, background: l.cor || "var(--marca)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 11, boxShadow: "0 3px 10px rgba(28,37,48,.15)" }}>
              <Asterisco tam={16} />
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>{l.nome}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", margin: "3px 0 13px", minHeight: 16 }}>{l.descricao || ""}</div>
            {l.url ? (
              <button className="btn-primaria" style={{ padding: "8px 14px", fontSize: 12.5 }} onClick={() => abrir(l)}>
                Abrir<i className="ti ti-external-link" style={{ fontSize: 14 }} aria-hidden="true"></i>
              </button>
            ) : (
              <span className="chip" style={{ background: "#ECF1F6", color: "var(--sec)" }}>URL não configurada</span>
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
        const meta = MODULOS.find((m) => m.id === mod) || { rotulo: mod, icone: "ti-info-circle", cor: "var(--sec)", fundo: "#ECF1F6" };
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
// Arquivos: o drive proprio
// ------------------------------------------------------------
function PaginaArquivos({ ctx }) {
  const [trilha, setTrilha] = useState([]); // [{id, nome}] - vazio = raiz
  const [pastas, setPastas] = useState(null);
  const [arquivos, setArquivos] = useState(null);
  const [contagens, setContagens] = useState({});
  const [nivel, setNivel] = useState("oculto");
  const [acessos, setAcessos] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [msg, setMsg] = useState("");
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [enviando, setEnviando] = useState("");
  const [addPerfil, setAddPerfil] = useState("");
  const [addNivel, setAddNivel] = useState("ver");

  const atual = trilha.length ? trilha[trilha.length - 1] : null;

  async function carregar() {
    setMsg("");
    setPastas(null);
    setArquivos(null);

    let niv;
    if (!atual) {
      niv = ctx.acessoTotal ? "editar" : nivelModulo(ctx, "arquivos");
    } else {
      const { data } = await sb.rpc("nivel_pasta", { p_pasta_id: atual.id });
      niv = data || "oculto";
    }
    setNivel(niv);

    let q = sb.from("pastas").select("*").order("nome");
    q = atual ? q.eq("pasta_pai_id", atual.id) : q.is("pasta_pai_id", null);
    const { data: ps } = await q;
    const filhas = ps || [];
    setPastas(filhas);

    if (filhas.length) {
      const ids = filhas.map((p) => p.id);
      const [{ data: fa }, { data: fp }] = await Promise.all([
        sb.from("arquivos").select("pasta_id").in("pasta_id", ids),
        sb.from("pastas").select("pasta_pai_id").in("pasta_pai_id", ids),
      ]);
      const c = {};
      (fa || []).forEach((r) => { c[r.pasta_id] = (c[r.pasta_id] || 0) + 1; });
      (fp || []).forEach((r) => { c[r.pasta_pai_id] = (c[r.pasta_pai_id] || 0) + 1; });
      setContagens(c);
    } else {
      setContagens({});
    }

    if (atual) {
      const { data: fs } = await sb.from("arquivos").select("*, profiles(nome)").eq("pasta_id", atual.id).order("nome");
      setArquivos(fs || []);
      if (niv === "editar") {
        const [{ data: ac }, { data: pf }] = await Promise.all([
          sb.from("pasta_acessos").select("*, perfis(nome)").eq("pasta_id", atual.id),
          sb.from("perfis").select("id, nome, acesso_total").order("nome"),
        ]);
        setAcessos(ac || []);
        setPerfis((pf || []).filter((p) => !p.acesso_total));
      }
    } else {
      setArquivos([]);
    }
  }

  useEffect(() => { carregar(); }, [atual && atual.id]);

  function entrar(p) { setTrilha([...trilha, { id: p.id, nome: p.nome, restrita: p.restrita }]); }
  function irPara(i) { setTrilha(i < 0 ? [] : trilha.slice(0, i + 1)); }

  async function criarPasta() {
    const nome = novoNome.trim();
    if (!nome) return;
    const { error } = await sb.from("pastas").insert({ nome, pasta_pai_id: atual ? atual.id : null, criado_por: ctx.profile.id });
    if (error) { setMsg("Erro ao criar pasta: " + error.message); return; }
    setNovoNome("");
    setCriando(false);
    carregar();
  }

  async function excluirPasta(p) {
    if ((contagens[p.id] || 0) > 0) { setMsg("A pasta " + p.nome + " não está vazia. Esvazie antes de excluir."); return; }
    if (!window.confirm('Excluir a pasta "' + p.nome + '"?')) return;
    const { error } = await sb.from("pastas").delete().eq("id", p.id);
    if (error) { setMsg("Erro ao excluir: " + error.message); return; }
    carregar();
  }

  async function enviarArquivos(lista) {
    if (!atual || !lista || !lista.length) return;
    const arr = Array.from(lista);
    for (let i = 0; i < arr.length; i++) {
      const f = arr[i];
      setEnviando("Enviando " + (i + 1) + " de " + arr.length + ": " + f.name);
      const caminho = atual.id + "/" + crypto.randomUUID() + "_" + f.name.replace(/[^\w.\-]+/g, "_");
      const up = await sb.storage.from("arquivos").upload(caminho, f);
      if (up.error) { setMsg("Erro ao enviar " + f.name + ": " + up.error.message); continue; }
      const ins = await sb.from("arquivos").insert({
        pasta_id: atual.id, nome: f.name, storage_path: caminho,
        tamanho: f.size, tipo: f.type || null, enviado_por: ctx.profile.id,
      });
      if (ins.error) {
        await sb.storage.from("arquivos").remove([caminho]);
        setMsg("Erro ao registrar " + f.name + ": " + ins.error.message);
      }
    }
    setEnviando("");
    carregar();
  }

  async function abrirArquivo(a, baixar) {
    const op = baixar ? { download: a.nome } : undefined;
    const { data, error } = await sb.storage.from("arquivos").createSignedUrl(a.storage_path, 120, op);
    if (error || !data) { setMsg("Não foi possível abrir: " + (error ? error.message : "sem acesso")); return; }
    registrarEvento(baixar ? "baixar" : "visualizar", "arquivos", a.nome, a.id);
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function excluirArquivo(a) {
    if (!window.confirm('Excluir o arquivo "' + a.nome + '"?')) return;
    const { error } = await sb.from("arquivos").delete().eq("id", a.id);
    if (error) { setMsg("Erro ao excluir: " + error.message); return; }
    await sb.storage.from("arquivos").remove([a.storage_path]);
    carregar();
  }

  async function alternarRestrita() {
    const { error } = await sb.from("pastas").update({ restrita: !atual.restrita }).eq("id", atual.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    const nova = { ...atual, restrita: !atual.restrita };
    setTrilha(trilha.slice(0, -1).concat(nova));
  }

  async function adicionarAcesso() {
    if (!addPerfil) return;
    const { error } = await sb.from("pasta_acessos").insert({ pasta_id: atual.id, perfil_id: addPerfil, nivel: addNivel });
    if (error) { setMsg("Erro: " + error.message); return; }
    setAddPerfil("");
    carregar();
  }

  async function mudarAcesso(ac, niv) {
    const { error } = await sb.from("pasta_acessos").update({ nivel: niv }).eq("id", ac.id);
    if (!error) carregar(); else setMsg("Erro: " + error.message);
  }

  async function removerAcesso(ac) {
    const { error } = await sb.from("pasta_acessos").delete().eq("id", ac.id);
    if (!error) carregar(); else setMsg("Erro: " + error.message);
  }

  const podeEditar = nivel === "editar";
  const perfisDisponiveis = perfis.filter((p) => !acessos.some((a) => a.perfil_id === p.id));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, flexWrap: "wrap" }}>
          <span onClick={() => irPara(-1)} style={{ color: trilha.length ? "var(--muted)" : "var(--ink)", fontWeight: trilha.length ? 400 : 600, cursor: "pointer" }}>Arquivos</span>
          {trilha.map((t, i) => (
            <React.Fragment key={t.id}>
              <i className="ti ti-chevron-right" style={{ fontSize: 13, color: "var(--muted)" }} aria-hidden="true"></i>
              <span onClick={() => irPara(i)} style={{ color: i === trilha.length - 1 ? "var(--ink)" : "var(--muted)", fontWeight: i === trilha.length - 1 ? 600 : 400, cursor: "pointer" }}>{t.nome}</span>
            </React.Fragment>
          ))}
          {atual && atual.restrita && (
            <span className="chip" style={{ background: "var(--tint)", color: "var(--marca-texto)", marginLeft: 4 }}>
              <i className="ti ti-lock" style={{ fontSize: 11 }} aria-hidden="true"></i>restrita
            </span>
          )}
        </div>
        {podeEditar && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-contorno" onClick={() => setCriando(!criando)}>
              <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true"></i>Nova pasta
            </button>
            {atual && (
              <label className="btn-primaria" style={{ padding: "9px 16px", fontSize: 12.5, cursor: "pointer" }}>
                <i className="ti ti-upload" style={{ fontSize: 15 }} aria-hidden="true"></i>Enviar arquivo
                <input type="file" multiple style={{ display: "none" }} onChange={(e) => { enviarArquivos(e.target.files); e.target.value = ""; }} />
              </label>
            )}
          </div>
        )}
      </div>

      {criando && (
        <div className="card-fl anim-pop" style={{ padding: 10, marginBottom: 12, display: "flex", gap: 8, maxWidth: 420 }}>
          <input className="campo" style={{ padding: "8px 10px", fontSize: 13 }} placeholder={"Nome da pasta" + (atual ? " dentro de " + atual.nome : "")}
            value={novoNome} onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") criarPasta(); }} autoFocus />
          <button className="btn-primaria" style={{ padding: "8px 14px", fontSize: 12.5 }} onClick={criarPasta}>Criar</button>
        </div>
      )}

      {enviando && (
        <div className="anim-pop" style={{ marginBottom: 10, fontSize: 12.5, fontWeight: 600, color: "var(--marca-texto)", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ animation: "girar 1.1s linear infinite", lineHeight: 0 }}><Asterisco tam={14} /></div>{enviando}
        </div>
      )}
      {msg && <div className="anim-pop" style={{ marginBottom: 10, fontSize: 12.5, fontWeight: 600, color: "var(--vermelho)" }}>{msg}</div>}

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          {!pastas && <div style={{ fontSize: 13, color: "var(--muted)" }}>Carregando…</div>}

          {pastas && pastas.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginBottom: 12 }}>
              {pastas.map((p, i) => (
                <div key={p.id} className="card-fl clicavel anim-sobe pasta-cartao" onClick={() => entrar(p)} style={{ padding: "12px 13px", animationDelay: (i * 40) + "ms", position: "relative" }}>
                  <div className="pasta3d" aria-hidden="true">
                    <div className="aba-p"></div>
                    <div className="corpo"></div>
                    <div className="papel"></div>
                    <div className="frente"></div>
                    {p.restrita && <i className="ti ti-lock cadeado" aria-hidden="true"></i>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}>
                    {(contagens[p.id] || 0)} {(contagens[p.id] || 0) === 1 ? "item" : "itens"}
                    {p.restrita && <i className="ti ti-lock" style={{ fontSize: 11 }} aria-hidden="true"></i>}
                  </div>
                  {podeEditar && (
                    <button className="btn-fantasma" style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24 }}
                      aria-label="Excluir pasta" title="Excluir pasta"
                      onClick={(e) => { e.stopPropagation(); excluirPasta(p); }}>
                      <i className="ti ti-trash" style={{ fontSize: 13 }} aria-hidden="true"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {atual && arquivos && (
            <div className="card-fl" style={{ overflow: "hidden" }}>
              {arquivos.length === 0 && (
                <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
                  Pasta sem arquivos.{podeEditar ? " Use o botão Enviar arquivo para começar." : ""}
                </div>
              )}
              {arquivos.map((a) => {
                const b = badgeTipo(a.nome);
                return (
                  <div key={a.id} className="linha-hover" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderBottom: "1px solid var(--linha-suave)", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span className="chip" style={{ background: b.bg, color: b.cor, marginRight: 7 }}>{b.r}</span>{a.nome}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                        {fmtBytes(a.tamanho)}{a.profiles && a.profiles.nome ? " · enviado por " + primeiroNome(a.profiles.nome) : ""} · {tempoRelativo(a.created_at)}
                      </div>
                    </div>
                    <span style={{ display: "flex", gap: 5, flex: "none" }}>
                      <button className="btn-fantasma" style={{ width: 28, height: 28 }} aria-label="Visualizar" title="Visualizar" onClick={() => abrirArquivo(a, false)}>
                        <i className="ti ti-eye" style={{ fontSize: 14 }} aria-hidden="true"></i>
                      </button>
                      <button className="btn-fantasma" style={{ width: 28, height: 28 }} aria-label="Baixar" title="Baixar" onClick={() => abrirArquivo(a, true)}>
                        <i className="ti ti-download" style={{ fontSize: 14 }} aria-hidden="true"></i>
                      </button>
                      {podeEditar && (
                        <button className="btn-fantasma" style={{ width: 28, height: 28 }} aria-label="Excluir" title="Excluir" onClick={() => excluirArquivo(a)}>
                          <i className="ti ti-trash" style={{ fontSize: 14 }} aria-hidden="true"></i>
                        </button>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {!atual && pastas && pastas.length === 0 && (
            <div className="card-fl" style={{ padding: "30px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
              Nenhuma pasta ainda.{podeEditar ? " Crie a primeira com o botão Nova pasta." : ""}
            </div>
          )}
        </div>

        {atual && podeEditar && (
          <div className="card-fl anim-sobe" style={{ flex: "none", width: 250, padding: "12px 13px" }}>
            <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <i className="ti ti-lock" style={{ fontSize: 14, color: "var(--marca-texto)" }} aria-hidden="true"></i>Quem acessa esta pasta
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 9, borderBottom: "1px solid var(--linha-suave)", marginBottom: 8 }}>
              <span style={{ fontSize: 12 }}>Pasta restrita</span>
              <button type="button" className={"sw" + (atual.restrita ? " on" : "")} onClick={alternarRestrita}
                aria-label={atual.restrita ? "Liberar pasta" : "Restringir pasta"}></button>
            </div>
            {!atual.restrita && (
              <p style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.55 }}>
                Aberta: vale a permissão do módulo Arquivos de cada perfil. Ligue a restrição para escolher perfis.
              </p>
            )}
            {atual.restrita && (
              <div>
                {acessos.length === 0 && (
                  <p style={{ fontSize: 11.5, color: "var(--ambar)", lineHeight: 1.55, marginBottom: 8 }}>
                    Nenhum perfil liberado: por enquanto só a Direção vê esta pasta.
                  </p>
                )}
                {acessos.map((ac) => (
                  <div key={ac.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", borderBottom: "1px solid var(--linha-suave)" }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exibirPerfil(ac.perfis ? ac.perfis.nome : "")}</span>
                    <span className="seg">
                      <button type="button" className={"sg" + (ac.nivel === "ver" ? " on-v" : "")} onClick={() => mudarAcesso(ac, "ver")}>Ver</button>
                      <button type="button" className={"sg" + (ac.nivel === "editar" ? " on-e" : "")} onClick={() => mudarAcesso(ac, "editar")}>Editar</button>
                    </span>
                    <button className="btn-fantasma" style={{ width: 22, height: 22 }} aria-label="Remover" title="Remover" onClick={() => removerAcesso(ac)}>
                      <i className="ti ti-x" style={{ fontSize: 12 }} aria-hidden="true"></i>
                    </button>
                  </div>
                ))}
                {perfisDisponiveis.length > 0 && (
                  <div style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
                    <select className="campo" style={{ flex: 1, minWidth: 110, padding: "6px 8px", fontSize: 12 }} value={addPerfil} onChange={(e) => setAddPerfil(e.target.value)}>
                      <option value="">perfil…</option>
                      {perfisDisponiveis.map((p) => <option key={p.id} value={p.id}>{exibirPerfil(p.nome)}</option>)}
                    </select>
                    <select className="campo" style={{ width: 78, padding: "6px 8px", fontSize: 12 }} value={addNivel} onChange={(e) => setAddNivel(e.target.value)}>
                      <option value="ver">Ver</option>
                      <option value="editar">Editar</option>
                    </select>
                    <button className="btn-primaria" style={{ padding: "6px 12px", fontSize: 12 }} onClick={adicionarAcesso}>Liberar</button>
                  </div>
                )}
              </div>
            )}
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10, display: "flex", alignItems: "center", gap: 5 }}>
              <i className="ti ti-history" style={{ fontSize: 12 }} aria-hidden="true"></i>Visualizações e downloads ficam na auditoria
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// RH e equipe
// ------------------------------------------------------------
const STATUS_COLAB = {
  ativo:     { r: "Ativo",     bg: "var(--verde-bg)",    cor: "var(--verde)" },
  ferias:    { r: "Férias",    bg: "var(--azul-bg)",     cor: "var(--azul)" },
  afastado:  { r: "Afastado",  bg: "var(--ambar-bg)",    cor: "var(--ambar)" },
  desligado: { r: "Desligado", bg: "#ECF1F6",            cor: "var(--sec)" },
};

function dataBr(iso) {
  if (!iso) return "";
  const p = String(iso).slice(0, 10).split("-");
  return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : iso;
}

function dataIso(br) {
  const t = String(br || "").trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
}

function numeroBr(v) {
  const t = String(v || "").trim();
  if (!t) return null;
  const n = parseFloat(t.replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

function AbaColaboradores({ ctx }) {
  const podeEditar = nivelAba(ctx, "rh", "colaboradores") === "editar";
  const [lista, setLista] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("ativos");
  const [msg, setMsg] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [f, setF] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [importando, setImportando] = useState(false);

  async function carregar() {
    const { data } = await sb.from("colaboradores").select("*").order("nome");
    setLista(data || []);
  }

  useEffect(() => { carregar(); }, []);

  const visiveis = useMemo(() => {
    let v = lista || [];
    if (filtro === "ativos") v = v.filter((c) => c.status !== "desligado");
    if (filtro === "desligados") v = v.filter((c) => c.status === "desligado");
    const q = busca.trim().toLowerCase();
    if (q) v = v.filter((c) => [c.nome, c.cargo, c.setor, c.unidade, c.regime].some((x) => String(x || "").toLowerCase().indexOf(q) !== -1));
    return v;
  }, [lista, busca, filtro]);

  function abrirForm(c) {
    setEditando(c || null);
    setF(c ? {
      nome: c.nome || "", cpf: c.cpf || "", cargo: c.cargo || "", setor: c.setor || "",
      regime: c.regime || "CLT", unidade: c.unidade || "", email: c.email || "", telefone: c.telefone || "",
      admissao: c.admissao || "", nascimento: c.nascimento || "", salario: c.salario != null ? String(c.salario).replace(".", ",") : "",
      status: c.status || "ativo", observacoes: c.observacoes || "", pin: c.pin || "",
    } : { nome: "", cpf: "", cargo: "", setor: "", regime: "CLT", unidade: "", email: "", telefone: "", admissao: "", nascimento: "", salario: "", status: "ativo", observacoes: "", pin: "" });
    setFormAberto(true);
    setMsg("");
  }

  function campo(k, v) { setF({ ...f, [k]: v }); }

  async function salvar() {
    if (!f.nome.trim()) { setMsg("O nome é obrigatório."); return; }
    if (f.pin.trim() && !/^[0-9]{4}$/.test(f.pin.trim())) { setMsg("O PIN do relógio precisa ter exatamente 4 números."); return; }
    setSalvando(true);
    const dados = {
      nome: f.nome.trim(), cpf: f.cpf.trim() || null, cargo: f.cargo.trim() || null, setor: f.setor.trim() || null,
      regime: f.regime || null, unidade: f.unidade.trim() || null, email: f.email.trim() || null, telefone: f.telefone.trim() || null,
      admissao: f.admissao || null, nascimento: f.nascimento || null,
      salario: numeroBr(f.salario), status: f.status, observacoes: f.observacoes.trim() || null,
      pin: f.pin.trim() || null,
      atualizado_por: ctx.profile.id,
    };
    const r = editando
      ? await sb.from("colaboradores").update(dados).eq("id", editando.id)
      : await sb.from("colaboradores").insert(dados);
    setSalvando(false);
    if (r.error) { setMsg("Erro ao salvar: " + r.error.message); return; }
    setFormAberto(false);
    carregar();
  }

  async function excluir(c) {
    if (!window.confirm('Excluir "' + c.nome + '" e todos os registros ligados (faltas, atestados)? Para manter o histórico, prefira o status Desligado.')) return;
    const { error } = await sb.from("colaboradores").delete().eq("id", c.id);
    if (error) { setMsg("Erro ao excluir: " + error.message); return; }
    carregar();
  }

  function baixarModelo() {
    const linhas = [
      "nome;cpf;cargo;setor;regime;unidade;email;telefone;admissao;nascimento;salario;status",
      "Maria Exemplo;123.456.789-00;Recepcionista;Recepcao;CLT;EQ1 Med Center;maria@exemplo.com;(34) 99999-0000;01/02/2024;15/06/1995;1850,00;ativo",
    ];
    const blob = new Blob(["\uFEFF" + linhas.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "modelo_colaboradores.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importar(arquivo) {
    if (!arquivo) return;
    setImportando(true);
    setMsg("");
    const texto = await arquivo.text();
    const linhas = texto.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
    if (linhas.length < 2) { setMsg("A planilha está vazia (só o cabeçalho ou nada)."); setImportando(false); return; }
    const sep = linhas[0].indexOf(";") !== -1 ? ";" : ",";
    const cab = linhas[0].split(sep).map((c) => c.trim().toLowerCase());
    const idx = (n) => cab.indexOf(n);
    if (idx("nome") === -1) { setMsg("O cabeçalho precisa ter a coluna nome. Baixe o modelo."); setImportando(false); return; }
    const novos = [];
    const erros = [];
    for (let i = 1; i < linhas.length; i++) {
      const c = linhas[i].split(sep).map((x) => x.trim());
      const pega = (n) => (idx(n) !== -1 ? c[idx(n)] || "" : "");
      const nome = pega("nome");
      if (!nome) { erros.push("linha " + (i + 1) + ": sem nome"); continue; }
      const st = (pega("status") || "ativo").toLowerCase();
      novos.push({
        nome, cpf: pega("cpf") || null, cargo: pega("cargo") || null, setor: pega("setor") || null,
        regime: pega("regime") || null, unidade: pega("unidade") || null, email: pega("email") || null,
        telefone: pega("telefone") || null, admissao: dataIso(pega("admissao")), nascimento: dataIso(pega("nascimento")),
        salario: numeroBr(pega("salario")), status: ["ativo","ferias","afastado","desligado"].indexOf(st) !== -1 ? st : "ativo",
        atualizado_por: ctx.profile.id,
      });
    }
    let inseridos = 0;
    for (let i = 0; i < novos.length; i += 50) {
      const lote = novos.slice(i, i + 50);
      const { error } = await sb.from("colaboradores").insert(lote);
      if (error) { erros.push("lote " + (i / 50 + 1) + ": " + error.message); }
      else inseridos += lote.length;
    }
    setImportando(false);
    setMsg(inseridos + " colaborador(es) importado(s)." + (erros.length ? " Problemas: " + erros.join(" · ") : ""));
    carregar();
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 170, position: "relative" }}>
          <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "var(--muted)" }} aria-hidden="true"></i>
          <input className="campo" style={{ paddingLeft: 36, padding: "8px 10px 8px 36px", fontSize: 13 }} placeholder="Buscar por nome, cargo, setor" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        {[["ativos", "Ativos"], ["todos", "Todos"], ["desligados", "Desligados"]].map(([v, r]) => (
          <span key={v} className="chip" onClick={() => setFiltro(v)}
            style={{ cursor: "pointer", background: filtro === v ? "var(--tint)" : "var(--branco)", color: filtro === v ? "var(--marca-texto)" : "var(--sec)", border: "1px solid " + (filtro === v ? "var(--tint-borda)" : "var(--linha)") }}>{r}</span>
        ))}
        {podeEditar && (
          <React.Fragment>
            <button className="btn-contorno" style={{ padding: "8px 13px", fontSize: 12.5 }} onClick={baixarModelo}>
              <i className="ti ti-download" style={{ fontSize: 14 }} aria-hidden="true"></i>Modelo
            </button>
            <label className="btn-contorno" style={{ cursor: "pointer", padding: "8px 13px", fontSize: 12.5 }}>
              <i className="ti ti-upload" style={{ fontSize: 14 }} aria-hidden="true"></i>{importando ? "Importando…" : "Importar planilha"}
              <input type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => { importar(e.target.files[0]); e.target.value = ""; }} />
            </label>
            <button className="btn-primaria" style={{ padding: "9px 15px", fontSize: 12.5 }} onClick={() => (formAberto ? setFormAberto(false) : abrirForm(null))}>
              <i className="ti ti-plus" style={{ fontSize: 15 }} aria-hidden="true"></i>Novo colaborador
            </button>
          </React.Fragment>
        )}
      </div>

      {formAberto && (
        <div className="card-fl anim-pop" style={{ padding: "13px 14px", marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>{editando ? "Editar colaborador" : "Novo colaborador"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8, marginBottom: 8 }}>
            <input className="campo" style={{ padding: "8px 10px", fontSize: 13, gridColumn: "span 2" }} placeholder="Nome completo *" value={f.nome} onChange={(e) => campo("nome", e.target.value)} autoFocus />
            <input className="campo" style={{ padding: "8px 10px", fontSize: 13 }} placeholder="CPF" value={f.cpf} onChange={(e) => campo("cpf", e.target.value)} />
            <input className="campo" style={{ padding: "8px 10px", fontSize: 13 }} placeholder="Cargo" value={f.cargo} onChange={(e) => campo("cargo", e.target.value)} />
            <input className="campo" list="setores-rh" style={{ padding: "8px 10px", fontSize: 13 }} placeholder="Setor" value={f.setor} onChange={(e) => campo("setor", e.target.value)} />
            <datalist id="setores-rh"><option value="Administrativo" /><option value="Clínico" /><option value="Terapêutico" /><option value="Recepção" /><option value="Financeiro" /><option value="Limpeza" /></datalist>
            <select className="campo" style={{ padding: "8px 10px", fontSize: 13 }} value={f.regime} onChange={(e) => campo("regime", e.target.value)}>
              {["CLT", "PJ", "Estágio", "Sócio", "Voluntário", "Outro"].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input className="campo" list="unidades-rh" style={{ padding: "8px 10px", fontSize: 13 }} placeholder="Unidade" value={f.unidade} onChange={(e) => campo("unidade", e.target.value)} />
            <datalist id="unidades-rh"><option value="EQ1 Med Center" /><option value="EQ2 Terapia Infantil" /></datalist>
            <input className="campo" style={{ padding: "8px 10px", fontSize: 13 }} placeholder="E-mail" value={f.email} onChange={(e) => campo("email", e.target.value)} />
            <input className="campo" style={{ padding: "8px 10px", fontSize: 13 }} placeholder="Telefone" value={f.telefone} onChange={(e) => campo("telefone", e.target.value)} />
            <label style={{ fontSize: 11, color: "var(--muted)" }}>Admissão<input className="campo" type="date" style={{ padding: "7px 10px", fontSize: 13, marginTop: 3 }} value={f.admissao || ""} onChange={(e) => campo("admissao", e.target.value)} /></label>
            <label style={{ fontSize: 11, color: "var(--muted)" }}>Nascimento<input className="campo" type="date" style={{ padding: "7px 10px", fontSize: 13, marginTop: 3 }} value={f.nascimento || ""} onChange={(e) => campo("nascimento", e.target.value)} /></label>
            <input className="campo" style={{ padding: "8px 10px", fontSize: 13 }} placeholder="Salário (ex.: 1850,00)" value={f.salario} onChange={(e) => campo("salario", e.target.value)} />
            <select className="campo" style={{ padding: "8px 10px", fontSize: 13 }} value={f.status} onChange={(e) => campo("status", e.target.value)}>
              <option value="ativo">Ativo</option><option value="ferias">Férias</option><option value="afastado">Afastado</option><option value="desligado">Desligado</option>
            </select>
            <input className="campo" style={{ padding: "8px 10px", fontSize: 13 }} placeholder="PIN do relógio (4 números)" maxLength={4} value={f.pin} onChange={(e) => campo("pin", e.target.value.replace(/\D/g, ""))} />
          </div>
          <input className="campo" style={{ padding: "8px 10px", fontSize: 13, marginBottom: 8 }} placeholder="Observações" value={f.observacoes} onChange={(e) => campo("observacoes", e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primaria" style={{ padding: "8px 15px", fontSize: 12.5 }} disabled={salvando} onClick={salvar}>{salvando ? "Salvando…" : "Salvar"}</button>
            <button className="btn-fantasma" style={{ width: "auto", padding: "0 10px" }} onClick={() => setFormAberto(false)}>cancelar</button>
          </div>
        </div>
      )}

      {msg && <div className="anim-pop" style={{ marginBottom: 10, fontSize: 12.5, fontWeight: 600, color: msg.indexOf("Erro") === 0 ? "var(--vermelho)" : "var(--marca-texto)" }}>{msg}</div>}

      {!lista && <div style={{ fontSize: 13, color: "var(--muted)" }}>Carregando…</div>}
      {lista && visiveis.length === 0 && (
        <div className="card-fl" style={{ padding: "30px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
          {lista.length === 0 ? "Nenhum colaborador ainda." + (podeEditar ? " Cadastre o primeiro ou importe a planilha." : "") : "Ninguém encontrado com esses filtros."}
        </div>
      )}

      {lista && visiveis.length > 0 && (
        <div className="card-fl" style={{ overflow: "hidden" }}>
          {visiveis.map((c) => {
            const st = STATUS_COLAB[c.status] || STATUS_COLAB.ativo;
            return (
              <div key={c.id} className="linha-hover" style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 14px", borderBottom: "1px solid var(--linha-suave)", flexWrap: "wrap", cursor: podeEditar ? "pointer" : "default" }}
                onClick={() => podeEditar && abrirForm(c)}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: c.status === "desligado" ? "#C3CCD6" : "var(--grad)", color: "#fff", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{iniciais(c.nome)}</div>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.nome}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{[c.cargo, c.setor, c.unidade].filter(Boolean).join(" · ") || "sem cargo definido"}</div>
                </div>
                {c.regime && <span className="chip" style={{ background: "var(--roxo-bg)", color: "var(--roxo)" }}>{c.regime}</span>}
                <span className="chip" style={{ background: st.bg, color: st.cor }}>{st.r}</span>
                {podeEditar && (
                  <button className="btn-fantasma" style={{ width: 28, height: 28 }} aria-label="Excluir" title="Excluir"
                    onClick={(e) => { e.stopPropagation(); excluir(c); }}>
                    <i className="ti ti-trash" style={{ fontSize: 14 }} aria-hidden="true"></i>
                  </button>
                )}
              </div>
            );
          })}
          <div style={{ padding: "8px 14px", fontSize: 11, color: "var(--muted)" }}>{visiveis.length} de {lista.length} colaborador(es)</div>
        </div>
      )}
    </div>
  );
}

function horaLocal(ts) {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function hojeLocalISO() {
  const n = new Date();
  return n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0");
}

// PDF mensal do ponto: mesmo modelo das folhas de assinatura do Ponto Digital antigo.
function pdfPonto(colab, regs, ocos, mesRotulo, retornarBlob) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(16, 104, 176); doc.rect(0, 0, pw, 38, "F");
  doc.setTextColor(255); doc.setFontSize(20); doc.setFont("helvetica", "bold");
  doc.text("RELATÓRIO DE PONTO", pw / 2, 18, { align: "center" });
  doc.setFontSize(11); doc.setFont("helvetica", "normal");
  doc.text("Período: " + mesRotulo, pw / 2, 28, { align: "center" });
  doc.setTextColor(28, 37, 48); doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.text("Funcionário: " + colab.nome, 14, 50);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text("Cargo: " + (colab.cargo || "—"), 14, 58);
  doc.text("Gerado em: " + new Date().toLocaleDateString("pt-BR") + " às " + new Date().toLocaleTimeString("pt-BR"), 14, 65);

  const chave = (dt) => dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
  const grupos = {};
  regs.slice().sort((a, b) => a.batida.localeCompare(b.batida)).forEach((r) => {
    const k = chave(new Date(r.batida)); (grupos[k] = grupos[k] || []).push(r);
  });
  const ocosPorDia = {};
  ocos.forEach((o) => { if (o.data) (ocosPorDia[o.data] = ocosPorDia[o.data] || []).push(o); });
  const datas = Object.keys(grupos);
  Object.keys(ocosPorDia).forEach((d) => { if (datas.indexOf(d) === -1) datas.push(d); });
  datas.sort();

  const fmtHora = (iso) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const linhas = []; let totalMin = 0;
  datas.forEach((dia) => {
    const rs = grupos[dia] || [];
    const entradas = rs.filter((r) => r.tipo === "entrada").map((r) => fmtHora(r.batida));
    const saidas = rs.filter((r) => r.tipo === "saida").map((r) => fmtHora(r.batida));
    let min = 0, ent = null;
    rs.forEach((r) => { if (r.tipo === "entrada") { ent = new Date(r.batida); } else if (ent) { min += (new Date(r.batida) - ent) / 60000; ent = null; } });
    totalMin += min;
    const h = Math.floor(min / 60), mi = Math.round(min % 60);
    const p = dia.split("-");
    linhas.push([p[2] + "/" + p[1] + "/" + p[0], entradas.join("\n") || "-", saidas.join("\n") || "-", rs.length ? h + "h " + String(mi).padStart(2, "0") + "min" : "-"]);
    (ocosPorDia[dia] || []).forEach((o) => {
      const prefixo = o.tipo === "admin" ? "Obs. Admin: " : "Ocorrência: ";
      let txt = prefixo + (o.descricao || "");
      if (o.observacao && o.observacao.trim()) txt += "\nResp. Administrativo: " + o.observacao;
      linhas.push([{ content: "", styles: { fillColor: [255, 252, 240] } }, { content: txt, colSpan: 3, styles: { fillColor: [255, 252, 240], textColor: [120, 90, 40], fontSize: 7.5, fontStyle: "italic", cellPadding: { top: 2, bottom: 3, left: 4, right: 6 } } }]);
    });
  });
  doc.autoTable({ startY: 74, head: [["Data", "Entradas", "Saídas", "Horas Trab."]], body: linhas,
    styles: { fontSize: 9, cellPadding: 4, lineColor: [231, 237, 243] },
    headStyles: { fillColor: [16, 104, 176], textColor: 255, fontStyle: "bold", fontSize: 10 },
    alternateRowStyles: { fillColor: [246, 248, 251] },
    columnStyles: { 0: { cellWidth: 30, fontStyle: "bold" }, 3: { cellWidth: 30, halign: "center", fontStyle: "bold" } },
    margin: { left: 14, right: 14 } });
  const yFim = doc.lastAutoTable.finalY + 12;
  const th = Math.floor(totalMin / 60), tm = Math.round(totalMin % 60);
  doc.setFillColor(246, 248, 251); doc.roundedRect(14, yFim, pw - 28, 24, 3, 3, "F");
  doc.setDrawColor(16, 104, 176); doc.roundedRect(14, yFim, pw - 28, 24, 3, 3, "S");
  doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(28, 37, 48);
  doc.text("TOTAL DE HORAS:", 20, yFim + 15);
  doc.text("(" + datas.filter((d) => grupos[d] && grupos[d].length).length + " dias)", pw / 2, yFim + 15, { align: "center" });
  doc.setTextColor(16, 104, 176);
  doc.text(th + "h " + String(tm).padStart(2, "0") + "min", pw - 20, yFim + 15, { align: "right" });
  const yAss = yFim + 46;
  doc.setDrawColor(180, 190, 200); doc.setLineWidth(0.3);
  doc.line(14, yAss, 90, yAss); doc.line(pw - 90, yAss, pw - 14, yAss);
  doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "normal");
  doc.text("Assinatura do Funcionário", 52, yAss + 6, { align: "center" });
  doc.text("Assinatura do Responsável", pw - 52, yAss + 6, { align: "center" });
  doc.setFontSize(7); doc.setTextColor(160, 170, 180);
  doc.text("Documento gerado pelo CORTEX Gestão — Grupo Equilibrium", pw / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
  const arq = "ponto-" + colab.nome.replace(/\s+/g, "_") + "-" + mesRotulo.replace("/", "-") + ".pdf";
  if (retornarBlob) return { blob: doc.output("blob"), nome: arq };
  doc.save(arq);
}

function AbaPonto({ ctx }) {
  const podeEditar = nivelAba(ctx, "rh", "ponto") === "editar";
  const [visao, setVisaoRaw] = useState(() => {
    try {
      const v = localStorage.getItem("cg_ponto_visao");
      if (["hoje", "espelho", "ocorrencias", "relatorios"].indexOf(v) !== -1) return v;
    } catch (e) {}
    return "hoje";
  });
  const setVisao = useCallback((v) => {
    setVisaoRaw(v);
    try { localStorage.setItem("cg_ponto_visao", v); } catch (e) {}
  }, []);
  const [hoje, setHoje] = useState(null);
  const [colabs, setColabs] = useState([]);
  const [colabSel, setColabSel] = useState("");
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [espelho, setEspelho] = useState(null);
  const [msg, setMsg] = useState("");
  const [addDia, setAddDia] = useState("");
  const [addHora, setAddHora] = useState("");
  const [addTipo, setAddTipo] = useState("entrada");
  const [ocorrencias, setOcorrencias] = useState(null);
  const [ocoMes, setOcoMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [ocoColab, setOcoColab] = useState("");
  const [novaOco, setNovaOco] = useState(null);
  const [editOco, setEditOco] = useState(null);
  const [obsOco, setObsOco] = useState(null);
  const [relMes, setRelMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [relDados, setRelDados] = useState(null);
  const [gerando, setGerando] = useState(false);

  async function carregarHoje() {
    const ini = new Date(); ini.setHours(0, 0, 0, 0);
    const { data } = await sb.from("ponto_registros")
      .select("id, tipo, batida, origem, obs, colaboradores(nome)")
      .gte("batida", ini.toISOString())
      .order("batida");
    setHoje(data || []);
  }

  async function carregarColabs() {
    const { data } = await sb.from("colaboradores").select("id, nome, cargo, status").order("nome");
    setColabs(data || []);
  }

  async function carregarEspelho() {
    if (!colabSel || !mes) { setEspelho(null); return; }
    const ini = mes + "-01T00:00:00";
    const fimD = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 1);
    const { data } = await sb.from("ponto_registros")
      .select("id, tipo, batida, origem, obs")
      .eq("colaborador_id", colabSel)
      .gte("batida", new Date(ini).toISOString())
      .lt("batida", fimD.toISOString())
      .order("batida");
    setEspelho(data || []);
  }

  useEffect(() => { carregarHoje(); carregarColabs(); }, []);
  useEffect(() => { carregarEspelho(); }, [colabSel, mes]);

  const gruposHoje = useMemo(() => {
    if (!hoje) return null;
    const g = {};
    hoje.forEach((r) => {
      const n = r.colaboradores ? r.colaboradores.nome : "?";
      (g[n] = g[n] || []).push(r);
    });
    return Object.keys(g).sort().map((n) => ({ nome: n, regs: g[n] }));
  }, [hoje]);

  const dias = useMemo(() => {
    if (!espelho) return null;
    const g = {};
    espelho.forEach((r) => {
      const d = new Date(r.batida);
      const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      (g[k] = g[k] || []).push(r);
    });
    let totalMin = 0;
    const lista = Object.keys(g).sort().map((k) => {
      const regs = g[k];
      let min = 0, aberto = false, ent = null;
      regs.forEach((r) => {
        if (r.tipo === "entrada") { ent = new Date(r.batida); }
        else if (ent) { min += (new Date(r.batida) - ent) / 60000; ent = null; }
      });
      if (ent) aberto = true;
      totalMin += min;
      return { dia: k, regs, min, aberto };
    });
    return { lista, totalMin };
  }, [espelho]);

  function fmtMin(m) {
    const h = Math.floor(m / 60), mi = Math.round(m % 60);
    return h + "h" + String(mi).padStart(2, "0");
  }

  async function excluirBatida(r) {
    if (!window.confirm("Excluir esta batida de " + horaLocal(r.batida) + "? A exclusão fica na auditoria.")) return;
    const { error } = await sb.from("ponto_registros").delete().eq("id", r.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    carregarHoje(); carregarEspelho();
  }

  async function adicionarBatida() {
    if (!colabSel || !addDia || !addHora) { setMsg("Escolha colaborador, dia e hora."); return; }
    const quando = new Date(addDia + "T" + addHora + ":00");
    const { error } = await sb.from("ponto_registros").insert({
      colaborador_id: colabSel, tipo: addTipo, batida: quando.toISOString(),
      origem: "manual", editado_por: ctx.profile.id,
      obs: "Adicionado por " + ((ctx.profile && ctx.profile.nome) || "gestão"),
    });
    if (error) { setMsg("Erro: " + error.message); return; }
    setMsg(""); setAddDia(""); setAddHora("");
    carregarHoje(); carregarEspelho();
  }

  function ultimoDia(m) {
    return String(new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).getDate()).padStart(2, "0");
  }

  async function carregarOcorrencias() {
    if (!ocoMes) { setOcorrencias(null); return; }
    let q = sb.from("ponto_ocorrencias")
      .select("id, colaborador_id, data, tipo, descricao, observacao, colaboradores(nome)")
      .gte("data", ocoMes + "-01").lte("data", ocoMes + "-" + ultimoDia(ocoMes))
      .order("data", { ascending: false }).order("created_at", { ascending: false }).limit(20000);
    if (ocoColab) q = q.eq("colaborador_id", ocoColab);
    const { data, error } = await q;
    if (error) { setMsg("Erro: " + error.message); return; }
    setMsg(""); setOcorrencias(data || []);
  }
  useEffect(() => { if (visao === "ocorrencias") carregarOcorrencias(); }, [visao, ocoMes, ocoColab]);

  async function carregarRelatorio() {
    if (!relMes) { setRelDados(null); return; }
    const ini = new Date(Number(relMes.slice(0, 4)), Number(relMes.slice(5, 7)) - 1, 1);
    const fim = new Date(Number(relMes.slice(0, 4)), Number(relMes.slice(5, 7)), 1);
    const [regs, ocos] = await Promise.all([
      sb.from("ponto_registros").select("colaborador_id, tipo, batida")
        .gte("batida", ini.toISOString()).lt("batida", fim.toISOString())
        .order("batida").limit(20000),
      sb.from("ponto_ocorrencias").select("colaborador_id, data, tipo, descricao, observacao")
        .gte("data", relMes + "-01").lte("data", relMes + "-" + ultimoDia(relMes))
        .order("data").limit(20000),
    ]);
    if (regs.error || ocos.error) { setMsg("Erro: " + (regs.error || ocos.error).message); return; }
    setRelDados({ regs: regs.data || [], ocos: ocos.data || [] });
  }
  useEffect(() => { if (visao === "relatorios") carregarRelatorio(); }, [visao, relMes]);

  async function salvarNovaOco() {
    if (!novaOco || !novaOco.colaborador_id || !novaOco.data || !novaOco.descricao.trim()) { setMsg("Preencha colaborador, data e descrição."); return; }
    const { error } = await sb.from("ponto_ocorrencias").insert({
      colaborador_id: novaOco.colaborador_id, data: novaOco.data, tipo: "admin",
      descricao: novaOco.descricao.trim() + " (adicionado por " + ((ctx.profile && ctx.profile.nome) || "gestão") + ")", criado_por: ctx.profile.id,
    });
    if (error) { setMsg("Erro: " + error.message); return; }
    setMsg(""); setNovaOco(null); carregarOcorrencias();
  }

  async function salvarEditOco() {
    if (!editOco || !editOco.data || !editOco.descricao.trim()) { setMsg("A data e a descrição não podem ficar vazias."); return; }
    const { error } = await sb.from("ponto_ocorrencias").update({ data: editOco.data, descricao: editOco.descricao.trim() }).eq("id", editOco.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    setMsg(""); setEditOco(null); carregarOcorrencias();
  }

  async function salvarObsOco() {
    if (!obsOco) return;
    const { error } = await sb.from("ponto_ocorrencias").update({ observacao: obsOco.texto.trim() || null }).eq("id", obsOco.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    setMsg(""); setObsOco(null); carregarOcorrencias();
  }

  async function excluirOco(o) {
    if (!window.confirm("Excluir esta ocorrência? A exclusão fica na auditoria.")) return;
    const { error } = await sb.from("ponto_ocorrencias").delete().eq("id", o.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    carregarOcorrencias();
  }

  const resumoRel = useMemo(() => {
    if (!relDados) return [];
    return colabs.filter((c) => c.status === "ativo").map((c) => {
      const regs = relDados.regs.filter((r) => r.colaborador_id === c.id);
      const diasSet = {}; let min = 0, ent = null;
      regs.forEach((r) => {
        const d = new Date(r.batida);
        diasSet[d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate()] = 1;
        if (r.tipo === "entrada") { ent = new Date(r.batida); }
        else if (ent) { min += (new Date(r.batida) - ent) / 60000; ent = null; }
      });
      return { colab: c, dias: Object.keys(diasSet).length, min };
    });
  }, [relDados, colabs]);

  function pdfDe(colab) {
    if (!window.jspdf || !window.jspdf.jsPDF) { setMsg("O gerador de PDF não carregou. Atualize a página com Ctrl+F5."); return; }
    const regs = (relDados.regs || []).filter((r) => r.colaborador_id === colab.id);
    const ocos = (relDados.ocos || []).filter((o) => o.colaborador_id === colab.id);
    if (!regs.length && !ocos.length) { setMsg(colab.nome + " não tem registros neste mês."); return; }
    setMsg("");
    const p = relMes.split("-");
    pdfPonto(colab, regs, ocos, p[1] + "/" + p[0]);
  }

  async function pdfTodos() {
    if (!window.jspdf || !window.jspdf.jsPDF || !window.JSZip) { setMsg("Bibliotecas de PDF/ZIP não carregaram. Atualize a página com Ctrl+F5."); return; }
    setGerando(true); setMsg("");
    try {
      const zip = new window.JSZip(); const p = relMes.split("-"); let n = 0;
      colabs.filter((c) => c.status === "ativo").forEach((c) => {
        const regs = (relDados.regs || []).filter((r) => r.colaborador_id === c.id);
        const ocos = (relDados.ocos || []).filter((o) => o.colaborador_id === c.id);
        if (regs.length || ocos.length) {
          const r = pdfPonto(c, regs, ocos, p[1] + "/" + p[0], true);
          zip.file(r.nome, r.blob); n++;
        }
      });
      if (!n) { setMsg("Nenhum registro neste mês."); setGerando(false); return; }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = "relatorios-ponto-" + relMes + ".zip"; a.click();
    } catch (e) { setMsg("Erro ao gerar o ZIP: " + e.message); }
    setGerando(false);
  }

  function csvMes() {
    if (!relDados) return;
    let csv = "Funcionário,Cargo,Data,Tipo,Horário\r\n";
    colabs.filter((c) => c.status === "ativo").forEach((c) => {
      (relDados.regs || []).filter((r) => r.colaborador_id === c.id).forEach((r) => {
        const d = new Date(r.batida);
        const dia = String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
        csv += '"' + c.nome + '","' + (c.cargo || "") + '","' + dia + '","' + r.tipo + '","' + d.toLocaleTimeString("pt-BR") + '"\r\n';
      });
    });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "relatorio-ponto-" + relMes + ".csv"; a.click();
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {[["hoje", "Hoje"], ["espelho", "Espelho mensal"], ["ocorrencias", "Ocorrências"], ["relatorios", "Relatórios"]].map(([v, r]) => (
          <span key={v} className="chip" onClick={() => setVisao(v)}
            style={{ cursor: "pointer", background: visao === v ? "var(--tint)" : "var(--branco)", color: visao === v ? "var(--marca-texto)" : "var(--sec)", border: "1px solid " + (visao === v ? "var(--tint-borda)" : "var(--linha)") }}>{r}</span>
        ))}
        <span style={{ flex: 1 }}></span>
        <a href="ponto.html" target="_blank" rel="noopener" className="btn-contorno" style={{ padding: "8px 13px", fontSize: 12.5, textDecoration: "none" }}>
          <i className="ti ti-clock" style={{ fontSize: 14 }} aria-hidden="true"></i>Abrir o relógio
        </a>
      </div>

      {msg && <div className="anim-pop" style={{ marginBottom: 10, fontSize: 12.5, fontWeight: 600, color: "var(--vermelho)" }}>{msg}</div>}

      {visao === "hoje" && (
        <div className="card-fl" style={{ overflow: "hidden" }}>
          {!gruposHoje && <div style={{ padding: 16, fontSize: 13, color: "var(--muted)" }}>Carregando…</div>}
          {gruposHoje && gruposHoje.length === 0 && (
            <div style={{ padding: "26px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>Ninguém bateu ponto hoje ainda.</div>
          )}
          {gruposHoje && gruposHoje.map((g) => (
            <div key={g.nome} className="linha-hover" style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 14px", borderBottom: "1px solid var(--linha-suave)", flexWrap: "wrap" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--grad)", color: "#fff", fontWeight: 700, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{iniciais(g.nome)}</div>
              <span style={{ fontSize: 13, fontWeight: 600, flex: "none" }}>{g.nome}</span>
              <span style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {g.regs.map((r) => (
                  <span key={r.id} className="chip" title={r.origem + (r.obs ? " · " + r.obs : "")}
                    style={{ background: r.tipo === "entrada" ? "var(--verde-bg)" : "var(--azul-bg)", color: r.tipo === "entrada" ? "var(--verde)" : "var(--azul)" }}>
                    {r.tipo === "entrada" ? "E" : "S"} {horaLocal(r.batida)}
                  </span>
                ))}
              </span>
            </div>
          ))}
          {gruposHoje && gruposHoje.length > 0 && (
            <div style={{ padding: "8px 14px", fontSize: 11, color: "var(--muted)" }}>{gruposHoje.length} pessoa(s) registraram ponto hoje</div>
          )}
        </div>
      )}

      {visao === "espelho" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <select className="campo" style={{ flex: 1, minWidth: 180, padding: "8px 10px", fontSize: 13 }} value={colabSel} onChange={(e) => setColabSel(e.target.value)}>
              <option value="">escolha o colaborador…</option>
              {colabs.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.status === "desligado" ? " (desligado)" : ""}</option>)}
            </select>
            <input className="campo" type="month" style={{ width: 150, padding: "8px 10px", fontSize: 13 }} value={mes} onChange={(e) => setMes(e.target.value)} />
          </div>

          {podeEditar && colabSel && (
            <div className="card-fl" style={{ padding: 10, marginBottom: 12, display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--sec)", fontWeight: 600 }}>Batida manual:</span>
              <input className="campo" type="date" style={{ width: 140, padding: "7px 9px", fontSize: 12.5 }} value={addDia} onChange={(e) => setAddDia(e.target.value)} />
              <input className="campo" type="time" style={{ width: 100, padding: "7px 9px", fontSize: 12.5 }} value={addHora} onChange={(e) => setAddHora(e.target.value)} />
              <select className="campo" style={{ width: 100, padding: "7px 9px", fontSize: 12.5 }} value={addTipo} onChange={(e) => setAddTipo(e.target.value)}>
                <option value="entrada">Entrada</option><option value="saida">Saída</option>
              </select>
              <button className="btn-primaria" style={{ padding: "7px 13px", fontSize: 12 }} onClick={adicionarBatida}>Registrar</button>
            </div>
          )}

          {!colabSel && <div className="card-fl" style={{ padding: "26px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>Escolha um colaborador para ver o espelho do mês.</div>}
          {colabSel && dias && (
            <div className="card-fl" style={{ overflow: "hidden" }}>
              {dias.lista.length === 0 && <div style={{ padding: "26px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>Sem batidas neste mês.</div>}
              {dias.lista.map((d) => (
                <div key={d.dia} className="linha-hover" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderBottom: "1px solid var(--linha-suave)", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, width: 84, flex: "none" }}>{dataBr(d.dia)}</span>
                  <span style={{ display: "flex", gap: 5, flexWrap: "wrap", flex: 1 }}>
                    {d.regs.map((r) => (
                      <span key={r.id} className="chip" title={r.origem + (r.obs ? " · " + r.obs : "") + (r.origem !== "relogio" ? " · corrigível" : "")}
                        style={{ background: r.tipo === "entrada" ? "var(--verde-bg)" : "var(--azul-bg)", color: r.tipo === "entrada" ? "var(--verde)" : "var(--azul)" }}>
                        {r.tipo === "entrada" ? "E" : "S"} {horaLocal(r.batida)}
                        {podeEditar && (
                          <i className="ti ti-x" style={{ fontSize: 11, marginLeft: 4, cursor: "pointer" }} aria-label="Excluir batida"
                            onClick={() => excluirBatida(r)}></i>
                        )}
                      </span>
                    ))}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: d.aberto ? "var(--ambar)" : "var(--ink)", flex: "none" }}>
                    {d.aberto ? "em aberto" : fmtMin(d.min)}
                  </span>
                </div>
              ))}
              {dias.lista.length > 0 && (
                <div style={{ padding: "9px 14px", fontSize: 12.5, fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--sec)" }}>Total do mês</span><span>{fmtMin(dias.totalMin)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {visao === "ocorrencias" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            <input className="campo" type="month" style={{ width: 150, padding: "8px 10px", fontSize: 13 }} value={ocoMes} onChange={(e) => setOcoMes(e.target.value)} />
            <select className="campo" style={{ flex: 1, minWidth: 180, padding: "8px 10px", fontSize: 13 }} value={ocoColab} onChange={(e) => setOcoColab(e.target.value)}>
              <option value="">todos os colaboradores</option>
              {colabs.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.status === "desligado" ? " (desligado)" : ""}</option>)}
            </select>
            {podeEditar && (
              <button className="btn-contorno" style={{ padding: "8px 13px", fontSize: 12.5 }}
                onClick={() => setNovaOco(novaOco ? null : { colaborador_id: ocoColab || "", data: hojeLocalISO(), descricao: "" })}>
                <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true"></i>Nova ocorrência
              </button>
            )}
          </div>

          {novaOco && podeEditar && (
            <div className="card-fl anim-pop" style={{ padding: 10, marginBottom: 12, display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--sec)", fontWeight: 600 }}>Ocorrência administrativa:</span>
              <select className="campo" style={{ flex: 1, minWidth: 170, padding: "7px 9px", fontSize: 12.5 }} value={novaOco.colaborador_id} onChange={(e) => setNovaOco({ ...novaOco, colaborador_id: e.target.value })}>
                <option value="">colaborador…</option>
                {colabs.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.status === "desligado" ? " (desligado)" : ""}</option>)}
              </select>
              <input className="campo" type="date" style={{ width: 140, padding: "7px 9px", fontSize: 12.5 }} value={novaOco.data} onChange={(e) => setNovaOco({ ...novaOco, data: e.target.value })} />
              <input className="campo" style={{ flex: 2, minWidth: 220, padding: "7px 9px", fontSize: 12.5 }} placeholder="descrição (ex.: atestado entregue, atraso combinado…)" value={novaOco.descricao} onChange={(e) => setNovaOco({ ...novaOco, descricao: e.target.value })} />
              <button className="btn-primaria" style={{ padding: "7px 13px", fontSize: 12 }} onClick={salvarNovaOco}>Registrar</button>
              <button className="btn-contorno" style={{ padding: "7px 13px", fontSize: 12 }} onClick={() => setNovaOco(null)}>Cancelar</button>
            </div>
          )}

          <div className="card-fl" style={{ overflow: "hidden" }}>
            {!ocorrencias && <div style={{ padding: 16, fontSize: 13, color: "var(--muted)" }}>Carregando…</div>}
            {ocorrencias && ocorrencias.length === 0 && (
              <div style={{ padding: "26px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>Nenhuma ocorrência neste mês.</div>
            )}
            {ocorrencias && ocorrencias.map((o) => (
              <div key={o.id} style={{ padding: "10px 14px", borderBottom: "1px solid var(--linha-suave)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, width: 84, flex: "none" }}>{o.data ? dataBr(o.data) : "—"}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, flex: "none" }}>{o.colaboradores ? o.colaboradores.nome : "(sem colaborador)"}</span>
                  <span className="chip" style={{ background: o.tipo === "admin" ? "var(--tint)" : "var(--azul-bg)", color: o.tipo === "admin" ? "var(--marca-texto)" : "var(--azul)" }}>
                    {o.tipo === "admin" ? "Administrativo" : "Funcionário"}
                  </span>
                  <span style={{ flex: 1 }}></span>
                  {podeEditar && (
                    <span style={{ display: "flex", gap: 10, flex: "none" }}>
                      <i className="ti ti-message-circle" title="Observação do administrativo" aria-label="Observação do administrativo"
                        style={{ fontSize: 15, cursor: "pointer", color: o.observacao ? "var(--ambar)" : "var(--muted)" }}
                        onClick={() => { setEditOco(null); setObsOco(obsOco && obsOco.id === o.id ? null : { id: o.id, texto: o.observacao || "" }); }}></i>
                      <i className="ti ti-pencil" title="Editar" aria-label="Editar" style={{ fontSize: 15, cursor: "pointer", color: "var(--muted)" }}
                        onClick={() => { setObsOco(null); setEditOco(editOco && editOco.id === o.id ? null : { id: o.id, data: o.data || "", descricao: o.descricao || "" }); }}></i>
                      <i className="ti ti-trash" title="Excluir" aria-label="Excluir" style={{ fontSize: 15, cursor: "pointer", color: "var(--vermelho)" }}
                        onClick={() => excluirOco(o)}></i>
                    </span>
                  )}
                </div>
                {(!editOco || editOco.id !== o.id) && (
                  <div style={{ fontSize: 12.5, color: "var(--sec)", marginTop: 4, whiteSpace: "pre-wrap" }}>{o.descricao || "—"}</div>
                )}
                {editOco && editOco.id === o.id && (
                  <div className="anim-pop" style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginTop: 7 }}>
                    <input className="campo" type="date" style={{ width: 140, padding: "7px 9px", fontSize: 12.5 }} value={editOco.data} onChange={(e) => setEditOco({ ...editOco, data: e.target.value })} />
                    <input className="campo" style={{ flex: 1, minWidth: 200, padding: "7px 9px", fontSize: 12.5 }} value={editOco.descricao} onChange={(e) => setEditOco({ ...editOco, descricao: e.target.value })} />
                    <button className="btn-primaria" style={{ padding: "7px 13px", fontSize: 12 }} onClick={salvarEditOco}>Salvar</button>
                    <button className="btn-contorno" style={{ padding: "7px 13px", fontSize: 12 }} onClick={() => setEditOco(null)}>Cancelar</button>
                  </div>
                )}
                {obsOco && obsOco.id === o.id && podeEditar && (
                  <div className="anim-pop" style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginTop: 7 }}>
                    <input className="campo" style={{ flex: 1, minWidth: 220, padding: "7px 9px", fontSize: 12.5 }} placeholder="observação do administrativo (aparece no PDF)" value={obsOco.texto} onChange={(e) => setObsOco({ ...obsOco, texto: e.target.value })} />
                    <button className="btn-primaria" style={{ padding: "7px 13px", fontSize: 12 }} onClick={salvarObsOco}>Salvar</button>
                    <button className="btn-contorno" style={{ padding: "7px 13px", fontSize: 12 }} onClick={() => setObsOco(null)}>Cancelar</button>
                  </div>
                )}
                {o.observacao && (!obsOco || obsOco.id !== o.id) && (
                  <div style={{ marginTop: 6, fontSize: 12, color: "var(--ambar)", background: "var(--ambar-bg, #FFF7E6)", border: "1px solid var(--linha)", borderRadius: 8, padding: "6px 10px", whiteSpace: "pre-wrap" }}>
                    <b>Observação do administrativo:</b> {o.observacao}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {visao === "relatorios" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            <input className="campo" type="month" style={{ width: 150, padding: "8px 10px", fontSize: 13 }} value={relMes} onChange={(e) => setRelMes(e.target.value)} />
            <span style={{ flex: 1 }}></span>
            <button className="btn-contorno" style={{ padding: "8px 13px", fontSize: 12.5 }} disabled={!relDados} onClick={csvMes}>
              <i className="ti ti-table-export" style={{ fontSize: 14 }} aria-hidden="true"></i>CSV do mês
            </button>
            <button className="btn-primaria" style={{ padding: "8px 13px", fontSize: 12.5 }} disabled={!relDados || gerando} onClick={pdfTodos}>
              <i className="ti ti-file-zip" style={{ fontSize: 14 }} aria-hidden="true"></i>{gerando ? "Gerando…" : "PDF de todos (ZIP)"}
            </button>
          </div>
          <div className="card-fl" style={{ overflow: "hidden" }}>
            {!relDados && <div style={{ padding: 16, fontSize: 13, color: "var(--muted)" }}>Carregando…</div>}
            {relDados && resumoRel.length === 0 && (
              <div style={{ padding: "26px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>Nenhum colaborador ativo.</div>
            )}
            {relDados && resumoRel.map((l) => (
              <div key={l.colab.id} className="linha-hover" style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 14px", borderBottom: "1px solid var(--linha-suave)", flexWrap: "wrap" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--grad)", color: "#fff", fontWeight: 700, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{iniciais(l.colab.nome)}</div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{l.colab.nome}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{l.colab.cargo || "—"}</div>
                </div>
                <span style={{ fontSize: 12.5, color: "var(--sec)", flex: "none" }}>{l.dias} dia(s)</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, flex: "none", width: 64, textAlign: "right" }}>{fmtMin(l.min)}</span>
                <button className="btn-contorno" style={{ padding: "6px 11px", fontSize: 12 }} onClick={() => pdfDe(l.colab)}>
                  <i className="ti ti-file-type-pdf" style={{ fontSize: 14 }} aria-hidden="true"></i>PDF
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SeletorPessoa({ pessoas, valor, aoEscolher, excluir, noMapa, rotuloVazio }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const caixaRef = useRef(null);
  useEffect(() => {
    function fora(e) { if (caixaRef.current && !caixaRef.current.contains(e.target)) setAberto(false); }
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, []);
  const norm = (t) => (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const lista = (pessoas || [])
    .filter((c) => !excluir || !excluir[c.id])
    .filter((c) => !busca || norm(c.nome).indexOf(norm(busca)) !== -1)
    .slice()
    .sort((a, b) => (((noMapa && noMapa[b.id]) ? 1 : 0) - ((noMapa && noMapa[a.id]) ? 1 : 0)) || a.nome.localeCompare(b.nome));
  const atual = (pessoas || []).find((c) => c.id === valor);
  const mini = { width: 20, height: 20, borderRadius: "50%", background: "var(--grad)", color: "#fff", fontWeight: 700, fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" };
  return (
    <div ref={caixaRef} style={{ position: "relative" }}>
      <div className="campo" style={{ width: "100%", padding: "8px 10px", fontSize: 12.5, display: "flex", alignItems: "center", gap: 7, cursor: "pointer", minHeight: 37 }}
        onClick={() => { setAberto(!aberto); setBusca(""); }}>
        {atual ? (
          <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
            {atual.foto_url ? <img src={atual.foto_url} alt="" style={{ ...mini, objectFit: "cover" }} /> : <span style={mini}>{iniciais(atual.nome)}</span>}
            <span style={{ fontWeight: 600, textTransform: "uppercase", fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{atual.nome}</span>
          </span>
        ) : (
          <span style={{ color: "var(--muted)" }}>{rotuloVazio || "ninguém (topo)"}</span>
        )}
        <i className={"ti ti-chevron-" + (aberto ? "up" : "down")} style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 14 }} aria-hidden="true"></i>
      </div>
      {aberto && (
        <div className="sel-pessoa-caixa anim-pop">
          <input autoFocus className="campo" style={{ width: "100%", padding: "7px 9px", fontSize: 12.5, marginBottom: 6 }} placeholder="digite para buscar…"
            value={busca} onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && lista.length) { aoEscolher(lista[0].id); setAberto(false); }
              if (e.key === "Escape") setAberto(false);
            }} />
          <div className="sel-pessoa-op" style={{ color: "var(--muted)" }} onClick={() => { aoEscolher(""); setAberto(false); }}>
            <i className="ti ti-crown" style={{ fontSize: 13 }} aria-hidden="true"></i>{rotuloVazio || "ninguém (topo)"}
          </div>
          <div style={{ maxHeight: 230, overflowY: "auto" }}>
            {lista.length === 0 && <div style={{ padding: "10px 8px", fontSize: 12, color: "var(--muted)" }}>ninguém com esse nome</div>}
            {lista.map((c) => (
              <div key={c.id} className="sel-pessoa-op" onClick={() => { aoEscolher(c.id); setAberto(false); }}>
                {c.foto_url ? <img src={c.foto_url} alt="" style={{ ...mini, objectFit: "cover" }} /> : <span style={mini}>{iniciais(c.nome)}</span>}
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: "block", fontWeight: 600, textTransform: "uppercase", fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome}</span>
                  <span style={{ display: "block", fontSize: 10.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.cargo || "—"}</span>
                </span>
                {noMapa && noMapa[c.id] && <span className="chip" style={{ background: "var(--tint)", color: "var(--marca-texto)", fontSize: 9, padding: "2px 7px", flex: "none" }}>no mapa</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const CORES_SETOR = {
  diretoria:   ["var(--tint)",     "var(--marca-texto)"],
  clinico:     ["var(--roxo-bg)",  "var(--roxo)"],
  atendimento: ["var(--teal-bg)",  "var(--teal)"],
  financeiro:  ["var(--verde-bg)", "var(--verde)"],
  terapeutico: ["var(--rosa-bg)",  "var(--rosa)"],
};
function corSetor(s) {
  const k = (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return CORES_SETOR[k] || ["var(--branco, #fff)", "var(--sec)"];
}

function AbaOrganograma({ ctx }) {
  const podeEditar = nivelAba(ctx, "rh", "organograma") === "editar";
  const [colabs, setColabs] = useState(null);
  const [visao, setVisao] = useState("arvore");
  const [msg, setMsg] = useState("");
  const [edit, setEdit] = useState(null);
  const [novo, setNovo] = useState(null);
  const [pop, setPop] = useState(null);
  const [verSoltos, setVerSoltos] = useState(false);
  const popTimer = useRef(null);

  async function carregar() {
    const { data, error } = await sb.from("colaboradores")
      .select("id, nome, cargo, setor, status, responde_para, no_topo, foto_url, formacao, registro_profissional, unidade, telefone, email, nascimento, admissao, origem_ponto_id")
      .neq("status", "desligado").order("nome").limit(20000);
    if (error) { setMsg("Erro: " + error.message + (error.message.indexOf("no_topo") !== -1 ? " — rode o 11_organograma_topo.sql." : (error.message.indexOf("foto_url") !== -1 || error.message.indexOf("responde_para") !== -1 ? " — rode o 08 e o 10 no Supabase." : ""))); return; }
    setMsg(""); setColabs(data || []);
  }
  useEffect(() => { carregar(); }, []);

  const arvore = useMemo(() => {
    if (!colabs) return null;
    const porId = {};
    colabs.forEach((c) => { porId[c.id] = c; });
    const filhos = {};
    colabs.forEach((c) => {
      if (c.responde_para && porId[c.responde_para]) {
        (filhos[c.responde_para] = filhos[c.responde_para] || []).push(c);
      }
    });
    const temChefe = (c) => c.responde_para && porId[c.responde_para];
    const raizes = colabs.filter((c) => c.no_topo || (!temChefe(c) && (filhos[c.id] || []).length > 0));
    let soltos = colabs.filter((c) => !c.no_topo && !temChefe(c) && !(filhos[c.id] || []).length);
    const alcancado = {};
    const visitar = (id) => { if (alcancado[id]) return; alcancado[id] = 1; (filhos[id] || []).forEach((f) => visitar(f.id)); };
    raizes.forEach((r) => visitar(r.id));
    const presos = colabs.filter((c) => !alcancado[c.id] && soltos.indexOf(c) === -1 && raizes.indexOf(c) === -1);
    soltos = soltos.concat(presos);
    return { porId, filhos, raizes, soltos, noMapa: alcancado };
  }, [colabs]);

  const setores = useMemo(() => {
    if (!colabs) return null;
    const g = {};
    colabs.forEach((c) => { const s = (c.setor || "").trim() || "Sem setor"; (g[s] = g[s] || []).push(c); });
    return Object.keys(g)
      .sort((a, b) => ((a === "Sem setor") - (b === "Sem setor")) || a.localeCompare(b))
      .map((s) => ({ setor: s, pessoas: g[s] }));
  }, [colabs]);

  function descendentesDe(id) {
    const s = {};
    const anda = (x) => (arvore.filhos[x] || []).forEach((f) => { if (!s[f.id]) { s[f.id] = 1; anda(f.id); } });
    anda(id);
    return s;
  }

  // ---- dossie flutuante ----
  function abrirPop(c, el, fixo) {
    clearTimeout(popTimer.current);
    const r = el.getBoundingClientRect();
    let x = r.right + 12;
    if (x + 310 > window.innerWidth) x = Math.max(8, r.left - 322);
    const y = Math.max(8, Math.min(r.top - 8, window.innerHeight - 430));
    if (fixo) { setPop(pop && pop.c.id === c.id && pop.fixo ? null : { c, x, y, fixo: true }); return; }
    popTimer.current = setTimeout(() => setPop((p) => (p && p.fixo ? p : { c, x, y, fixo: false })), 260);
  }
  function agendarFecharPop() {
    clearTimeout(popTimer.current);
    popTimer.current = setTimeout(() => setPop((p) => (p && p.fixo ? p : null)), 220);
  }

  // ---- acoes ----
  function abrirEdicao(c) {
    setPop(null); setNovo(null);
    setEdit(edit && edit.id === c.id ? null : { id: c.id, responde_para: c.responde_para || "", cargo: c.cargo || "", setor: c.setor || "", no_topo: !!c.no_topo });
  }
  function abrirNovo(chefeId) {
    setPop(null); setEdit(null);
    const chefe = chefeId && arvore ? arvore.porId[chefeId] : null;
    setNovo({ nome: "", cargo: "", setor: chefe ? (chefe.setor || "") : "", responde_para: chefeId || "" });
  }
  async function salvarNovo() {
    if (!novo.nome.trim()) { setMsg("Dê o nome da pessoa."); return; }
    const { error } = await sb.from("colaboradores").insert({
      nome: novo.nome.trim(), cargo: (novo.cargo || "").trim() || null,
      setor: (novo.setor || "").trim() || null, responde_para: novo.responde_para || null,
      status: "ativo",
    });
    if (error) { setMsg("Erro: " + error.message); return; }
    setMsg(""); setNovo(null); carregar();
  }
  async function salvarEdit() {
    const { error } = await sb.from("colaboradores").update({
      no_topo: !!edit.no_topo,
      responde_para: edit.no_topo ? null : (edit.responde_para || null),
      cargo: (edit.cargo || "").trim() || null,
      setor: (edit.setor || "").trim() || null,
    }).eq("id", edit.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    setMsg(""); setEdit(null); carregar();
  }
  async function remover(c) {
    setPop(null);
    const criadoAMao = !c.origem_ponto_id;
    const aviso = criadoAMao
      ? 'Excluir "' + c.nome + '" do sistema? (pessoa criada à mão, sem histórico de ponto; os subordinados passam a responder ao chefe dela)'
      : 'Tirar "' + c.nome + '" do organograma? A pessoa continua no sistema — ponto e RH intactos — e os subordinados passam a responder ao chefe dela.';
    if (!window.confirm(aviso)) return;
    const { error: e1 } = await sb.from("colaboradores").update({ responde_para: c.responde_para || null }).eq("responde_para", c.id);
    if (e1) { setMsg("Erro: " + e1.message); return; }
    const { error: e2 } = criadoAMao
      ? await sb.from("colaboradores").delete().eq("id", c.id)
      : await sb.from("colaboradores").update({ responde_para: null, no_topo: false }).eq("id", c.id);
    if (e2) { setMsg("Erro: " + e2.message); return; }
    setMsg(""); carregar();
  }

  const Cartao = ({ c }) => (
    <div className="org-no" onMouseEnter={(e) => abrirPop(c, e.currentTarget, false)} onMouseLeave={agendarFecharPop} onClick={(e) => abrirPop(c, e.currentTarget, true)}>
      {podeEditar && (
        <span className="org-acoes" onClick={(e) => e.stopPropagation()} onMouseEnter={() => clearTimeout(popTimer.current)}>
          <i className="ti ti-user-plus" title="Adicionar subordinado" aria-label="Adicionar subordinado" onClick={() => abrirNovo(c.id)}></i>
          <i className="ti ti-pencil" title="Editar vínculo" aria-label="Editar vínculo" onClick={() => abrirEdicao(c)}></i>
          <i className="ti ti-trash" title="Remover" aria-label="Remover" onClick={() => remover(c)}></i>
        </span>
      )}
      {c.foto_url
        ? <img className="org-foto" src={c.foto_url} alt="" />
        : <div className="org-foto org-foto-ini">{iniciais(c.nome)}</div>}
      <div className="org-nome">{c.nome}</div>
      <div className="org-cargo">{c.cargo || "—"}</div>
      {c.setor && <span className="chip org-chip-setor" style={{ background: corSetor(c.setor)[0], color: corSetor(c.setor)[1] }}>{c.setor}</span>}
    </div>
  );

  const No = ({ c }) => (
    <li>
      <Cartao c={c} />
      {(arvore.filhos[c.id] || []).length > 0 && (
        <ul>{arvore.filhos[c.id].map((f) => <No key={f.id} c={f} />)}</ul>
      )}
    </li>
  );

  const editando = edit && arvore && arvore.porId[edit.id];
  const desc = editando ? descendentesDe(edit.id) : {};

  const linhasPop = pop ? [
    ["Unidade", pop.c.unidade],
    ["Formação", pop.c.formacao],
    ["Registro", pop.c.registro_profissional],
    ["Admissão", pop.c.admissao ? dataBr(pop.c.admissao) : null],
    ["Aniversário", pop.c.nascimento ? pop.c.nascimento.slice(5).split("-").reverse().join("/") : null],
    ["Telefone", pop.c.telefone],
    ["E-mail", pop.c.email],
  ].filter((l) => l[1]) : [];

  return (
    <div>
      {pop && (
        <div className="org-pop anim-pop" style={{ left: pop.x, top: pop.y }}
          onMouseEnter={() => clearTimeout(popTimer.current)} onMouseLeave={agendarFecharPop}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
            {pop.c.foto_url
              ? <img className="org-foto" style={{ width: 68, height: 68 }} src={pop.c.foto_url} alt="" />
              : <div className="org-foto org-foto-ini" style={{ width: 68, height: 68, fontSize: 19 }}>{iniciais(pop.c.nome)}</div>}
            <div style={{ minWidth: 0 }}>
              <div className="org-pop-nome">{pop.c.nome}</div>
              <div style={{ fontSize: 12, color: "var(--sec)" }}>{pop.c.cargo || "—"}</div>
              <div style={{ display: "flex", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
                {pop.c.setor && <span className="chip org-chip-setor" style={{ background: corSetor(pop.c.setor)[0], color: corSetor(pop.c.setor)[1] }}>{pop.c.setor}</span>}
                {pop.c.status !== "ativo" && <span className="chip org-chip-setor" style={{ background: "var(--ambar-bg, #FFF7E6)", color: "var(--ambar)" }}>{pop.c.status}</span>}
              </div>
            </div>
            {pop.fixo && <i className="ti ti-x" style={{ marginLeft: "auto", alignSelf: "flex-start", cursor: "pointer", color: "var(--muted)" }} onClick={() => setPop(null)} aria-label="Fechar"></i>}
          </div>
          {linhasPop.length > 0 ? linhasPop.map((l) => (
            <div key={l[0]} className="org-pop-lin"><b>{l[0]}</b><span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{l[1]}</span></div>
          )) : (
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Sem dados na ficha ainda — preencha em Configurações → Fichas da equipe.</div>
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {[["arvore", "Hierarquia"], ["setores", "Por setor"]].map(([v, r]) => (
          <span key={v} className="chip" onClick={() => setVisao(v)}
            style={{ cursor: "pointer", background: visao === v ? "var(--tint)" : "var(--branco)", color: visao === v ? "var(--marca-texto)" : "var(--sec)", border: "1px solid " + (visao === v ? "var(--tint-borda)" : "var(--linha)") }}>{r}</span>
        ))}
        <span style={{ flex: 1 }}></span>
        {colabs && arvore && (
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            {colabs.length} pessoa(s) · {colabs.length - arvore.soltos.length} no organograma · {arvore.soltos.length} sem vínculo
          </span>
        )}
        {podeEditar && (
          <button className="btn-contorno" style={{ padding: "8px 13px", fontSize: 12.5 }} onClick={() => (novo ? setNovo(null) : abrirNovo(""))}>
            <i className="ti ti-user-plus" style={{ fontSize: 14 }} aria-hidden="true"></i>Adicionar pessoa
          </button>
        )}
      </div>

      {msg && <div className="anim-pop" style={{ marginBottom: 10, fontSize: 12.5, fontWeight: 600, color: "var(--vermelho)" }}>{msg}</div>}

      {(novo || editando) && podeEditar && (
        <div className="org-modal-fundo" onClick={(e) => { if (e.target === e.currentTarget) { setNovo(null); setEdit(null); } }}>
          <div className="org-modal anim-pop">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: .3, minWidth: 0 }}>
                {novo ? "Nova pessoa" : arvore.porId[edit.id].nome}
              </div>
              <i className="ti ti-x" style={{ marginLeft: "auto", cursor: "pointer", color: "var(--muted)", fontSize: 17 }} onClick={() => { setNovo(null); setEdit(null); }} aria-label="Fechar"></i>
            </div>

            {msg && <div className="anim-pop" style={{ marginBottom: 10, fontSize: 12.5, fontWeight: 600, color: "var(--vermelho)" }}>{msg}</div>}

            {novo ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div><label style={ROT_FICHA}>Nome completo</label>
                  <input className="campo" style={{ width: "100%", padding: "8px 10px", fontSize: 12.5 }} value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></div>
                <div><label style={ROT_FICHA}>Cargo</label>
                  <input className="campo" style={{ width: "100%", padding: "8px 10px", fontSize: 12.5 }} value={novo.cargo} onChange={(e) => setNovo({ ...novo, cargo: e.target.value })} /></div>
                <div><label style={ROT_FICHA}>Setor</label>
                  <input className="campo" style={{ width: "100%", padding: "8px 10px", fontSize: 12.5 }} value={novo.setor} onChange={(e) => setNovo({ ...novo, setor: e.target.value })} /></div>
                <div><label style={ROT_FICHA}>Responde para</label>
                  <SeletorPessoa pessoas={colabs || []} valor={novo.responde_para} noMapa={arvore ? arvore.noMapa : null}
                    rotuloVazio="ninguém (topo)"
                    aoEscolher={(v) => setNovo({ ...novo, responde_para: v })} /></div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--sec)" }}>
                  <button type="button" className={"sw" + (edit.no_topo ? " on" : "")} onClick={() => setEdit({ ...edit, no_topo: !edit.no_topo, responde_para: edit.no_topo ? edit.responde_para : "" })} aria-label="Fixar no topo"></button>
                  topo (fundador/diretor)
                </label>
                <div style={{ opacity: edit.no_topo ? .5 : 1, pointerEvents: edit.no_topo ? "none" : "auto" }}>
                  <label style={ROT_FICHA}>Responde para</label>
                  <SeletorPessoa pessoas={colabs} valor={edit.responde_para} noMapa={arvore.noMapa}
                    excluir={Object.assign({ [edit.id]: 1 }, desc)}
                    rotuloVazio="ninguém (topo do organograma)"
                    aoEscolher={(v) => setEdit({ ...edit, responde_para: v })} />
                </div>
                <div><label style={ROT_FICHA}>Cargo</label>
                  <input className="campo" style={{ width: "100%", padding: "8px 10px", fontSize: 12.5 }} value={edit.cargo} onChange={(e) => setEdit({ ...edit, cargo: e.target.value })} /></div>
                <div><label style={ROT_FICHA}>Setor</label>
                  <input className="campo" style={{ width: "100%", padding: "8px 10px", fontSize: 12.5 }} value={edit.setor} onChange={(e) => setEdit({ ...edit, setor: e.target.value })} /></div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 15 }}>
              <button className="btn-primaria" style={{ padding: "8px 15px", fontSize: 12.5 }} onClick={novo ? salvarNovo : salvarEdit}>{novo ? "Adicionar" : "Salvar"}</button>
              <button className="btn-contorno" style={{ padding: "8px 15px", fontSize: 12.5 }} onClick={() => { setNovo(null); setEdit(null); }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {!colabs && <div className="card-fl" style={{ padding: 16, fontSize: 13, color: "var(--muted)" }}>Carregando…</div>}

      {colabs && visao === "arvore" && (
        <div>
          <div className="card-fl" style={{ padding: "6px 10px" }}>
            {arvore.raizes.length === 0 ? (
              <div style={{ padding: "26px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                O organograma nasce dos vínculos: use o lápis nas pessoas abaixo e defina para quem cada uma responde.<br />
                Quem não responde a ninguém e tem gente respondendo a ele aparece aqui no topo.
              </div>
            ) : (
              <div className="org-rolagem">
                <ul className="org-arvore">
                  {arvore.raizes.map((r) => <No key={r.id} c={r} />)}
                </ul>
              </div>
            )}
          </div>

          {arvore.soltos.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {!verSoltos ? (
                <button className="btn-contorno" style={{ padding: "8px 14px", fontSize: 12.5 }} onClick={() => setVerSoltos(true)}>
                  <i className="ti ti-users" style={{ fontSize: 14 }} aria-hidden="true"></i>
                  Mostrar todos os prestadores sem vínculo ({arvore.soltos.length})
                </button>
              ) : (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 2px 8px" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sec)", textTransform: "uppercase", letterSpacing: .5 }}>
                      Sem vínculo no organograma ({arvore.soltos.length})
                    </span>
                    <button className="btn-contorno" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => setVerSoltos(false)}>esconder</button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {arvore.soltos.map((c) => <Cartao key={c.id} c={c} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {colabs && visao === "setores" && setores && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {setores.map((g) => (
            <div key={g.setor} className="card-fl" style={{ padding: "12px 13px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 9, display: "flex", alignItems: "center", gap: 7, textTransform: "uppercase", letterSpacing: .4 }}>
                {g.setor}
                <span className="chip" style={{ background: corSetor(g.setor)[0], color: corSetor(g.setor)[1] }}>{g.pessoas.length}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {g.pessoas.map((c) => <Cartao key={c.id} c={c} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AbaFaltas({ ctx }) {
  const podeEditar = nivelAba(ctx, "rh", "faltas") === "editar";
  const [visao, setVisao] = useState("faltas");
  const [colabs, setColabs] = useState([]);
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [colabSel, setColabSel] = useState("");
  const [faltas, setFaltas] = useState(null);
  const [atestados, setAtestados] = useState(null);
  const [msg, setMsg] = useState("");
  const [novo, setNovo] = useState(null);
  const [edit, setEdit] = useState(null);

  useEffect(() => { (async () => {
    const { data } = await sb.from("colaboradores").select("id, nome, status").order("nome");
    setColabs(data || []);
  })(); }, []);

  function fimMes(m) { return m + "-" + String(new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).getDate()).padStart(2, "0"); }

  async function carregarFaltas() {
    let q = sb.from("faltas").select("id, colaborador_id, data, tipo, justificada, motivo, colaboradores(nome)")
      .gte("data", mes + "-01").lte("data", fimMes(mes))
      .order("data", { ascending: false }).limit(20000);
    if (colabSel) q = q.eq("colaborador_id", colabSel);
    const { data, error } = await q;
    if (error) { setMsg("Erro: " + error.message); return; }
    setMsg(""); setFaltas(data || []);
  }
  async function carregarAtestados() {
    let q = sb.from("atestados").select("id, colaborador_id, inicio, fim, dias, cid, observacao, colaboradores(nome)")
      .lte("inicio", fimMes(mes)).gte("fim", mes + "-01")
      .order("inicio", { ascending: false }).limit(20000);
    if (colabSel) q = q.eq("colaborador_id", colabSel);
    const { data, error } = await q;
    if (error) { setMsg("Erro: " + error.message); return; }
    setMsg(""); setAtestados(data || []);
  }
  useEffect(() => { setNovo(null); setEdit(null); if (visao === "faltas") carregarFaltas(); else carregarAtestados(); }, [visao, mes, colabSel]);

  const rotTipo = { falta: "Falta", atraso: "Atraso", saida_antecipada: "Saída antecipada" };
  const corTipo = {
    falta: ["var(--vermelho-bg, #FDEBEB)", "var(--vermelho)"],
    atraso: ["var(--ambar-bg, #FFF7E6)", "var(--ambar)"],
    saida_antecipada: ["var(--azul-bg)", "var(--azul)"],
  };

  function diasEntre(a, b) { return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000) + 1; }

  async function salvarNovo() {
    if (visao === "faltas") {
      if (!novo.colaborador_id || !novo.data) { setMsg("Escolha colaborador e data."); return; }
      const { error } = await sb.from("faltas").insert({
        colaborador_id: novo.colaborador_id, data: novo.data, tipo: novo.tipo,
        justificada: !!novo.justificada, motivo: (novo.motivo || "").trim() || null,
        registrado_por: ctx.profile.id,
      });
      if (error) { setMsg("Erro: " + error.message); return; }
      setMsg(""); setNovo(null); carregarFaltas();
    } else {
      if (!novo.colaborador_id || !novo.inicio || !novo.fim) { setMsg("Escolha colaborador, início e fim."); return; }
      if (novo.fim < novo.inicio) { setMsg("O fim não pode vir antes do início."); return; }
      const { error } = await sb.from("atestados").insert({
        colaborador_id: novo.colaborador_id, inicio: novo.inicio, fim: novo.fim,
        dias: diasEntre(novo.inicio, novo.fim),
        cid: (novo.cid || "").trim() || null, observacao: (novo.observacao || "").trim() || null,
        registrado_por: ctx.profile.id,
      });
      if (error) { setMsg("Erro: " + error.message); return; }
      setMsg(""); setNovo(null); carregarAtestados();
    }
  }

  async function salvarEdit() {
    if (visao === "faltas") {
      if (!edit.data) { setMsg("A data é obrigatória."); return; }
      const { error } = await sb.from("faltas").update({
        data: edit.data, tipo: edit.tipo, justificada: !!edit.justificada,
        motivo: (edit.motivo || "").trim() || null,
      }).eq("id", edit.id);
      if (error) { setMsg("Erro: " + error.message); return; }
      setMsg(""); setEdit(null); carregarFaltas();
    } else {
      if (!edit.inicio || !edit.fim || edit.fim < edit.inicio) { setMsg("Confira as datas do atestado."); return; }
      const { error } = await sb.from("atestados").update({
        inicio: edit.inicio, fim: edit.fim, dias: diasEntre(edit.inicio, edit.fim),
        cid: (edit.cid || "").trim() || null, observacao: (edit.observacao || "").trim() || null,
      }).eq("id", edit.id);
      if (error) { setMsg("Erro: " + error.message); return; }
      setMsg(""); setEdit(null); carregarAtestados();
    }
  }

  async function excluir(item) {
    if (!window.confirm("Excluir este registro? A exclusão fica na auditoria.")) return;
    const { error } = await sb.from(visao === "faltas" ? "faltas" : "atestados").delete().eq("id", item.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    if (visao === "faltas") carregarFaltas(); else carregarAtestados();
  }

  async function alternarJustificada(f) {
    const { error } = await sb.from("faltas").update({ justificada: !f.justificada }).eq("id", f.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    carregarFaltas();
  }

  const selColab = (valor, aoMudar, flexivel) => (
    <select className="campo" style={{ flex: flexivel ? 1 : "none", minWidth: 170, padding: "7px 9px", fontSize: 12.5 }} value={valor} onChange={aoMudar}>
      <option value="">colaborador…</option>
      {colabs.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.status === "desligado" ? " (desligado)" : ""}</option>)}
    </select>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {[["faltas", "Faltas"], ["atestados", "Atestados"]].map(([v, r]) => (
          <span key={v} className="chip" onClick={() => setVisao(v)}
            style={{ cursor: "pointer", background: visao === v ? "var(--tint)" : "var(--branco)", color: visao === v ? "var(--marca-texto)" : "var(--sec)", border: "1px solid " + (visao === v ? "var(--tint-borda)" : "var(--linha)") }}>{r}</span>
        ))}
        <input className="campo" type="month" style={{ width: 150, padding: "8px 10px", fontSize: 13 }} value={mes} onChange={(e) => setMes(e.target.value)} />
        <select className="campo" style={{ flex: 1, minWidth: 180, padding: "8px 10px", fontSize: 13 }} value={colabSel} onChange={(e) => setColabSel(e.target.value)}>
          <option value="">todos os colaboradores</option>
          {colabs.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.status === "desligado" ? " (desligado)" : ""}</option>)}
        </select>
        {podeEditar && (
          <button className="btn-contorno" style={{ padding: "8px 13px", fontSize: 12.5 }}
            onClick={() => setNovo(novo ? null : (visao === "faltas"
              ? { colaborador_id: colabSel || "", data: hojeLocalISO(), tipo: "falta", justificada: false, motivo: "" }
              : { colaborador_id: colabSel || "", inicio: hojeLocalISO(), fim: hojeLocalISO(), cid: "", observacao: "" }))}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true"></i>{visao === "faltas" ? "Nova falta" : "Novo atestado"}
          </button>
        )}
      </div>

      {msg && <div className="anim-pop" style={{ marginBottom: 10, fontSize: 12.5, fontWeight: 600, color: "var(--vermelho)" }}>{msg}</div>}

      {novo && podeEditar && visao === "faltas" && (
        <div className="card-fl anim-pop" style={{ padding: 10, marginBottom: 12, display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
          {selColab(novo.colaborador_id, (e) => setNovo({ ...novo, colaborador_id: e.target.value }), true)}
          <input className="campo" type="date" style={{ width: 140, padding: "7px 9px", fontSize: 12.5 }} value={novo.data} onChange={(e) => setNovo({ ...novo, data: e.target.value })} />
          <select className="campo" style={{ width: 150, padding: "7px 9px", fontSize: 12.5 }} value={novo.tipo} onChange={(e) => setNovo({ ...novo, tipo: e.target.value })}>
            <option value="falta">Falta</option><option value="atraso">Atraso</option><option value="saida_antecipada">Saída antecipada</option>
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--sec)" }}>
            <button type="button" className={"sw" + (novo.justificada ? " on" : "")} onClick={() => setNovo({ ...novo, justificada: !novo.justificada })} aria-label="Justificada"></button>justificada
          </label>
          <input className="campo" style={{ flex: 2, minWidth: 200, padding: "7px 9px", fontSize: 12.5 }} placeholder="motivo (opcional)" value={novo.motivo} onChange={(e) => setNovo({ ...novo, motivo: e.target.value })} />
          <button className="btn-primaria" style={{ padding: "7px 13px", fontSize: 12 }} onClick={salvarNovo}>Registrar</button>
          <button className="btn-contorno" style={{ padding: "7px 13px", fontSize: 12 }} onClick={() => setNovo(null)}>Cancelar</button>
        </div>
      )}

      {novo && podeEditar && visao === "atestados" && (
        <div className="card-fl anim-pop" style={{ padding: 10, marginBottom: 12, display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
          {selColab(novo.colaborador_id, (e) => setNovo({ ...novo, colaborador_id: e.target.value }), true)}
          <input className="campo" type="date" style={{ width: 140, padding: "7px 9px", fontSize: 12.5 }} value={novo.inicio} onChange={(e) => setNovo({ ...novo, inicio: e.target.value })} />
          <span style={{ fontSize: 12, color: "var(--muted)" }}>até</span>
          <input className="campo" type="date" style={{ width: 140, padding: "7px 9px", fontSize: 12.5 }} value={novo.fim} onChange={(e) => setNovo({ ...novo, fim: e.target.value })} />
          <input className="campo" style={{ width: 110, padding: "7px 9px", fontSize: 12.5 }} placeholder="CID (opcional)" value={novo.cid} onChange={(e) => setNovo({ ...novo, cid: e.target.value })} />
          <input className="campo" style={{ flex: 2, minWidth: 200, padding: "7px 9px", fontSize: 12.5 }} placeholder="observação (opcional)" value={novo.observacao} onChange={(e) => setNovo({ ...novo, observacao: e.target.value })} />
          <button className="btn-primaria" style={{ padding: "7px 13px", fontSize: 12 }} onClick={salvarNovo}>Registrar</button>
          <button className="btn-contorno" style={{ padding: "7px 13px", fontSize: 12 }} onClick={() => setNovo(null)}>Cancelar</button>
        </div>
      )}

      {visao === "faltas" && (
        <div className="card-fl" style={{ overflow: "hidden" }}>
          {!faltas && <div style={{ padding: 16, fontSize: 13, color: "var(--muted)" }}>Carregando…</div>}
          {faltas && faltas.length === 0 && (
            <div style={{ padding: "26px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>Nenhuma falta neste mês.</div>
          )}
          {faltas && faltas.map((f) => (
            <div key={f.id} style={{ padding: "10px 14px", borderBottom: "1px solid var(--linha-suave)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, width: 84, flex: "none" }}>{dataBr(f.data)}</span>
                <span style={{ fontSize: 13, fontWeight: 600, flex: "none" }}>{f.colaboradores ? f.colaboradores.nome : "—"}</span>
                <span className="chip" style={{ background: corTipo[f.tipo][0], color: corTipo[f.tipo][1] }}>{rotTipo[f.tipo] || f.tipo}</span>
                <span className="chip" title={podeEditar ? "Clique para alternar" : ""}
                  onClick={podeEditar ? () => alternarJustificada(f) : undefined}
                  style={{ cursor: podeEditar ? "pointer" : "default", background: f.justificada ? "var(--verde-bg)" : "var(--branco)", color: f.justificada ? "var(--verde)" : "var(--muted)", border: "1px solid " + (f.justificada ? "var(--verde-bg)" : "var(--linha)") }}>
                  {f.justificada ? "Justificada" : "Não justificada"}
                </span>
                <span style={{ flex: 1 }}></span>
                {podeEditar && (
                  <span style={{ display: "flex", gap: 10, flex: "none" }}>
                    <i className="ti ti-pencil" title="Editar" aria-label="Editar" style={{ fontSize: 15, cursor: "pointer", color: "var(--muted)" }}
                      onClick={() => setEdit(edit && edit.id === f.id ? null : { id: f.id, data: f.data, tipo: f.tipo, justificada: f.justificada, motivo: f.motivo || "" })}></i>
                    <i className="ti ti-trash" title="Excluir" aria-label="Excluir" style={{ fontSize: 15, cursor: "pointer", color: "var(--vermelho)" }} onClick={() => excluir(f)}></i>
                  </span>
                )}
              </div>
              {f.motivo && (!edit || edit.id !== f.id) && (
                <div style={{ fontSize: 12.5, color: "var(--sec)", marginTop: 4, whiteSpace: "pre-wrap" }}>{f.motivo}</div>
              )}
              {edit && edit.id === f.id && (
                <div className="anim-pop" style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginTop: 7 }}>
                  <input className="campo" type="date" style={{ width: 140, padding: "7px 9px", fontSize: 12.5 }} value={edit.data} onChange={(e) => setEdit({ ...edit, data: e.target.value })} />
                  <select className="campo" style={{ width: 150, padding: "7px 9px", fontSize: 12.5 }} value={edit.tipo} onChange={(e) => setEdit({ ...edit, tipo: e.target.value })}>
                    <option value="falta">Falta</option><option value="atraso">Atraso</option><option value="saida_antecipada">Saída antecipada</option>
                  </select>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--sec)" }}>
                    <button type="button" className={"sw" + (edit.justificada ? " on" : "")} onClick={() => setEdit({ ...edit, justificada: !edit.justificada })} aria-label="Justificada"></button>justificada
                  </label>
                  <input className="campo" style={{ flex: 1, minWidth: 180, padding: "7px 9px", fontSize: 12.5 }} value={edit.motivo} onChange={(e) => setEdit({ ...edit, motivo: e.target.value })} />
                  <button className="btn-primaria" style={{ padding: "7px 13px", fontSize: 12 }} onClick={salvarEdit}>Salvar</button>
                  <button className="btn-contorno" style={{ padding: "7px 13px", fontSize: 12 }} onClick={() => setEdit(null)}>Cancelar</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {visao === "atestados" && (
        <div className="card-fl" style={{ overflow: "hidden" }}>
          {!atestados && <div style={{ padding: 16, fontSize: 13, color: "var(--muted)" }}>Carregando…</div>}
          {atestados && atestados.length === 0 && (
            <div style={{ padding: "26px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>Nenhum atestado tocando este mês.</div>
          )}
          {atestados && atestados.map((a) => (
            <div key={a.id} style={{ padding: "10px 14px", borderBottom: "1px solid var(--linha-suave)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, flex: "none" }}>{dataBr(a.inicio)} – {dataBr(a.fim)}</span>
                <span className="chip" style={{ background: "var(--tint)", color: "var(--marca-texto)" }}>{a.dias || diasEntre(a.inicio, a.fim)} dia(s)</span>
                <span style={{ fontSize: 13, fontWeight: 600, flex: "none" }}>{a.colaboradores ? a.colaboradores.nome : "—"}</span>
                {a.cid && <span className="chip" style={{ background: "var(--azul-bg)", color: "var(--azul)" }}>CID {a.cid}</span>}
                <span style={{ flex: 1 }}></span>
                {podeEditar && (
                  <span style={{ display: "flex", gap: 10, flex: "none" }}>
                    <i className="ti ti-pencil" title="Editar" aria-label="Editar" style={{ fontSize: 15, cursor: "pointer", color: "var(--muted)" }}
                      onClick={() => setEdit(edit && edit.id === a.id ? null : { id: a.id, inicio: a.inicio, fim: a.fim, cid: a.cid || "", observacao: a.observacao || "" })}></i>
                    <i className="ti ti-trash" title="Excluir" aria-label="Excluir" style={{ fontSize: 15, cursor: "pointer", color: "var(--vermelho)" }} onClick={() => excluir(a)}></i>
                  </span>
                )}
              </div>
              {a.observacao && (!edit || edit.id !== a.id) && (
                <div style={{ fontSize: 12.5, color: "var(--sec)", marginTop: 4, whiteSpace: "pre-wrap" }}>{a.observacao}</div>
              )}
              {edit && edit.id === a.id && (
                <div className="anim-pop" style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginTop: 7 }}>
                  <input className="campo" type="date" style={{ width: 140, padding: "7px 9px", fontSize: 12.5 }} value={edit.inicio} onChange={(e) => setEdit({ ...edit, inicio: e.target.value })} />
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>até</span>
                  <input className="campo" type="date" style={{ width: 140, padding: "7px 9px", fontSize: 12.5 }} value={edit.fim} onChange={(e) => setEdit({ ...edit, fim: e.target.value })} />
                  <input className="campo" style={{ width: 110, padding: "7px 9px", fontSize: 12.5 }} placeholder="CID" value={edit.cid} onChange={(e) => setEdit({ ...edit, cid: e.target.value })} />
                  <input className="campo" style={{ flex: 1, minWidth: 180, padding: "7px 9px", fontSize: 12.5 }} placeholder="observação" value={edit.observacao} onChange={(e) => setEdit({ ...edit, observacao: e.target.value })} />
                  <button className="btn-primaria" style={{ padding: "7px 13px", fontSize: 12 }} onClick={salvarEdit}>Salvar</button>
                  <button className="btn-contorno" style={{ padding: "7px 13px", fontSize: 12 }} onClick={() => setEdit(null)}>Cancelar</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AbaAlertas({ ctx }) {
  const podeEditar = nivelAba(ctx, "rh", "alertas") === "editar";
  const [visao, setVisao] = useState("alertas");
  const [colabs, setColabs] = useState([]);
  const [mostrarFechados, setMostrarFechados] = useState(false);
  const [lista, setLista] = useState(null);
  const [msg, setMsg] = useState("");
  const [novo, setNovo] = useState(null);
  const [edit, setEdit] = useState(null);

  useEffect(() => { (async () => {
    const { data } = await sb.from("colaboradores").select("id, nome, status").order("nome");
    setColabs(data || []);
  })(); }, []);

  const ehAlerta = visao === "alertas";
  const tabela = ehAlerta ? "alertas" : "pendencias";
  const flag = ehAlerta ? "resolvido" : "concluida";

  async function carregar() {
    let q = sb.from(tabela).select("*, colaboradores(nome)")
      .order("prazo", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }).limit(20000);
    if (!mostrarFechados) q = q.eq(flag, false);
    const { data, error } = await q;
    if (error) { setMsg("Erro: " + error.message); return; }
    const d = (data || []).slice().sort((a, b) => Number(a[flag]) - Number(b[flag]));
    setMsg(""); setLista(d);
  }
  useEffect(() => { setNovo(null); setEdit(null); carregar(); }, [visao, mostrarFechados]);

  const corCrit = {
    critico: ["var(--vermelho-bg, #FDEBEB)", "var(--vermelho)", "Crítico"],
    atencao: ["var(--ambar-bg, #FFF7E6)", "var(--ambar)", "Atenção"],
    info: ["var(--azul-bg)", "var(--azul)", "Informativo"],
  };

  async function salvarNovo() {
    if (!novo.titulo.trim()) { setMsg("Dê um título."); return; }
    const base = {
      titulo: novo.titulo.trim(), descricao: (novo.descricao || "").trim() || null,
      prazo: novo.prazo || null, colaborador_id: novo.colaborador_id || null, criado_por: ctx.profile.id,
    };
    if (ehAlerta) base.criticidade = novo.criticidade || "atencao";
    const { error } = await sb.from(tabela).insert(base);
    if (error) { setMsg("Erro: " + error.message); return; }
    setMsg(""); setNovo(null); carregar();
  }

  async function salvarEdit() {
    if (!edit.titulo.trim()) { setMsg("O título não pode ficar vazio."); return; }
    const base = {
      titulo: edit.titulo.trim(), descricao: (edit.descricao || "").trim() || null,
      prazo: edit.prazo || null, colaborador_id: edit.colaborador_id || null,
    };
    if (ehAlerta) base.criticidade = edit.criticidade || "atencao";
    const { error } = await sb.from(tabela).update(base).eq("id", edit.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    setMsg(""); setEdit(null); carregar();
  }

  async function alternarFeito(item) {
    const patch = ehAlerta
      ? { resolvido: !item.resolvido, resolvido_em: !item.resolvido ? new Date().toISOString() : null }
      : { concluida: !item.concluida, concluida_em: !item.concluida ? new Date().toISOString() : null };
    const { error } = await sb.from(tabela).update(patch).eq("id", item.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    carregar();
  }

  async function excluir(item) {
    if (!window.confirm("Excluir este registro? A exclusão fica na auditoria.")) return;
    const { error } = await sb.from(tabela).delete().eq("id", item.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    carregar();
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {[["alertas", "Alertas"], ["pendencias", "Pendências"]].map(([v, r]) => (
          <span key={v} className="chip" onClick={() => setVisao(v)}
            style={{ cursor: "pointer", background: visao === v ? "var(--tint)" : "var(--branco)", color: visao === v ? "var(--marca-texto)" : "var(--sec)", border: "1px solid " + (visao === v ? "var(--tint-borda)" : "var(--linha)") }}>{r}</span>
        ))}
        <span style={{ flex: 1 }}></span>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--sec)" }}>
          <button type="button" className={"sw" + (mostrarFechados ? " on" : "")} onClick={() => setMostrarFechados(!mostrarFechados)} aria-label="Mostrar também os fechados"></button>
          mostrar {ehAlerta ? "resolvidos" : "concluídas"}
        </label>
        {podeEditar && (
          <button className="btn-contorno" style={{ padding: "8px 13px", fontSize: 12.5 }}
            onClick={() => setNovo(novo ? null : { titulo: "", descricao: "", prazo: "", colaborador_id: "", criticidade: "atencao" })}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true"></i>{ehAlerta ? "Novo alerta" : "Nova pendência"}
          </button>
        )}
      </div>

      {msg && <div className="anim-pop" style={{ marginBottom: 10, fontSize: 12.5, fontWeight: 600, color: "var(--vermelho)" }}>{msg}</div>}

      {novo && podeEditar && (
        <div className="card-fl anim-pop" style={{ padding: 10, marginBottom: 12, display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
          <input className="campo" style={{ flex: 2, minWidth: 200, padding: "7px 9px", fontSize: 12.5 }} placeholder="título" value={novo.titulo} onChange={(e) => setNovo({ ...novo, titulo: e.target.value })} />
          <select className="campo" style={{ flex: 1, minWidth: 160, padding: "7px 9px", fontSize: 12.5 }} value={novo.colaborador_id} onChange={(e) => setNovo({ ...novo, colaborador_id: e.target.value })}>
            <option value="">sem colaborador</option>
            {colabs.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.status === "desligado" ? " (desligado)" : ""}</option>)}
          </select>
          {ehAlerta && (
            <select className="campo" style={{ width: 130, padding: "7px 9px", fontSize: 12.5 }} value={novo.criticidade} onChange={(e) => setNovo({ ...novo, criticidade: e.target.value })}>
              <option value="critico">Crítico</option><option value="atencao">Atenção</option><option value="info">Informativo</option>
            </select>
          )}
          <input className="campo" type="date" style={{ width: 140, padding: "7px 9px", fontSize: 12.5 }} value={novo.prazo} onChange={(e) => setNovo({ ...novo, prazo: e.target.value })} title="prazo (opcional)" />
          <input className="campo" style={{ flex: 2, minWidth: 200, padding: "7px 9px", fontSize: 12.5 }} placeholder="descrição (opcional)" value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} />
          <button className="btn-primaria" style={{ padding: "7px 13px", fontSize: 12 }} onClick={salvarNovo}>Registrar</button>
          <button className="btn-contorno" style={{ padding: "7px 13px", fontSize: 12 }} onClick={() => setNovo(null)}>Cancelar</button>
        </div>
      )}

      <div className="card-fl" style={{ overflow: "hidden" }}>
        {!lista && <div style={{ padding: 16, fontSize: 13, color: "var(--muted)" }}>Carregando…</div>}
        {lista && lista.length === 0 && (
          <div style={{ padding: "26px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
            {ehAlerta ? "Nenhum alerta em aberto." : "Nenhuma pendência em aberto."}
          </div>
        )}
        {lista && lista.map((item) => {
          const feito = !!item[flag];
          const vencido = item.prazo && !feito && item.prazo < hojeLocalISO();
          return (
            <div key={item.id} style={{ padding: "10px 14px", borderBottom: "1px solid var(--linha-suave)", opacity: feito ? .62 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                <button type="button" title={podeEditar ? (feito ? "Reabrir" : (ehAlerta ? "Marcar como resolvido" : "Concluir")) : ""}
                  onClick={podeEditar ? () => alternarFeito(item) : undefined}
                  style={{ width: 20, height: 20, borderRadius: "50%", flex: "none", cursor: podeEditar ? "pointer" : "default", border: "2px solid " + (feito ? "var(--verde)" : "var(--linha)"), background: feito ? "var(--verde)" : "transparent", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                  {feito && <i className="ti ti-check" style={{ fontSize: 12 }} aria-hidden="true"></i>}
                </button>
                <span style={{ fontSize: 13, fontWeight: 600, textDecoration: feito ? "line-through" : "none", color: feito ? "var(--muted)" : "var(--ink)" }}>{item.titulo}</span>
                {ehAlerta && corCrit[item.criticidade] && (
                  <span className="chip" style={{ background: corCrit[item.criticidade][0], color: corCrit[item.criticidade][1] }}>{corCrit[item.criticidade][2]}</span>
                )}
                {item.colaboradores && <span className="chip" style={{ background: "var(--tint)", color: "var(--marca-texto)" }}>{item.colaboradores.nome}</span>}
                {item.prazo && (
                  <span className="chip" style={{ background: vencido ? "var(--vermelho-bg, #FDEBEB)" : "var(--branco)", color: vencido ? "var(--vermelho)" : "var(--muted)", border: vencido ? "none" : "1px solid var(--linha)" }}>
                    {vencido ? "venceu " : "até "}{dataBr(item.prazo)}
                  </span>
                )}
                <span style={{ flex: 1 }}></span>
                {podeEditar && (
                  <span style={{ display: "flex", gap: 10, flex: "none" }}>
                    <i className="ti ti-pencil" title="Editar" aria-label="Editar" style={{ fontSize: 15, cursor: "pointer", color: "var(--muted)" }}
                      onClick={() => setEdit(edit && edit.id === item.id ? null : { id: item.id, titulo: item.titulo, descricao: item.descricao || "", prazo: item.prazo || "", colaborador_id: item.colaborador_id || "", criticidade: item.criticidade || "atencao" })}></i>
                    <i className="ti ti-trash" title="Excluir" aria-label="Excluir" style={{ fontSize: 15, cursor: "pointer", color: "var(--vermelho)" }} onClick={() => excluir(item)}></i>
                  </span>
                )}
              </div>
              {item.descricao && (!edit || edit.id !== item.id) && (
                <div style={{ fontSize: 12.5, color: "var(--sec)", marginTop: 4, marginLeft: 29, whiteSpace: "pre-wrap" }}>{item.descricao}</div>
              )}
              {edit && edit.id === item.id && (
                <div className="anim-pop" style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginTop: 7, marginLeft: 29 }}>
                  <input className="campo" style={{ flex: 2, minWidth: 180, padding: "7px 9px", fontSize: 12.5 }} value={edit.titulo} onChange={(e) => setEdit({ ...edit, titulo: e.target.value })} />
                  <select className="campo" style={{ flex: 1, minWidth: 150, padding: "7px 9px", fontSize: 12.5 }} value={edit.colaborador_id} onChange={(e) => setEdit({ ...edit, colaborador_id: e.target.value })}>
                    <option value="">sem colaborador</option>
                    {colabs.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.status === "desligado" ? " (desligado)" : ""}</option>)}
                  </select>
                  {ehAlerta && (
                    <select className="campo" style={{ width: 130, padding: "7px 9px", fontSize: 12.5 }} value={edit.criticidade} onChange={(e) => setEdit({ ...edit, criticidade: e.target.value })}>
                      <option value="critico">Crítico</option><option value="atencao">Atenção</option><option value="info">Informativo</option>
                    </select>
                  )}
                  <input className="campo" type="date" style={{ width: 140, padding: "7px 9px", fontSize: 12.5 }} value={edit.prazo} onChange={(e) => setEdit({ ...edit, prazo: e.target.value })} />
                  <input className="campo" style={{ flex: 2, minWidth: 180, padding: "7px 9px", fontSize: 12.5 }} placeholder="descrição" value={edit.descricao} onChange={(e) => setEdit({ ...edit, descricao: e.target.value })} />
                  <button className="btn-primaria" style={{ padding: "7px 13px", fontSize: 12 }} onClick={salvarEdit}>Salvar</button>
                  <button className="btn-contorno" style={{ padding: "7px 13px", fontSize: 12 }} onClick={() => setEdit(null)}>Cancelar</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const PEE_CADERNOS = [
  { n: 0, nome: "Marca e Promessa" },
  { n: 1, nome: "Implantação" },
  { n: 2, nome: "Operação" },
  { n: 3, nome: "Gestão" },
  { n: 4, nome: "Controle" },
  { n: 5, nome: "Formação" },
];
const PEE_CORES = ["#0B2F4E", "#1068B2", "#1E86C0", "#2AA0C0", "#56C4CF", "#82D2D9"];
const PEE_SITUACOES = {
  publicado: ["var(--verde-bg)", "var(--verde)", "Publicado"],
  elaboracao: ["var(--ambar-bg, #FFF7E6)", "var(--ambar)", "Em elaboração"],
  revisao: ["var(--azul-bg)", "var(--azul)", "Em revisão"],
};

function PaginaPee({ ctx }) {
  const podeCad = nivelAba(ctx, "pee", "cadernos") === "editar";
  const podeVenc = nivelAba(ctx, "pee", "vencimentos") === "editar";
  const [visao, setVisao] = useState("cadernos");
  const [pastas, setPastas] = useState(null);
  const [docs, setDocs] = useState([]);
  const [vencs, setVencs] = useState([]);
  const [cadAberto, setCadAberto] = useState(null);
  const [docAberto, setDocAberto] = useState(null);
  const [editDoc, setEditDoc] = useState(null);
  const [novaPasta, setNovaPasta] = useState(null);
  const [renPasta, setRenPasta] = useState(null);
  const [formVenc, setFormVenc] = useState(null);
  const [busca, setBusca] = useState("");
  const [msg, setMsg] = useState("");

  async function carregar() {
    const [rp, rd, rv] = await Promise.all([
      sb.from("pee_pastas").select("*").order("caderno").order("ordem").order("nome").limit(2000),
      sb.from("pee_docs").select("*").order("codigo", { nullsFirst: false }).order("titulo").limit(20000),
      sb.from("pee_vencimentos").select("*").order("vencimento", { nullsFirst: false }).limit(2000),
    ]);
    if (rp.error) { setMsg("Erro: " + rp.error.message + (rp.error.message.indexOf("pee_") !== -1 ? " — rode o 14_pee.sql no Supabase." : "")); return; }
    if (rd.error || rv.error) { setMsg("Erro: " + (rd.error || rv.error).message); return; }
    setMsg(""); setPastas(rp.data || []); setDocs(rd.data || []); setVencs(rv.data || []);
  }
  useEffect(() => { carregar(); }, []);

  const pastasPorCad = useMemo(() => {
    const m = {}; (pastas || []).forEach((p) => { (m[p.caderno] = m[p.caderno] || []).push(p); }); return m;
  }, [pastas]);
  const pastaPorId = useMemo(() => {
    const m = {}; (pastas || []).forEach((p) => { m[p.id] = p; }); return m;
  }, [pastas]);
  const docsPorPasta = useMemo(() => {
    const m = {}; docs.forEach((d) => { (m[d.pasta_id] = m[d.pasta_id] || []).push(d); }); return m;
  }, [docs]);

  function contagemCaderno(n) {
    const ps = pastasPorCad[n] || [];
    const nd = ps.reduce((t, p) => t + (docsPorPasta[p.id] || []).length, 0);
    return ps.length + " pasta(s) · " + nd + " documento(s)";
  }

  function sugestaoCodigo(cad) {
    let maior = 0;
    docs.forEach((d) => {
      const p = pastaPorId[d.pasta_id];
      if (!p || p.caderno !== cad) return;
      const m = /PEE-(\d)-(\d+)/.exec(d.codigo || "");
      if (m && Number(m[1]) === cad) maior = Math.max(maior, Number(m[2]));
    });
    return "PEE-" + cad + "-" + String(maior + 1).padStart(3, "0");
  }

  // ---------- pastas ----------
  async function salvarNovaPasta() {
    if (!novaPasta.nome.trim()) { setMsg("Dê o nome da pasta."); return; }
    const { error } = await sb.from("pee_pastas").insert({ caderno: novaPasta.caderno, nome: novaPasta.nome.trim() });
    if (error) { setMsg("Erro: " + error.message); return; }
    setMsg(""); setNovaPasta(null); carregar();
  }
  async function salvarRenPasta() {
    if (!renPasta.nome.trim()) { setMsg("O nome não pode ficar vazio."); return; }
    const { error } = await sb.from("pee_pastas").update({ nome: renPasta.nome.trim() }).eq("id", renPasta.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    setMsg(""); setRenPasta(null); carregar();
  }
  async function excluirPasta(p) {
    const n = (docsPorPasta[p.id] || []).length;
    if (!window.confirm('Excluir a pasta "' + p.nome + '"' + (n ? " e os " + n + " documento(s) dela" : "") + "? A exclusão fica na auditoria.")) return;
    const { error } = await sb.from("pee_pastas").delete().eq("id", p.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    setMsg(""); carregar();
  }

  // ---------- documentos ----------
  function novoDoc(p) {
    setMsg("");
    setEditDoc({ pasta_id: p.id, codigo: sugestaoCodigo(p.caderno), titulo: "", versao: "1.0", situacao: "elaboracao", texto: "" });
  }
  function editarDoc(d) {
    setMsg("");
    setEditDoc({ id: d.id, pasta_id: d.pasta_id, codigo: d.codigo || "", titulo: d.titulo, versao: d.versao || "1.0", situacao: d.situacao, texto: d.texto || "" });
  }
  async function salvarDoc() {
    if (!editDoc.titulo.trim()) { setMsg("Dê o título do documento."); return; }
    const campos = {
      pasta_id: editDoc.pasta_id,
      codigo: (editDoc.codigo || "").trim() || null,
      titulo: editDoc.titulo.trim(),
      versao: (editDoc.versao || "").trim() || "1.0",
      situacao: editDoc.situacao,
      texto: (editDoc.texto || "").trim() || null,
      atualizado_por: ctx.profile.id,
      atualizado_em: new Date().toISOString(),
    };
    let r;
    if (editDoc.id) r = await sb.from("pee_docs").update(campos).eq("id", editDoc.id).select().single();
    else r = await sb.from("pee_docs").insert(campos).select().single();
    if (r.error) { setMsg("Erro: " + r.error.message); return; }
    setMsg(""); setEditDoc(null); setDocAberto(r.data); carregar();
  }
  async function excluirDoc(d) {
    if (!window.confirm('Excluir o documento "' + d.titulo + '"? A exclusão fica na auditoria.')) return;
    const { error } = await sb.from("pee_docs").delete().eq("id", d.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    setMsg(""); setDocAberto(null); carregar();
  }

  // ---------- vencimentos ----------
  function statusVenc(v) {
    if (!v.vencimento) return ["var(--branco, #fff)", "var(--muted)", "sem data"];
    const hoje = hojeLocalISO();
    if (v.vencimento < hoje) return ["var(--vermelho-bg, #FDEBEB)", "var(--vermelho)", "venceu " + dataBr(v.vencimento)];
    const dias = Math.round((new Date(v.vencimento + "T12:00:00") - new Date(hoje + "T12:00:00")) / 86400000);
    if (dias <= 30) return ["var(--ambar-bg, #FFF7E6)", "var(--ambar)", "vence " + dataBr(v.vencimento)];
    return ["var(--verde-bg)", "var(--verde)", "até " + dataBr(v.vencimento)];
  }
  async function salvarVenc() {
    if (!formVenc.item.trim()) { setMsg("Dê o nome do item."); return; }
    const campos = {
      item: formVenc.item.trim(), orgao: (formVenc.orgao || "").trim() || null,
      vencimento: formVenc.vencimento || null, observacao: (formVenc.observacao || "").trim() || null,
    };
    const r = formVenc.id
      ? await sb.from("pee_vencimentos").update(campos).eq("id", formVenc.id)
      : await sb.from("pee_vencimentos").insert({ ...campos, criado_por: ctx.profile.id });
    if (r.error) { setMsg("Erro: " + r.error.message); return; }
    setMsg(""); setFormVenc(null); carregar();
  }
  async function excluirVenc(v) {
    if (!window.confirm('Excluir "' + v.item + '" dos vencimentos?')) return;
    const { error } = await sb.from("pee_vencimentos").delete().eq("id", v.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    carregar();
  }

  const normBusca = (t) => (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const docsFiltrados = useMemo(() => {
    const b = normBusca(busca);
    return docs.filter((d) => !b || normBusca(d.titulo).indexOf(b) !== -1 || normBusca(d.codigo).indexOf(b) !== -1)
      .slice()
      .sort((a, b2) => {
        const ca = (pastaPorId[a.pasta_id] || {}).caderno || 0;
        const cb = (pastaPorId[b2.pasta_id] || {}).caderno || 0;
        return ca - cb || (a.codigo || "zzz").localeCompare(b2.codigo || "zzz");
      });
  }, [docs, busca, pastaPorId]);

  const ChipSit = ({ s }) => {
    const c = PEE_SITUACOES[s] || PEE_SITUACOES.elaboracao;
    return <span className="chip" style={{ background: c[0], color: c[1] }}>{c[2]}</span>;
  };
  const BadgeCad = ({ n, tam }) => (
    <span style={{ width: tam || 30, height: tam || 30, borderRadius: 9, background: PEE_CORES[n], color: "#fff", fontWeight: 800, fontSize: (tam || 30) * .45, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{n}</span>
  );

  function abrirDaLista(d) {
    const p = pastaPorId[d.pasta_id];
    setVisao("cadernos"); setCadAberto(p ? p.caderno : 0); setDocAberto(d);
  }

  return (
    <div>
      {/* ---------- editor de documento ---------- */}
      {editDoc && podeCad && (
        <div className="org-modal-fundo" onClick={(e) => { if (e.target === e.currentTarget) setEditDoc(null); }}>
          <div className="org-modal anim-pop" style={{ maxWidth: 660 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{editDoc.id ? "Editar documento" : "Novo documento"}</div>
              <i className="ti ti-x" style={{ marginLeft: "auto", cursor: "pointer", color: "var(--muted)", fontSize: 17 }} onClick={() => setEditDoc(null)} aria-label="Fechar"></i>
            </div>
            {msg && <div className="anim-pop" style={{ marginBottom: 10, fontSize: 12.5, fontWeight: 600, color: "var(--vermelho)" }}>{msg}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <div style={{ width: 130 }}><label style={ROT_FICHA}>Código</label>
                  <input className="campo" style={{ width: "100%", padding: "8px 10px", fontSize: 12.5, fontFamily: "var(--mono, monospace)" }} value={editDoc.codigo} onChange={(e) => setEditDoc({ ...editDoc, codigo: e.target.value })} /></div>
                <div style={{ flex: 1, minWidth: 200 }}><label style={ROT_FICHA}>Título</label>
                  <input className="campo" style={{ width: "100%", padding: "8px 10px", fontSize: 12.5 }} value={editDoc.titulo} onChange={(e) => setEditDoc({ ...editDoc, titulo: e.target.value })} /></div>
                <div style={{ width: 80 }}><label style={ROT_FICHA}>Versão</label>
                  <input className="campo" style={{ width: "100%", padding: "8px 10px", fontSize: 12.5 }} value={editDoc.versao} onChange={(e) => setEditDoc({ ...editDoc, versao: e.target.value })} /></div>
                <div style={{ width: 150 }}><label style={ROT_FICHA}>Situação</label>
                  <select className="campo" style={{ width: "100%", padding: "8px 10px", fontSize: 12.5 }} value={editDoc.situacao} onChange={(e) => setEditDoc({ ...editDoc, situacao: e.target.value })}>
                    <option value="elaboracao">Em elaboração</option>
                    <option value="revisao">Em revisão</option>
                    <option value="publicado">Publicado</option>
                  </select></div>
              </div>
              <div><label style={ROT_FICHA}>Pasta</label>
                <select className="campo" style={{ width: "100%", padding: "8px 10px", fontSize: 12.5 }} value={editDoc.pasta_id} onChange={(e) => setEditDoc({ ...editDoc, pasta_id: e.target.value })}>
                  {(pastas || []).map((p) => <option key={p.id} value={p.id}>Caderno {p.caderno} · {p.nome}</option>)}
                </select></div>
              <div><label style={ROT_FICHA}>Texto (parágrafos separados por linha em branco)</label>
                <textarea className="campo" style={{ width: "100%", padding: "10px 12px", fontSize: 13, minHeight: 260, resize: "vertical", lineHeight: 1.6 }} value={editDoc.texto} onChange={(e) => setEditDoc({ ...editDoc, texto: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn-primaria" style={{ padding: "8px 15px", fontSize: 12.5 }} onClick={salvarDoc}>Salvar</button>
              <button className="btn-contorno" style={{ padding: "8px 15px", fontSize: 12.5 }} onClick={() => setEditDoc(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- filtros ---------- */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {[["cadernos", "Cadernos"], ["lista", "Lista mestra"], ["vencimentos", "Vencimentos"]].map(([v, r]) => (
          <span key={v} className="chip" onClick={() => { setVisao(v); setDocAberto(null); }}
            style={{ cursor: "pointer", background: visao === v ? "var(--tint)" : "var(--branco)", color: visao === v ? "var(--marca-texto)" : "var(--sec)", border: "1px solid " + (visao === v ? "var(--tint-borda)" : "var(--linha)") }}>{r}</span>
        ))}
        <span style={{ flex: 1 }}></span>
        {visao === "lista" && (
          <input className="campo" style={{ width: 240, padding: "8px 10px", fontSize: 12.5 }} placeholder="buscar por título ou código…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        )}
        {visao === "vencimentos" && podeVenc && (
          <button className="btn-contorno" style={{ padding: "8px 13px", fontSize: 12.5 }}
            onClick={() => { setMsg(""); setFormVenc(formVenc ? null : { item: "", orgao: "", vencimento: "", observacao: "" }); }}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true"></i>Novo item
          </button>
        )}
      </div>

      {msg && !editDoc && <div className="anim-pop" style={{ marginBottom: 10, fontSize: 12.5, fontWeight: 600, color: "var(--vermelho)" }}>{msg}</div>}

      {!pastas && <div className="card-fl" style={{ padding: 16, fontSize: 13, color: "var(--muted)" }}>Carregando…</div>}

      {/* ---------- CADERNOS ---------- */}
      {pastas && visao === "cadernos" && cadAberto === null && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12 }}>
          {PEE_CADERNOS.map((c) => (
            <div key={c.n} className="card-fl clicavel" onClick={() => setCadAberto(c.n)} style={{ padding: "16px 15px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <BadgeCad n={c.n} tam={42} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{c.nome}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{contagemCaderno(c.n)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pastas && visao === "cadernos" && cadAberto !== null && !docAberto && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <button className="btn-contorno" style={{ padding: "7px 12px", fontSize: 12 }} onClick={() => setCadAberto(null)}>
              <i className="ti ti-arrow-left" style={{ fontSize: 13 }} aria-hidden="true"></i>Cadernos
            </button>
            <BadgeCad n={cadAberto} />
            <span style={{ fontSize: 14.5, fontWeight: 800 }}>Caderno {cadAberto} · {PEE_CADERNOS[cadAberto].nome}</span>
            <span style={{ flex: 1 }}></span>
            {podeCad && (
              <button className="btn-contorno" style={{ padding: "8px 13px", fontSize: 12.5 }}
                onClick={() => { setMsg(""); setNovaPasta(novaPasta ? null : { caderno: cadAberto, nome: "" }); }}>
                <i className="ti ti-folder-plus" style={{ fontSize: 14 }} aria-hidden="true"></i>Nova pasta
              </button>
            )}
          </div>

          {novaPasta && podeCad && (
            <div className="card-fl anim-pop" style={{ padding: 10, marginBottom: 12, display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
              <input className="campo" style={{ flex: 1, minWidth: 200, padding: "7px 9px", fontSize: 12.5 }} placeholder="nome da pasta" value={novaPasta.nome} onChange={(e) => setNovaPasta({ ...novaPasta, nome: e.target.value })} />
              <button className="btn-primaria" style={{ padding: "7px 13px", fontSize: 12 }} onClick={salvarNovaPasta}>Criar</button>
              <button className="btn-contorno" style={{ padding: "7px 13px", fontSize: 12 }} onClick={() => setNovaPasta(null)}>Cancelar</button>
            </div>
          )}

          {(pastasPorCad[cadAberto] || []).length === 0 && (
            <div className="card-fl" style={{ padding: "30px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
              Este caderno ainda não tem pastas.{podeCad ? " Crie a primeira acima." : ""}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(pastasPorCad[cadAberto] || []).map((p) => (
              <div key={p.id} className="card-fl" style={{ overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 14px", borderBottom: "1px solid var(--linha-suave)", background: "var(--campo, #FBFCFE)" }}>
                  <i className="ti ti-folder" style={{ fontSize: 15, color: PEE_CORES[cadAberto] }} aria-hidden="true"></i>
                  {renPasta && renPasta.id === p.id ? (
                    <span style={{ display: "flex", gap: 6, flex: 1, alignItems: "center" }}>
                      <input className="campo" autoFocus style={{ flex: 1, padding: "6px 9px", fontSize: 12.5 }} value={renPasta.nome} onChange={(e) => setRenPasta({ ...renPasta, nome: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") salvarRenPasta(); if (e.key === "Escape") setRenPasta(null); }} />
                      <button className="btn-primaria" style={{ padding: "6px 11px", fontSize: 11.5 }} onClick={salvarRenPasta}>Salvar</button>
                    </span>
                  ) : (
                    <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{p.nome}</span>
                  )}
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>{(docsPorPasta[p.id] || []).length} doc(s)</span>
                  {podeCad && (!renPasta || renPasta.id !== p.id) && (
                    <span style={{ display: "flex", gap: 10 }}>
                      <i className="ti ti-file-plus" title="Novo documento" style={{ fontSize: 15, cursor: "pointer", color: "var(--muted)" }} onClick={() => novoDoc(p)}></i>
                      <i className="ti ti-pencil" title="Renomear pasta" style={{ fontSize: 15, cursor: "pointer", color: "var(--muted)" }} onClick={() => { setMsg(""); setRenPasta({ id: p.id, nome: p.nome }); }}></i>
                      <i className="ti ti-trash" title="Excluir pasta" style={{ fontSize: 15, cursor: "pointer", color: "var(--vermelho)" }} onClick={() => excluirPasta(p)}></i>
                    </span>
                  )}
                </div>
                {(docsPorPasta[p.id] || []).map((d) => (
                  <div key={d.id} className="linha-hover" onClick={() => setDocAberto(d)}
                    style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 14px", borderBottom: "1px solid var(--linha-suave)", cursor: "pointer", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--mono, monospace)", fontSize: 11.5, fontWeight: 700, color: "var(--marca-texto)", minWidth: 84 }}>{d.codigo || "—"}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, minWidth: 160 }}>{d.titulo}</span>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>v{d.versao}</span>
                    <ChipSit s={d.situacao} />
                  </div>
                ))}
                {(docsPorPasta[p.id] || []).length === 0 && (
                  <div style={{ padding: "12px 14px", fontSize: 12, color: "var(--muted)" }}>Pasta vazia.</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- LEITOR ---------- */}
      {pastas && visao === "cadernos" && cadAberto !== null && docAberto && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <button className="btn-contorno" style={{ padding: "7px 12px", fontSize: 12 }} onClick={() => setDocAberto(null)}>
              <i className="ti ti-arrow-left" style={{ fontSize: 13 }} aria-hidden="true"></i>{(pastaPorId[docAberto.pasta_id] || {}).nome || "Pasta"}
            </button>
            <span style={{ flex: 1 }}></span>
            {podeCad && (
              <span style={{ display: "flex", gap: 8 }}>
                <button className="btn-contorno" style={{ padding: "7px 12px", fontSize: 12 }} onClick={() => editarDoc(docAberto)}>
                  <i className="ti ti-pencil" style={{ fontSize: 13 }} aria-hidden="true"></i>Editar
                </button>
                <button className="btn-contorno" style={{ padding: "7px 12px", fontSize: 12, color: "var(--vermelho)" }} onClick={() => excluirDoc(docAberto)}>
                  <i className="ti ti-trash" style={{ fontSize: 13 }} aria-hidden="true"></i>Excluir
                </button>
              </span>
            )}
          </div>
          <div className="card-fl" style={{ padding: "22px 26px", maxWidth: 860 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 8 }}>
              <BadgeCad n={cadAberto} tam={26} />
              <span style={{ fontFamily: "var(--mono, monospace)", fontSize: 12, fontWeight: 700, color: "var(--marca-texto)" }}>{docAberto.codigo || "sem código"}</span>
              <span style={{ fontSize: 11.5, color: "var(--muted)" }}>v{docAberto.versao}</span>
              <ChipSit s={docAberto.situacao} />
              <span style={{ flex: 1 }}></span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>atualizado em {dataBr((docAberto.atualizado_em || docAberto.created_at || "").slice(0, 10))}</span>
            </div>
            <h2 style={{ margin: "0 0 14px", fontSize: 20, fontWeight: 800, letterSpacing: -.2 }}>{docAberto.titulo}</h2>
            {(docAberto.texto || "").trim() ? (
              (docAberto.texto || "").split(/\n\s*\n/).map((par, i) => (
                <p key={i} style={{ fontSize: 14, lineHeight: 1.75, color: "var(--ink)", margin: "0 0 12px", whiteSpace: "pre-wrap" }}>{par}</p>
              ))
            ) : (
              <div style={{ padding: "18px 0", fontSize: 13, color: "var(--muted)" }}>
                Conteúdo em elaboração — a estrutura já existe; o texto será redigido a partir do processo real do setor.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------- LISTA MESTRA ---------- */}
      {pastas && visao === "lista" && (
        <div className="card-fl" style={{ overflow: "hidden" }}>
          {docsFiltrados.length === 0 && (
            <div style={{ padding: "26px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
              {docs.length === 0 ? "Nenhum documento ainda." : "Nada com essa busca."}
            </div>
          )}
          {docsFiltrados.map((d) => {
            const cad = (pastaPorId[d.pasta_id] || {}).caderno || 0;
            return (
              <div key={d.id} className="linha-hover" onClick={() => abrirDaLista(d)}
                style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 14px", borderBottom: "1px solid var(--linha-suave)", cursor: "pointer", flexWrap: "wrap" }}>
                <BadgeCad n={cad} tam={24} />
                <span style={{ fontFamily: "var(--mono, monospace)", fontSize: 11.5, fontWeight: 700, color: "var(--marca-texto)", minWidth: 84 }}>{d.codigo || "—"}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, minWidth: 160 }}>
                  {d.titulo}
                  <span style={{ display: "block", fontSize: 10.5, color: "var(--muted)", fontWeight: 500 }}>{(pastaPorId[d.pasta_id] || {}).nome}</span>
                </span>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>v{d.versao}</span>
                <ChipSit s={d.situacao} />
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- VENCIMENTOS ---------- */}
      {pastas && visao === "vencimentos" && (
        <div>
          {formVenc && podeVenc && (
            <div className="card-fl anim-pop" style={{ padding: 10, marginBottom: 12, display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
              <input className="campo" style={{ flex: 2, minWidth: 190, padding: "7px 9px", fontSize: 12.5 }} placeholder="item (ex.: Alvará sanitário)" value={formVenc.item} onChange={(e) => setFormVenc({ ...formVenc, item: e.target.value })} />
              <input className="campo" style={{ flex: 1, minWidth: 150, padding: "7px 9px", fontSize: 12.5 }} placeholder="órgão (opcional)" value={formVenc.orgao} onChange={(e) => setFormVenc({ ...formVenc, orgao: e.target.value })} />
              <input className="campo" type="date" style={{ width: 140, padding: "7px 9px", fontSize: 12.5 }} value={formVenc.vencimento} onChange={(e) => setFormVenc({ ...formVenc, vencimento: e.target.value })} />
              <input className="campo" style={{ flex: 2, minWidth: 180, padding: "7px 9px", fontSize: 12.5 }} placeholder="observação (opcional)" value={formVenc.observacao} onChange={(e) => setFormVenc({ ...formVenc, observacao: e.target.value })} />
              <button className="btn-primaria" style={{ padding: "7px 13px", fontSize: 12 }} onClick={salvarVenc}>{formVenc.id ? "Salvar" : "Registrar"}</button>
              <button className="btn-contorno" style={{ padding: "7px 13px", fontSize: 12 }} onClick={() => setFormVenc(null)}>Cancelar</button>
            </div>
          )}
          <div className="card-fl" style={{ overflow: "hidden" }}>
            {vencs.length === 0 && (
              <div style={{ padding: "26px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>Nenhum item acompanhado ainda.</div>
            )}
            {vencs.map((v) => {
              const st = statusVenc(v);
              return (
                <div key={v.id} style={{ padding: "10px 14px", borderBottom: "1px solid var(--linha-suave)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                    <i className="ti ti-calendar-due" style={{ fontSize: 15, color: st[1] }} aria-hidden="true"></i>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{v.item}</span>
                    {v.orgao && <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{v.orgao}</span>}
                    <span className="chip" style={{ background: st[0], color: st[1] }}>{st[2]}</span>
                    <span style={{ flex: 1 }}></span>
                    {podeVenc && (
                      <span style={{ display: "flex", gap: 10 }}>
                        <i className="ti ti-pencil" title="Editar" style={{ fontSize: 15, cursor: "pointer", color: "var(--muted)" }}
                          onClick={() => { setMsg(""); setFormVenc({ id: v.id, item: v.item, orgao: v.orgao || "", vencimento: v.vencimento || "", observacao: v.observacao || "" }); }}></i>
                        <i className="ti ti-trash" title="Excluir" style={{ fontSize: 15, cursor: "pointer", color: "var(--vermelho)" }} onClick={() => excluirVenc(v)}></i>
                      </span>
                    )}
                  </div>
                  {v.observacao && <div style={{ fontSize: 12, color: "var(--sec)", marginTop: 4, marginLeft: 24 }}>{v.observacao}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const PALETA_PESSOAS = ["#BFD9F2", "#F9C6C6", "#C9EFD4", "#F6D9B0", "#E3CBF2", "#BFE9E4", "#F2C9DF", "#D6E3B8", "#F4CBB4", "#C5D2F4", "#EFE3A9", "#D9C8EE", "#B8E6F2", "#F2D3C2"];
function corPessoa(chave) {
  let h = 0;
  const s = String(chave || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETA_PESSOAS[h % PALETA_PESSOAS.length];
}
function iniciaisCroqui(nome) {
  const t = (nome || "").trim();
  return t ? t.slice(0, 2).toUpperCase() : "?";
}

const DIAS_SALAS = [[1, "Seg"], [2, "Ter"], [3, "Qua"], [4, "Qui"], [5, "Sex"], [6, "Sáb"]];
const PERIODOS_SALAS = [[1, "P1"], [2, "P2"], [3, "P3"]];
const HORA_PERIODO = { 1: "7h", 2: "12h", 3: "16h" };

function PaginaSalas({ ctx }) {
  const podeCad = nivelAba(ctx, "salas", "cadastro") === "editar";
  const podeGrade = nivelAba(ctx, "salas", "grade") === "editar";
  const [visao, setVisao] = useState("grade");
  const [salas, setSalas] = useState(null);
  const [ocupacoes, setOcupacoes] = useState([]);
  const [pessoas, setPessoas] = useState([]);
  const [unidade, setUnidade] = useState("EQ1");
  const [andar, setAndar] = useState("");
  const [msg, setMsg] = useState("");
  const [celula, setCelula] = useState(null);   // { sala, dia, periodo }
  const [novaOc, setNovaOc] = useState({ colaborador_id: "", rotulo: "", horario: "" });
  const [editSala, setEditSala] = useState(null);

  async function carregar() {
    const [rs, ro, rp] = await Promise.all([
      sb.from("salas").select("*").order("unidade").order("andar").order("numero").limit(2000),
      sb.from("salas_ocupacoes").select("*").order("periodo").order("created_at").limit(20000),
      sb.from("colaboradores_basico").select("*").order("nome").limit(20000),
    ]);
    if (rs.error) { setMsg("Erro: " + rs.error.message + (rs.error.message.indexOf("salas") !== -1 ? " — rode o 12_salas.sql no Supabase." : "")); return; }
    if (ro.error || rp.error) { setMsg("Erro: " + (ro.error || rp.error).message); return; }
    setMsg(""); setSalas(rs.data || []); setOcupacoes(ro.data || []); setPessoas(rp.data || []);
  }
  useEffect(() => { carregar(); }, []);

  const pessoaPorId = useMemo(() => {
    const m = {}; pessoas.forEach((p) => { m[p.id] = p; }); return m;
  }, [pessoas]);

  const mapa = useMemo(() => {
    const m = {};
    ocupacoes.forEach((o) => {
      const k = o.dia_semana + "-" + o.periodo;
      (m[o.sala_id] = m[o.sala_id] || {});
      (m[o.sala_id][k] = m[o.sala_id][k] || []).push(o);
    });
    return m;
  }, [ocupacoes]);

  const pesoAndar = (a) => { const n = parseInt(a || "", 10); return isNaN(n) ? 0 : n; };
  const andares = useMemo(() => {
    if (!salas) return [];
    const vistos = {};
    salas.filter((s) => s.ativa && s.unidade === unidade && s.andar).forEach((s) => { vistos[s.andar] = 1; });
    return Object.keys(vistos).sort((a, b) => pesoAndar(b) - pesoAndar(a) || a.localeCompare(b));
  }, [salas, unidade]);
  useEffect(() => {
    if (andares.length && andares.indexOf(andar) === -1) setAndar(andares[0]);
    if (!andares.length && andar) setAndar("");
  }, [andares]);

  const salasVista = useMemo(() => {
    if (!salas) return [];
    return salas
      .filter((s) => s.ativa && s.unidade === unidade && (!andar || (s.andar || "") === andar))
      .slice()
      .sort((a, b) => (parseInt(a.numero, 10) || 999) - (parseInt(b.numero, 10) || 999) || a.numero.localeCompare(b.numero));
  }, [salas, unidade, andar]);

  const livres = useMemo(() => {
    let ocupadas = 0;
    salasVista.forEach((s) => {
      DIAS_SALAS.forEach(([d]) => PERIODOS_SALAS.forEach(([p]) => {
        if (((mapa[s.id] || {})[d + "-" + p] || []).length) ocupadas++;
      }));
    });
    return salasVista.length * 18 - ocupadas;
  }, [salasVista, mapa]);

  const primeiroNome = (n) => (n || "").trim().split(/\s+/)[0];

  const legenda = useMemo(() => {
    const m = {};
    salasVista.forEach((s) => {
      const porCel = mapa[s.id] || {};
      Object.keys(porCel).forEach((k) => porCel[k].forEach((o) => {
        const pes = o.colaborador_id ? pessoaPorId[o.colaborador_id] : null;
        const nome = pes ? pes.nome : (o.rotulo || "");
        if (!nome || (!pes && o.rotulo === "Indisponível")) return;
        m[o.colaborador_id || nome] = nome;
      }));
    });
    return Object.keys(m).map((c) => ({ chave: c, nome: m[c] })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [salasVista, mapa, pessoaPorId]);

  function abrirCelula(s, d, p) {
    const ocs = ((mapa[s.id] || {})[d + "-" + p] || []);
    if (!podeGrade && !ocs.length) return;
    setMsg(""); setNovaOc({ colaborador_id: "", rotulo: "", horario: "" });
    setCelula({ sala: s, dia: d, periodo: p });
  }

  async function addOc() {
    const temPessoa = !!novaOc.colaborador_id;
    if (!temPessoa && !novaOc.rotulo.trim()) { setMsg("Escolha um profissional ou dê um rótulo."); return; }
    const ocs = ((mapa[celula.sala.id] || {})[celula.dia + "-" + celula.periodo] || []);
    if (temPessoa && ocs.some((o) => o.colaborador_id === novaOc.colaborador_id)) { setMsg("Essa pessoa já está nesta célula."); return; }
    const { error } = await sb.from("salas_ocupacoes").insert({
      sala_id: celula.sala.id, colaborador_id: novaOc.colaborador_id || null,
      rotulo: temPessoa ? null : novaOc.rotulo.trim(),
      dia_semana: celula.dia, periodo: celula.periodo,
      horario: (novaOc.horario || "").trim() || null,
      criado_por: ctx.profile.id,
    });
    if (error) { setMsg("Erro: " + error.message); return; }
    setMsg(""); setNovaOc({ colaborador_id: "", rotulo: "", horario: "" }); carregar();
  }

  async function delOc(o) {
    const nome = o.colaborador_id ? (pessoaPorId[o.colaborador_id] || {}).nome : o.rotulo;
    if (!window.confirm('Tirar "' + (nome || "esta ocupação") + '" desta célula?')) return;
    const { error } = await sb.from("salas_ocupacoes").delete().eq("id", o.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    carregar();
  }

  async function salvarSala() {
    if (!editSala.numero.trim()) { setMsg("Dê o número (ou nome) da sala."); return; }
    const campos = {
      numero: editSala.numero.trim(), unidade: editSala.unidade,
      andar: (editSala.andar || "").trim() || null,
      especialidade: (editSala.especialidade || "").trim() || null,
      cor: editSala.cor || null,
      observacoes: (editSala.observacoes || "").trim() || null,
    };
    const r = editSala.id
      ? await sb.from("salas").update(campos).eq("id", editSala.id)
      : await sb.from("salas").insert(campos);
    if (r.error) { setMsg("Erro: " + r.error.message); return; }
    setMsg(""); setEditSala(null); carregar();
  }

  async function alternarAtiva(s) {
    const { error } = await sb.from("salas").update({ ativa: !s.ativa }).eq("id", s.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    carregar();
  }

  async function excluirSala(s) {
    if (!window.confirm('Excluir a sala "' + s.numero + '"? A grade dela some junto. A exclusão fica na auditoria.')) return;
    const { error } = await sb.from("salas").delete().eq("id", s.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    carregar();
  }

  const Badge = ({ s, tam }) => (
    <span className="gs-badge" style={{ background: s.cor || "var(--tint)", color: s.cor ? "#fff" : "var(--marca-texto)", fontSize: tam || 14 }}>{s.numero}</span>
  );

  const ocsCelula = celula ? (((mapa[celula.sala.id] || {})[celula.dia + "-" + celula.periodo]) || []) : [];

  return (
    <div>
      {/* ---------- janela da celula ---------- */}
      {celula && (
        <div className="org-modal-fundo" onClick={(e) => { if (e.target === e.currentTarget) setCelula(null); }}>
          <div className="org-modal anim-pop">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Badge s={celula.sala} />
              <div style={{ fontSize: 13.5, fontWeight: 800 }}>
                {DIAS_SALAS.find(([d]) => d === celula.dia)[1]} · P{celula.periodo}
                <span style={{ fontWeight: 500, color: "var(--muted)", fontSize: 12 }}> ({HORA_PERIODO[celula.periodo]})</span>
              </div>
              <i className="ti ti-x" style={{ marginLeft: "auto", cursor: "pointer", color: "var(--muted)", fontSize: 17 }} onClick={() => setCelula(null)} aria-label="Fechar"></i>
            </div>
            {msg && <div className="anim-pop" style={{ marginBottom: 10, fontSize: 12.5, fontWeight: 600, color: "var(--vermelho)" }}>{msg}</div>}

            {ocsCelula.length === 0 && <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>Período livre.</div>}
            {ocsCelula.map((o) => {
              const p = o.colaborador_id ? pessoaPorId[o.colaborador_id] : null;
              return (
                <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 4px", borderBottom: "1px solid var(--linha-suave)" }}>
                  {p && p.foto_url
                    ? <img src={p.foto_url} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", flex: "none" }} />
                    : <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--grad)", color: "#fff", fontWeight: 700, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{iniciais(p ? p.nome : (o.rotulo || "?"))}</span>}
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p ? p.nome : o.rotulo}</span>
                    <span style={{ display: "block", fontSize: 10.5, color: "var(--muted)" }}>{o.horario || (p ? (p.cargo || "") : "")}</span>
                  </span>
                  {podeGrade && <i className="ti ti-trash" title="Tirar da célula" style={{ fontSize: 14, cursor: "pointer", color: "var(--vermelho)", flex: "none" }} onClick={() => delOc(o)}></i>}
                </div>
              );
            })}

            {podeGrade && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <div><label style={ROT_FICHA}>Profissional</label>
                  <SeletorPessoa pessoas={pessoas} valor={novaOc.colaborador_id} rotuloVazio="sem profissional (usar rótulo)"
                    aoEscolher={(v) => setNovaOc({ ...novaOc, colaborador_id: v })} /></div>
                {!novaOc.colaborador_id && (
                  <div><label style={ROT_FICHA}>Rótulo</label>
                    <input className="campo" style={{ width: "100%", padding: "8px 10px", fontSize: 12.5 }} placeholder="ex.: Reunião de equipe" value={novaOc.rotulo} onChange={(e) => setNovaOc({ ...novaOc, rotulo: e.target.value })} /></div>
                )}
                <div><label style={ROT_FICHA}>Horário (opcional)</label>
                  <input className="campo" style={{ width: "100%", padding: "8px 10px", fontSize: 12.5 }} placeholder="ex.: 7h-13h ou início 8h30" value={novaOc.horario} onChange={(e) => setNovaOc({ ...novaOc, horario: e.target.value })} /></div>
                <div><button className="btn-primaria" style={{ padding: "8px 15px", fontSize: 12.5 }} onClick={addOc}>Colocar na célula</button></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------- janela da sala (cadastro) ---------- */}
      {editSala && podeCad && (
        <div className="org-modal-fundo" onClick={(e) => { if (e.target === e.currentTarget) setEditSala(null); }}>
          <div className="org-modal anim-pop">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{editSala.id ? "Editar sala" : "Nova sala"}</div>
              <i className="ti ti-x" style={{ marginLeft: "auto", cursor: "pointer", color: "var(--muted)", fontSize: 17 }} onClick={() => setEditSala(null)} aria-label="Fechar"></i>
            </div>
            {msg && <div className="anim-pop" style={{ marginBottom: 10, fontSize: 12.5, fontWeight: 600, color: "var(--vermelho)" }}>{msg}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}><label style={ROT_FICHA}>Número / nome</label>
                  <input className="campo" style={{ width: "100%", padding: "8px 10px", fontSize: 12.5 }} value={editSala.numero} onChange={(e) => setEditSala({ ...editSala, numero: e.target.value })} /></div>
                <div style={{ width: 110 }}><label style={ROT_FICHA}>Unidade</label>
                  <select className="campo" style={{ width: "100%", padding: "8px 10px", fontSize: 12.5 }} value={editSala.unidade} onChange={(e) => setEditSala({ ...editSala, unidade: e.target.value })}>
                    <option value="EQ1">EQ1</option><option value="EQ2">EQ2</option>
                  </select></div>
              </div>
              <div><label style={ROT_FICHA}>Andar</label>
                <input className="campo" style={{ width: "100%", padding: "8px 10px", fontSize: 12.5 }} placeholder="ex.: 3º andar, Térreo" value={editSala.andar} onChange={(e) => setEditSala({ ...editSala, andar: e.target.value })} /></div>
              <div><label style={ROT_FICHA}>Especialidade</label>
                <input className="campo" style={{ width: "100%", padding: "8px 10px", fontSize: 12.5 }} placeholder="ex.: Neuropsicologia, Fono…" value={editSala.especialidade} onChange={(e) => setEditSala({ ...editSala, especialidade: e.target.value })} /></div>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <div><label style={ROT_FICHA}>Cor do cartão</label>
                  <input type="color" value={editSala.cor || "#1068B0"} onChange={(e) => setEditSala({ ...editSala, cor: e.target.value })} style={{ width: 52, height: 34, border: "1px solid var(--linha)", borderRadius: 8, padding: 2, background: "#fff", cursor: "pointer" }} /></div>
                {editSala.cor && <button className="btn-contorno" style={{ padding: "7px 11px", fontSize: 11.5 }} onClick={() => setEditSala({ ...editSala, cor: null })}>sem cor</button>}
              </div>
              <div><label style={ROT_FICHA}>Observações</label>
                <input className="campo" style={{ width: "100%", padding: "8px 10px", fontSize: 12.5 }} value={editSala.observacoes || ""} onChange={(e) => setEditSala({ ...editSala, observacoes: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 15 }}>
              <button className="btn-primaria" style={{ padding: "8px 15px", fontSize: 12.5 }} onClick={salvarSala}>{editSala.id ? "Salvar" : "Criar sala"}</button>
              <button className="btn-contorno" style={{ padding: "8px 15px", fontSize: 12.5 }} onClick={() => setEditSala(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- filtros ---------- */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {[["grade", "Grade da semana"], ["cadastro", "Salas"]].map(([v, r]) => (
          <span key={v} className="chip" onClick={() => setVisao(v)}
            style={{ cursor: "pointer", background: visao === v ? "var(--tint)" : "var(--branco)", color: visao === v ? "var(--marca-texto)" : "var(--sec)", border: "1px solid " + (visao === v ? "var(--tint-borda)" : "var(--linha)") }}>{r}</span>
        ))}
        <span style={{ width: 6 }}></span>
        {["EQ1", "EQ2"].map((u) => (
          <span key={u} className="chip" onClick={() => setUnidade(u)}
            style={{ cursor: "pointer", background: unidade === u ? "var(--teal-bg)" : "var(--branco)", color: unidade === u ? "var(--teal)" : "var(--sec)", border: "1px solid " + (unidade === u ? "var(--teal-bg)" : "var(--linha)") }}>{u}</span>
        ))}
        {visao === "grade" && andares.map((a) => (
          <span key={a} className="chip" onClick={() => setAndar(a)}
            style={{ cursor: "pointer", background: andar === a ? "var(--tint)" : "var(--branco)", color: andar === a ? "var(--marca-texto)" : "var(--sec)", border: "1px solid " + (andar === a ? "var(--tint-borda)" : "var(--linha)") }}>{a}</span>
        ))}
        <span style={{ flex: 1 }}></span>
        {visao === "grade" && salasVista.length > 0 && (
          <span style={{ fontSize: 12, color: "var(--muted)" }}>{salasVista.length} sala(s) · <b style={{ color: "var(--verde)" }}>{livres}</b> períodos livres</span>
        )}
        {visao === "grade" && (
          <span style={{ fontSize: 11, color: "var(--muted)" }}>P1 7h · P2 12h · P3 16h</span>
        )}
        {visao === "cadastro" && podeCad && (
          <button className="btn-contorno" style={{ padding: "8px 13px", fontSize: 12.5 }}
            onClick={() => { setMsg(""); setEditSala({ numero: "", unidade: unidade, andar: andar || "", especialidade: "", cor: null, observacoes: "" }); }}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true"></i>Nova sala
          </button>
        )}
      </div>

      {msg && !celula && !editSala && <div className="anim-pop" style={{ marginBottom: 10, fontSize: 12.5, fontWeight: 600, color: "var(--vermelho)" }}>{msg}</div>}

      {!salas && <div className="card-fl" style={{ padding: 16, fontSize: 13, color: "var(--muted)" }}>Carregando…</div>}

      {/* ---------- GRADE ---------- */}
      {salas && visao === "grade" && (
        salasVista.length === 0 ? (
          <div className="card-fl" style={{ padding: "30px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
            Nenhuma sala ativa em {unidade}{andar ? " · " + andar : ""}. {podeCad ? "Cadastre na visão Salas." : ""}
          </div>
        ) : (
          <div>
            {legenda.length > 0 && (
              <div className="card-fl" style={{ padding: "8px 12px", marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 9, alignItems: "center" }}>
                {legenda.map((l) => (
                  <span key={l.chave} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--sec)", fontWeight: 600 }}>
                    <span className="gs-pill" style={{ background: corPessoa(l.chave) }}>{iniciaisCroqui(l.nome)}</span>
                    {primeiroNome(l.nome)}
                  </span>
                ))}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--muted)" }}>
                  <span className="gs-pill gs-x">✕</span>indisponível
                </span>
              </div>
            )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
            {salasVista.map((s) => (
              <div key={s.id} className="card-fl" style={{ padding: "11px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                  <Badge s={s} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.especialidade || "Sala " + s.numero}</div>
                    <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{s.unidade}{s.andar ? " · " + s.andar : ""}</div>
                  </div>
                </div>
                <table className={"gs" + (podeGrade ? " pode" : "")}>
                  <thead><tr><th></th>{DIAS_SALAS.map(([d, r]) => <th key={d}>{r}</th>)}</tr></thead>
                  <tbody>
                    {PERIODOS_SALAS.map(([p, rp]) => (
                      <tr key={p}>
                        <td className="rot" title={HORA_PERIODO[p]}>{rp}</td>
                        {DIAS_SALAS.map(([d]) => {
                          const ocs = ((mapa[s.id] || {})[d + "-" + p] || []);
                          return (
                            <td key={d} className={"gs-cel" + (ocs.length ? "" : " livre")} onClick={() => abrirCelula(s, d, p)}
                              title={ocs.map((o) => (o.colaborador_id ? (pessoaPorId[o.colaborador_id] || {}).nome : o.rotulo) + (o.horario ? " (" + o.horario + ")" : "")).join(", ") || "Livre"}>
                              {ocs.map((o) => {
                                const pes = o.colaborador_id ? pessoaPorId[o.colaborador_id] : null;
                                const nome = pes ? pes.nome : (o.rotulo || "?");
                                const indisp = !pes && o.rotulo === "Indisponível";
                                return indisp
                                  ? <span key={o.id} className="gs-pill gs-x">✕</span>
                                  : <span key={o.id} className="gs-pill" style={{ background: corPessoa(o.colaborador_id || nome) }}>{iniciaisCroqui(nome)}</span>;
                              })}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          </div>
        )
      )}

      {/* ---------- CADASTRO ---------- */}
      {salas && visao === "cadastro" && (
        <div className="card-fl" style={{ overflow: "hidden" }}>
          {salas.filter((s) => s.unidade === unidade).length === 0 && (
            <div style={{ padding: "26px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>Nenhuma sala em {unidade} ainda.</div>
          )}
          {salas.filter((s) => s.unidade === unidade)
            .slice()
            .sort((a, b) => pesoAndar(b.andar) - pesoAndar(a.andar) || (parseInt(a.numero, 10) || 999) - (parseInt(b.numero, 10) || 999))
            .map((s) => (
              <div key={s.id} className="linha-hover" style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 14px", borderBottom: "1px solid var(--linha-suave)", flexWrap: "wrap", opacity: s.ativa ? 1 : .5 }}>
                <Badge s={s} tam={13} />
                <div style={{ flex: 1, minWidth: 130 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{s.especialidade || "Sala " + s.numero}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.andar || "—"}{s.observacoes ? " · " + s.observacoes : ""}</div>
                </div>
                {podeCad && (
                  <span style={{ display: "flex", gap: 10, alignItems: "center", flex: "none" }}>
                    <button type="button" className={"sw" + (s.ativa ? " on" : "")} title={s.ativa ? "Desativar" : "Ativar"} aria-label={s.ativa ? "Desativar sala" : "Ativar sala"} onClick={() => alternarAtiva(s)}></button>
                    <i className="ti ti-pencil" title="Editar" style={{ fontSize: 15, cursor: "pointer", color: "var(--muted)" }} onClick={() => { setMsg(""); setEditSala({ ...s }); }}></i>
                    <i className="ti ti-trash" title="Excluir" style={{ fontSize: 15, cursor: "pointer", color: "var(--vermelho)" }} onClick={() => excluirSala(s)}></i>
                  </span>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function PaginaRH({ ctx }) {
  const abas = [
    { id: "colaboradores", r: "Colaboradores" },
    { id: "ponto", r: "Ponto" },
    { id: "organograma", r: "Organograma" },
    { id: "faltas", r: "Faltas e atestados" },
    { id: "alertas", r: "Alertas e pendências" },
  ].filter((a) => nivelAba(ctx, "rh", a.id) !== "oculto");
  const [aba, setAbaRaw] = useState(() => {
    try {
      const v = localStorage.getItem("cg_rh_aba");
      if (v && abas.some((a) => a.id === v)) return v;
    } catch (e) {}
    return abas.length ? abas[0].id : "colaboradores";
  });
  const setAba = useCallback((v) => {
    setAbaRaw(v);
    try { localStorage.setItem("cg_rh_aba", v); } catch (e) {}
  }, []);

  return (
    <div>
      <div className="aba-linha">
        {abas.map((a) => (
          <div key={a.id} className={"aba" + (aba === a.id ? " on" : "")} onClick={() => setAba(a.id)}>{a.r}</div>
        ))}
      </div>
      {aba === "colaboradores" && <AbaColaboradores ctx={ctx} />}
      {aba === "ponto" && <AbaPonto ctx={ctx} />}
      {aba === "organograma" && <AbaOrganograma ctx={ctx} />}
      {aba === "faltas" && <AbaFaltas ctx={ctx} />}
      {aba === "alertas" && <AbaAlertas ctx={ctx} />}
      {["colaboradores", "ponto", "organograma", "faltas", "alertas"].indexOf(aba) === -1 && (
        <div className="card-fl" style={{ padding: "30px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
          Esta aba chega no próximo sprint — o banco já está pronto para ela.
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Modelos: arquivos prontos da casa
// ------------------------------------------------------------
const CORES_CATEGORIA = [
  { bg: "var(--tint)", cor: "var(--marca-texto)" },
  { bg: "var(--verde-bg)", cor: "var(--verde)" },
  { bg: "var(--roxo-bg)", cor: "var(--roxo)" },
  { bg: "var(--teal-bg)", cor: "var(--teal)" },
  { bg: "var(--rosa-bg)", cor: "var(--rosa)" },
  { bg: "var(--ambar-bg)", cor: "var(--ambar)" },
];

function PaginaModelos({ ctx }) {
  const [modelos, setModelos] = useState(null);
  const [filtro, setFiltro] = useState("");
  const [msg, setMsg] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [fNome, setFNome] = useState("");
  const [fCategoria, setFCategoria] = useState("");
  const [fDescricao, setFDescricao] = useState("");
  const [fArquivo, setFArquivo] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const podeEditar = nivelModulo(ctx, "modelos") === "editar";

  async function carregar() {
    const { data } = await sb.from("modelos").select("*, profiles(nome)").order("categoria").order("nome");
    setModelos(data || []);
  }

  useEffect(() => { carregar(); }, []);

  const categorias = useMemo(() => {
    const set = [];
    (modelos || []).forEach((m) => {
      const c = (m.categoria || "Geral").trim();
      if (set.indexOf(c) === -1) set.push(c);
    });
    return set.sort();
  }, [modelos]);

  function corCategoria(c) {
    const i = Math.max(0, categorias.indexOf((c || "Geral").trim()));
    return CORES_CATEGORIA[i % CORES_CATEGORIA.length];
  }

  const visiveis = (modelos || []).filter((m) => !filtro || (m.categoria || "Geral").trim() === filtro);

  function abrirForm(m) {
    setEditando(m || null);
    setFNome(m ? m.nome : "");
    setFCategoria(m ? (m.categoria || "") : "");
    setFDescricao(m ? (m.descricao || "") : "");
    setFArquivo(null);
    setFormAberto(true);
    setMsg("");
  }

  async function salvarModelo() {
    const nome = fNome.trim();
    if (!nome) { setMsg("Dê um nome ao modelo."); return; }
    if (!editando && !fArquivo) { setMsg("Escolha o arquivo do modelo."); return; }
    setSalvando(true);
    setMsg("");

    let caminho = editando ? editando.storage_path : null;
    if (fArquivo) {
      caminho = crypto.randomUUID() + "_" + fArquivo.name.replace(/[^\w.\-]+/g, "_");
      const up = await sb.storage.from("modelos").upload(caminho, fArquivo);
      if (up.error) { setMsg("Erro ao enviar o arquivo: " + up.error.message); setSalvando(false); return; }
    }

    const dados = { nome, categoria: fCategoria.trim() || "Geral", descricao: fDescricao.trim() || null, storage_path: caminho, atualizado_por: ctx.profile.id };
    let erro = null;
    if (editando) {
      const { error } = await sb.from("modelos").update(dados).eq("id", editando.id);
      erro = error;
      if (!error && fArquivo && editando.storage_path && editando.storage_path !== caminho) {
        await sb.storage.from("modelos").remove([editando.storage_path]);
      }
    } else {
      const { error } = await sb.from("modelos").insert(dados);
      erro = error;
      if (error && caminho) await sb.storage.from("modelos").remove([caminho]);
    }

    if (erro) { setMsg("Erro ao salvar: " + erro.message); setSalvando(false); return; }
    setSalvando(false);
    setFormAberto(false);
    carregar();
  }

  async function excluirModelo(m) {
    if (!window.confirm('Excluir o modelo "' + m.nome + '"?')) return;
    const { error } = await sb.from("modelos").delete().eq("id", m.id);
    if (error) { setMsg("Erro ao excluir: " + error.message); return; }
    if (m.storage_path) await sb.storage.from("modelos").remove([m.storage_path]);
    carregar();
  }

  async function abrirModelo(m, baixar) {
    if (!m.storage_path) { setMsg("Este modelo está sem arquivo. Edite e envie um."); return; }
    const ext = "." + m.storage_path.split(".").pop();
    const op = baixar ? { download: m.nome.replace(/[^\w.\- ]+/g, "").trim() + ext } : undefined;
    const { data, error } = await sb.storage.from("modelos").createSignedUrl(m.storage_path, 120, op);
    if (error || !data) { setMsg("Não foi possível abrir: " + (error ? error.message : "sem acesso")); return; }
    registrarEvento(baixar ? "baixar" : "visualizar", "modelos", m.nome, m.id);
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span className="chip" onClick={() => setFiltro("")} style={{ cursor: "pointer", background: !filtro ? "var(--tint)" : "var(--branco)", color: !filtro ? "var(--marca-texto)" : "var(--sec)", border: "1px solid " + (!filtro ? "var(--tint-borda)" : "var(--linha)") }}>Todos</span>
          {categorias.map((c) => {
            const cor = corCategoria(c);
            const on = filtro === c;
            return (
              <span key={c} className="chip" onClick={() => setFiltro(on ? "" : c)}
                style={{ cursor: "pointer", background: on ? cor.bg : "var(--branco)", color: on ? cor.cor : "var(--sec)", border: "1px solid " + (on ? "transparent" : "var(--linha)") }}>{c}</span>
            );
          })}
        </div>
        {podeEditar && (
          <button className="btn-primaria" style={{ padding: "9px 16px", fontSize: 12.5 }} onClick={() => (formAberto ? setFormAberto(false) : abrirForm(null))}>
            <i className="ti ti-plus" style={{ fontSize: 15 }} aria-hidden="true"></i>Novo modelo
          </button>
        )}
      </div>

      {formAberto && (
        <div className="card-fl anim-pop" style={{ padding: "13px 14px", marginBottom: 12, maxWidth: 560 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>{editando ? "Editar modelo" : "Novo modelo"}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <input className="campo" style={{ flex: 2, minWidth: 170, padding: "8px 10px", fontSize: 13 }} placeholder="Nome do modelo" value={fNome} onChange={(e) => setFNome(e.target.value)} autoFocus />
            <input className="campo" list="cats-modelos" style={{ flex: 1, minWidth: 120, padding: "8px 10px", fontSize: 13 }} placeholder="Categoria" value={fCategoria} onChange={(e) => setFCategoria(e.target.value)} />
            <datalist id="cats-modelos">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <input className="campo" style={{ padding: "8px 10px", fontSize: 13, marginBottom: 8 }} placeholder="Descrição (opcional)" value={fDescricao} onChange={(e) => setFDescricao(e.target.value)} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <label className="btn-contorno" style={{ cursor: "pointer", padding: "8px 13px", fontSize: 12.5 }}>
              <i className="ti ti-upload" style={{ fontSize: 14 }} aria-hidden="true"></i>{fArquivo ? fArquivo.name : (editando ? "Substituir arquivo (opcional)" : "Escolher arquivo")}
              <input type="file" style={{ display: "none" }} onChange={(e) => setFArquivo(e.target.files[0] || null)} />
            </label>
            <button className="btn-primaria" style={{ padding: "8px 15px", fontSize: 12.5 }} disabled={salvando} onClick={salvarModelo}>{salvando ? "Salvando…" : "Salvar"}</button>
            <button className="btn-fantasma" style={{ width: "auto", padding: "0 10px" }} onClick={() => setFormAberto(false)}>cancelar</button>
          </div>
        </div>
      )}

      {msg && <div className="anim-pop" style={{ marginBottom: 10, fontSize: 12.5, fontWeight: 600, color: "var(--vermelho)" }}>{msg}</div>}

      {!modelos && <div style={{ fontSize: 13, color: "var(--muted)" }}>Carregando…</div>}
      {modelos && visiveis.length === 0 && (
        <div className="card-fl" style={{ padding: "30px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
          {modelos.length === 0 ? "Nenhum modelo ainda." + (podeEditar ? " Comece pelo botão Novo modelo." : "") : "Nenhum modelo nesta categoria."}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 }}>
        {visiveis.map((m, i) => {
          const b = badgeTipo(m.storage_path || m.nome);
          const cc = corCategoria(m.categoria);
          return (
            <div key={m.id} className="card-fl anim-sobe" style={{ padding: "13px 14px", display: "flex", flexDirection: "column", animationDelay: (i * 35) + "ms" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
                <span className="chip" style={{ background: b.bg, color: b.cor }}>{b.r}</span>
                <span className="chip" style={{ background: cc.bg, color: cc.cor }}>{(m.categoria || "Geral").trim()}</span>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.35 }}>{m.nome}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", margin: "4px 0 10px", lineHeight: 1.5, flex: 1 }}>
                {m.descricao || ""}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 9 }}>
                atualizado {tempoRelativo(m.atualizado_em)}{m.profiles && m.profiles.nome ? " por " + primeiroNome(m.profiles.nome) : ""}
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                <button className="btn-fantasma" style={{ width: 28, height: 28 }} aria-label="Visualizar" title="Visualizar" onClick={() => abrirModelo(m, false)}>
                  <i className="ti ti-eye" style={{ fontSize: 14 }} aria-hidden="true"></i>
                </button>
                <button className="btn-primaria" style={{ padding: "6px 12px", fontSize: 12, flex: 1, justifyContent: "center" }} onClick={() => abrirModelo(m, true)}>
                  <i className="ti ti-download" style={{ fontSize: 13 }} aria-hidden="true"></i>Baixar
                </button>
                {podeEditar && (
                  <React.Fragment>
                    <button className="btn-fantasma" style={{ width: 28, height: 28 }} aria-label="Editar" title="Editar" onClick={() => abrirForm(m)}>
                      <i className="ti ti-edit" style={{ fontSize: 14 }} aria-hidden="true"></i>
                    </button>
                    <button className="btn-fantasma" style={{ width: 28, height: 28 }} aria-label="Excluir" title="Excluir" onClick={() => excluirModelo(m)}>
                      <i className="ti ti-trash" style={{ fontSize: 14 }} aria-hidden="true"></i>
                    </button>
                  </React.Fragment>
                )}
              </div>
            </div>
          );
        })}
      </div>
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
            style={{ padding: "10px 12px", borderColor: sel && sel.id === p.id ? "var(--marca)" : undefined, background: sel && sel.id === p.id ? "#F4F9FD" : undefined }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{exibirPerfil(p.nome)}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{contagem[p.id] || 0} {(contagem[p.id] || 0) === 1 ? "pessoa" : "pessoas"}</div>
            {p.acesso_total && <span className="chip" style={{ background: "var(--tint)", color: "var(--marca-texto)", marginTop: 5 }}>Acesso total</span>}
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
            <div style={{ width: 44, height: 44, borderRadius: 13, background: "var(--tint)", color: "var(--marca-texto)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
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

function gerarSenha() {
  const c = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

function AbaPessoas({ ctx, podeEditar }) {
  const [pessoas, setPessoas] = useState(null);
  const [perfis, setPerfis] = useState([]);
  const [msg, setMsg] = useState("");
  const [novo, setNovo] = useState(null);
  const [criando, setCriando] = useState(false);
  const [feito, setFeito] = useState(null);
  const [colabs, setColabs] = useState([]);
  const [vinculando, setVinculando] = useState(null);

  async function carregar() {
    const { data: ps } = await sb.from("perfis").select("id, nome, acesso_total").order("acesso_total", { ascending: false }).order("nome");
    const { data: gente } = await sb.from("profiles").select("id, nome, email, ativo, perfil_id, colaborador_id").order("nome");
    const { data: cs } = await sb.from("colaboradores").select("id, nome, cargo, setor, foto_url").order("nome").limit(2000);
    setColabs(cs || []);
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

  async function vincular(p, colabId) {
    const { error } = await sb.from("profiles").update({ colaborador_id: colabId }).eq("id", p.id);
    if (error) {
      if (error.message.indexOf("colaborador_id") !== -1) setMsg("Rode o 19_usuarios_prestadores.sql no Supabase para ativar o vínculo.");
      else if (error.message.indexOf("profiles_colaborador_unico") !== -1) setMsg("Esse prestador já está vinculado a outro acesso.");
      else setMsg("Erro: " + error.message);
      return;
    }
    setMsg(""); setVinculando(null); carregar();
  }

  async function alternarAtivo(p) {
    const { error } = await sb.from("profiles").update({ ativo: !p.ativo }).eq("id", p.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    setMsg("");
    carregar();
  }

  async function criarAcesso() {
    const email = (novo.email || "").trim().toLowerCase();
    if (!novo.nome.trim()) { setMsg("Dê o nome da pessoa."); return; }
    if (!email || email.indexOf("@") === -1) { setMsg("E-mail inválido."); return; }
    if ((novo.senha || "").length < 6) { setMsg("A senha precisa de pelo menos 6 caracteres."); return; }
    setCriando(true); setMsg("");
    const { data, error } = await sbCadastro.auth.signUp({
      email, password: novo.senha,
      options: { data: { nome: novo.nome.trim() } },
    });
    if (error) {
      setCriando(false);
      setMsg("Erro: " + (error.message.toLowerCase().indexOf("already") !== -1 ? "este e-mail já tem login." : error.message));
      return;
    }
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setCriando(false);
      setMsg("Erro: este e-mail já tem login.");
      return;
    }
    const uid = data.user && data.user.id;
    if (uid) {
      const { error: e2 } = await sb.from("profiles").update({
        nome: novo.nome.trim(), perfil_id: novo.perfil || null, ativo: true,
      }).eq("id", uid);
      if (e2) setMsg("Login criado, mas não consegui aplicar o perfil: " + e2.message);
    }
    setCriando(false);
    setFeito({ email, senha: novo.senha, pendente: !data.session });
    setNovo(null);
    carregar();
  }

  if (!pessoas) return <div style={{ fontSize: 13, color: "var(--muted)" }}>Carregando…</div>;

  return (
    <div>
      {podeEditar && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <button className="btn-contorno" style={{ padding: "8px 13px", fontSize: 12.5 }}
            onClick={() => { setFeito(null); setMsg(""); setNovo(novo ? null : { nome: "", email: "", senha: gerarSenha(), perfil: "" }); }}>
            <i className="ti ti-user-plus" style={{ fontSize: 14 }} aria-hidden="true"></i>Novo acesso
          </button>
        </div>
      )}

      {novo && podeEditar && (
        <div className="card-fl anim-pop" style={{ padding: 10, marginBottom: 12, display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
          <input className="campo" style={{ flex: 1.4, minWidth: 170, padding: "7px 9px", fontSize: 12.5 }} placeholder="nome completo" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
          <input className="campo" style={{ flex: 1.4, minWidth: 190, padding: "7px 9px", fontSize: 12.5 }} placeholder="e-mail de login" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} />
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <input className="campo" style={{ width: 128, padding: "7px 9px", fontSize: 12.5, fontFamily: "var(--mono, monospace)" }} placeholder="senha inicial" value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} />
            <i className="ti ti-refresh" title="Gerar outra senha" aria-label="Gerar outra senha" style={{ cursor: "pointer", color: "var(--muted)", fontSize: 15 }} onClick={() => setNovo({ ...novo, senha: gerarSenha() })}></i>
          </span>
          <select className="campo" style={{ width: 158, padding: "7px 9px", fontSize: 12.5 }} value={novo.perfil} onChange={(e) => setNovo({ ...novo, perfil: e.target.value })}>
            <option value="">sem perfil (depois)</option>
            {perfis.map((pf) => <option key={pf.id} value={pf.id}>{exibirPerfil(pf.nome)}</option>)}
          </select>
          <button className="btn-primaria" style={{ padding: "7px 13px", fontSize: 12 }} disabled={criando} onClick={criarAcesso}>{criando ? "Criando…" : "Criar acesso"}</button>
          <button className="btn-contorno" style={{ padding: "7px 13px", fontSize: 12 }} onClick={() => setNovo(null)}>Cancelar</button>
        </div>
      )}

      {vinculando && (
        <div className="org-modal-fundo" onClick={(e) => { if (e.target === e.currentTarget) setVinculando(null); }}>
          <div className="org-modal anim-pop" style={{ maxWidth: 540 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Vincular prestador</div>
              <i className="ti ti-x" style={{ marginLeft: "auto", cursor: "pointer", color: "var(--muted)", fontSize: 17 }} onClick={() => setVinculando(null)} aria-label="Fechar"></i>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 11 }}>
              Acesso: <b style={{ color: "var(--ink)" }}>{vinculando.nome || vinculando.email}</b>
            </div>
            <div style={{ minHeight: 340 }}>
              <SeletorPessoa pessoas={colabs} valor={vinculando.colaborador_id || null}
                aoEscolher={(id) => vincular(vinculando, id || null)}
                rotuloVazio="sem vínculo (remover)" />
            </div>
            {msg && <div className="anim-pop" style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: "var(--vermelho)" }}>{msg}</div>}
            <div style={{ marginTop: 12, textAlign: "right" }}>
              <button className="btn-contorno" style={{ padding: "8px 14px", fontSize: 12.5 }} onClick={() => setVinculando(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {feito && (
        <div className="card-fl anim-pop" style={{ padding: "12px 14px", marginBottom: 12, background: "var(--verde-bg)", borderColor: "var(--verde-bg)" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--verde)", marginBottom: 4 }}>✓ Acesso criado — anote e entregue para a pessoa:</div>
          <div style={{ fontSize: 13, fontFamily: "var(--mono, monospace)", userSelect: "all" }}>{feito.email} · senha: {feito.senha}</div>
          {feito.pendente && (
            <div style={{ fontSize: 11.5, color: "var(--ambar)", marginTop: 6, lineHeight: 1.5 }}>
              O Supabase pediu confirmação por e-mail antes do primeiro login. Para os acessos entrarem direto, desligue "Confirm email" uma única vez no painel: Authentication → Sign In / Providers → Email.
            </div>
          )}
          <div style={{ marginTop: 7 }}><button className="btn-contorno" style={{ padding: "5px 10px", fontSize: 11.5 }} onClick={() => setFeito(null)}>fechar</button></div>
        </div>
      )}

      <div className="card-fl" style={{ overflow: "hidden" }}>
        {pessoas.map((p) => {
          const euMesmo = p.id === ctx.profile.id;
          return (
            <div key={p.id} className="linha-hover" style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 14px", borderBottom: "1px solid var(--linha-suave)", flexWrap: "wrap" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: p.ativo ? "var(--grad)" : "#C3CCD6", color: "#fff", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{iniciais(p.nome)}</div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.nome || "(sem nome)"}{euMesmo && <span style={{ fontWeight: 400, color: "var(--muted)" }}> · você</span>}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{p.email}</div>
              </div>
              {(() => {
                const cv = p.colaborador_id ? colabs.find((c) => c.id === p.colaborador_id) : null;
                const miniV = { width: 20, height: 20, borderRadius: "50%", background: "var(--grad)", color: "#fff", fontWeight: 700, fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" };
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "none", maxWidth: 250 }}>
                    {cv ? (
                      <span className="chip" title={cv.nome + (podeEditar ? " — clique para trocar" : "")}
                        onClick={() => { if (podeEditar) { setMsg(""); setVinculando(p); } }}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--tint)", color: "var(--marca-texto)", cursor: podeEditar ? "pointer" : "default", maxWidth: 210, padding: "4px 9px" }}>
                        {cv.foto_url ? <img src={cv.foto_url} alt="" style={{ ...miniV, objectFit: "cover" }} /> : <span style={miniV}>{iniciais(cv.nome)}</span>}
                        <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cv.nome}</span>
                      </span>
                    ) : (
                      podeEditar
                        ? <button className="btn-contorno" style={{ padding: "6px 11px", fontSize: 11.5 }} onClick={() => { setMsg(""); setVinculando(p); }}>
                            <i className="ti ti-link" style={{ fontSize: 13 }} aria-hidden="true"></i>vincular prestador
                          </button>
                        : <span style={{ fontSize: 11, color: "var(--muted)" }}>sem vínculo</span>
                    )}
                    {cv && podeEditar && (
                      <i className="ti ti-x" title="Desvincular prestador" style={{ fontSize: 14, color: "var(--muted)", cursor: "pointer", flex: "none" }} onClick={() => vincular(p, null)}></i>
                    )}
                  </div>
                );
              })()}
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
        Crie os acessos aqui mesmo: a pessoa entra na hora com o e-mail e a senha que você definir, já no perfil escolhido. Vincule cada acesso ao prestador correspondente — é isso que liga o login ao card: a pessoa passa a editar a própria foto e os próprios dados em "Minha conta".
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
    const { error } = await sb.from("cortex_links").insert({ nome: "Novo CORTEX", descricao: "", url: "", cor: "#1068B0", ordem: maior + 1 });
    if (error) { setMsg("Erro: " + error.message); return; }
    carregar();
  }

  if (!links) return <div style={{ fontSize: 13, color: "var(--muted)" }}>Carregando…</div>;

  return (
    <div>
      {links.map((l) => (
        <div key={l.id} className="card-fl" style={{ padding: "11px 13px", marginBottom: 10, display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          <input type="color" value={l.cor || "#1068B0"} disabled={!podeEditar}
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

const ROT_FICHA = { display: "block", fontSize: 10.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: .6, marginBottom: 4 };
function CampoFicha({ r, filho, largo }) {
  return <div style={{ gridColumn: largo ? "1 / -1" : "auto" }}><label style={ROT_FICHA}>{r}</label>{filho}</div>;
}

// ------------------------------------------------------------
// Recorte de foto: pop-up para enquadrar antes de enviar
// ------------------------------------------------------------
function RecorteFoto({ arquivo, aoUsar, aoCancelar }) {
  const VP = 300;
  const [img, setImg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [ocupado, setOcupado] = useState(false);
  const arrasto = useRef(null);

  useEffect(() => {
    const url = URL.createObjectURL(arquivo);
    const i = new Image();
    i.onload = () => { setImg(i); setZoom(1); setPos({ x: 0, y: 0 }); };
    i.onerror = () => aoCancelar();
    i.src = url;
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  function geo(z) {
    const base = Math.max(VP / img.width, VP / img.height);
    const esc = base * z;
    return { w: img.width * esc, h: img.height * esc };
  }
  function prender(p, z) {
    const { w, h } = geo(z);
    const mx = Math.max(0, (w - VP) / 2), my = Math.max(0, (h - VP) / 2);
    return { x: Math.min(mx, Math.max(-mx, p.x)), y: Math.min(my, Math.max(-my, p.y)) };
  }
  function baixou(e) {
    arrasto.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function moveu(e) {
    if (!arrasto.current || !img) return;
    const a = arrasto.current;
    setPos(prender({ x: a.px + (e.clientX - a.x), y: a.py + (e.clientY - a.y) }, zoom));
  }
  function soltou() { arrasto.current = null; }
  function mudarZoom(v) {
    const z = Number(v);
    setZoom(z);
    setPos((p) => prender(p, z));
  }
  function confirmar() {
    if (!img || ocupado) return;
    setOcupado(true);
    const S = 512, cv = document.createElement("canvas");
    cv.width = S; cv.height = S;
    const g = cv.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, S, S);
    const { w, h } = geo(zoom);
    const f = S / VP;
    g.drawImage(img, ((VP - w) / 2 + pos.x) * f, ((VP - h) / 2 + pos.y) * f, w * f, h * f);
    cv.toBlob((b) => { if (b) aoUsar(b); else setOcupado(false); }, "image/jpeg", .9);
  }

  const g0 = img ? geo(zoom) : { w: 0, h: 0 };
  return (
    <div className="org-modal-fundo" onClick={(e) => { if (e.target === e.currentTarget && !ocupado) aoCancelar(); }}>
      <div className="org-modal anim-pop" style={{ maxWidth: 356, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Enquadrar a foto</div>
          <i className="ti ti-x" style={{ marginLeft: "auto", cursor: "pointer", color: "var(--muted)", fontSize: 17 }} onClick={aoCancelar} aria-label="Fechar"></i>
        </div>
        <div
          onPointerDown={baixou} onPointerMove={moveu} onPointerUp={soltou} onPointerCancel={soltou}
          style={{ width: VP, height: VP, margin: "0 auto", position: "relative", overflow: "hidden", borderRadius: 16, background: "#EEF2F6", cursor: "grab", touchAction: "none", userSelect: "none" }}>
          {img && (
            <img src={img.src} alt="" draggable={false}
              style={{ position: "absolute", left: (VP - g0.w) / 2 + pos.x, top: (VP - g0.h) / 2 + pos.y, width: g0.w, height: g0.h, maxWidth: "none", pointerEvents: "none" }} />
          )}
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", boxShadow: "0 0 0 400px rgba(247, 250, 253, .78)", pointerEvents: "none" }}></div>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(16, 104, 176, .55)", pointerEvents: "none" }}></div>
          {!img && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, color: "var(--muted)" }}>Carregando…</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "13px 2px 0" }}>
          <i className="ti ti-photo" style={{ fontSize: 13, color: "var(--muted)" }} aria-hidden="true"></i>
          <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => mudarZoom(e.target.value)} style={{ flex: 1, accentColor: "var(--azul, #1068B0)" }} aria-label="Aproximar" />
          <i className="ti ti-photo" style={{ fontSize: 18, color: "var(--muted)" }} aria-hidden="true"></i>
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 6 }}>Arraste a foto para posicionar · use a barra para aproximar</div>
        <div style={{ display: "flex", gap: 8, marginTop: 13 }}>
          <button className="btn-primaria" style={{ flex: 1, padding: "9px 0", fontSize: 12.5 }} disabled={!img || ocupado} onClick={confirmar}>{ocupado ? "Preparando…" : "Usar foto"}</button>
          <button className="btn-contorno" style={{ padding: "9px 15px", fontSize: 12.5 }} disabled={ocupado} onClick={aoCancelar}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Minha conta: o proprio card, editavel por quem esta logado
// ------------------------------------------------------------
function PaginaMinhaConta({ ctx }) {
  const [card, setCard] = useState(undefined);
  const [form, setForm] = useState(null);
  const [fotoBruta, setFotoBruta] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [enviandoMinhaFoto, setEnviandoMinhaFoto] = useState(false);
  const [msg, setMsg] = useState("");

  async function carregar() {
    const { data, error } = await sb.rpc("meu_card");
    if (error) {
      setMsg(error.message.indexOf("meu_card") !== -1 ? "Rode o 19_usuarios_prestadores.sql no Supabase para ativar esta página." : "Erro: " + error.message);
      setCard(null);
      return;
    }
    const c = data && data[0];
    setCard(c || null);
    if (c) setForm({
      telefone: c.telefone || "", email: c.email || "", nascimento: c.nascimento || "",
      formacao: c.formacao || "", registro_profissional: c.registro_profissional || "",
    });
  }
  useEffect(() => { carregar(); }, []);

  async function salvar() {
    setSalvando(true); setMsg("");
    const { error } = await sb.rpc("meu_card_atualizar", { dados: form });
    setSalvando(false);
    if (error) { setMsg("Erro: " + error.message); return; }
    setMsg("✓ Salvo. Seu card já aparece atualizado no organograma.");
    registrarEvento("update", "rh", "meu_card", card.colaborador_id, {});
    carregar();
  }

  async function usarFoto(blob) {
    setFotoBruta(null); setEnviandoMinhaFoto(true); setMsg("");
    try {
      const caminho = card.colaborador_id + "-" + Date.now() + ".jpg";
      const up = await sb.storage.from("fotos").upload(caminho, blob, { contentType: "image/jpeg", upsert: true });
      if (up.error) throw up.error;
      const url = sb.storage.from("fotos").getPublicUrl(caminho).data.publicUrl;
      const { error } = await sb.rpc("meu_card_atualizar", { dados: { foto_url: url } });
      if (error) throw error;
      setMsg("✓ Foto atualizada.");
      carregar();
    } catch (e2) { setMsg("Erro na foto: " + e2.message); }
    setEnviandoMinhaFoto(false);
  }

  const cx = { width: "100%", padding: "8px 10px", fontSize: 12.5 };

  if (card === undefined) return <div className="card-fl" style={{ padding: 16, fontSize: 13, color: "var(--muted)" }}>Carregando…</div>;

  if (card === null) return (
    <div className="card-fl" style={{ maxWidth: 560, padding: "26px 24px" }}>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Seu login ainda não está ligado a um prestador</div>
      <div style={{ fontSize: 13, color: "var(--sec)", lineHeight: 1.65 }}>
        Quando a Direção vincular o seu acesso ao seu cadastro (em Configurações → Pessoas), esta página vira o seu card:
        você mesmo atualiza a sua foto, telefone, e-mail, formação e registro profissional — e tudo aparece na hora no organograma.
      </div>
      {msg && <div className="anim-pop" style={{ marginTop: 12, fontSize: 12.5, fontWeight: 600, color: "var(--vermelho)" }}>{msg}</div>}
    </div>
  );

  return (
    <div style={{ maxWidth: 620 }}>
      {fotoBruta && <RecorteFoto arquivo={fotoBruta} aoCancelar={() => setFotoBruta(null)} aoUsar={usarFoto} />}

      <div className="card-fl" style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ position: "relative", flex: "none" }}>
            {card.foto_url
              ? <img src={card.foto_url} alt="" style={{ width: 92, height: 92, borderRadius: "50%", objectFit: "cover", boxShadow: "0 0 0 3px #fff, 0 0 0 6px var(--tint-borda)" }} />
              : <div style={{ width: 92, height: 92, borderRadius: "50%", background: "var(--grad)", color: "#fff", fontWeight: 700, fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>{iniciais(card.nome)}</div>}
            <label title="Trocar foto" style={{ position: "absolute", right: -2, bottom: -2, width: 30, height: 30, borderRadius: "50%", background: "var(--marca-texto)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(11, 47, 78, .35)" }}>
              <i className={"ti " + (enviandoMinhaFoto ? "ti-loader-2" : "ti-camera")} style={{ fontSize: 15 }} aria-hidden="true"></i>
              <input type="file" accept="image/*" style={{ display: "none" }} disabled={enviandoMinhaFoto}
                onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) { setMsg(""); setFotoBruta(f); } }} />
            </label>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 17, fontWeight: 800, textTransform: "uppercase", letterSpacing: .3 }}>{card.nome}</div>
            <div style={{ fontSize: 13, color: "var(--sec)", marginTop: 2 }}>{card.cargo || "—"}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
              {card.setor && <span className="chip" style={{ background: "var(--tint)", color: "var(--marca-texto)" }}>{card.setor}</span>}
              {card.unidade && <span className="chip" style={{ background: "var(--branco)", border: "1px solid var(--linha)", color: "var(--sec)" }}>{card.unidade}</span>}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          <div><label style={ROT_FICHA}>Telefone</label>
            <input className="campo" style={cx} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
          <div><label style={ROT_FICHA}>E-mail de contato</label>
            <input className="campo" style={cx} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label style={ROT_FICHA}>Aniversário</label>
            <input className="campo" type="date" style={cx} value={form.nascimento} onChange={(e) => setForm({ ...form, nascimento: e.target.value })} /></div>
          <div><label style={ROT_FICHA}>Registro profissional</label>
            <input className="campo" style={cx} placeholder="CRP, CRM, CREFONO…" value={form.registro_profissional} onChange={(e) => setForm({ ...form, registro_profissional: e.target.value })} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={ROT_FICHA}>Formação</label>
            <input className="campo" style={cx} placeholder="graduação, especializações…" value={form.formacao} onChange={(e) => setForm({ ...form, formacao: e.target.value })} /></div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 15 }}>
          <button className="btn-primaria" style={{ padding: "9px 17px", fontSize: 12.5 }} disabled={salvando} onClick={salvar}>{salvando ? "Salvando…" : "Salvar"}</button>
          {msg && <span className="anim-pop" style={{ fontSize: 12.5, fontWeight: 600, color: msg.indexOf("✓") === 0 ? "var(--verde)" : "var(--vermelho)" }}>{msg}</span>}
        </div>
        <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 12, lineHeight: 1.6 }}>
          Estes dados alimentam o seu card no organograma e o seu dossiê. Cargo, setor e os dados de RH continuam com a Direção.
        </p>
      </div>
    </div>
  );
}

async function reduzirFoto(arq, max) {
  try {
    const img = await createImageBitmap(arq);
    const esc = Math.min(1, (max || 512) / Math.max(img.width, img.height));
    const cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.round(img.width * esc));
    cv.height = Math.max(1, Math.round(img.height * esc));
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    return await new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("conversão falhou"))), "image/jpeg", 0.85));
  } catch (e) { return arq; }
}

function AbaFichas({ ctx, podeEditar }) {
  const [lista, setLista] = useState(null);
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState(null);
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const ro = !podeEditar;

  async function carregar() {
    const { data, error } = await sb.from("colaboradores").select("*").order("nome").limit(20000);
    if (error) { setMsg("Erro: " + error.message); return; }
    setLista(data || []);
  }
  useEffect(() => { carregar(); }, []);

  const filtrada = (lista || []).filter((c) => c.nome.toLowerCase().indexOf(busca.toLowerCase()) !== -1);
  const vz = (t) => (t || "").trim() || null;

  function abrir(c) { setSel({ ...c }); setMsg(""); }

  async function salvar() {
    if (!sel.nome || !sel.nome.trim()) { setMsg("O nome é obrigatório."); return; }
    setSalvando(true);
    const { error } = await sb.from("colaboradores").update({
      nome: sel.nome.trim(), status: sel.status,
      cargo: vz(sel.cargo), setor: vz(sel.setor), unidade: vz(sel.unidade), regime: vz(sel.regime),
      cpf: vz(sel.cpf), telefone: vz(sel.telefone), email: vz(sel.email),
      admissao: sel.admissao || null, nascimento: sel.nascimento || null,
      formacao: vz(sel.formacao), registro_profissional: vz(sel.registro_profissional),
      salario: sel.salario === "" || sel.salario === null || sel.salario === undefined ? null : sel.salario,
      observacoes: vz(sel.observacoes),
    }).eq("id", sel.id);
    setSalvando(false);
    if (error) { setMsg("Erro: " + error.message + (error.message.indexOf("formacao") !== -1 ? " — rode o 10_ficha_profissional.sql." : "")); return; }
    setMsg("✓ Ficha salva."); carregar();
  }

  const [fotoBruta, setFotoBruta] = useState(null);

  function trocarFoto(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f || !sel) return;
    setMsg("");
    setFotoBruta(f);
  }

  async function enviarFotoRecortada(blob) {
    setFotoBruta(null);
    setEnviandoFoto(true); setMsg("");
    try {
      const caminho = sel.id + "-" + Date.now() + ".jpg";
      const up = await sb.storage.from("fotos").upload(caminho, blob, { contentType: "image/jpeg", upsert: true });
      if (up.error) throw up.error;
      const pub = sb.storage.from("fotos").getPublicUrl(caminho);
      const url = pub.data.publicUrl;
      const { error } = await sb.from("colaboradores").update({ foto_url: url }).eq("id", sel.id);
      if (error) throw error;
      setSel((s) => ({ ...s, foto_url: url }));
      setMsg("✓ Foto atualizada."); carregar();
    } catch (e2) { setMsg("Erro na foto: " + e2.message + " — o 10_ficha_profissional.sql já rodou?"); }
    setEnviandoFoto(false);
  }

  const cx = { width: "100%", padding: "8px 10px", fontSize: 12.5 };

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
      {fotoBruta && <RecorteFoto arquivo={fotoBruta} aoCancelar={() => setFotoBruta(null)} aoUsar={enviarFotoRecortada} />}
      <div className="card-fl" style={{ width: 270, flex: "none", overflow: "hidden" }}>
        <div style={{ padding: 10, borderBottom: "1px solid var(--linha-suave)" }}>
          <input className="campo" style={cx} placeholder="buscar pelo nome…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div style={{ maxHeight: 520, overflowY: "auto" }}>
          {!lista && <div style={{ padding: 14, fontSize: 12.5, color: "var(--muted)" }}>Carregando…</div>}
          {lista && filtrada.length === 0 && <div style={{ padding: 14, fontSize: 12.5, color: "var(--muted)" }}>Ninguém com esse nome.</div>}
          {filtrada.map((c) => (
            <div key={c.id} className="linha-hover" onClick={() => abrir(c)}
              style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 11px", cursor: "pointer", borderBottom: "1px solid var(--linha-suave)", background: sel && sel.id === c.id ? "var(--tint)" : "transparent", opacity: c.status === "desligado" ? .55 : 1 }}>
              {c.foto_url
                ? <img src={c.foto_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flex: "none" }} />
                : <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--grad)", color: "#fff", fontWeight: 700, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{iniciais(c.nome)}</div>}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome}</div>
                <div style={{ fontSize: 10.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.cargo || "—"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card-fl" style={{ flex: 1, minWidth: 320, padding: 16 }}>
        {!sel ? (
          <div style={{ padding: "40px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
            Escolha alguém na lista ao lado para abrir a ficha.
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
              {sel.foto_url
                ? <img src={sel.foto_url} alt="" style={{ width: 76, height: 76, borderRadius: "50%", objectFit: "cover", boxShadow: "0 0 0 2.5px #fff, 0 0 0 5px var(--tint-borda)" }} />
                : <div style={{ width: 76, height: 76, borderRadius: "50%", background: "var(--grad)", color: "#fff", fontWeight: 700, fontSize: 21, display: "flex", alignItems: "center", justifyContent: "center" }}>{iniciais(sel.nome)}</div>}
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 15, fontWeight: 800, textTransform: "uppercase", letterSpacing: .3 }}>{sel.nome}</div>
                <div style={{ fontSize: 12.5, color: "var(--sec)" }}>{sel.cargo || "—"}{sel.setor ? " · " + sel.setor : ""}</div>
              </div>
              {podeEditar && (
                <label className="btn-contorno" style={{ padding: "8px 13px", fontSize: 12.5, cursor: "pointer" }}>
                  <i className="ti ti-camera" style={{ fontSize: 14 }} aria-hidden="true"></i>{enviandoFoto ? "Enviando…" : "Trocar foto"}
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={trocarFoto} disabled={enviandoFoto} />
                </label>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 11 }}>
              <CampoFicha r="Nome completo" largo filho={<input className="campo" style={cx} disabled={ro} value={sel.nome || ""} onChange={(e) => setSel({ ...sel, nome: e.target.value })} />} />
              <CampoFicha r="Status" filho={
                <select className="campo" style={cx} disabled={ro} value={sel.status} onChange={(e) => setSel({ ...sel, status: e.target.value })}>
                  <option value="ativo">Ativo</option><option value="ferias">Férias</option>
                  <option value="afastado">Afastado</option><option value="desligado">Desligado</option>
                </select>} />
              <CampoFicha r="Cargo" filho={<input className="campo" style={cx} disabled={ro} value={sel.cargo || ""} onChange={(e) => setSel({ ...sel, cargo: e.target.value })} />} />
              <CampoFicha r="Setor" filho={<input className="campo" style={cx} disabled={ro} value={sel.setor || ""} onChange={(e) => setSel({ ...sel, setor: e.target.value })} />} />
              <CampoFicha r="Unidade" filho={<input className="campo" style={cx} disabled={ro} placeholder="EQ1 / EQ2" value={sel.unidade || ""} onChange={(e) => setSel({ ...sel, unidade: e.target.value })} />} />
              <CampoFicha r="Regime" filho={<input className="campo" style={cx} disabled={ro} placeholder="CLT / PJ / Estágio" value={sel.regime || ""} onChange={(e) => setSel({ ...sel, regime: e.target.value })} />} />
              <CampoFicha r="Admissão" filho={<input className="campo" type="date" style={cx} disabled={ro} value={sel.admissao || ""} onChange={(e) => setSel({ ...sel, admissao: e.target.value })} />} />
              <CampoFicha r="Nascimento" filho={<input className="campo" type="date" style={cx} disabled={ro} value={sel.nascimento || ""} onChange={(e) => setSel({ ...sel, nascimento: e.target.value })} />} />
              <CampoFicha r="CPF" filho={<input className="campo" style={cx} disabled={ro} value={sel.cpf || ""} onChange={(e) => setSel({ ...sel, cpf: e.target.value })} />} />
              <CampoFicha r="Telefone" filho={<input className="campo" style={cx} disabled={ro} value={sel.telefone || ""} onChange={(e) => setSel({ ...sel, telefone: e.target.value })} />} />
              <CampoFicha r="E-mail" largo filho={<input className="campo" style={cx} disabled={ro} value={sel.email || ""} onChange={(e) => setSel({ ...sel, email: e.target.value })} />} />
              <CampoFicha r="Formação" largo filho={<input className="campo" style={cx} disabled={ro} placeholder="ex.: Psicologia — UFU, especialização em neuropsicologia" value={sel.formacao || ""} onChange={(e) => setSel({ ...sel, formacao: e.target.value })} />} />
              <CampoFicha r="Registro profissional" filho={<input className="campo" style={cx} disabled={ro} placeholder="CRP / CRM / CREFITO…" value={sel.registro_profissional || ""} onChange={(e) => setSel({ ...sel, registro_profissional: e.target.value })} />} />
              <CampoFicha r="Salário (R$)" filho={<input className="campo" type="number" step="0.01" style={cx} disabled={ro} value={sel.salario === null || sel.salario === undefined ? "" : sel.salario} onChange={(e) => setSel({ ...sel, salario: e.target.value })} />} />
              <CampoFicha r="Observações" largo filho={<textarea className="campo" style={{ ...cx, minHeight: 70, resize: "vertical" }} disabled={ro} value={sel.observacoes || ""} onChange={(e) => setSel({ ...sel, observacoes: e.target.value })} />} />
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 14 }}>
              {podeEditar && <button className="btn-primaria" style={{ padding: "9px 16px", fontSize: 12.5 }} disabled={salvando} onClick={salvar}>{salvando ? "Salvando…" : "Salvar ficha"}</button>}
              {msg && <span className="anim-pop" style={{ fontSize: 12.5, fontWeight: 600, color: msg.indexOf("Erro") === 0 ? "var(--vermelho)" : "var(--verde)" }}>{msg}</span>}
            </div>
          </div>
        )}
      </div>
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
        <div className={"aba" + (aba === "fichas" ? " on" : "")} onClick={() => setAba("fichas")}>Fichas da equipe</div>
        <div className={"aba" + (aba === "links" ? " on" : "")} onClick={() => setAba("links")}>Outros CORTEX</div>
      </div>
      {aba === "perfis" && <AbaPerfis ctx={ctx} podeEditar={podeEditar} />}
      {aba === "pessoas" && <AbaPessoas ctx={ctx} podeEditar={podeEditar} />}
      {aba === "fichas" && <AbaFichas ctx={ctx} podeEditar={podeEditar} />}
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
  const [meuCard, setMeuCard] = useState(null);
  useEffect(() => {
    if (!sb) return;
    sb.rpc("meu_card").then(({ data }) => { if (data && data[0]) setMeuCard(data[0]); }).catch(() => {});
  }, []);
  const [pagina, setPaginaRaw] = useState(() => {
    try {
      const v = localStorage.getItem("cg_pagina");
      if (v && MODULOS.some((m) => m.id === v) && nivelModulo(ctx, v) !== "oculto") return v;
    } catch (e) {}
    return "painel";
  });
  const setPagina = useCallback((v) => {
    setPaginaRaw(v);
    try { localStorage.setItem("cg_pagina", v); } catch (e) {}
  }, []);
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
  } else if (pagina === "arquivos") {
    conteudo = <PaginaArquivos ctx={ctx} />;
  } else if (pagina === "modelos") {
    conteudo = <PaginaModelos ctx={ctx} />;
  } else if (pagina === "rh") {
    conteudo = <PaginaRH ctx={ctx} />;
  } else if (pagina === "conta") {
    conteudo = <PaginaMinhaConta ctx={ctx} />;
  } else if (pagina === "pee") {
    conteudo = <PaginaPee ctx={ctx} />;
  } else if (pagina === "salas") {
    conteudo = <PaginaSalas ctx={ctx} />;
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
      <Sidebar meuCard={meuCard} ctx={ctx} pagina={pagina} setPagina={setPagina} estado={sbEstado} setEstado={setSbEstado} aoSair={aoSair} />
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
  const usuarioAtual = useRef(null);

  const carregarContexto = useCallback(async (userId) => {
    usuarioAtual.current = userId;
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
        // O Supabase reemite SIGNED_IN quando a aba volta ao foco (renovacao
        // de token). Se for a mesma pessoa, nao ha nada a fazer: o sistema
        // continua exatamente onde estava.
        if (usuarioAtual.current === sessao.user.id) return;
        setFase("carregando");
        carregarContexto(sessao.user.id);
      }
      if (evento === "SIGNED_OUT") {
        usuarioAtual.current = null;
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
