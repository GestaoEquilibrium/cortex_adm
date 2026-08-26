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
  { id: "relatorios",    rotulo: "Relatórios",     icone: "ti-chart-bar",        cor: "var(--verde)",         fundo: "var(--verde-bg)" },
  { id: "infinity",      rotulo: "Infinity",       icone: "ti-coin",             cor: "var(--ambar)",         fundo: "#FFF7E6" },
  { id: "demandas",      rotulo: "Demandas",       icone: "ti-checklist",        cor: "#7C3AED",              fundo: "#F3E8FF" },
  { id: "callcenter",    rotulo: "Call Center",    icone: "ti-headset",          cor: "#0E7490",              fundo: "#E0F7FA" },
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
  const [celAberta, setCelAberta] = useState(false);
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

      <button className="botao-celular so-celular" aria-label="Abrir menu" onClick={() => setCelAberta(true)}>
        <i className="ti ti-menu-2" style={{ fontSize: 20 }} aria-hidden="true"></i>
      </button>
      {celAberta && <div className="pano-celular so-celular" onClick={() => setCelAberta(false)}></div>}

      <aside className={"sb" + (estado === "rail" ? " rail" : "") + (estado === "oculta" ? " oculta" : "") + (celAberta ? " aberta-cel" : "")}
             onClick={() => { if (window.innerWidth <= 820) setCelAberta(false); }}>
        <div className="logo-area" style={{ display: "flex", alignItems: "center", gap: 9, padding: "2px 8px 10px", minHeight: 34 }}>
          <Asterisco tam={20} />
          <span className="rotulo" style={{ fontWeight: 700, fontSize: 15.5 }}>CORTEX <span style={{ color: "var(--marca-escuro)" }}>Gestão</span></span>
        </div>

        <div className="controles-sb" style={{ display: "flex", gap: 6, padding: "0 6px 10px", flexWrap: "wrap" }}>
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
        <div className="rotulo" style={{ textAlign: "center", fontSize: 10, color: "var(--muted)", opacity: .65, padding: "5px 0 1px" }}>v61</div>
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
  const [previa, setPrevia] = useState(null);
  const [renomear, setRenomear] = useState(null);
  const [mover, setMover] = useState(null);
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

  function verArquivo(a) {
    registrarEvento("visualizar", "arquivos", a.nome, a.id);
    setPrevia(a);
  }

  function abrirRenomear(a) { setMsg(""); setRenomear({ a, nome: a.nome }); }

  async function salvarRenomear() {
    const alvo = renomear;
    if (!alvo) return;
    let nome = alvo.nome.trim();
    if (!nome) { setMsg("O nome não pode ficar vazio."); return; }
    const extOrig = (alvo.a.nome.match(/\.[A-Za-z0-9]{1,8}$/) || [""])[0];
    if (extOrig && nome.toLowerCase().slice(-extOrig.length) !== extOrig.toLowerCase()) nome += extOrig;
    const { error } = await sb.from("arquivos").update({ nome }).eq("id", alvo.a.id);
    if (error) { setMsg("Erro ao renomear: " + error.message); return; }
    registrarEvento("renomear", "arquivos", alvo.a.nome + " → " + nome, alvo.a.id);
    setRenomear(null); carregar();
  }

  async function abrirMover(a) {
    setMsg("");
    setMover({ a, pastas: null });
    const { data, error } = await sb.from("pastas").select("id, nome, pasta_pai_id").order("nome").limit(2000);
    if (error) { setMsg("Erro ao listar pastas: " + error.message); setMover(null); return; }
    const porId = {};
    (data || []).forEach((pp) => { porId[pp.id] = pp; });
    function caminho(pp) {
      const partes = [pp.nome];
      let pai = pp.pasta_pai_id, guarda = 0;
      while (pai && porId[pai] && guarda < 8) { partes.unshift(porId[pai].nome); pai = porId[pai].pasta_pai_id; guarda++; }
      return partes.join(" / ");
    }
    const lista = (data || []).map((pp) => ({ id: pp.id, rotulo: caminho(pp) }))
      .sort((x, y) => x.rotulo.localeCompare(y.rotulo));
    setMover({ a, pastas: lista });
  }

  async function moverPara(pastaId) {
    const alvo = mover;
    if (!alvo || !pastaId) return;
    const { error } = await sb.from("arquivos").update({ pasta_id: pastaId }).eq("id", alvo.a.id);
    if (error) { setMsg("Não deu para mover: " + error.message); return; }
    registrarEvento("mover", "arquivos", alvo.a.nome, alvo.a.id);
    setMover(null); carregar();
  }

  async function abrirArquivo(a, baixar) {
    const op = baixar ? { download: a.nome } : undefined;
    const { data, error } = await sb.storage.from("arquivos").createSignedUrl(a.storage_path, 120, op);
    if (error || !data) { setMsg("Não foi possível abrir: " + (error ? error.message : "sem acesso")); return; }
    registrarEvento(baixar ? "baixar" : "visualizar", "arquivos", a.nome, a.id);
    if (baixar) {
      const el = document.createElement("a");
      el.href = data.signedUrl; el.download = a.nome; el.rel = "noopener";
      document.body.appendChild(el); el.click(); el.remove();
    } else {
      window.open(data.signedUrl, "_blank", "noopener");
    }
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
      {previa && <PreviaArquivo bucket="arquivos" alvo={previa} aoFechar={() => setPrevia(null)} aoBaixar={() => abrirArquivo(previa, true)} />}
      {renomear && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(28,37,48,.45)", zIndex: 8900, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}
             onClick={(e) => { if (e.target === e.currentTarget) setRenomear(null); }}>
          <div className="card-fl anim-pop" style={{ width: "min(440px, 94vw)", padding: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 10 }}>Renomear arquivo</div>
            <input className="campo" autoFocus style={{ width: "100%", padding: "9px 11px", fontSize: 13 }} value={renomear.nome}
                   onChange={(e) => setRenomear({ ...renomear, nome: e.target.value })}
                   onKeyDown={(e) => { if (e.key === "Enter") salvarRenomear(); if (e.key === "Escape") setRenomear(null); }} />
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>A extensão original é mantida sozinha se você não digitar outra.</div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn-primaria" style={{ padding: "8px 15px", fontSize: 12.5 }} onClick={salvarRenomear}>Salvar</button>
              <button className="btn-contorno" style={{ padding: "8px 15px", fontSize: 12.5 }} onClick={() => setRenomear(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {mover && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(28,37,48,.45)", zIndex: 8900, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}
             onClick={(e) => { if (e.target === e.currentTarget) setMover(null); }}>
          <div className="card-fl anim-pop" style={{ width: "min(480px, 94vw)", maxHeight: "80vh", padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--linha)", fontWeight: 800, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Mover "{mover.a.nome}" para…
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
              {!mover.pastas && <div style={{ padding: 14, fontSize: 12.5, color: "var(--muted)" }}>Carregando pastas…</div>}
              {mover.pastas && mover.pastas.length === 0 && <div style={{ padding: 14, fontSize: 12.5, color: "var(--muted)" }}>Nenhuma pasta disponível para você.</div>}
              {(mover.pastas || []).map((pp) => {
                const aqui = atual && pp.id === atual.id;
                return (
                  <div key={pp.id} onClick={() => { if (!aqui) moverPara(pp.id); }}
                       style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 9, cursor: aqui ? "default" : "pointer", opacity: aqui ? .5 : 1, fontSize: 12.5 }}
                       className={aqui ? "" : "linha-hover"}>
                    <i className="ti ti-folder" style={{ fontSize: 15, color: "var(--marca-texto)", flex: "none" }} aria-hidden="true"></i>
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pp.rotulo}</span>
                    {aqui && <span className="chip" style={{ fontSize: 10, background: "var(--campo)", color: "var(--muted)" }}>pasta atual</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "10px 14px", borderTop: "1px solid var(--linha)", textAlign: "right" }}>
              <button className="btn-contorno" style={{ padding: "7px 14px", fontSize: 12.5 }} onClick={() => setMover(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
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
                      <button className="btn-fantasma" style={{ width: 28, height: 28 }} aria-label="Visualizar" title="Visualizar" onClick={() => verArquivo(a)}>
                        <i className="ti ti-eye" style={{ fontSize: 14 }} aria-hidden="true"></i>
                      </button>
                      <button className="btn-fantasma" style={{ width: 28, height: 28 }} aria-label="Baixar" title="Baixar" onClick={() => abrirArquivo(a, true)}>
                        <i className="ti ti-download" style={{ fontSize: 14 }} aria-hidden="true"></i>
                      </button>
                      {podeEditar && (
                        <button className="btn-fantasma" style={{ width: 28, height: 28 }} aria-label="Renomear" title="Renomear" onClick={() => abrirRenomear(a)}>
                          <i className="ti ti-pencil" style={{ fontSize: 14 }} aria-hidden="true"></i>
                        </button>
                      )}
                      {podeEditar && (
                        <button className="btn-fantasma" style={{ width: 28, height: 28 }} aria-label="Mover para outra pasta" title="Mover para outra pasta" onClick={() => abrirMover(a)}>
                          <i className="ti ti-folder-symlink" style={{ fontSize: 14 }} aria-hidden="true"></i>
                        </button>
                      )}
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
  const [espelhoPrev, setEspelhoPrev] = useState(null);

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
            <button className="btn-fantasma" style={{ width: "auto", padding: "8px 13px", fontSize: 12.5 }} disabled={!colabSel || gerando} onClick={async () => { if (!colabSel) return; setGerando(true); try { const pv = await gerarEspelhoMensal(sb, colabSel, mes, "ver"); setEspelhoPrev(pv); } catch (e) { alert("Erro ao gerar espelho: " + e.message); } setGerando(false); }}><i className="ti ti-eye" style={{ marginRight: 5 }} aria-hidden="true"></i>{gerando ? "Gerando…" : "Espelho do mês"}</button>
            {espelhoPrev && <PreviaEspelho prev={espelhoPrev} aoFechar={() => { try { URL.revokeObjectURL(espelhoPrev.url); } catch (e2) {} setEspelhoPrev(null); }} />}
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

  // ---- mapa navegavel (sprint 41): zoom + arrastar + setas ----
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  function mudarZoom(d) {
    setZoom((z) => Math.min(1.6, Math.max(0.4, Math.round((z + d) * 100) / 100)));
  }
  function moverMapa(dx, dy) {
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }
  function centralizarMapa() { setZoom(1); setPan({ x: 0, y: 0 }); }

  function iniciarArrasto(e) {
    if (e.target.closest && e.target.closest("button, i, input, select, .sw, .org-controles")) return;
    const start = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, ativo: false };
    function mv(ev) {
      const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
      if (!start.ativo && Math.abs(dx) + Math.abs(dy) > 6) start.ativo = true;
      if (start.ativo) { setPan({ x: start.px + dx, y: start.py + dy }); ev.preventDefault(); }
    }
    function up() {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      if (start.ativo) {
        const mata = (ce) => { ce.stopPropagation(); ce.preventDefault(); };
        window.addEventListener("click", mata, true);
        setTimeout(() => window.removeEventListener("click", mata, true), 0);
      }
    }
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  }
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
              <div className="org-mapa" onPointerDown={iniciarArrasto} style={{ touchAction: "none" }}>
                <div className="org-mapa-conteudo" style={{ transform: "translate(" + pan.x + "px," + pan.y + "px) scale(" + zoom + ")" }}>
                  <ul className="org-arvore">
                    {arvore.raizes.map((r) => <No key={r.id} c={r} />)}
                  </ul>
                </div>
                <div className="org-controles">
                  <button className="org-btn" onClick={() => mudarZoom(0.15)} aria-label="Aproximar" title="Aproximar"><i className="ti ti-plus" aria-hidden="true"></i></button>
                  <div className="org-zoom-rotulo">{Math.round(zoom * 100)}%</div>
                  <button className="org-btn" onClick={() => mudarZoom(-0.15)} aria-label="Afastar" title="Afastar"><i className="ti ti-minus" aria-hidden="true"></i></button>
                  <div className="org-setas">
                    <button className="org-btn" onClick={() => moverMapa(0, 140)} aria-label="Ver o que está acima" title="Ver o que está acima"><i className="ti ti-arrow-up" aria-hidden="true"></i></button>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="org-btn" onClick={() => moverMapa(140, 0)} aria-label="Ver o que está à esquerda" title="Ver o que está à esquerda"><i className="ti ti-arrow-left" aria-hidden="true"></i></button>
                      <button className="org-btn" onClick={() => moverMapa(-140, 0)} aria-label="Ver o que está à direita" title="Ver o que está à direita"><i className="ti ti-arrow-right" aria-hidden="true"></i></button>
                    </div>
                    <button className="org-btn" onClick={() => moverMapa(0, -140)} aria-label="Ver o que está abaixo" title="Ver o que está abaixo"><i className="ti ti-arrow-down" aria-hidden="true"></i></button>
                  </div>
                  <button className="org-btn" onClick={centralizarMapa} aria-label="Centralizar" title="Centralizar (100%)"><i className="ti ti-focus-2" aria-hidden="true"></i></button>
                </div>
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
  const [ferias, setFerias] = useState(null);
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
  async function carregarFerias() {
    let q = sb.from("ferias").select("id, colaborador_id, inicio, fim, observacao, colaboradores(nome)")
      .lte("inicio", fimMes(mes)).gte("fim", mes + "-01")
      .order("inicio", { ascending: false }).limit(20000);
    if (colabSel) q = q.eq("colaborador_id", colabSel);
    const { data, error } = await q;
    if (error) { setMsg("Erro: " + error.message + (error.message.indexOf("ferias") !== -1 ? " — rode o 32_ferias.sql." : "")); return; }
    setMsg(""); setFerias(data || []);
  }
  useEffect(() => { setNovo(null); setEdit(null); if (visao === "faltas") carregarFaltas(); else if (visao === "atestados") carregarAtestados(); else carregarFerias(); }, [visao, mes, colabSel]);

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
    } else if (visao === "atestados") {
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
    } else {
      if (!novo.colaborador_id || !novo.inicio || !novo.fim) { setMsg("Escolha colaborador, início e fim."); return; }
      if (novo.fim < novo.inicio) { setMsg("O fim não pode vir antes do início."); return; }
      const { error } = await sb.from("ferias").insert({
        colaborador_id: novo.colaborador_id, inicio: novo.inicio, fim: novo.fim,
        observacao: (novo.observacao || "").trim() || null,
        registrado_por: ctx.profile.id,
      });
      if (error) { setMsg("Erro: " + error.message + (error.message.indexOf("ferias") !== -1 ? " — rode o 32_ferias.sql." : "")); return; }
      setMsg(""); setNovo(null); carregarFerias();
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
    } else if (visao === "atestados") {
      if (!edit.inicio || !edit.fim || edit.fim < edit.inicio) { setMsg("Confira as datas do atestado."); return; }
      const { error } = await sb.from("atestados").update({
        inicio: edit.inicio, fim: edit.fim, dias: diasEntre(edit.inicio, edit.fim),
        cid: (edit.cid || "").trim() || null, observacao: (edit.observacao || "").trim() || null,
      }).eq("id", edit.id);
      if (error) { setMsg("Erro: " + error.message); return; }
      setMsg(""); setEdit(null); carregarAtestados();
    } else {
      if (!edit.inicio || !edit.fim || edit.fim < edit.inicio) { setMsg("Confira as datas das férias."); return; }
      const { error } = await sb.from("ferias").update({
        inicio: edit.inicio, fim: edit.fim,
        observacao: (edit.observacao || "").trim() || null,
      }).eq("id", edit.id);
      if (error) { setMsg("Erro: " + error.message); return; }
      setMsg(""); setEdit(null); carregarFerias();
    }
  }

  async function excluir(item) {
    if (!window.confirm("Excluir este registro? A exclusão fica na auditoria.")) return;
    const { error } = await sb.from(visao === "faltas" ? "faltas" : visao === "atestados" ? "atestados" : "ferias").delete().eq("id", item.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    if (visao === "faltas") carregarFaltas(); else if (visao === "atestados") carregarAtestados(); else carregarFerias();
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
        {[["faltas", "Faltas"], ["atestados", "Atestados"], ["ferias", "Férias"]].map(([v, r]) => (
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
              : visao === "atestados"
              ? { colaborador_id: colabSel || "", inicio: hojeLocalISO(), fim: hojeLocalISO(), cid: "", observacao: "" }
              : { colaborador_id: colabSel || "", inicio: hojeLocalISO(), fim: hojeLocalISO(), observacao: "" }))}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true"></i>{visao === "faltas" ? "Nova falta" : visao === "atestados" ? "Novo atestado" : "Novas férias"}
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

      {novo && podeEditar && visao === "ferias" && (
        <div className="card-fl anim-pop" style={{ padding: 10, marginBottom: 12, display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
          {selColab(novo.colaborador_id, (e) => setNovo({ ...novo, colaborador_id: e.target.value }), true)}
          <input className="campo" type="date" style={{ width: 140, padding: "7px 9px", fontSize: 12.5 }} value={novo.inicio} onChange={(e) => setNovo({ ...novo, inicio: e.target.value })} />
          <span style={{ fontSize: 12, color: "var(--muted)" }}>até</span>
          <input className="campo" type="date" style={{ width: 140, padding: "7px 9px", fontSize: 12.5 }} value={novo.fim} onChange={(e) => setNovo({ ...novo, fim: e.target.value })} />
          {novo.inicio && novo.fim && novo.fim >= novo.inicio && (
            <span className="chip" style={{ background: "var(--verde-bg)", color: "var(--verde)" }}>{diasEntre(novo.inicio, novo.fim)} dia(s)</span>
          )}
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

      {visao === "ferias" && (
        <div className="card-fl" style={{ overflow: "hidden" }}>
          {!ferias && <div style={{ padding: 16, fontSize: 13, color: "var(--muted)" }}>Carregando…</div>}
          {ferias && ferias.length === 0 && (
            <div style={{ padding: "26px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>Nenhum período de férias tocando este mês.</div>
          )}
          {ferias && ferias.map((a) => (
            <div key={a.id} style={{ padding: "10px 14px", borderBottom: "1px solid var(--linha-suave)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, flex: "none" }}>{dataBr(a.inicio)} a {dataBr(a.fim)}</span>
                <span style={{ fontSize: 13, fontWeight: 600, flex: "none" }}>{a.colaboradores ? a.colaboradores.nome : "—"}</span>
                <span className="chip" style={{ background: "var(--verde-bg)", color: "var(--verde)" }}>{diasEntre(a.inicio, a.fim)} dia(s) de férias</span>
                <span style={{ flex: 1 }}></span>
                {podeEditar && (
                  <span style={{ display: "flex", gap: 10, flex: "none" }}>
                    <i className="ti ti-pencil" title="Editar" aria-label="Editar" style={{ fontSize: 15, cursor: "pointer", color: "var(--muted)" }}
                      onClick={() => setEdit(edit && edit.id === a.id ? null : { id: a.id, inicio: a.inicio, fim: a.fim, observacao: a.observacao || "" })}></i>
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
    { id: "fichas", r: "Fichas" },
    { id: "documentos", r: "Documentos" },
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
      {aba === "fichas" && <AbaFichas ctx={ctx} podeEditar={nivelAba(ctx, "rh", "fichas") === "editar"} />}
      {aba === "documentos" && <AbaDocsEstagio ctx={ctx} />}
      {aba === "faltas" && <AbaFaltas ctx={ctx} />}
      {aba === "alertas" && <AbaAlertas ctx={ctx} />}
      {["colaboradores", "ponto", "organograma", "faltas", "alertas", "fichas", "documentos"].indexOf(aba) === -1 && (
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
  const [previaM, setPreviaM] = useState(null);
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

  function verModelo(m) {
    if (!m.storage_path) { setMsg("Este modelo está sem arquivo. Edite e envie um."); return; }
    registrarEvento("visualizar", "modelos", m.nome, m.id);
    setPreviaM(m);
  }

  async function abrirModelo(m, baixar) {
    if (!m.storage_path) { setMsg("Este modelo está sem arquivo. Edite e envie um."); return; }
    const ext = "." + m.storage_path.split(".").pop();
    const op = baixar ? { download: m.nome.replace(/[^\w.\- ]+/g, "").trim() + ext } : undefined;
    const { data, error } = await sb.storage.from("modelos").createSignedUrl(m.storage_path, 120, op);
    if (error || !data) { setMsg("Não foi possível abrir: " + (error ? error.message : "sem acesso")); return; }
    registrarEvento(baixar ? "baixar" : "visualizar", "modelos", m.nome, m.id);
    if (baixar) {
      const el = document.createElement("a");
      el.href = data.signedUrl; el.download = m.nome; el.rel = "noopener";
      document.body.appendChild(el); el.click(); el.remove();
    } else {
      window.open(data.signedUrl, "_blank", "noopener");
    }
  }

  return (
    <div>
      {previaM && <PreviaArquivo bucket="modelos" alvo={previaM} aoFechar={() => setPreviaM(null)} aoBaixar={() => abrirModelo(previaM, true)} />}
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
                <button className="btn-fantasma" style={{ width: 28, height: 28 }} aria-label="Visualizar" title="Visualizar" onClick={() => verModelo(m)}>
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
  const [instituicoesFicha, setInstituicoesFicha] = useState([]);
  const ro = !podeEditar;
  const dBRf = (d) => (d || "").split("-").reverse().join("/");
  const [autorizacoes, setAutorizacoes] = useState([]);
  const [autModal, setAutModal] = useState(null);
  const [autMsg, setAutMsg] = useState("");

  async function carregar() {
    const { data, error } = await sb.from("colaboradores").select("*").order("nome").limit(20000);
    if (error) { setMsg("Erro: " + error.message); return; }
    setLista(data || []);
    const inst = await sb.from("instituicoes").select("id, sigla, nome").order("sigla");
    if (!inst.error) setInstituicoesFicha(inst.data || []);
  }
  useEffect(() => { carregar(); }, []);

  const filtrada = (lista || []).filter((c) => c.nome.toLowerCase().indexOf(busca.toLowerCase()) !== -1);
  const vz = (t) => (t || "").trim() || null;

  function abrir(c) { setSel({ ...c }); setMsg(""); }

  useEffect(() => {
    if (!sel || !sel.id) { setAutorizacoes([]); return; }
    let vivo = true;
    (async () => {
      const { data, error } = await sb.from("horas_extras_autorizacoes").select("id, data, minutos, autorizado_por, obs").eq("colaborador_id", sel.id).order("data", { ascending: false }).limit(40);
      if (vivo) setAutorizacoes(error ? [] : (data || []));
    })();
    return () => { vivo = false; };
  }, [sel && sel.id]);

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
      rg: vz(sel.rg), endereco: vz(sel.endereco), cidade: vz(sel.cidade), cep: vz(sel.cep),
      estado_civil: vz(sel.estado_civil), periodo_curso: vz(sel.periodo_curso),
      instituicao_id: sel.instituicao_id || null, dados_bancarios: vz(sel.dados_bancarios),
      carga_semanal_horas: sel.carga_semanal_horas === "" || sel.carga_semanal_horas == null ? null : parseFloat(sel.carga_semanal_horas),
      trabalha_sabado: !!sel.trabalha_sabado,
      observacoes: vz(sel.observacoes),
    }).eq("id", sel.id);
    setSalvando(false);
    if (error) { setMsg("Erro: " + error.message + (error.message.indexOf("formacao") !== -1 ? " — rode o 10_ficha_profissional.sql." : (error.message.indexOf("instituicao_id") !== -1 || error.message.indexOf("dados_bancarios") !== -1 ? " — rode o 28_documentos_estagio.sql." : (error.message.indexOf("carga_semanal") !== -1 || error.message.indexOf("trabalha_sabado") !== -1 ? " — rode o 29_carga_horaria.sql." : "")))); return; }
    setMsg("✓ Ficha salva."); carregar();
  }

  async function excluirFicha() {
    if (!sel) return;
    if (!window.confirm('Excluir a ficha de "' + sel.nome + '"? Isso apaga o colaborador e tudo ligado a ele (batidas de ponto, faltas, atestados). Para manter o histórico, prefira o status Desligado. A exclusão fica na auditoria.')) return;
    const { error } = await sb.from("colaboradores").delete().eq("id", sel.id);
    if (error) { setMsg("Erro ao excluir: " + error.message); return; }
    setSel(null); setMsg("✓ Ficha excluída."); carregar();
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
              <CampoFicha r="RG" filho={<input className="campo" style={cx} disabled={ro} value={sel.rg || ""} onChange={(e) => setSel({ ...sel, rg: e.target.value })} />} />
              <CampoFicha r="Estado civil" filho={<input className="campo" style={cx} disabled={ro} value={sel.estado_civil || ""} onChange={(e) => setSel({ ...sel, estado_civil: e.target.value })} />} />
              <CampoFicha r="Endereço (rua e número)" largo filho={<input className="campo" style={cx} disabled={ro} value={sel.endereco || ""} onChange={(e) => setSel({ ...sel, endereco: e.target.value })} />} />
              <CampoFicha r="Cidade" filho={<input className="campo" style={cx} disabled={ro} placeholder="Uberlândia-MG" value={sel.cidade || ""} onChange={(e) => setSel({ ...sel, cidade: e.target.value })} />} />
              <CampoFicha r="CEP" filho={<input className="campo" style={cx} disabled={ro} value={sel.cep || ""} onChange={(e) => setSel({ ...sel, cep: e.target.value })} />} />
              <CampoFicha r="Período do curso" filho={<input className="campo" style={cx} disabled={ro} placeholder="7º período" value={sel.periodo_curso || ""} onChange={(e) => setSel({ ...sel, periodo_curso: e.target.value })} />} />
              <CampoFicha r="Instituição de ensino" filho={
                <select className="campo" style={cx} disabled={ro} value={sel.instituicao_id || ""} onChange={(e) => setSel({ ...sel, instituicao_id: e.target.value || null })}>
                  <option value="">—</option>
                  {instituicoesFicha.map((i) => <option key={i.id} value={i.id}>{i.sigla} — {i.nome}</option>)}
                </select>} />
              <CampoFicha r="Dados bancários / PIX" largo filho={<input className="campo" style={cx} disabled={ro} placeholder="Pix 000.000.000-00 · Banco X ag 0000 / cc 00000-0" value={sel.dados_bancarios || ""} onChange={(e) => setSel({ ...sel, dados_bancarios: e.target.value })} />} />
              <CampoFicha r="Carga semanal (h)" filho={<input className="campo" type="number" min="0" max="60" step="0.5" style={cx} disabled={ro} placeholder="ex.: 30" value={sel.carga_semanal_horas == null ? "" : sel.carga_semanal_horas} onChange={(e) => setSel({ ...sel, carga_semanal_horas: e.target.value })} />} />
              <CampoFicha r="Trabalha aos sábados" filho={<select className="campo" style={cx} disabled={ro} value={sel.trabalha_sabado ? "sim" : "nao"} onChange={(e) => setSel({ ...sel, trabalha_sabado: e.target.value === "sim" })}><option value="nao">Não</option><option value="sim">Sim — 4h no sábado</option></select>} />
              {(() => { const c = parseFloat(sel.carga_semanal_horas); if (!c || c <= 0) return null; const fm = (u) => { const h = Math.floor(u), m = Math.round((u - h) * 60); return h + "h" + (m ? String(m).padStart(2, "0") : ""); }; return (
                <div style={{ gridColumn: "1 / -1", fontSize: 11.5, color: "var(--marca-texto)", background: "var(--tint)", border: "1px solid var(--tint-borda)", borderRadius: 9, padding: "6px 10px", lineHeight: 1.55 }}>
                  {sel.trabalha_sabado
                    ? <span>Jornada prevista: <b>{fm(c / 5)}/dia útil</b> nas semanas sem sábado; com sábado trabalhado, <b>{fm((c - 4) / 5)}/dia útil</b> e <b>4h no sábado</b>.</span>
                    : <span>Jornada prevista: <b>{fm(c / 5)} por dia útil</b> (segunda a sexta).</span>}
                  {" "}Saída acima do previsto do dia + 10 min dispara o alerta, salvo hora extra autorizada.
                </div>
              ); })()}

            </div>

            <div style={{ marginTop: 16, borderTop: "1px dashed var(--linha)", paddingTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--sec)" }}><i className="ti ti-clock-plus" style={{ marginRight: 5 }} aria-hidden="true"></i>Horas extras autorizadas</div>
                {podeEditar && <button className="btn-fantasma" style={{ width: "auto", padding: "6px 11px", fontSize: 11.5 }} onClick={() => { setAutMsg(""); setAutModal({ linhas: [{ data: "", horas: "1" }], obs: "" }); }}>+ Autorizar horas extras</button>}
                {autMsg && <span className="anim-pop" style={{ fontSize: 12, fontWeight: 600, color: autMsg.indexOf("Erro") === 0 ? "var(--vermelho)" : "var(--verde)" }}>{autMsg}</span>}
              </div>
              {autorizacoes.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 7 }}>Nenhuma autorização registrada. Sem autorização, sair acima do previsto do dia (+10 min de tolerância) dispara o alerta no relógio e para a direção.</div>
              ) : (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                  {autorizacoes.map((a) => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5, background: "var(--campo)", border: "1px solid var(--linha)", borderRadius: 9, padding: "6px 10px" }}>
                      <b style={{ color: "var(--marca-texto)" }}>{dBRf(a.data)}</b>
                      <span>+{Math.floor(a.minutos / 60)}h{a.minutos % 60 ? String(a.minutos % 60).padStart(2, "0") : ""}</span>
                      <span style={{ color: "var(--muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.autorizado_por}{a.obs ? " — " + a.obs : ""}</span>
                      {podeEditar && <i className="ti ti-trash" style={{ cursor: "pointer", color: "var(--vermelho)", fontSize: 14 }} title="Remover autorização" onClick={async () => { const { error } = await sb.from("horas_extras_autorizacoes").delete().eq("id", a.id); if (error) { setAutMsg("Erro: " + error.message); } else { setAutMsg("✓ Removida."); setAutorizacoes(autorizacoes.filter((x) => x.id !== a.id)); registrarEvento("editar", "rh", "Removeu autorização de horas extras de " + sel.nome + " em " + dBRf(a.data)); } }}></i>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {autModal && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,32,.55)", zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }} onClick={(e) => { if (e.target === e.currentTarget) setAutModal(null); }}>
                <div className="anim-pop" style={{ background: "var(--branco)", borderRadius: 16, padding: 18, maxWidth: 480, width: "100%", boxShadow: "0 20px 50px rgba(0,0,0,.3)", border: "1px solid var(--linha)" }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 4 }}>Autorizar horas extras — {sel.nome}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 10 }}>Escolha os dias e quantas horas a mais valem em cada um. No dia autorizado, o alerta só dispara acima do previsto + extra.</div>
                  {autModal.linhas.map((l, i) => (
                    <div key={i} style={{ display: "flex", gap: 7, marginBottom: 7, alignItems: "center" }}>
                      <input className="campo" type="date" style={{ flex: 1.2, padding: "7px 9px", fontSize: 12.5 }} value={l.data} onChange={(e) => { const ls = autModal.linhas.slice(); ls[i] = { ...l, data: e.target.value }; setAutModal({ ...autModal, linhas: ls }); }} />
                      <input className="campo" type="number" min="0.5" max="12" step="0.5" style={{ width: 92, padding: "7px 9px", fontSize: 12.5 }} value={l.horas} onChange={(e) => { const ls = autModal.linhas.slice(); ls[i] = { ...l, horas: e.target.value }; setAutModal({ ...autModal, linhas: ls }); }} />
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>hora(s)</span>
                      {autModal.linhas.length > 1 && <i className="ti ti-x" style={{ cursor: "pointer", color: "var(--muted)" }} onClick={() => setAutModal({ ...autModal, linhas: autModal.linhas.filter((_, j) => j !== i) })}></i>}
                    </div>
                  ))}
                  <button className="btn-fantasma" style={{ width: "auto", padding: "5px 10px", fontSize: 11.5, marginBottom: 10 }} onClick={() => setAutModal({ ...autModal, linhas: [...autModal.linhas, { data: "", horas: "1" }] })}>+ mais um dia</button>
                  <input className="campo" style={{ width: "100%", padding: "7px 9px", fontSize: 12.5, marginBottom: 12 }} placeholder="motivo / observação (opcional)" value={autModal.obs} onChange={(e) => setAutModal({ ...autModal, obs: e.target.value })} />
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button className="btn-fantasma" style={{ width: "auto", padding: "8px 14px", fontSize: 12.5 }} onClick={() => setAutModal(null)}>Cancelar</button>
                    <button className="btn-primaria" style={{ padding: "8px 15px", fontSize: 12.5 }} onClick={async () => {
                      const ls = autModal.linhas.filter((l) => l.data && parseFloat(l.horas) > 0);
                      if (!ls.length) { setAutMsg("Erro: preencha ao menos um dia com horas."); return; }
                      const quem = (ctx && ctx.profile && (ctx.profile.nome || ctx.profile.email)) || "direção";
                      const regs = ls.map((l) => ({ colaborador_id: sel.id, data: l.data, minutos: Math.round(parseFloat(l.horas) * 60), autorizado_por: quem, obs: (autModal.obs || "").trim() || null }));
                      const { error } = await sb.from("horas_extras_autorizacoes").upsert(regs, { onConflict: "colaborador_id,data" });
                      if (error) { setAutMsg("Erro: " + error.message + (error.message.indexOf("horas_extras") !== -1 ? " — rode o 29_carga_horaria.sql." : "")); return; }
                      registrarEvento("editar", "rh", "Autorizou horas extras de " + sel.nome + " (" + regs.map((r) => dBRf(r.data) + " +" + (r.minutos / 60) + "h").join(", ") + ")");
                      setAutModal(null); setAutMsg("✓ Autorização registrada.");
                      const rec = await sb.from("horas_extras_autorizacoes").select("id, data, minutos, autorizado_por, obs").eq("colaborador_id", sel.id).order("data", { ascending: false }).limit(40);
                      if (!rec.error) setAutorizacoes(rec.data || []);
                    }}>Salvar autorização</button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 14 }}>
              {podeEditar && <button className="btn-primaria" style={{ padding: "9px 16px", fontSize: 12.5 }} disabled={salvando} onClick={salvar}>{salvando ? "Salvando…" : "Salvar ficha"}</button>}
              {podeEditar && <button className="btn-fantasma" style={{ width: "auto", padding: "9px 14px", fontSize: 12.5, color: "var(--vermelho)", borderColor: "rgba(220,38,38,.45)" }} onClick={excluirFicha}><i className="ti ti-trash" style={{ fontSize: 14, marginRight: 5 }} aria-hidden="true"></i>Excluir ficha</button>}
              {msg && <span className="anim-pop" style={{ fontSize: 12.5, fontWeight: 600, color: msg.indexOf("Erro") === 0 ? "var(--vermelho)" : "var(--verde)" }}>{msg}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const VAPID_PUBLICA = "BDDEPgSTxarUAAyXXwYEA6xxX5YWRuGfZ4Srd5OB5XOEExSw8jRGyid4cQRQnaPAlZv9-L-dzUJScYxCPkPmGpQ";

function b64ParaU8(b) {
  const pad = "=".repeat((4 - (b.length % 4)) % 4);
  const s = (b + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(s);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function nomeAparelho() {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : "Aparelho";
  const nv = /CriOS|Chrome/.test(ua) ? "Chrome" : /FxiOS|Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "";
  return (os + " " + nv).trim();
}

function AbaNotificacoes({ ctx }) {
  const TIPOS = [
    { id: "ponto_ocorrencia", rotulo: "Ocorrência registrada no relógio", desc: "Alguém registrou uma ocorrência no ponto.", vivo: true },
    { id: "demanda_atribuida", rotulo: "Demanda atribuída a você", desc: "Quando alguém te designa uma tarefa. Vem ligado por padrão.", vivo: true, padraoOn: true },
    { id: "rh_alerta", rotulo: "Alertas e pendências do RH", desc: "Alertas legais e pendências da equipe.", vivo: false },
    { id: "pee_vencimento", rotulo: "Documento do PEE vencendo", desc: "Avisos de vencimento de documentos.", vivo: false },
  ];
  const [prefs, setPrefs] = useState(null);
  const [aparelhos, setAparelhos] = useState(null);
  const [endpointAtual, setEndpointAtual] = useState(null);
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const suporta = ("serviceWorker" in navigator) && ("PushManager" in window) && ("Notification" in window);
  const ehIphone = /iPhone|iPad/.test(navigator.userAgent);
  const instalado = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;

  async function carregar() {
    const [p, a] = await Promise.all([
      sb.from("notificacao_preferencias").select("tipo, ativo"),
      sb.from("push_inscricoes").select("id, endpoint, aparelho, created_at").order("created_at"),
    ]);
    const m = {}; (p.data || []).forEach((x) => { m[x.tipo] = x.ativo; });
    setPrefs(m); setAparelhos(a.data || []);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg && (await reg.pushManager.getSubscription());
      setEndpointAtual(sub ? sub.endpoint : null);
    } catch (e) { setEndpointAtual(null); }
  }
  useEffect(() => { carregar(); }, []);

  async function alternar(t) {
    const novo = !((prefs && prefs[t.id] !== undefined) ? prefs[t.id] : !!t.padraoOn);
    setPrefs({ ...prefs, [t.id]: novo });
    const { error } = await sb.from("notificacao_preferencias")
      .upsert({ profile_id: ctx.profile.id, tipo: t.id, ativo: novo }, { onConflict: "profile_id,tipo" });
    if (error) setMsg("Erro: " + error.message + " — o 23_notificacoes.sql já rodou?");
  }

  async function ativarAparelho() {
    setMsg(""); setOcupado(true);
    try {
      if (!suporta) throw new Error("Este navegador não suporta notificações push.");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("Permissão negada no aparelho.");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ParaU8(VAPID_PUBLICA) });
      const j = sub.toJSON();
      const { error } = await sb.from("push_inscricoes").upsert({
        profile_id: ctx.profile.id, endpoint: sub.endpoint,
        p256dh: j.keys.p256dh, auth: j.keys.auth, aparelho: nomeAparelho(),
      }, { onConflict: "endpoint" });
      if (error) throw error;
      setMsg("✓ Notificações ativadas neste aparelho.");
      carregar();
    } catch (e) { setMsg("Erro: " + e.message); }
    setOcupado(false);
  }

  async function desativarAparelho() {
    setOcupado(true); setMsg("");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg && (await reg.pushManager.getSubscription());
      if (sub) { await sb.from("push_inscricoes").delete().eq("endpoint", sub.endpoint); await sub.unsubscribe(); }
      setMsg("Notificações desativadas neste aparelho.");
      carregar();
    } catch (e) { setMsg("Erro: " + e.message); }
    setOcupado(false);
  }

  async function removerAparelho(a) {
    if (!window.confirm("Remover este aparelho? Ele para de receber avisos.")) return;
    await sb.from("push_inscricoes").delete().eq("id", a.id);
    carregar();
  }

  async function testar() {
    setOcupado(true); setMsg("");
    try {
      const { data, error } = await sb.functions.invoke("notificar", {
        body: { tipo: "teste", titulo: "CORTEX Gestão", corpo: "Notificação de teste — tudo funcionando por aqui.", url: "./" },
      });
      if (error) throw error;
      setMsg("✓ Teste enviado para " + ((data && data.enviadas) || 0) + " aparelho(s). Olhe a barra de notificações.");
    } catch (e) { setMsg("Erro no teste: " + e.message + " — a Edge Function 'notificar' já foi criada?"); }
    setOcupado(false);
  }

  const esteAtivo = endpointAtual && (aparelhos || []).some((a) => a.endpoint === endpointAtual);

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 640 }}>
      {ehIphone && !instalado && (
        <div className="card-fl" style={{ padding: "12px 14px", fontSize: 12.5, color: "var(--sec)" }}>
          <b>iPhone:</b> instale o CORTEX na tela inicial (Safari → Compartilhar → "Adicionar à Tela de Início") e abra por lá — a Apple só permite notificações para o app instalado.
        </div>
      )}

      <div className="card-fl" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>Este aparelho</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>
          {esteAtivo ? "Recebendo notificações neste aparelho." : "Este aparelho ainda não recebe notificações."}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!esteAtivo
            ? <button className="btn-primaria" style={{ padding: "9px 16px", fontSize: 12.5 }} disabled={ocupado} onClick={ativarAparelho}><i className="ti ti-bell" style={{ fontSize: 14, marginRight: 6 }} aria-hidden="true"></i>Ativar neste aparelho</button>
            : <button className="btn-fantasma" style={{ width: "auto", padding: "9px 14px", fontSize: 12.5 }} disabled={ocupado} onClick={desativarAparelho}>Desativar neste aparelho</button>}
          <button className="btn-contorno" style={{ padding: "9px 14px", fontSize: 12.5 }} disabled={ocupado || !esteAtivo} onClick={testar}><i className="ti ti-send" style={{ fontSize: 14, marginRight: 6 }} aria-hidden="true"></i>Enviar teste</button>
        </div>
      </div>

      <div className="card-fl" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>O que você quer receber</div>
        {TIPOS.map((t) => { const ligado = (prefs && prefs[t.id] !== undefined) ? prefs[t.id] : !!t.padraoOn; return (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: "1px solid var(--linha-suave)" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{t.rotulo}{!t.vivo && <span className="chip" style={{ marginLeft: 7, fontSize: 10, background: "var(--tint)", color: "var(--marca-texto)" }}>em breve</span>}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{t.desc}</div>
            </div>
            <span className="chip" onClick={() => alternar(t)}
              style={{ cursor: "pointer", fontWeight: 700, background: ligado ? "rgba(22,163,74,.12)" : "var(--branco)", color: ligado ? "var(--verde)" : "var(--muted)", border: "1px solid " + (ligado ? "rgba(22,163,74,.35)" : "var(--linha)") }}>
              {ligado ? "Ativado" : "Desativado"}
            </span>
          </div>
        ); })}
      </div>

      <div className="card-fl" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>Aparelhos autorizados</div>
        {!aparelhos && <div style={{ fontSize: 12, color: "var(--muted)" }}>Carregando…</div>}
        {aparelhos && aparelhos.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)" }}>Nenhum aparelho ainda.</div>}
        {(aparelhos || []).map((a) => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderTop: "1px solid var(--linha-suave)", fontSize: 12.5 }}>
            <i className="ti ti-device-mobile" style={{ fontSize: 15, color: "var(--marca-texto)", flex: "none" }} aria-hidden="true"></i>
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.aparelho || "Aparelho"}{a.endpoint === endpointAtual ? " · este aqui" : ""}</span>
            <span style={{ color: "var(--muted)", fontSize: 11, flex: "none" }}>{dataBr(a.created_at.slice(0, 10))}</span>
            <i className="ti ti-trash" style={{ fontSize: 14, cursor: "pointer", color: "var(--vermelho)", flex: "none" }} onClick={() => removerAparelho(a)} aria-label="Remover aparelho"></i>
          </div>
        ))}
      </div>

      {msg && <div className="anim-pop" style={{ fontSize: 12.5, fontWeight: 600, color: msg.indexOf("Erro") === 0 ? "var(--vermelho)" : "var(--verde)" }}>{msg}</div>}
    </div>
  );
}

function PaginaRelatorios({ ctx }) {
  const RELS = [
    { id: "ponto", ico: "ti-clock", tit: "Ponto do mês", desc: "Espelho individual — semana a semana, no padrão oficial", vivo: true },
    { id: "faltas", ico: "ti-calendar-off", tit: "Faltas e atestados", desc: "Período, por pessoa e tipo", vivo: true },
    { id: "quadro", ico: "ti-users", tit: "Quadro de pessoal", desc: "Ativos por setor, regime e unidade", vivo: true },
    { id: "ocorrencias", ico: "ti-message-report", tit: "Ocorrências do ponto", desc: "Tudo que foi registrado no período", vivo: true },
    { id: "salas", ico: "ti-door", tit: "Salas", desc: "Ocupação por unidade", vivo: false },
    { id: "pee", ico: "ti-book", tit: "PEE — vencimentos", desc: "Documentos a vencer", vivo: false },
  ];
  const [rel, setRel] = useState(null);
  const [espelhoPrev, setEspelhoPrev] = useState(null);
  const [colabs, setColabs] = useState([]);
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [setor, setSetor] = useState("");
  const [colabId, setColabId] = useState("");
  const [statusQ, setStatusQ] = useState("ativo");
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await sb.from("colaboradores")
        .select("id, nome, cargo, setor, regime, unidade, status, admissao, desligamento")
        .order("nome").limit(20000);
      if (error) { setMsg("Sem acesso aos dados de RH (" + error.message + "). Fale com a direção sobre o seu perfil."); return; }
      setColabs(data || []);
    })();
  }, []);

  const setores = useMemo(() => {
    const s = {}; colabs.forEach((c) => { if (c.setor) s[c.setor] = 1; });
    return Object.keys(s).sort();
  }, [colabs]);
  const porId = useMemo(() => { const m = {}; colabs.forEach((c) => { m[c.id] = c; }); return m; }, [colabs]);

  function ultimoDiaMes(m) { return String(new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).getDate()).padStart(2, "0"); }
  function fmtH(min) { const h = Math.floor(min / 60), mi = Math.round(min % 60); return h + "h" + String(mi).padStart(2, "0"); }
  function dentroSetor(c) { return !setor || (c && c.setor === setor); }
  const TIPO_FALTA = { falta: "Falta", atraso: "Atraso", saida_antecipada: "Saída antecipada" };

  useEffect(() => {
    if (!rel || !colabs.length) return;
    let vivo = true;
    (async () => {
      setCarregando(true); setMsg(""); setDados(null);
      try {
        const ini = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 1, 1);
        const fim = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 1);
        const d1 = mes + "-01", d2 = mes + "-" + ultimoDiaMes(mes);

        if (rel === "ponto") {
          if (!colabId) { if (vivo) { setDados(null); setMsg("Escolha o colaborador — o espelho é individual, no padrão oficial (paisagem, semana a semana)."); } }
          else { const pv = await gerarEspelhoMensal(sb, colabId, mes, "ver"); if (vivo) { setDados(null); setEspelhoPrev(function (ant) { if (ant) { try { URL.revokeObjectURL(ant.url); } catch (e2) {} } return pv; }); setMsg("✓ Espelho de " + ((porId[colabId] || {}).nome || "colaborador") + " pronto — visualização aberta."); } }
        }

        if (rel === "faltas") {
          let q1 = sb.from("faltas").select("colaborador_id, data, tipo, justificada, motivo").gte("data", d1).lte("data", d2).limit(20000);
          let q2 = sb.from("atestados").select("colaborador_id, inicio, fim, dias, cid, observacao").lte("inicio", d2).gte("fim", d1).limit(20000);
          if (colabId) { q1 = q1.eq("colaborador_id", colabId); q2 = q2.eq("colaborador_id", colabId); }
          const [r1, r2] = await Promise.all([q1, q2]);
          if (r1.error || r2.error) throw (r1.error || r2.error);
          const itens = [];
          (r1.data || []).forEach((f) => {
            const c = porId[f.colaborador_id];
            if (!dentroSetor(c)) return;
            itens.push({ ord: f.data, linha: [dataBr(f.data), c ? c.nome : "?", TIPO_FALTA[f.tipo] || f.tipo,
              (f.justificada ? "Justificada" : "Não justificada") + (f.motivo ? " — " + f.motivo : "")] });
          });
          let nAt = 0;
          (r2.data || []).forEach((a) => {
            const c = porId[a.colaborador_id];
            if (!dentroSetor(c)) return;
            nAt++;
            itens.push({ ord: a.inicio, linha: [dataBr(a.inicio), c ? c.nome : "?", "Atestado",
              dataBr(a.inicio) + " a " + dataBr(a.fim) + (a.dias ? " (" + a.dias + " dia(s))" : "") + (a.cid ? " · CID " + a.cid : "") + (a.observacao ? " — " + a.observacao : "")] });
          });
          itens.sort((x, y) => (x.ord < y.ord ? -1 : 1));
          if (vivo) setDados({ cab: ["Data", "Colaborador", "Tipo", "Detalhe"], linhas: itens.map((i) => i.linha),
            rodape: (itens.length - nAt) + " falta(s)/atraso(s) · " + nAt + " atestado(s)" });
        }

        if (rel === "quadro") {
          const lista = colabs.filter((c) => dentroSetor(c) && (statusQ === "todos" || c.status === statusQ));
          const regimes = {}; lista.forEach((c) => { const r = c.regime || "—"; regimes[r] = (regimes[r] || 0) + 1; });
          const adm = colabs.filter((c) => c.admissao && c.admissao >= d1 && c.admissao <= d2).length;
          const desl = colabs.filter((c) => c.desligamento && c.desligamento >= d1 && c.desligamento <= d2).length;
          const linhas = lista.map((c) => [c.nome, c.cargo || "", c.setor || "", c.regime || "", c.unidade || "", c.status, c.admissao ? dataBr(c.admissao) : ""]);
          if (vivo) setDados({ cab: ["Nome", "Cargo", "Setor", "Regime", "Unidade", "Status", "Admissão"], linhas,
            rodape: lista.length + " pessoa(s) · " + Object.keys(regimes).map((r) => regimes[r] + " " + r).join(" · ") +
              " · No mês: " + adm + " admissão(ões), " + desl + " desligamento(s)" });
        }

        if (rel === "ocorrencias") {
          let q = sb.from("ponto_ocorrencias").select("colaborador_id, data, tipo, descricao, observacao")
            .gte("data", d1).lte("data", d2).order("data").limit(20000);
          if (colabId) q = q.eq("colaborador_id", colabId);
          const r1 = await q;
          if (r1.error) throw r1.error;
          const linhas = (r1.data || []).filter((o) => dentroSetor(porId[o.colaborador_id])).map((o) => {
            const c = porId[o.colaborador_id];
            return [o.data ? dataBr(o.data) : "", c ? c.nome : "(sem vínculo)", o.tipo || "",
              (o.descricao || "") + (o.observacao ? " — Obs. adm.: " + o.observacao : "")];
          });
          if (vivo) setDados({ cab: ["Data", "Colaborador", "Tipo", "Descrição"], linhas,
            rodape: linhas.length + " ocorrência(s) no período" });
        }
      } catch (e) { if (vivo) setMsg("Erro: " + e.message); }
      if (vivo) setCarregando(false);
    })();
    return () => { vivo = false; };
  }, [rel, mes, setor, colabId, statusQ, colabs]);

  function nomeRel() { const r = RELS.filter((x) => x.id === rel)[0]; return r ? r.tit : ""; }
  function subtitulo() {
    const p = mes.split("-");
    return "Competência " + p[1] + "/" + p[0] + (setor ? " · setor " + setor : "") +
      (colabId && porId[colabId] ? " · " + porId[colabId].nome : "") +
      (rel === "quadro" ? " · " + (statusQ === "todos" ? "todos" : statusQ + "s") : "");
  }

  function baixarCsv() {
    if (!dados) return;
    const esc = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const cab = rel === "ponto" ? dados.cab.concat(["Cargo", "Setor"]) : dados.cab;
    const linhas = [cab.map(esc).join(";")];
    dados.linhas.forEach((l) => linhas.push(l.map(esc).join(";")));
    const blob = new Blob(["\uFEFF" + linhas.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "relatorio-" + rel + "-" + mes + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function baixarPdf() {
    if (!dados) return;
    if (!window.jspdf || !window.jspdf.jsPDF) { setMsg("O gerador de PDF não carregou. Atualize com Ctrl+F5."); return; }
    const doc = new window.jspdf.jsPDF(rel === "quadro" ? "l" : "p");
    doc.setFontSize(15); doc.setTextColor(16, 104, 176);
    doc.text("CORTEX Gestão · " + nomeRel(), 14, 16);
    doc.setFontSize(10); doc.setTextColor(110);
    doc.text(subtitulo(), 14, 22);
    doc.autoTable({
      startY: 27, head: [dados.cab], body: dados.linhas.map((l) => l.slice(0, dados.cab.length)),
      styles: { fontSize: 8.5, cellPadding: 2.2 },
      headStyles: { fillColor: [16, 104, 176], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [246, 248, 251] },
    });
    const y = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 30) + 7;
    doc.setFontSize(9); doc.setTextColor(70);
    doc.text(dados.rodape || "", 14, y);
    doc.save("relatorio-" + rel + "-" + mes + ".pdf");
  }

  if (!rel) return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
        {RELS.map((r) => (
          <div key={r.id} className={"card-fl" + (r.vivo ? " clicavel" : "")}
            onClick={() => { if (r.vivo) { setRel(r.id); setDados(null); } }}
            style={{ padding: "14px 15px", opacity: r.vivo ? 1 : .55 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--tint)", color: "var(--marca-texto)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 9 }}>
              <i className={"ti " + r.ico} style={{ fontSize: 17 }} aria-hidden="true"></i>
            </div>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.tit}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", margin: "3px 0 8px" }}>{r.desc}</div>
            <span className="chip" style={{ fontSize: 10.5, background: r.vivo ? "var(--tint)" : "var(--campo)", color: r.vivo ? "var(--marca-texto)" : "var(--muted)" }}>{r.vivo ? "PDF · CSV" : "em breve"}</span>
          </div>
        ))}
      </div>
      {msg && <div className="anim-pop" style={{ marginTop: 12, fontSize: 12.5, fontWeight: 600, color: "var(--vermelho)" }}>{msg}</div>}
    </div>
  );

  return (
    <div>
      {espelhoPrev && <PreviaEspelho prev={espelhoPrev} aoFechar={() => { setEspelhoPrev(function (ant) { if (ant) { try { URL.revokeObjectURL(ant.url); } catch (e2) {} } return null; }); }} />}
      <button className="btn-fantasma" style={{ width: "auto", padding: "6px 12px", marginBottom: 12 }} onClick={() => { setRel(null); setMsg(""); setEspelhoPrev(function (ant) { if (ant) { try { URL.revokeObjectURL(ant.url); } catch (e2) {} } return null; }); }}>
        <i className="ti ti-arrow-left" style={{ fontSize: 14, marginRight: 5 }} aria-hidden="true"></i>Relatórios
      </button>
      <div style={{ fontWeight: 700, fontSize: 15.5, marginBottom: 10 }}>{nomeRel()}</div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <input className="campo" type="month" style={{ width: 150, padding: "7px 9px", fontSize: 12.5 }} value={mes} onChange={(e) => setMes(e.target.value)} />
        <select className="campo" style={{ width: 170, padding: "7px 9px", fontSize: 12.5 }} value={setor} onChange={(e) => setSetor(e.target.value)}>
          <option value="">Todos os setores</option>
          {setores.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {rel !== "quadro" && (
          <select className="campo" style={{ width: 200, padding: "7px 9px", fontSize: 12.5 }} value={colabId} onChange={(e) => setColabId(e.target.value)}>
            <option value="">Todos os colaboradores</option>
            {colabs.filter((c) => dentroSetor(c)).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
        {rel === "quadro" && (
          <select className="campo" style={{ width: 140, padding: "7px 9px", fontSize: 12.5 }} value={statusQ} onChange={(e) => setStatusQ(e.target.value)}>
            <option value="ativo">Ativos</option><option value="todos">Todos</option>
            <option value="ferias">Férias</option><option value="afastado">Afastados</option><option value="desligado">Desligados</option>
          </select>
        )}
        <span style={{ flex: 1 }}></span>
        <button className="btn-primaria" style={{ padding: "8px 14px", fontSize: 12.5 }} disabled={!dados || carregando} onClick={baixarPdf}>
          <i className="ti ti-file-type-pdf" style={{ fontSize: 14, marginRight: 5 }} aria-hidden="true"></i>Exportar PDF
        </button>
        <button className="btn-contorno" style={{ padding: "8px 14px", fontSize: 12.5 }} disabled={!dados || carregando} onClick={baixarCsv}>
          <i className="ti ti-table-export" style={{ fontSize: 14, marginRight: 5 }} aria-hidden="true"></i>Exportar CSV
        </button>
      </div>

      <div className="card-fl" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12.5, minWidth: 560 }}>
            <thead><tr>
              {dados && dados.cab.map((h) => <th key={h} style={{ textAlign: "left", padding: "9px 12px", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: .5, borderBottom: "1px solid var(--linha)" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {carregando && <tr><td colSpan={9} style={{ padding: 16, color: "var(--muted)" }}>Gerando…</td></tr>}
              {!carregando && dados && dados.linhas.length === 0 && <tr><td colSpan={9} style={{ padding: 16, color: "var(--muted)" }}>Nada no período com esses filtros.</td></tr>}
              {!carregando && dados && dados.linhas.map((l, i) => (
                <tr key={i} style={{ background: i % 2 ? "var(--campo)" : "transparent" }}>
                  {l.slice(0, dados.cab.length).map((c, j) => <td key={j} style={{ padding: "8px 12px", borderBottom: "1px solid var(--linha-suave)", verticalAlign: "top" }}>{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {dados && <div style={{ padding: "9px 12px", fontSize: 12, color: "var(--sec)", borderTop: "1px solid var(--linha)", fontWeight: 600 }}>{dados.rodape}</div>}
      </div>
      {msg && <div className="anim-pop" style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: "var(--vermelho)" }}>{msg}</div>}
    </div>
  );
}

function PaginaInfinity({ ctx }) {
  const [teste, setTeste] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [mesFin, setMesFin] = useState(() => new Date().toISOString().slice(0, 7));
  const [tick, setTick] = useState(0);
  const [resumo, setResumo] = useState(null);
  const [carregandoFin, setCarregandoFin] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      setCarregandoFin(true);
      try {
        const { data, error } = await sb.rpc("infinity_resumo", { p_mes: mesFin });
        if (error) throw error;
        if (vivo) setResumo(data);
      } catch (e) { if (vivo) setResumo({ ok: false, erro: e.message + " — o 25_infinity_resumo.sql já rodou?" }); }
      if (vivo) setCarregandoFin(false);
    })();
    return () => { vivo = false; };
  }, [mesFin, tick]);

  const brl = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const cap = (t) => { const s = String(t == null || t === "" ? "—" : t); return s.charAt(0).toUpperCase() + s.slice(1); };
  const rotSec = { fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 6 };
  const thSt = { textAlign: "left", padding: "7px 10px", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: .5, borderBottom: "1px solid var(--linha)" };
  const tdSt = { padding: "7px 10px", borderBottom: "1px solid var(--linha-suave)" };
  function CartaoFin({ titulo, valor, sub }) {
    return (
      <div style={{ background: "var(--campo)", border: "1px solid var(--linha)", borderRadius: 12, padding: "11px 13px" }}>
        <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: .5 }}>{titulo}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--marca-texto)", margin: "3px 0 2px" }}>{valor}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--muted)" }}>{sub}</div>}
      </div>
    );
  }

  async function testar() {
    setOcupado(true); setTeste(null);
    try {
      const { data, error } = await sb.rpc("infinity_testar");
      if (error) throw error;
      setTeste(data);
    } catch (e) { setTeste({ ok: false, erro: e.message + " — o 24_integracao_infinity.sql já rodou?" }); }
    setOcupado(false);
  }

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 640 }}>
      <div className="card-fl" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>Ponte com o Infinity</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>
          A leitura do financeiro passa pelo banco do CORTEX — a chave da ponte nunca chega ao navegador.
          Endereço e chaves ficam em Configurações → Integrações.
        </div>
        <button className="btn-primaria" style={{ padding: "9px 16px", fontSize: 12.5 }} disabled={ocupado} onClick={testar}>
          <i className="ti ti-plug-connected" style={{ fontSize: 14, marginRight: 6 }} aria-hidden="true"></i>
          {ocupado ? "Testando…" : "Testar ponte"}
        </button>
        {teste && (
          <div className="anim-pop" style={{ marginTop: 12, fontSize: 12.5, fontWeight: 600, color: teste.ok ? "var(--verde)" : "var(--vermelho)" }}>
            {teste.ok
              ? "✓ Conectado ao " + ((teste.resposta && teste.resposta.sistema) || "Infinity") + " em " + teste.latencia_ms + " ms"
              : "✗ " + (teste.erro || "Falha na ponte.")}
          </div>
        )}
      </div>

      <div className="card-fl" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, flex: 1 }}>Painel financeiro</div>
          <input className="campo" type="month" style={{ width: 150, padding: "7px 9px", fontSize: 12.5 }} value={mesFin} onChange={(e) => setMesFin(e.target.value)} />
          <button className="btn-fantasma" style={{ width: "auto", padding: "7px 12px" }} disabled={carregandoFin} onClick={() => setTick((t) => t + 1)} aria-label="Atualizar" title="Atualizar">
            <i className="ti ti-refresh" style={{ fontSize: 14 }} aria-hidden="true"></i>
          </button>
        </div>
        {carregandoFin && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Buscando no Infinity…</div>}
        {!carregandoFin && resumo && !resumo.ok && (
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--vermelho)" }}>✗ {resumo.erro}</div>
        )}
        {!carregandoFin && resumo && resumo.ok && (
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <div style={rotSec}>Movimento do mês (transactions)</div>
              {(resumo.transacoes || []).length === 0
                ? <div style={{ fontSize: 12, color: "var(--muted)" }}>Sem lançamentos no mês.</div>
                : <div style={{ overflowX: "auto" }}>
                    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12.5, minWidth: 380 }}>
                      <thead><tr>{["Tipo", "Status", "Qtde", "Total"].map((h) => <th key={h} style={thSt}>{h}</th>)}</tr></thead>
                      <tbody>
                        {(resumo.transacoes || []).map((t, i) => (
                          <tr key={i} style={{ background: i % 2 ? "var(--campo)" : "transparent" }}>
                            <td style={tdSt}>{cap(t.type)}</td>
                            <td style={tdSt}>{cap(t.status)}</td>
                            <td style={tdSt}>{t.qtd}</td>
                            <td style={{ ...tdSt, fontWeight: 700 }}>{brl(t.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
              <CartaoFin titulo="Caixa do mês" valor={brl(resumo.caixa && resumo.caixa.total)} sub={(((resumo.caixa && resumo.caixa.qtd) || 0) + " lançamento(s)")} />
              <CartaoFin titulo="Folha (competência)" valor={brl(resumo.pagamentos && resumo.pagamentos.total_liquido)} sub={"bruto " + brl(resumo.pagamentos && resumo.pagamentos.total_bruto)} />
              <CartaoFin titulo="Repasses (líquido)" valor={brl(resumo.repasses && resumo.repasses.liquido)} sub={"receita " + brl(resumo.repasses && resumo.repasses.receita) + " · holding " + brl(resumo.repasses && resumo.repasses.holding)} />
            </div>
            {(resumo.caixa_formas || []).length > 0 && (
              <div>
                <div style={rotSec}>Caixa por forma de pagamento</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(resumo.caixa_formas || []).map((f, i) => (
                    <span key={i} className="chip" style={{ background: "var(--tint)", color: "var(--marca-texto)", fontWeight: 700 }}>{cap(f.forma)} · {brl(f.total)}</span>
                  ))}
                </div>
              </div>
            )}
            {(resumo.contas || []).length > 0 && (
              <div>
                <div style={rotSec}>Contas bancárias (saldo inicial cadastrado)</div>
                {(resumo.contas || []).map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, padding: "6px 0", borderTop: "1px solid var(--linha-suave)" }}>
                    <span>{c.nome}{c.banco ? " · " + c.banco : ""}</span>
                    <span style={{ fontWeight: 700 }}>{brl(c.saldo_inicial)}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              Somente leitura, direto do Infinity pela ponte. Os rótulos de tipo e status vêm do banco de lá — me mande um print do painel que eu deixo os nomes bonitos.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AbaIntegracoes({ ctx }) {
  const [f, setF] = useState(null);
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [teste, setTeste] = useState(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await sb.from("integracoes").select("*").eq("id", "infinity").maybeSingle();
      if (error) { setMsg("Erro: " + error.message + " — o 24_integracao_infinity.sql já rodou?"); setF({ url: "", anon_key: "", chave_ponte: "" }); return; }
      setF({ url: (data && data.url) || "", anon_key: (data && data.anon_key) || "", chave_ponte: (data && data.chave_ponte) || "" });
    })();
  }, []);

  async function salvar() {
    setOcupado(true); setMsg(""); setTeste(null);
    const { error } = await sb.from("integracoes").update({
      url: f.url.trim() || null,
      anon_key: f.anon_key.trim() || null,
      chave_ponte: f.chave_ponte.trim() || null,
      atualizado_por: ctx.profile.id,
      atualizado_em: new Date().toISOString(),
    }).eq("id", "infinity");
    setOcupado(false);
    if (error) { setMsg("Erro ao salvar: " + error.message); return; }
    setMsg("✓ Integração salva.");
  }

  async function testar() {
    setOcupado(true); setMsg(""); setTeste(null);
    try {
      const { data, error } = await sb.rpc("infinity_testar");
      if (error) throw error;
      setTeste(data);
    } catch (e) { setTeste({ ok: false, erro: e.message }); }
    setOcupado(false);
  }

  if (!f) return <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Carregando…</div>;

  const rot = { display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 };

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 640 }}>
      <div className="card-fl" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "#FFF7E6", color: "var(--ambar)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-coin" style={{ fontSize: 16 }} aria-hidden="true"></i>
          </div>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>Infinity (financeiro)</div>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
          URL e anon key ficam em Settings → API do projeto do Infinity no Supabase. A chave da ponte é a mesma
          embutida na P1 que roda lá. Só a direção enxerga e edita esta tela.
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <div><label style={rot}>URL do Supabase do Infinity</label>
            <input className="campo" style={{ padding: "8px 10px", fontSize: 12.5 }} placeholder="https://xxxxxxxx.supabase.co" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></div>
          <div><label style={rot}>Anon key do Infinity</label>
            <input className="campo" style={{ padding: "8px 10px", fontSize: 12.5, fontFamily: "var(--mono, monospace)" }} placeholder="eyJ..." value={f.anon_key} onChange={(e) => setF({ ...f, anon_key: e.target.value })} /></div>
          <div><label style={rot}>Chave da ponte</label>
            <input className="campo" style={{ padding: "8px 10px", fontSize: 12.5, fontFamily: "var(--mono, monospace)" }} placeholder="cole a chave do arquivo de segredos" value={f.chave_ponte} onChange={(e) => setF({ ...f, chave_ponte: e.target.value })} /></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <button className="btn-primaria" style={{ padding: "9px 16px", fontSize: 12.5 }} disabled={ocupado} onClick={salvar}>{ocupado ? "Salvando…" : "Salvar"}</button>
          <button className="btn-contorno" style={{ padding: "9px 14px", fontSize: 12.5 }} disabled={ocupado} onClick={testar}>
            <i className="ti ti-plug-connected" style={{ fontSize: 14, marginRight: 5 }} aria-hidden="true"></i>Testar conexão
          </button>
        </div>
        {msg && <div className="anim-pop" style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: msg.indexOf("Erro") === 0 ? "var(--vermelho)" : "var(--verde)" }}>{msg}</div>}
        {teste && (
          <div className="anim-pop" style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: teste.ok ? "var(--verde)" : "var(--vermelho)" }}>
            {teste.ok
              ? "✓ Conectado ao " + ((teste.resposta && teste.resposta.sistema) || "Infinity") + " em " + teste.latencia_ms + " ms"
              : "✗ " + (teste.erro || "Falha na ponte.")}
          </div>
        )}
      </div>
    </div>
  );
}

function PaginaDemandas({ ctx }) {
  const podeEditar = nivelModulo(ctx, "demandas") === "editar";
  const [lista, setLista] = useState(null);
  const [colabs, setColabs] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("abertas");
  const [setorF, setSetorF] = useState("");
  const [prioF, setPrioF] = useState("");
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function carregar() {
    const { data, error } = await sb.rpc("demandas_listar");
    if (error) { setMsg("Erro: " + error.message + " — o 26_demandas.sql já rodou?"); setLista([]); return; }
    setLista(data || []);
  }
  useEffect(() => {
    carregar();
    if (podeEditar) {
      sb.from("colaboradores").select("id, nome, setor").eq("status", "ativo").order("nome").limit(2000)
        .then(({ data }) => setColabs(data || []));
    }
  }, []);

  const hojeStr = (() => { const n = new Date(); return n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0"); })();
  const PRIO = {
    urgente: { r: "Urgente", cor: "var(--vermelho)", fundo: "rgba(220,38,38,.12)" },
    alta: { r: "Alta", cor: "#B45309", fundo: "#FFF7E6" },
    baixa: { r: "Baixa", cor: "var(--muted)", fundo: "var(--campo)" },
  };

  function farolPrazo(d) {
    if (!d.prazo || d.status === "concluida") return null;
    if (d.prazo < hojeStr) {
      const dias = Math.max(1, Math.round((new Date(hojeStr) - new Date(d.prazo)) / 86400000));
      return { cor: "var(--vermelho)", fundo: "rgba(220,38,38,.10)", rotulo: "atrasada " + dias + "d" };
    }
    if (d.prazo === hojeStr) return { cor: "#B45309", fundo: "#FFFBEB", rotulo: "vence hoje" };
    return null;
  }

  const setores = useMemo(() => {
    const s = {}; (lista || []).forEach((d) => { if (d.setor) s[d.setor] = 1; });
    return Object.keys(s).sort();
  }, [lista]);

  const visiveis = (lista || []).filter((d) =>
    (filtro === "todas" || (filtro === "abertas" ? d.status === "aberta" : d.status === "concluida"))
    && (!setorF || d.setor === setorF)
    && (!prioF || d.prioridade === prioF)
    && ((d.titulo + " " + (d.descricao || "") + " " + d.nome).toLowerCase().indexOf(busca.trim().toLowerCase()) >= 0)
  );
  const nAbertas = (lista || []).filter((d) => d.status === "aberta").length;
  const nAtrasadas = (lista || []).filter((d) => d.status === "aberta" && d.prazo && d.prazo < hojeStr).length;
  const nUrgentes = (lista || []).filter((d) => d.status === "aberta" && d.prioridade === "urgente").length;

  function abrirNova() { setMsg(""); setForm({ id: null, titulo: "", colaborador_id: "", prazo: "", descricao: "", prioridade: "normal" }); }
  function abrirEdicao(d) { setMsg(""); setForm({ id: d.id, titulo: d.titulo, colaborador_id: d.colaborador_id, prazo: d.prazo || "", descricao: d.descricao || "", prioridade: d.prioridade || "normal" }); }

  async function salvar() {
    if (!form.titulo.trim()) { setMsg("Dê um título à demanda."); return; }
    if (!form.colaborador_id) { setMsg("Atribua a demanda a alguém."); return; }
    setOcupado(true); setMsg("");
    const dados = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      colaborador_id: form.colaborador_id,
      prazo: form.prazo || null,
      prioridade: form.prioridade || "normal",
      atualizado_em: new Date().toISOString(),
    };
    let r;
    if (form.id) r = await sb.from("demandas").update(dados).eq("id", form.id);
    else r = await sb.from("demandas").insert({ ...dados, criado_por: ctx.profile.id });
    setOcupado(false);
    if (r.error) { setMsg("Erro ao salvar: " + r.error.message); return; }
    setForm(null); carregar();
  }

  async function marcar(d, novo) {
    const { error } = await sb.from("demandas").update({
      status: novo,
      concluida_em: novo === "concluida" ? new Date().toISOString() : null,
      atualizado_em: new Date().toISOString(),
    }).eq("id", d.id);
    if (error) setMsg("Erro: " + error.message); else carregar();
  }

  async function excluir(d) {
    if (!window.confirm('Excluir a demanda "' + d.titulo + '"? A exclusão fica na auditoria.')) return;
    const { error } = await sb.from("demandas").delete().eq("id", d.id);
    if (error) setMsg("Erro: " + error.message); else carregar();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 320 }}>
          <input className="campo" style={{ width: "100%", padding: "8px 10px", fontSize: 12.5 }}
            placeholder="Buscar demanda ou pessoa..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <select className="campo" style={{ width: 130, padding: "8px 10px", fontSize: 12.5 }} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="abertas">Abertas</option><option value="todas">Todas</option><option value="concluidas">Concluídas</option>
        </select>
        <select className="campo" style={{ width: 160, padding: "8px 10px", fontSize: 12.5 }} value={setorF} onChange={(e) => setSetorF(e.target.value)}>
          <option value="">Todos os setores</option>
          {setores.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="campo" style={{ width: 140, padding: "8px 10px", fontSize: 12.5 }} value={prioF} onChange={(e) => setPrioF(e.target.value)}>
          <option value="">Prioridade</option>
          <option value="urgente">Urgente</option><option value="alta">Alta</option><option value="normal">Normal</option><option value="baixa">Baixa</option>
        </select>
        <span className="chip" style={{ background: "var(--tint)", color: "var(--marca-texto)", fontWeight: 700 }}>{nAbertas} aberta(s)</span>
        {nUrgentes > 0 && <span className="chip" style={{ background: "rgba(220,38,38,.12)", color: "var(--vermelho)", fontWeight: 800 }}>⚡ {nUrgentes} urgente(s)</span>}
        {nAtrasadas > 0 && <span className="chip" style={{ background: "rgba(220,38,38,.10)", color: "var(--vermelho)", fontWeight: 700 }}>{nAtrasadas} atrasada(s)</span>}
        <span style={{ flex: 1 }}></span>
        {podeEditar && (
          <button className="btn-primaria" style={{ padding: "9px 15px", fontSize: 12.5 }} onClick={() => (form ? setForm(null) : abrirNova())}>
            <i className="ti ti-plus" style={{ fontSize: 14, marginRight: 5 }} aria-hidden="true"></i>Nova demanda
          </button>
        )}
      </div>

      {msg && <div className="anim-pop" style={{ marginBottom: 10, fontSize: 12.5, fontWeight: 600, color: "var(--vermelho)" }}>{msg}</div>}

      {form && podeEditar && (
        <div className="card-fl anim-pop" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>{form.id ? "Editar demanda" : "Nova demanda"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10 }}>
            <input className="campo" style={{ padding: "8px 10px", fontSize: 12.5 }} placeholder="O que precisa ser feito?" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            <select className="campo" style={{ padding: "8px 10px", fontSize: 12.5 }} value={form.colaborador_id} onChange={(e) => setForm({ ...form, colaborador_id: e.target.value })}>
              <option value="">Atribuir a...</option>
              {colabs.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.setor ? " · " + c.setor : ""}</option>)}
            </select>
            <input className="campo" type="date" style={{ padding: "8px 10px", fontSize: 12.5 }} value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
            <select className="campo" style={{ padding: "8px 10px", fontSize: 12.5 }} value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })}>
              <option value="baixa">Baixa</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option>
            </select>
          </div>
          <textarea className="campo" style={{ width: "100%", marginTop: 10, padding: "8px 10px", fontSize: 12.5, minHeight: 64, resize: "vertical" }}
            placeholder="Detalhes (opcional)" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn-primaria" style={{ padding: "8px 15px", fontSize: 12.5 }} disabled={ocupado} onClick={salvar}>{ocupado ? "Salvando…" : (form.id ? "Salvar" : "Adicionar")}</button>
            <button className="btn-contorno" style={{ padding: "8px 15px", fontSize: 12.5 }} onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {!lista && <div className="card-fl" style={{ padding: 16, fontSize: 13, color: "var(--muted)" }}>Carregando…</div>}

      {lista && visiveis.length === 0 && (
        <div className="card-fl" style={{ padding: "24px 18px", fontSize: 13, color: "var(--muted)", lineHeight: 1.6, textAlign: "center" }}>
          Nenhuma demanda por aqui.{!podeEditar && <span><br />Você enxerga as demandas do seu setor — se algo deveria aparecer, confirme com a direção se o seu login está vinculado ao seu cadastro (Configurações → Pessoas).</span>}
        </div>
      )}

      {lista && visiveis.map((d) => {
        const farol = farolPrazo(d);
        const feita = d.status === "concluida";
        return (
          <div key={d.id} className="card-fl" style={{ padding: "12px 14px", marginBottom: 8, display: "flex", gap: 11, alignItems: "flex-start", opacity: feita ? .68 : 1 }}>
            {podeEditar ? (
              <button onClick={() => marcar(d, feita ? "aberta" : "concluida")} aria-label={feita ? "Reabrir" : "Concluir"} title={feita ? "Reabrir" : "Concluir"}
                style={{ width: 24, height: 24, borderRadius: 8, flex: "none", marginTop: 2, cursor: "pointer", border: "1.5px solid " + (feita ? "var(--verde)" : "var(--linha)"), background: feita ? "rgba(22,163,74,.12)" : "var(--campo)", color: "var(--verde)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {feita && <i className="ti ti-check" style={{ fontSize: 14 }} aria-hidden="true"></i>}
              </button>
            ) : (
              <div style={{ width: 24, height: 24, borderRadius: 8, flex: "none", marginTop: 2, border: "1.5px solid " + (feita ? "var(--verde)" : "var(--linha)"), background: feita ? "rgba(22,163,74,.12)" : "var(--campo)", color: "var(--verde)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {feita && <i className="ti ti-check" style={{ fontSize: 14 }} aria-hidden="true"></i>}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, textDecoration: feita ? "line-through" : "none" }}>{d.titulo}</span>
                {d.prioridade !== "normal" && PRIO[d.prioridade] && <span className="chip" style={{ background: PRIO[d.prioridade].fundo, color: PRIO[d.prioridade].cor, fontWeight: 800, fontSize: 10.5 }}>{PRIO[d.prioridade].r}</span>}
                {farol && <span className="chip" style={{ background: farol.fundo, color: farol.cor, fontWeight: 700, fontSize: 10.5 }}>{farol.rotulo}</span>}
                {d.setor && <span className="chip" style={{ background: "var(--tint)", color: "var(--marca-texto)", fontWeight: 700, fontSize: 10.5 }}>{d.setor}</span>}
              </div>
              <div style={{ fontSize: 12, color: "var(--sec)", marginTop: 3 }}>
                <i className="ti ti-user" style={{ fontSize: 12, marginRight: 4 }} aria-hidden="true"></i>{d.nome}{d.cargo ? " · " + d.cargo : ""}
                {d.prazo && <span> · <i className="ti ti-calendar" style={{ fontSize: 12, marginRight: 3 }} aria-hidden="true"></i>{feita ? "prazo era " : "até "}{dataBr(d.prazo)}</span>}
                {feita && d.concluida_em && <span> · concluída em {dataBr(d.concluida_em.slice(0, 10))}</span>}
              </div>
              {d.descricao && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, whiteSpace: "pre-wrap" }}>{d.descricao}</div>}
            </div>
            {podeEditar && (
              <div style={{ display: "flex", gap: 9, flex: "none", marginTop: 3 }}>
                <i className="ti ti-pencil" style={{ fontSize: 15, cursor: "pointer", color: "var(--muted)" }} onClick={() => abrirEdicao(d)} aria-label="Editar" title="Editar"></i>
                <i className="ti ti-trash" style={{ fontSize: 15, cursor: "pointer", color: "var(--vermelho)" }} onClick={() => excluir(d)} aria-label="Excluir" title="Excluir"></i>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PreviaArquivo({ bucket, alvo, aoFechar, aoBaixar }) {
  const [estado, setEstado] = useState({ carregando: true });

  useEffect(() => {
    function tecla(e) { if (e.key === "Escape") aoFechar(); }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aoFechar]);

  useEffect(() => {
    let vivo = true;
    let urlObj = null;
    (async () => {
      try {
        const ext = (String(alvo.storage_path || alvo.nome).split(".").pop() || "").toLowerCase();
        const MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", bmp: "image/bmp", svg: "image/svg+xml", pdf: "application/pdf", mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/mp4", txt: "text/plain", csv: "text/csv", md: "text/plain", json: "application/json", log: "text/plain" };
        const tipo = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].indexOf(ext) >= 0 ? "imagem"
          : ext === "pdf" ? "pdf"
          : ["mp4", "webm", "mov"].indexOf(ext) >= 0 ? "video"
          : ["mp3", "wav", "ogg", "m4a"].indexOf(ext) >= 0 ? "audio"
          : ["txt", "csv", "md", "json", "log"].indexOf(ext) >= 0 ? "texto" : "outro";
        if (tipo === "outro") { if (vivo) setEstado({ tipo, ext }); return; }
        const { data, error } = await sb.storage.from(bucket).download(alvo.storage_path);
        if (error) throw error;
        if (!vivo) return;
        if (tipo === "texto") {
          const txt = await data.slice(0, 300000).text();
          if (vivo) setEstado({ tipo, texto: txt, cortado: data.size > 300000 });
        } else {
          urlObj = URL.createObjectURL(new Blob([data], { type: MIME[ext] || "application/octet-stream" }));
          if (vivo) setEstado({ tipo, url: urlObj });
        }
      } catch (e) { if (vivo) setEstado({ erro: e.message || String(e) }); }
    })();
    return () => { vivo = false; if (urlObj) URL.revokeObjectURL(urlObj); };
  }, [alvo, bucket]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(28,37,48,.55)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}
         onClick={(e) => { if (e.target === e.currentTarget) aoFechar(); }}>
      <div className="card-fl anim-pop" style={{ width: "min(940px, 96vw)", maxHeight: "92vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--linha)" }}>
          <i className="ti ti-file" style={{ fontSize: 16, color: "var(--marca-texto)", flex: "none" }} aria-hidden="true"></i>
          <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{alvo.nome}</div>
          <button className="btn-contorno" style={{ padding: "6px 12px", fontSize: 12, flex: "none" }} onClick={aoBaixar}>
            <i className="ti ti-download" style={{ fontSize: 13, marginRight: 5 }} aria-hidden="true"></i>Baixar
          </button>
          <button className="btn-fantasma" style={{ width: 30, height: 30, flex: "none" }} aria-label="Fechar" title="Fechar (Esc)" onClick={aoFechar}>
            <i className="ti ti-x" style={{ fontSize: 15 }} aria-hidden="true"></i>
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 300, background: "var(--campo)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto" }}>
          {estado.carregando && <div style={{ fontSize: 13, color: "var(--muted)", padding: 30 }}>Preparando a prévia…</div>}
          {estado.erro && <div style={{ fontSize: 13, color: "var(--vermelho)", padding: 24, textAlign: "center" }}>Não deu pra abrir a prévia: {estado.erro}</div>}
          {estado.tipo === "outro" && (
            <div style={{ fontSize: 13, color: "var(--muted)", padding: 26, textAlign: "center", lineHeight: 1.7 }}>
              Sem prévia para arquivos <b>.{estado.ext}</b> (o navegador não exibe esse tipo).<br />Use o botão <b>Baixar</b> aí em cima.
            </div>
          )}
          {estado.tipo === "imagem" && <img src={estado.url} alt={alvo.nome} style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }} />}
          {estado.tipo === "pdf" && <iframe title={alvo.nome} src={estado.url} style={{ width: "100%", height: "80vh", border: "none", background: "#fff" }} />}
          {estado.tipo === "video" && <video src={estado.url} controls style={{ maxWidth: "100%", maxHeight: "80vh" }} />}
          {estado.tipo === "audio" && <audio src={estado.url} controls style={{ width: "min(480px, 90%)", margin: "40px 0" }} />}
          {estado.tipo === "texto" && (
            <pre style={{ margin: 0, padding: 16, fontSize: 12, width: "100%", maxHeight: "80vh", overflow: "auto", whiteSpace: "pre-wrap", fontFamily: "var(--mono, monospace)" }}>{estado.texto}{estado.cortado ? "\n\n… (arquivo grande — prévia parcial; baixe para ver tudo)" : ""}</pre>
          )}
        </div>
      </div>
    </div>
  );
}

const EQ_PDF = {
  MARCA: [16, 104, 176], TINT: [231, 242, 251], INK: [28, 37, 48],
  SEC: [91, 101, 114], MUTED: [140, 151, 164], LINHA: [217, 228, 238], CAMPO: [246, 249, 252],
  ML: 20, MR: 20, W: 210, H: 297,
};
const EQ_MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function eqSlug(t) {
  return String(t || "documento").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
}

function eqVal(t) { return (t && String(t).trim()) || "____________________"; }

function pdfEqCabecalhos(doc, titulo, subtitulo) {
  const E = EQ_PDF;
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    const cx = E.ML + 5, cy = 16, r = 4.2;
    doc.setDrawColor(E.MARCA[0], E.MARCA[1], E.MARCA[2]); doc.setLineWidth(0.66); doc.setLineCap("round");
    [90, 0, 45, 135].forEach((ang) => {
      const a = ang * Math.PI / 180, dx = r * Math.cos(a), dy = r * Math.sin(a);
      doc.line(cx - dx, cy - dy, cx + dx, cy + dy);
    });
    doc.setTextColor(E.MARCA[0], E.MARCA[1], E.MARCA[2]); doc.setFont("helvetica", "bold"); doc.setFontSize(12.5);
    doc.text("GRUPO EQUILIBRIUM", E.ML + 12, 15.2);
    doc.setTextColor(E.MUTED[0], E.MUTED[1], E.MUTED[2]); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    doc.text("CLÍNICA EQUILIBRIUM MED CENTER LTDA · CNPJ 34.032.586/0001-98", E.ML + 12, 18.9);
    doc.setTextColor(E.SEC[0], E.SEC[1], E.SEC[2]); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.text(titulo, E.W - E.MR, 15.2, { align: "right" });
    doc.setTextColor(E.MUTED[0], E.MUTED[1], E.MUTED[2]); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.text(subtitulo, E.W - E.MR, 18.9, { align: "right" });
    doc.setDrawColor(E.MARCA[0], E.MARCA[1], E.MARCA[2]); doc.setLineWidth(0.5);
    doc.line(E.ML, 21, E.W - E.MR, 21);
    doc.setDrawColor(E.LINHA[0], E.LINHA[1], E.LINHA[2]); doc.setLineWidth(0.25);
    doc.line(E.ML, E.H - 14, E.W - E.MR, E.H - 14);
    doc.setTextColor(E.MUTED[0], E.MUTED[1], E.MUTED[2]); doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.text("Av. Cesário Alvim, 2001 · salas 101 a 303 · Nossa Senhora Aparecida · Uberlândia/MG", E.ML, E.H - 10.2);
    doc.text("Gerado pelo CORTEX Gestão · página " + i, E.W - E.MR, E.H - 10.2, { align: "right" });
  }
}

function PreviaEspelho({ prev, aoFechar }) {
  const [ix, setIx] = useState(0);
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") aoFechar(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  useEffect(() => { setIx(0); }, [prev]);
  if (!prev) return null;
  const docs = prev.docs && prev.docs.length ? prev.docs : [{ url: prev.url, nome: prev.nome, rotulo: null }];
  const atual = docs[Math.min(ix, docs.length - 1)];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,16,24,.66)", zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }} onClick={(e) => { if (e.target === e.currentTarget) aoFechar(); }}>
      <div className="anim-pop" style={{ background: "var(--branco)", borderRadius: 16, width: "min(1200px, 96vw)", height: "min(760px, 92vh)", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 26px 70px rgba(0,0,0,.45)", border: "1px solid var(--linha)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--linha)" }}>
          <i className="ti ti-report" style={{ color: "var(--marca-texto)", fontSize: 17 }} aria-hidden="true"></i>
          <div style={{ fontSize: 13.5, fontWeight: 700, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prev.titulo}{atual.rotulo ? " — " + atual.rotulo : ""}</div>
          {docs.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button className="btn-fantasma" style={{ width: "auto", padding: "5px 10px", fontSize: 13 }} disabled={ix === 0} onClick={() => setIx(ix - 1)}>&lsaquo;</button>
              <span style={{ fontSize: 12, color: "var(--sec)", fontWeight: 700 }}>{ix + 1}/{docs.length}</span>
              <button className="btn-fantasma" style={{ width: "auto", padding: "5px 10px", fontSize: 13 }} disabled={ix === docs.length - 1} onClick={() => setIx(ix + 1)}>&rsaquo;</button>
            </div>
          )}
          <a href={atual.url} download={atual.nome} className="btn-primaria" style={{ padding: "7px 13px", fontSize: 12.5, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}><i className="ti ti-download" aria-hidden="true"></i>Baixar PDF</a>
          <button className="btn-fantasma" style={{ width: "auto", padding: "7px 11px", fontSize: 12.5 }} onClick={aoFechar} title="Fechar"><i className="ti ti-x" aria-hidden="true"></i></button>
        </div>
        <iframe title="Documento" src={atual.url + "#toolbar=0&navpanes=0&view=FitH"} style={{ border: "none", width: "100%", flex: 1, background: "#F3F6FA" }} />
        <div style={{ padding: "6px 14px", fontSize: 11, color: "var(--muted)", borderTop: "1px solid var(--linha)" }}>Visualização — nada foi baixado ainda. No iPhone, se a prévia mostrar só a primeira página, use o Baixar PDF.</div>
      </div>
    </div>
  );
}

function fmtHMc(min, comSinal) {
  const neg = (min || 0) < 0; const n = Math.abs(Math.round(min || 0));
  const t = Math.floor(n / 60) + "h" + String(n % 60).padStart(2, "0");
  return (neg ? "-" : (comSinal ? "+" : "")) + t;
}

async function gerarEspelhoMensal(sb, colabId, mesRef, modo) {
  const ano = Number(mesRef.slice(0, 4)), mm = Number(mesRef.slice(5, 7));
  const nDias = new Date(ano, mm, 0).getDate();
  const d1 = mesRef + "-01", d2 = mesRef + "-" + String(nDias).padStart(2, "0");
  const isoIni = d1 + "T00:00:00-03:00";
  const isoFim = (mm === 12 ? (ano + 1) + "-01" : ano + "-" + String(mm + 1).padStart(2, "0")) + "-01T00:00:00-03:00";
  const addD = (iso, n) => { const t = new Date(iso + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
  const d1m = addD(d1, -6), d2m = addD(d2, 7);
  const isoIniM = d1m + "T00:00:00-03:00", isoFimM = addD(d2m, 1) + "T00:00:00-03:00";
  const dBR = (d) => (d || "").split("-").reverse().join("/");

  const rc = await sb.from("colaboradores").select("nome, cargo, unidade, regime, carga_semanal_horas, trabalha_sabado").eq("id", colabId).single();
  if (rc.error) throw rc.error;
  const col = rc.data;
  const carga = parseFloat(col.carga_semanal_horas) || 0;
  const flagSab = !!col.trabalha_sabado;

  const [rr, rf, ra, rx, rfa, rat, rfe, roc] = await Promise.all([
    sb.from("ponto_registros").select("tipo, batida").eq("colaborador_id", colabId).gte("batida", isoIniM).lt("batida", isoFimM).order("batida").limit(4600),
    sb.from("feriados").select("data, nome").gte("data", d1m).lte("data", d2m),
    sb.from("horas_extras_autorizacoes").select("data, minutos").eq("colaborador_id", colabId).gte("data", d1m).lte("data", d2m),
    sb.from("ponto_alertas_excesso").select("data, minutos_excedidos").eq("colaborador_id", colabId).gte("data", d1m).lte("data", d2m),
    sb.from("faltas").select("data, tipo, justificada").eq("colaborador_id", colabId).gte("data", d1).lte("data", d2),
    sb.from("atestados").select("inicio, fim").eq("colaborador_id", colabId).lte("inicio", d2).gte("fim", d1),
    sb.from("ferias").select("inicio, fim").eq("colaborador_id", colabId).lte("inicio", d2).gte("fim", d1),
    sb.from("ponto_ocorrencias").select("data, descricao").eq("colaborador_id", colabId).gte("data", d1m).lte("data", d2m),
  ]);
  if (rr.error) throw rr.error;
  const feri = {}; ((rf && rf.data) || []).forEach((f) => { feri[f.data] = f.nome; });
  const aut = {}; ((ra && ra.data) || []).forEach((a) => { aut[a.data] = a.minutos; });
  const exc = {}; ((rx && rx.data) || []).forEach((a) => { exc[a.data] = a.minutos_excedidos; });
  const falt = {}; ((rfa && rfa.data) || []).forEach((f) => { falt[f.data] = f; });
  const atst = (rat && rat.data) || [];
  const fer = (rfe && rfe.data) || [];
  const ocor = {}; ((roc && roc.data) || []).forEach((o) => { if (o.data) ocor[o.data] = (ocor[o.data] ? ocor[o.data] + " · " : "") + (o.descricao || ""); });

  const porDia = {};
  ((rr.data) || []).forEach((r) => {
    const dt = new Date(r.batida);
    const dLoc = dt.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const hLoc = dt.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
    (porDia[dLoc] = porDia[dLoc] || []).push(hLoc);
  });

  const dowDe = (dISO) => new Date(dISO + "T12:00:00Z").getUTCDay();
  const addDias = (dISO, n) => { const dt = new Date(dISO + "T12:00:00Z"); dt.setUTCDate(dt.getUTCDate() + n); return dt.toISOString().slice(0, 10); };
  const segundaDe = (dISO) => { const dw = dowDe(dISO); return addDias(dISO, dw === 0 ? -6 : 1 - dw); };
  const sabSemana = {};
  Object.keys(porDia).forEach((dISO) => { if (dowDe(dISO) === 6 && flagSab && !feri[dISO]) sabSemana[segundaDe(dISO)] = true; });

  function previstoDia(dISO) {
    if (!carga) return 0;
    const dw = dowDe(dISO);
    if (dw === 0) return 0;
    if (feri[dISO]) return 0;
    const comSab = !!sabSemana[segundaDe(dISO)];
    if (dw === 6) return comSab ? 240 : 0;
    return Math.max(Math.round(((comSab ? carga - 4 : carga) * 60) / 5), 0);
  }
  function realizadoDia(dISO) {
    const hs = porDia[dISO] || []; let t = 0;
    for (let i = 0; i + 1 < hs.length; i += 2) {
      const a = hs[i].split(":"), b = hs[i + 1].split(":");
      t += (Number(b[0]) * 60 + Number(b[1])) - (Number(a[0]) * 60 + Number(a[1]));
    }
    return Math.max(t, 0);
  }

  const SEMANA = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  const body = []; const semRows = []; const apagadas = [];
  let prevSem = 0, realSem = 0, prevMes = 0, realMes = 0, nSem = 0, semIni = null;
  let nFaltas = 0, nAtest = 0, nFerias = 0, minAut = 0, minExc = 0;
  Object.keys(aut).forEach(function (dk) { if (dk >= d1 && dk <= d2) minAut += aut[dk]; });
  Object.keys(exc).forEach(function (dk) { if (dk >= d1 && dk <= d2) minExc += exc[dk]; });

  for (let d = 1; d <= nDias; d++) {
    const dISO = mesRef + "-" + String(d).padStart(2, "0");
    if (!semIni) semIni = dISO;
    const dw = dowDe(dISO);
    const hs = porDia[dISO] || [];
    const prev = emFer ? 0 : previstoDia(dISO);
    const real = realizadoDia(dISO);
    const emAtest = atst.some(function (a) { return a.inicio <= dISO && a.fim >= dISO; });
    const emFer = fer.some(function (a) { return a.inicio <= dISO && a.fim >= dISO; });
    const obs = [];
    if (feri[dISO]) obs.push("FERIADO — " + feri[dISO]);
    if (emFer) { obs.push("FÉRIAS"); nFerias++; }
    else if (falt[dISO]) { obs.push(falt[dISO].justificada ? "FALTA JUSTIFICADA" : "FALTA"); if (!falt[dISO].justificada) nFaltas++; }
    else if (emAtest) { obs.push("ATESTADO"); nAtest++; }
    else if (prev > 0 && hs.length === 0) { obs.push("FALTA (sem registro)"); nFaltas++; }
    if (aut[dISO]) obs.push("Extra autorizada +" + fmtHMc(aut[dISO]));
    if (exc[dISO]) obs.push("EXCEDEU " + fmtHMc(exc[dISO]) + " s/ autorização");
    if (hs.length % 2 === 1) obs.push("batida ímpar — conferir");
    if (ocor[dISO]) obs.push(String(ocor[dISO]).slice(0, 58));
    const ent = hs[0] || "", sai = hs.length > 1 ? hs[hs.length - 1] : "", i1 = hs.length > 2 ? hs[1] : "", i2 = hs.length > 3 ? hs[2] : "";
    const saldo = real - prev;
    body.push([String(d).padStart(2, "0"), SEMANA[dw], ent, i1, i2, sai,
      prev ? fmtHMc(prev) : "—", (hs.length || prev) ? fmtHMc(real) : "—",
      (prev || hs.length) ? fmtHMc(saldo, true) : "—", obs.join(" · ")]);
    if ((dw === 0 || feri[dISO] || emFer) && hs.length === 0) apagadas.push(body.length - 1);
    prevSem += prev; realSem += real; prevMes += prev; realMes += real;
    if (dw === 0 || d === nDias) {
      nSem++;
      body.push([{ content: "SEMANA " + nSem + " · " + dBR(semIni).slice(0, 5) + " a " + dBR(dISO).slice(0, 5), colSpan: 6 },
        fmtHMc(prevSem), fmtHMc(realSem), fmtHMc(realSem - prevSem, true), ""]);
      semRows.push(body.length - 1);
      prevSem = 0; realSem = 0; semIni = null;
    }
  }

  const E = EQ_PDF, W = 297, H = 210, ML = 12, MR = 12;
  const doc = new window.jspdf.jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Bloco de identificação
  doc.setFillColor(E.CAMPO[0], E.CAMPO[1], E.CAMPO[2]);
  doc.setDrawColor(E.LINHA[0], E.LINHA[1], E.LINHA[2]); doc.setLineWidth(0.3);
  doc.roundedRect(ML, 21, W - ML - MR, 19, 2.5, 2.5, "FD");
  doc.setTextColor(E.MUTED[0], E.MUTED[1], E.MUTED[2]); doc.setFont("helvetica", "bold"); doc.setFontSize(6.6);
  doc.text("FUNCIONÁRIO", ML + 5, 26);
  doc.text("CARGO", ML + 118, 26);
  doc.text("UNIDADE / REGIME", ML + 200, 26);
  doc.setTextColor(E.INK[0], E.INK[1], E.INK[2]); doc.setFontSize(9.6);
  doc.text(String(col.nome || "").toUpperCase().slice(0, 58), ML + 5, 30.6);
  doc.setFontSize(8.6); doc.setFont("helvetica", "normal");
  doc.text(String(col.cargo || "—").slice(0, 44), ML + 118, 30.6);
  doc.text(((col.unidade || "—") + " · " + (col.regime || "—")).slice(0, 40), ML + 200, 30.6);
  doc.setFontSize(7.4); doc.setTextColor(E.SEC[0], E.SEC[1], E.SEC[2]);
  const fmH = (u) => { const h = Math.floor(u), m = Math.round((u - h) * 60); return h + "h" + (m ? String(m).padStart(2, "0") : ""); };
  let jorn;
  if (!carga) jorn = "Carga semanal não cadastrada na ficha — previsto zerado neste espelho.";
  else if (flagSab) jorn = "Carga semanal " + fmH(carga) + "  ·  dia útil " + fmH(carga / 5) + " (sem sábado) ou " + fmH((carga - 4) / 5) + " + sábado 4h  ·  tolerância 10 min/dia";
  else jorn = "Carga semanal " + fmH(carga) + "  ·  dia útil " + fmH(carga / 5) + " (seg–sex)  ·  tolerância 10 min/dia";
  doc.text(jorn, ML + 5, 36.4);
  doc.setFont("helvetica", "bold"); doc.setTextColor(E.MARCA[0], E.MARCA[1], E.MARCA[2]);
  doc.text((EQ_MESES[mm - 1] + " de " + ano).toUpperCase(), W - MR - 5, 36.4, { align: "right" });

  const molduraTab = [];
  doc.autoTable({
    startY: 43,
    rowPageBreak: "avoid",
    margin: { left: ML, right: MR, top: 21, bottom: 16 },
    head: [["DIA", "SEM", "ENTRADA", "INT. INÍCIO", "INT. FIM", "SAÍDA", "PREVISTO", "REALIZADO", "SALDO", "OBSERVAÇÕES"]],
    body: body,
    styles: { font: "helvetica", fontSize: 7.4, cellPadding: 1.3, lineColor: [238, 241, 245], lineWidth: 0.2, textColor: E.INK, valign: "middle" },
    headStyles: { fillColor: E.MARCA, textColor: [255, 255, 255], fontSize: 7.4, fontStyle: "bold", halign: "center", cellPadding: 1.6 },
    alternateRowStyles: { fillColor: [250, 252, 254] },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" }, 1: { cellWidth: 12, halign: "center" },
      2: { cellWidth: 18, halign: "center" }, 3: { cellWidth: 18, halign: "center" },
      4: { cellWidth: 18, halign: "center" }, 5: { cellWidth: 18, halign: "center" },
      6: { cellWidth: 19, halign: "center" }, 7: { cellWidth: 20, halign: "center" },
      8: { cellWidth: 18, halign: "center" }, 9: { cellWidth: "auto" },
    },
    didParseCell: function (dt) {
      if (dt.section !== "body") return;
      const i = dt.row.index, ci = dt.column.index, v = String(dt.cell.raw || "");
      if (semRows.indexOf(i) !== -1) {
        dt.cell.styles.fillColor = E.TINT; dt.cell.styles.fontStyle = "bold"; dt.cell.styles.fontSize = 7.6;
        dt.cell.styles.textColor = E.INK;
        if (ci === 0) dt.cell.styles.halign = "left";
        if (ci === 8) dt.cell.styles.textColor = v.indexOf("-") === 0 ? [185, 28, 28] : (v.indexOf("+") === 0 ? [21, 128, 61] : E.INK);
        return;
      }
      if (apagadas.indexOf(i) !== -1) dt.cell.styles.textColor = E.MUTED;
      if (ci === 8) {
        if (v.indexOf("-") === 0) dt.cell.styles.textColor = [185, 28, 28];
        else if (v.indexOf("+") === 0) dt.cell.styles.textColor = [21, 128, 61];
      }
      if (ci === 9) {
        if (v.indexOf("EXCEDEU") !== -1) { dt.cell.styles.textColor = [185, 28, 28]; dt.cell.styles.fontStyle = "bold"; }
        else if (v.indexOf("Extra autorizada") !== -1) dt.cell.styles.textColor = [154, 88, 10];
        else if (v.indexOf("FERIADO") !== -1) dt.cell.styles.textColor = E.MUTED;
      }
    },
    didDrawPage: function (dpg) {
      molduraTab.push({ pg: doc.internal.getCurrentPageInfo().pageNumber, y0: dpg.pageNumber === 1 ? 43 : dpg.settings.margin.top, y1: dpg.cursor.y });
    },
  });

  // Moldura-cartão arredondada da tabela (por página)
  molduraTab.forEach(function (m) {
    doc.setPage(m.pg);
    doc.setDrawColor(E.LINHA[0], E.LINHA[1], E.LINHA[2]); doc.setLineWidth(0.35);
    doc.roundedRect(ML - 1.6, m.y0 - 1.6, (W - ML - MR) + 3.2, (m.y1 - m.y0) + 3.2, 2.6, 2.6, "S");
  });

  // Fechamento do mês
  let y = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : 60) + 6;
  if (y > H - 56) { doc.addPage(); y = 26; }
  const difMes = realMes - prevMes;
  const larg3 = (W - ML - MR - 12) / 3;
  const caixas = [
    ["HORAS ACORDADAS", fmtHMc(prevMes), E.INK],
    ["HORAS REALIZADAS", fmtHMc(realMes), E.MARCA],
    ["DIFERENÇA", fmtHMc(difMes, true), difMes < 0 ? [185, 28, 28] : [21, 128, 61]],
  ];
  caixas.forEach(function (cx, i) {
    const x = ML + i * (larg3 + 6);
    doc.setFillColor(E.CAMPO[0], E.CAMPO[1], E.CAMPO[2]);
    doc.setDrawColor(E.LINHA[0], E.LINHA[1], E.LINHA[2]); doc.setLineWidth(0.3);
    doc.roundedRect(x, y, larg3, 17, 2.5, 2.5, "FD");
    doc.setTextColor(E.MUTED[0], E.MUTED[1], E.MUTED[2]); doc.setFont("helvetica", "bold"); doc.setFontSize(6.6);
    doc.text(cx[0], x + 5, y + 5.4);
    doc.setTextColor(cx[2][0], cx[2][1], cx[2][2]); doc.setFontSize(13.5);
    doc.text(cx[1], x + 5, y + 12.8);
  });
  const selo = difMes < 0 ? "NEGATIVO" : (difMes > 0 ? "POSITIVO" : "EM DIA");
  const seloCor = difMes < 0 ? [185, 28, 28] : (difMes > 0 ? [21, 128, 61] : [91, 101, 114]);
  doc.setFillColor(seloCor[0], seloCor[1], seloCor[2]);
  const sx = ML + 2 * (larg3 + 6) + larg3 - 26;
  doc.roundedRect(sx, y + 4.4, 22, 7.4, 3.6, 3.6, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(7.6);
  doc.text(selo, sx + 11, y + 9.2, { align: "center" });

  y += 22;
  doc.setTextColor(E.SEC[0], E.SEC[1], E.SEC[2]); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text(nFaltas + " falta(s) sem justificativa  ·  " + nAtest + " dia(s) de atestado  ·  " + nFerias + " dia(s) de férias  ·  extras autorizadas +" + fmtHMc(minAut) + "  ·  excedente sem autorização " + fmtHMc(minExc), ML, y);

  y += 12;
  if (y > H - 22) { doc.addPage(); y = 30; }
  doc.setDrawColor(E.INK[0], E.INK[1], E.INK[2]); doc.setLineWidth(0.3);
  doc.line(ML + 8, y + 8, ML + 108, y + 8);
  doc.line(W - MR - 108, y + 8, W - MR - 8, y + 8);
  doc.setFontSize(7.4); doc.setTextColor(E.SEC[0], E.SEC[1], E.SEC[2]);
  doc.text(String(col.nome || "").toUpperCase().slice(0, 52), ML + 58, y + 12.2, { align: "center" });
  doc.text("CLÍNICA EQUILIBRIUM MED CENTER LTDA", W - MR - 58, y + 12.2, { align: "center" });

  // Cabeçalho e rodapé (todas as páginas), paisagem
  const nP = doc.getNumberOfPages();
  for (let i = 1; i <= nP; i++) {
    doc.setPage(i);
    const cx0 = ML + 4.6, cy0 = 11.4, r0 = 3.5;
    doc.setDrawColor(E.MARCA[0], E.MARCA[1], E.MARCA[2]); doc.setLineWidth(0.6); doc.setLineCap("round");
    [90, 0, 45, 135].forEach(function (ang) {
      const a = ang * Math.PI / 180, dx = r0 * Math.cos(a), dy = r0 * Math.sin(a);
      doc.line(cx0 - dx, cy0 - dy, cx0 + dx, cy0 + dy);
    });
    doc.setTextColor(E.MARCA[0], E.MARCA[1], E.MARCA[2]); doc.setFont("helvetica", "bold"); doc.setFontSize(11.5);
    doc.text("GRUPO EQUILIBRIUM", ML + 11, 10.6);
    doc.setTextColor(E.MUTED[0], E.MUTED[1], E.MUTED[2]); doc.setFont("helvetica", "normal"); doc.setFontSize(6.8);
    doc.text("CLÍNICA EQUILIBRIUM MED CENTER LTDA · CNPJ 34.032.586/0001-98", ML + 11, 14);
    doc.setTextColor(E.SEC[0], E.SEC[1], E.SEC[2]); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.text("ESPELHO MENSAL DE PONTO", W - MR, 10.6, { align: "right" });
    doc.setTextColor(E.MUTED[0], E.MUTED[1], E.MUTED[2]); doc.setFont("helvetica", "normal"); doc.setFontSize(6.8);
    doc.text("Controle de frequência · " + EQ_MESES[mm - 1] + "/" + ano, W - MR, 14, { align: "right" });
    doc.setDrawColor(E.MARCA[0], E.MARCA[1], E.MARCA[2]); doc.setLineWidth(0.45);
    doc.line(ML, 16.4, W - MR, 16.4);
    doc.setDrawColor(E.LINHA[0], E.LINHA[1], E.LINHA[2]); doc.setLineWidth(0.2);
    doc.line(ML, H - 10.5, W - MR, H - 10.5);
    doc.setTextColor(E.MUTED[0], E.MUTED[1], E.MUTED[2]); doc.setFontSize(6.6);
    doc.text("Av. Cesário Alvim, 2001 · salas 101 a 303 · Nossa Senhora Aparecida · Uberlândia/MG", ML, H - 6.8);
    doc.text("Gerado pelo CORTEX Gestão · página " + i + " de " + nP, W - MR, H - 6.8, { align: "right" });
  }

  registrarEvento("gerar", "rh", "Espelho mensal de " + col.nome + " (" + mesRef + ")" + (modo === "ver" ? " — visualização" : ""));
  const nomeArq = "Espelho_" + eqSlug(col.nome) + "_" + mesRef + ".pdf";
  if (modo === "ver") {
    return { url: doc.output("bloburl"), nome: nomeArq, titulo: "Espelho de ponto — " + col.nome + " — " + EQ_MESES[mm - 1] + "/" + ano };
  }
  doc.save(nomeArq);
}

function pdfEstagioTermo(d, modo) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const E = EQ_PDF, LARG = E.W - E.ML - E.MR;
  let y = 30;
  const ensure = (h) => { if (y + h > E.H - 18) { doc.addPage(); y = 30; } };

  doc.setTextColor(E.INK[0], E.INK[1], E.INK[2]); doc.setFont("helvetica", "bold"); doc.setFontSize(14.5);
  doc.text("TERMO DE COMPROMISSO DE ESTÁGIO", E.W / 2, y, { align: "center" }); y += 5;
  doc.setTextColor(E.MUTED[0], E.MUTED[1], E.MUTED[2]); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
  doc.text("Formalizado de acordo com a Lei nº 11.788/2008", E.W / 2, y, { align: "center" }); y += 6;

  function caixaParte(rotulo, texto) {
    doc.autoTable({
      startY: y, margin: { left: E.ML, right: E.MR },
      head: [[rotulo]], body: [[texto]], theme: "grid",
      headStyles: { fillColor: E.MARCA, textColor: 255, fontSize: 7.2, fontStyle: "bold", cellPadding: { top: 1.4, bottom: 1.4, left: 3, right: 3 } },
      bodyStyles: { fillColor: E.CAMPO, textColor: E.INK, fontSize: 8.8, cellPadding: { top: 2, bottom: 2.4, left: 3, right: 3 }, lineColor: E.LINHA, lineWidth: 0.2 },
      styles: { font: "helvetica" },
    });
    y = doc.lastAutoTable.finalY + 2.5;
  }
  caixaParte("CONCEDENTE", "CLÍNICA EQUILIBRIUM MED CENTER LTDA, sociedade empresária inscrita no CNPJ 34.032.586/0001-98, estabelecida na Av. Cesário Alvim, 2001, salas 101 a 303, Bairro Nossa Senhora Aparecida, Uberlândia/MG.");
  caixaParte("ESTAGIÁRIO(A)", eqVal(d.nome) + ", inscrito(a) no CPF " + eqVal(d.cpf) + " e RG " + eqVal(d.rg) + ", residente na " + eqVal(d.endereco) + ", " + eqVal(d.cidade) + ", CEP " + eqVal(d.cep) + ".");
  caixaParte("INSTITUIÇÃO DE ENSINO INTERVENIENTE", eqVal(d.instNome) + ", inscrita no CNPJ " + eqVal(d.instCnpj) + ", estabelecida na " + eqVal(d.instEnd) + ".");

  const paresQ = [
    ["ÁREA DO ESTÁGIO", d.area, "DURAÇÃO", d.duracao],
    ["INÍCIO", d.inicioBr, "JORNADA", d.jornadaQuadro],
    ["BOLSA-AUXÍLIO", d.bolsaQuadro, "SUPERVISOR", d.supervisor],
  ];
  const corpoQ = [];
  paresQ.forEach((pr) => { corpoQ.push([pr[0], pr[2]]); corpoQ.push([eqVal(pr[1]), eqVal(pr[3])]); });
  doc.autoTable({
    startY: y + 1, margin: { left: E.ML, right: E.MR },
    body: corpoQ, theme: "grid",
    styles: { font: "helvetica", fillColor: E.TINT, lineColor: E.LINHA, lineWidth: 0.2 },
    didParseCell: (h) => {
      if (h.row.index % 2 === 0) {
        h.cell.styles.fontSize = 6.4; h.cell.styles.textColor = E.MUTED; h.cell.styles.fontStyle = "bold";
        h.cell.styles.cellPadding = { top: 1.3, bottom: 0.2, left: 3, right: 3 };
      } else {
        h.cell.styles.fontSize = 9; h.cell.styles.fontStyle = "bold"; h.cell.styles.textColor = E.MARCA;
        h.cell.styles.cellPadding = { top: 0.2, bottom: 1.6, left: 3, right: 3 };
      }
    },
  });
  y = doc.lastAutoTable.finalY + 5;

  function clausula(titulo, itens) {
    ensure(16);
    doc.setTextColor(E.MARCA[0], E.MARCA[1], E.MARCA[2]); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text(titulo, E.ML, y); y += 4.6;
    doc.setTextColor(E.INK[0], E.INK[1], E.INK[2]); doc.setFont("helvetica", "normal"); doc.setFontSize(8.8);
    itens.forEach((t) => {
      const linhas = doc.splitTextToSize(t, LARG);
      const h = linhas.length * 4.4 + 1.2;
      ensure(h + 2);
      doc.text(t, E.ML, y, { maxWidth: LARG, align: "justify", lineHeightFactor: 1.42 });
      y += h;
    });
    y += 2;
  }
  clausula("CLÁUSULA PRIMEIRA — OBJETO DO ESTÁGIO", [
    "1.1. O presente Termo estabelece as condições básicas para a consecução do estágio em " + eqVal(d.area) + ", nas dependências da CONCEDENTE.",
    "1.2. O estágio visa o exercício prático de competências próprias da atividade profissional e a contextualização curricular, objetivando o desenvolvimento do(a) educando(a) para a vida cidadã e para o trabalho, proporcionadas pela aprendizagem social, profissional e cultural no ambiente de trabalho.",
    "1.3. O(A) ESTAGIÁRIO(A) declara estar regularmente matriculado(a) na INSTITUIÇÃO DE ENSINO INTERVENIENTE, condição indispensável para a realização do estágio.",
    "1.4. As atividades a serem desenvolvidas constam do ANEXO I — Plano de Atividades de Estágio, parte integrante deste Termo, ajustado conforme o curso do(a) estagiário(a) e a função exercida.",
  ]);
  clausula("CLÁUSULA SEGUNDA — DO PERÍODO E DO ESTÁGIO", [
    "2.1. O estágio terá duração inicial de " + eqVal(d.duracao) + ", com início em " + eqVal(d.inicioBr) + ".",
    "2.1.1. Rescisão: este Termo poderá ser rescindido unilateralmente por qualquer das partes, a qualquer tempo, mediante comunicação escrita, sem multa ou indenização, observada a comunicação à Instituição de Ensino.",
    "2.1.2. Prorrogação: o estágio poderá ser prorrogado uma vez, por igual período, caso a empresa concedente tenha necessidade, respeitado o limite legal de 2 (dois) anos. Essa prorrogação será formalizada por meio de um Termo de Encerramento de Compromisso de Estágio.",
    "2.2. O estágio será cumprido nas dependências da CONCEDENTE, de segunda a sexta-feira, em " + eqVal(d.jornadaClausula) + " diários, com a distribuição dessas horas definida conforme as necessidades da CONCEDENTE.",
    "2.3. O horário do estágio é compatível com o horário escolar, sendo concedidos períodos especiais quando conflitante com atividades obrigatórias do curso.",
    "2.4. Serão elaborados relatórios de acompanhamento do estágio em conformidade com as exigências da INSTITUIÇÃO DE ENSINO INTERVENIENTE.",
  ]);
  clausula("CLÁUSULA TERCEIRA — DA BOLSA-AUXÍLIO E DO SEGURO", [
    "3.1. Será concedida bolsa-auxílio no valor de " + eqVal(d.bolsaClausula) + " mensais, paga mediante depósito em conta bancária até o 5º dia útil do mês subsequente" + (d.vtClausula || ", já incluído o auxílio-transporte") + ".",
    "3.2. Haverá a contratação de seguro pela parte Concedente, através da inclusão do(a) estagiário(a) na Apólice Coletiva de Acidentes Pessoais da CONCEDENTE.",
    "3.3. A bolsa-auxílio possui natureza contraprestativa, sendo devida exclusivamente nos períodos de efetiva realização das atividades de estágio, nos termos deste instrumento e da legislação aplicável.",
  ]);
  clausula("CLÁUSULA QUARTA — CONDIÇÕES GERAIS", [
    "4.1. Aplicam-se a este Termo as disposições da Lei nº 11.788/2008. O estágio não cria vínculo empregatício de qualquer natureza, observados os requisitos legais.",
    "4.2. O(A) ESTAGIÁRIO(A) compromete-se a observar as normas internas da CONCEDENTE.",
    "4.3. É assegurado ao(à) estagiário(a), sempre que o estágio tenha duração igual ou superior a 1 (um) ano, período de recesso de 30 (trinta) dias — ou o proporcional ao período estagiado — a ser gozado preferencialmente durante suas férias escolares.",
    "4.4. Caberá ao(à) estagiário(a) a obrigação de informar à parte Concedente quaisquer alterações ocorridas no transcurso da sua atividade escolar, tais como interrupção de frequência às aulas, mudança de curso ou transferência de Instituição de Ensino.",
    "4.5. É de responsabilidade do(a) Estagiário(a) preservar o sigilo e a confidencialidade das informações a que tiver acesso no decorrer do seu estágio junto à Parte Concedente.",
    "4.6. Serão motivos de rescisão automática do presente Instrumento Jurídico:",
    "4.6.1. O abandono ou a interrupção do curso pelo(a) Estagiário(a), o trancamento de matrícula ou a conclusão do curso;",
    "4.6.2. O descumprimento de quaisquer das cláusulas previstas neste Termo.",
    "4.7. O presente instrumento poderá ser renovado na forma da Lei e denunciado, a qualquer tempo, mediante comunicação escrita, pela parte Concedente ou pelo(a) Estagiário(a).",
    "4.8. Fica eleito o foro da comarca de Uberlândia/MG para dirimir quaisquer questões oriundas deste Termo.",
  ]);

  ensure(52);
  doc.setTextColor(E.INK[0], E.INK[1], E.INK[2]); doc.setFont("helvetica", "normal"); doc.setFontSize(8.8);
  doc.text("E por estarem justas e acordadas, as partes assinam o presente em 3 (três) vias de igual teor.", E.ML, y, { maxWidth: LARG }); y += 5;
  doc.text("Uberlândia/MG, " + d.dataExtenso + ".", E.ML, y); y += 24;

  function linhasAssinatura(itens) {
    const col = LARG / itens.length;
    let alturaMax = 0;
    itens.forEach((a, i) => {
      const x0 = E.ML + i * col + 4, x1 = E.ML + (i + 1) * col - 4, xm = (x0 + x1) / 2;
      doc.setDrawColor(E.SEC[0], E.SEC[1], E.SEC[2]); doc.setLineWidth(0.2); doc.line(x0, y, x1, y);
      doc.setFont("helvetica", "bold"); doc.setFontSize(7.4); doc.setTextColor(E.SEC[0], E.SEC[1], E.SEC[2]);
      const nomeLinhas = doc.splitTextToSize(a[0], col - 10);
      doc.text(nomeLinhas, xm, y + 3.6, { align: "center" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      const yy = y + 3.6 + nomeLinhas.length * 3.2 + 1.1;
      doc.text(a[1], xm, yy, { align: "center" });
      alturaMax = Math.max(alturaMax, yy - y + 4);
    });
    y += alturaMax + 6;
  }
  linhasAssinatura([["CLÍNICA EQUILIBRIUM MED CENTER LTDA", "Concedente"],
                    [eqVal(d.nome), "Estagiário(a)"],
                    [d.instSigla || "INSTITUIÇÃO DE ENSINO", "Interveniente"]]);

  doc.addPage(); y = 30;
  doc.setTextColor(E.INK[0], E.INK[1], E.INK[2]); doc.setFont("helvetica", "bold"); doc.setFontSize(12.5);
  doc.text("ANEXO I — PLANO DE ATIVIDADES DE ESTÁGIO", E.W / 2, y, { align: "center" }); y += 4.6;
  doc.setTextColor(E.MUTED[0], E.MUTED[1], E.MUTED[2]); doc.setFont("helvetica", "normal"); doc.setFontSize(8.2);
  doc.text("Parte integrante do Termo de Compromisso de Estágio", E.W / 2, y, { align: "center" }); y += 7;
  doc.setTextColor(E.MARCA[0], E.MARCA[1], E.MARCA[2]); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  y += 0;
  doc.setTextColor(E.INK[0], E.INK[1], E.INK[2]); doc.setFont("helvetica", "normal"); doc.setFontSize(8.6);
  doc.text("Estagiário(a): " + eqVal(d.nome) + "   ·   Supervisor responsável: " + eqVal(d.supervisor), E.ML, y, { maxWidth: LARG }); y += 7;

  const atvBase = (d.atribuicoes && d.atribuicoes.trim())
    ? d.atribuicoes.trim().split(/\n+/).map((l) => "• " + l.replace(/^[-•*]\s*/, ""))
    : ["• _________________________________________________________", "• _________________________________________________________", "• _________________________________________________________"];
  const atvLinhas = [];
  atvBase.forEach((l) => { doc.splitTextToSize(l, LARG - 10).forEach((x) => atvLinhas.push(x)); });
  const hBox = 9 + atvLinhas.length * 4.5 + 5;
  ensure(hBox + 30);
  doc.setFillColor(E.TINT[0], E.TINT[1], E.TINT[2]); doc.setDrawColor(E.MARCA[0], E.MARCA[1], E.MARCA[2]); doc.setLineWidth(0.3);
  doc.rect(E.ML, y, LARG, 7, "FD");
  doc.rect(E.ML, y, LARG, hBox, "S");
  doc.setTextColor(E.MUTED[0], E.MUTED[1], E.MUTED[2]); doc.setFont("helvetica", "bold"); doc.setFontSize(6.6);
  doc.text("DESCRIÇÃO DAS ATIVIDADES", E.ML + 3, y + 4.5);
  doc.setTextColor(E.INK[0], E.INK[1], E.INK[2]); doc.setFont("helvetica", "normal"); doc.setFontSize(8.8);
  doc.text(atvLinhas, E.ML + 4, y + 12, { lineHeightFactor: 1.45 });
  y += hBox + 8;
  ensure(46);
  doc.setTextColor(E.MARCA[0], E.MARCA[1], E.MARCA[2]); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text("DECLARAÇÃO DE RESPONSABILIDADE", E.ML, y); y += 4.6;
  doc.setTextColor(E.INK[0], E.INK[1], E.INK[2]); doc.setFont("helvetica", "normal"); doc.setFontSize(8.8);
  const declTxt = "O(A) supervisor(a) " + eqVal(d.supervisor) + " declara assumir a responsabilidade técnica pela supervisão das atividades descritas neste Plano, desenvolvidas por " + eqVal(d.nome) + " nas dependências da CONCEDENTE, zelando pela compatibilidade entre as atividades, o curso de formação do(a) estagiário(a) e a função exercida. O(A) estagiário(a) declara ciência das atividades previstas e compromisso com sua execução sob supervisão.";
  const declLin = doc.splitTextToSize(declTxt, LARG);
  ensure(declLin.length * 4.4 + 28);
  doc.text(declTxt, E.ML, y, { maxWidth: LARG, align: "justify", lineHeightFactor: 1.42 });
  y += declLin.length * 4.4 + 18;
  linhasAssinatura([[eqVal(d.nome), "Estagiário(a)"], [eqVal(d.supervisor), "Supervisor(a) responsável"]]);

  pdfEqCabecalhos(doc, "TERMO DE COMPROMISSO DE ESTÁGIO", "Lei nº 11.788/2008");
  const nomeArqT = "Termo_Estagio_" + eqSlug(d.nome) + ".pdf";
  if (modo === "ver") return { url: doc.output("bloburl"), nome: nomeArqT };
  doc.save(nomeArqT);
}

function pdfEstagioFolha(d, modo) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const E = EQ_PDF, LARG = E.W - E.ML - E.MR;
  let y = 30;

  doc.setTextColor(E.INK[0], E.INK[1], E.INK[2]); doc.setFont("helvetica", "bold"); doc.setFontSize(14.5);
  doc.text("FOLHA DE ROSTO — PASTA DO COLABORADOR", E.W / 2, y, { align: "center" }); y += 5;
  doc.setTextColor(E.MUTED[0], E.MUTED[1], E.MUTED[2]); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
  doc.text("Identificação, vínculo e conferência de documentos", E.W / 2, y, { align: "center" }); y += 4;

  function secao(titulo) {
    doc.setTextColor(E.MARCA[0], E.MARCA[1], E.MARCA[2]); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text(titulo, E.ML, y + 5); y += 7;
  }
  function grade(pares) {
    const corpo = [];
    for (let i = 0; i < pares.length; i += 2) {
      const a = pares[i], b = pares[i + 1] || ["", ""];
      corpo.push([a[0], b[0]]);
      corpo.push([eqVal(a[1]), b[0] ? eqVal(b[1]) : ""]);
    }
    doc.autoTable({
      startY: y, margin: { left: E.ML, right: E.MR }, body: corpo, theme: "grid",
      styles: { font: "helvetica", fillColor: E.CAMPO, lineColor: E.LINHA, lineWidth: 0.2 },
      didParseCell: (h) => {
        if (h.row.index % 2 === 0) {
          h.cell.styles.fontSize = 6.4; h.cell.styles.textColor = E.MUTED; h.cell.styles.fontStyle = "bold";
          h.cell.styles.cellPadding = { top: 1.2, bottom: 0.2, left: 3, right: 3 };
        } else {
          h.cell.styles.fontSize = 8.8; h.cell.styles.fontStyle = "bold"; h.cell.styles.textColor = E.MARCA;
          h.cell.styles.cellPadding = { top: 0.2, bottom: 1.5, left: 3, right: 3 };
        }
      },
    });
    y = doc.lastAutoTable.finalY + 2;
  }

  secao("IDENTIFICAÇÃO");
  grade([["NOME COMPLETO", d.nome], ["DATA DE NASCIMENTO", d.nascimentoBr],
         ["ENDEREÇO", d.endereco], ["CIDADE / CEP", (d.cidade || "") + (d.cep ? " · " + d.cep : "")],
         ["TELEFONE", d.telefone], ["E-MAIL", d.email],
         ["ESTADO CIVIL", d.estadoCivil], ["ESCOLARIDADE", d.escolaridade],
         ["INSTITUIÇÃO", d.instSigla]]);

  secao("VÍNCULO E ESTÁGIO");
  const VINC = ["Funcionário CLT", "Estagiário", "Prestador PJ", "Prestador PF", "Outros"];
  doc.setTextColor(E.INK[0], E.INK[1], E.INK[2]); doc.setFont("helvetica", "normal"); doc.setFontSize(8.6);
  doc.text(VINC.map((v) => "( " + (v === d.vinculo ? "X" : "  ") + " ) " + v).join("    "), E.ML, y + 3); y += 5.5;
  grade([["FUNÇÃO", d.funcao], ["SUPERVISOR", d.supervisor],
         ["ADMISSÃO", d.admissaoBr], ["PERÍODO DO ESTÁGIO", d.periodoBr],
         ["HORÁRIO", d.horario], ["BOLSA-AUXÍLIO / PAGAMENTO", d.bolsaPix]]);

  secao("DOCUMENTOS NA PASTA");
  const DOCS = ["Contrato / Termo de Estágio", "CTPS", "Número do PIS", "CPF", "RG", "Título de eleitor", "CNH",
    "Comprovante de residência", "Certificado de reservista", "Certidão de nascimento ou casamento",
    "Certidão de nascimento de filhos (0 a 14 anos)", "Cartão de vacina", "Atestado de escolaridade"];
  const OBS = { "CPF": d.cpf || "", "RG": d.rg || "" };
  doc.autoTable({
    startY: y, margin: { left: E.ML, right: E.MR },
    head: [["DOCUMENTO", "NA PASTA", "OBSERVAÇÃO"]],
    body: DOCS.map((nm) => [nm, "(   ) Sim    (   ) Não", OBS[nm] || ""]),
    theme: "grid",
    headStyles: { fillColor: E.TINT, textColor: E.MUTED, fontSize: 6.6, fontStyle: "bold", cellPadding: { top: 1.6, bottom: 1.6, left: 3, right: 3 }, lineColor: E.MARCA, lineWidth: 0.25 },
    bodyStyles: { fontSize: 8, textColor: E.INK, cellPadding: { top: 1.7, bottom: 1.7, left: 3, right: 3 }, lineColor: E.LINHA, lineWidth: 0.2 },
    alternateRowStyles: { fillColor: E.CAMPO },
    columnStyles: { 0: { cellWidth: LARG * 0.46 }, 1: { cellWidth: LARG * 0.24 }, 2: { cellWidth: LARG * 0.30 } },
    styles: { font: "helvetica" },
  });

  pdfEqCabecalhos(doc, "FOLHA DE ROSTO — PASTA DO COLABORADOR", "Documento interno");
  const nomeArqF = "Folha_Rosto_" + eqSlug(d.nome) + ".pdf";
  if (modo === "ver") return { url: doc.output("bloburl"), nome: nomeArqF };
  doc.save(nomeArqF);
}

const ATIV_PADRAO = {
  "Psicologia — Análise do Comportamento Aplicada (ABA)": [
    "Acompanhamento das sessões de intervenção ABA sob supervisão",
    "Coleta e registro de dados dos programas de ensino",
    "Apoio na preparação de materiais e ambientes de atendimento",
    "Participação em discussões de caso e supervisões clínicas",
    "Registro das atividades no sistema interno",
  ],
  "Neuropsicologia": [
    "Observação e apoio em avaliações neuropsicológicas sob supervisão",
    "Aplicação assistida de instrumentos autorizados ao estágio",
    "Tabulação e organização de protocolos e resultados",
    "Participação em devolutivas e discussões de caso com o supervisor",
    "Registro das atividades no sistema interno",
  ],
  "Fonoaudiologia": [
    "Observação e apoio em atendimentos fonoaudiológicos sob supervisão",
    "Auxílio na preparação de materiais terapêuticos",
    "Registro de evolução das sessões acompanhadas",
    "Participação em discussões de caso e orientações a famílias",
    "Registro das atividades no sistema interno",
  ],
  "Psicologia Clínica": [
    "Observação de atendimentos clínicos sob supervisão",
    "Apoio em acolhimentos e triagens",
    "Estudo e discussão de casos com o supervisor",
    "Elaboração de registros e relatórios de estágio",
    "Registro das atividades no sistema interno",
  ],
  "Call Center": [
    "Atendimento telefônico e por WhatsApp a pacientes e responsáveis",
    "Agendamento, confirmação e remarcação de consultas e terapias",
    "Orientações sobre convênios, valores e documentação",
    "Registro de ocorrências e informativos no sistema interno",
    "Apoio à recepção e à coordenação administrativa",
  ],
  "Recepção": [
    "Acolhimento presencial de pacientes e responsáveis",
    "Cadastro, conferência de documentos e atualização de dados",
    "Organização de agendas e apoio ao fluxo das salas",
    "Recebimento de pagamentos e emissão de comprovantes",
    "Registro das atividades no sistema interno",
  ],
  "Administrativo": [
    "Apoio às rotinas administrativas e de arquivo",
    "Organização de documentos e pastas de colaboradores",
    "Lançamentos e conferências em planilhas e sistemas internos",
    "Apoio ao call center e à recepção quando necessário",
    "Registro das atividades no sistema interno",
  ],
  "Estágio de Observação": [
    "Observação estruturada dos atendimentos autorizados",
    "Registro de observações conforme roteiro do supervisor",
    "Participação em discussões de caso e supervisões",
    "Cumprimento das normas de sigilo e conduta da clínica",
  ],
};

function AbaDocsEstagio({ ctx }) {
  const AREAS = ["Psicologia — Análise do Comportamento Aplicada (ABA)", "Neuropsicologia", "Fonoaudiologia", "Psicologia Clínica", "Call Center", "Recepção", "Administrativo", "Estágio de Observação"];
  const DURACOES = [{ v: 3, r: "3 (três) meses" }, { v: 6, r: "6 (seis) meses" }, { v: 12, r: "12 (doze) meses" }];
  const JORNADAS = [
    { id: "430", clausula: "4 (quatro) horas e 30 (trinta) minutos", quadro: "Seg. a sex., 4h30 diárias (22h30 semanais)" },
    { id: "400", clausula: "4 (quatro) horas", quadro: "Seg. a sex., 4h diárias (20h semanais)" },
    { id: "600", clausula: "6 (seis) horas", quadro: "Seg. a sex., 6h diárias (30h semanais)" },
    { id: "outra", clausula: "", quadro: "" },
  ];
  const VINCULOS = ["Funcionário CLT", "Estagiário", "Prestador PJ", "Prestador PF", "Outros"];

  const [colabs, setColabs] = useState(null);
  const [docPrev, setDocPrev] = useState(null);
  const [insts, setInsts] = useState([]);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({
    colaboradorId: "", tipo: "pacote", instituicaoId: "", area: AREAS[0], duracao: 6,
    inicio: "", jornada: "430", jornadaCustom: "", bolsa: "1.200,00", bolsaExtenso: "mil e duzentos reais",
    supervisorId: "", horario: "07:00 às 11:30", vinculo: "Estagiário", areaCustom: "", vt: "incluso", atribuicoes: (ATIV_PADRAO["Psicologia — Análise do Comportamento Aplicada (ABA)"] || []).join("\n"),
  });

  useEffect(() => {
    (async () => {
      const r = await sb.from("colaboradores")
        .select("id, nome, cpf, rg, endereco, cidade, cep, estado_civil, telefone, email, nascimento, cargo, admissao, formacao, periodo_curso, instituicao_id, dados_bancarios, registro_profissional, status, contrato_arquivo_id")
        .order("nome").limit(20000);
      if (r.error) { setMsg("Erro: " + r.error.message + (r.error.message.indexOf("instituicao_id") !== -1 || r.error.message.indexOf("periodo_curso") !== -1 ? " — rode o 28_documentos_estagio.sql." : (r.error.message.indexOf("contrato_arquivo_id") !== -1 ? " — rode o 31_contrato_vinculo.sql." : ""))); setColabs([]); return; }
      setColabs(r.data || []);
      const i = await sb.from("instituicoes").select("id, sigla, nome, cnpj, endereco").eq("ativo", true).order("sigla");
      if (!i.error) setInsts(i.data || []);
    })();
  }, []);

  const porId = useMemo(() => { const m = {}; (colabs || []).forEach((c) => { m[c.id] = c; }); return m; }, [colabs]);
  const colab = porId[f.colaboradorId] || null;
  const inst = insts.filter((i) => i.id === (f.instituicaoId || (colab && colab.instituicao_id)))[0] || null;
  const sup = porId[f.supervisorId] || null;
  const jor = JORNADAS.filter((j) => j.id === f.jornada)[0] || JORNADAS[0];

  function escolherColab(id) {
    const c = porId[id];
    setF({ ...f, colaboradorId: id, instituicaoId: (c && c.instituicao_id) || "" });
    setMsg("");
  }

  const precisaTermo = [["CPF", "cpf"], ["RG", "rg"], ["Endereço", "endereco"], ["Cidade", "cidade"], ["CEP", "cep"]];
  const precisaFolha = [["Nascimento", "nascimento"], ["Telefone", "telefone"], ["E-mail", "email"], ["Estado civil", "estado_civil"], ["Formação (curso)", "formacao"], ["Período do curso", "periodo_curso"], ["Dados bancários / PIX", "dados_bancarios"]];
  const faltantes = !colab ? [] : (f.tipo === "folha" ? precisaFolha : f.tipo === "termo" ? precisaTermo : precisaTermo.concat(precisaFolha))
    .filter(([r, k]) => !colab[k] || !String(colab[k]).trim()).map(([r]) => r);

  function dataBrOu(v) { return v ? dataBr(v) : ""; }
  function somaMeses(iso, meses) {
    const dt = new Date(iso + "T12:00:00");
    dt.setMonth(dt.getMonth() + meses);
    dt.setDate(dt.getDate() - 1);
    return dt.toISOString().slice(0, 10);
  }

  function montar() {
    const durTxt = (DURACOES.filter((x) => x.v === Number(f.duracao))[0] || DURACOES[1]).r;
    const fim = f.inicio ? somaMeses(f.inicio, Number(f.duracao)) : "";
    const hoje = new Date();
    const jornadaClausula = f.jornada === "outra" ? f.jornadaCustom : jor.clausula;
    const jornadaQuadro = f.jornada === "outra" ? f.jornadaCustom : jor.quadro;
    return {
      nome: colab.nome ? colab.nome.toUpperCase() : "",
      cpf: colab.cpf, rg: colab.rg, endereco: colab.endereco, cidade: colab.cidade, cep: colab.cep,
      estadoCivil: colab.estado_civil, telefone: colab.telefone, email: colab.email,
      nascimentoBr: dataBrOu(colab.nascimento), admissaoBr: dataBrOu(colab.admissao),
      escolaridade: colab.formacao ? ("Graduando(a) em " + colab.formacao + (colab.periodo_curso ? " — " + colab.periodo_curso : "")) : "",
      funcao: colab.cargo,
      instNome: inst ? (inst.sigla + " — " + inst.nome) : "", instSigla: inst ? inst.sigla : "",
      instCnpj: inst ? inst.cnpj : "", instEnd: inst ? inst.endereco : "",
      area: f.area === "__outra" ? f.areaCustom : f.area, duracao: durTxt,
      inicioBr: dataBrOu(f.inicio), periodoBr: f.inicio ? (dataBr(f.inicio) + " a " + dataBr(fim)) : "",
      jornadaClausula, jornadaQuadro,
      bolsaQuadro: "R$ " + f.bolsa + "/mês " + (f.vt === "adicional" ? "(+ auxílio-transporte à parte)" : "(auxílio-transporte incluso)"),
      bolsaClausula: "R$ " + f.bolsa + " (" + f.bolsaExtenso + ")",
      vtClausula: f.vt === "adicional" ? ", acrescido do auxílio-transporte, pago separadamente" : ", já incluído o auxílio-transporte",
      bolsaPix: "R$ " + f.bolsa + (colab.dados_bancarios ? " · " + colab.dados_bancarios : ""),
      supervisor: sup ? (sup.nome + (sup.registro_profissional ? " — " + sup.registro_profissional : "")) : "",
      horario: f.horario, vinculo: f.vinculo,
      dataExtenso: String(hoje.getDate()).padStart(2, "0") + " de " + EQ_MESES[hoje.getMonth()] + " de " + hoje.getFullYear(),
      atribuicoes: f.atribuicoes,
    };
  }

  async function gerar() {
    setMsg("");
    if (!colab) { setMsg("Escolha o colaborador."); return; }
    if (colab.contrato_arquivo_id) { setMsg("Este colaborador já tem contrato vinculado. Exclua o arquivo antigo em CONTRATOS ESTAGIÁRIOS para regerar."); return; }
    if (!window.jspdf || !window.jspdf.jsPDF) { setMsg("O gerador de PDF não carregou. Atualize com Ctrl+F5."); return; }
    if (f.tipo !== "folha" && !f.inicio) { setMsg("Informe a data de início do estágio."); return; }
    const d = montar();
    registrarEvento("gerar", "rh", "documentos_estagio: " + f.tipo + " · " + colab.nome, colab.id);
    const docsPrev = [];
    let pvTermo = null, pvFolha = null;
    if (f.tipo === "termo" || f.tipo === "pacote") { pvTermo = pdfEstagioTermo(d, "ver"); docsPrev.push({ url: pvTermo.url, nome: pvTermo.nome, rotulo: "Termo + Plano de Atividades" }); }
    if (f.tipo === "folha" || f.tipo === "pacote") { pvFolha = pdfEstagioFolha(d, "ver"); docsPrev.push({ url: pvFolha.url, nome: pvFolha.nome, rotulo: "Folha de rosto" }); }
    setDocPrev({ docs: docsPrev, titulo: "Documentos de estágio — " + d.nome });
    setMsg("Arquivando na pasta CONTRATOS ESTAGIÁRIOS…");
    try {
      let pastaId = null;
      const pr = await sb.from("pastas").select("id").eq("nome", "CONTRATOS ESTAGIÁRIOS").limit(1);
      if (!pr.error && pr.data && pr.data.length) pastaId = pr.data[0].id;
      if (!pastaId) {
        const pc = await sb.from("pastas").insert({ nome: "CONTRATOS ESTAGIÁRIOS", pasta_pai_id: null, criado_por: ctx.profile.id }).select("id").single();
        if (!pc.error && pc.data) pastaId = pc.data.id;
      }
      if (!pastaId) throw new Error("não encontrei nem consegui criar a pasta CONTRATOS ESTAGIÁRIOS");
      async function arquivar(pv) {
        const blob = await (await fetch(pv.url)).blob();
        const caminho = pastaId + "/" + crypto.randomUUID() + "_" + pv.nome;
        const up = await sb.storage.from("arquivos").upload(caminho, blob, { contentType: "application/pdf" });
        if (up.error) throw up.error;
        const ins = await sb.from("arquivos").insert({ pasta_id: pastaId, nome: pv.nome, storage_path: caminho, tamanho: blob.size, tipo: "application/pdf", enviado_por: ctx.profile.id }).select("id").single();
        if (ins.error) { await sb.storage.from("arquivos").remove([caminho]); throw ins.error; }
        return ins.data.id;
      }
      let contratoId = null;
      if (pvTermo) contratoId = await arquivar(pvTermo);
      if (pvFolha) await arquivar(pvFolha);
      if (contratoId) {
        const upd = await sb.from("colaboradores").update({ contrato_arquivo_id: contratoId }).eq("id", colab.id);
        if (upd.error) throw upd.error;
        setColabs((colabs || []).map(function (c) { return c.id === colab.id ? { ...c, contrato_arquivo_id: contratoId } : c; }));
        setF(function (ant) { return { ...ant, colaboradorId: "" }; });
        registrarEvento("criar", "arquivos", "Contrato de estágio arquivado e vinculado: " + colab.nome);
      }
      setMsg("✓ Pronto: visualize na janela — já arquivado em CONTRATOS ESTAGIÁRIOS" + (contratoId ? " e vinculado ao colaborador (saiu da lista)." : "."));
    } catch (e2) {
      setMsg("✓ Documentos prontos na janela, mas o arquivamento falhou: " + (e2.message || e2) + (String(e2.message || "").indexOf("contrato_arquivo_id") !== -1 ? " — rode o 31_contrato_vinculo.sql." : ""));
    }
  }

  const rot = { display: "block", fontSize: 10.5, fontWeight: 700, color: "var(--muted)", marginBottom: 3, textTransform: "uppercase", letterSpacing: .4 };
  const cxi = { width: "100%", padding: "8px 10px", fontSize: 12.5 };
  const TIPOS = [{ id: "pacote", r: "Termo + Folha de Rosto" }, { id: "termo", r: "Só o Termo + Plano" }, { id: "folha", r: "Só a Folha de Rosto" }];

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 860 }}>
      {docPrev && <PreviaEspelho prev={docPrev} aoFechar={() => { (docPrev.docs || []).forEach(function (dd) { try { URL.revokeObjectURL(dd.url); } catch (e2) {} }); setDocPrev(null); }} />}
      <div className="card-fl" style={{ padding: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 3 }}>Gerar documentos de estágio</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
          Os dados azuis do modelo saem do cadastro (aba Fichas). Listas prontas conforme o Mapa de Campos; atribuições sempre manuais.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.4fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={rot}>Colaborador</label>
            <select className="campo" style={cxi} value={f.colaboradorId} onChange={(e) => escolherColab(e.target.value)}>
              <option value="">Escolha…</option>
              {(colabs || []).filter((c) => c.status !== "desligado" && !c.contrato_arquivo_id).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            {colabs && (colabs || []).filter((c) => c.status !== "desligado" && !c.contrato_arquivo_id).length === 0 && (
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Todos os ativos já têm contrato vinculado. Para regerar alguém, exclua o contrato dele na pasta CONTRATOS ESTAGIÁRIOS (módulo Arquivos) — o vínculo cai sozinho.</div>
            )}
          </div>
          <div>
            <label style={rot}>O que gerar</label>
            <select className="campo" style={cxi} value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
              {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.r}</option>)}
            </select>
          </div>
        </div>

        {colab && faltantes.length > 0 && (
          <div className="anim-pop" style={{ fontSize: 11.5, fontWeight: 600, color: "#B45309", background: "#FFF7E6", border: "1px solid rgba(180,83,9,.3)", borderRadius: 9, padding: "8px 11px", marginBottom: 10 }}>
            Faltam na ficha (saem como linha em branco no PDF): {faltantes.join(", ")}. Complete na aba <b>Fichas</b>.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={rot}>Instituição de ensino</label>
            <select className="campo" style={cxi} value={f.instituicaoId || (colab && colab.instituicao_id) || ""} onChange={(e) => setF({ ...f, instituicaoId: e.target.value })}>
              <option value="">Escolha…</option>
              {insts.map((i) => <option key={i.id} value={i.id}>{i.sigla} — {i.nome}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={rot}>Área do estágio</label>
            <select className="campo" style={cxi} value={f.area} onChange={(e) => { const ar = e.target.value; setF({ ...f, area: ar, atribuicoes: (ATIV_PADRAO[ar] || []).join("\n"), vt: (ar === "Call Center" || ar === "Recepção") ? "adicional" : "incluso" }); }}>
              {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              <option value="__outra">Outra — digitar…</option>
            </select>
          </div>
          {f.area === "__outra" && (
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={rot}>Objeto do estágio (texto que entra na cláusula 1.1)</label>
              <input className="campo" style={cxi} placeholder="ex.: Marketing e Comunicação" value={f.areaCustom} onChange={(e) => setF({ ...f, areaCustom: e.target.value })} />
            </div>
          )}
          <div>
            <label style={rot}>Duração</label>
            <select className="campo" style={cxi} value={f.duracao} onChange={(e) => setF({ ...f, duracao: e.target.value })}>
              {DURACOES.map((d2) => <option key={d2.v} value={d2.v}>{d2.r}</option>)}
            </select>
          </div>
          <div>
            <label style={rot}>Início do estágio</label>
            <input className="campo" type="date" style={cxi} value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} />
          </div>
          <div>
            <label style={rot}>Jornada</label>
            <select className="campo" style={cxi} value={f.jornada} onChange={(e) => setF({ ...f, jornada: e.target.value })}>
              <option value="430">4h30 seg–sex (padrão)</option>
              <option value="400">4h seg–sex</option>
              <option value="600">6h seg–sex</option>
              <option value="outra">Personalizada…</option>
            </select>
          </div>
          {f.jornada === "outra" && (
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={rot}>Jornada personalizada (texto que entra no termo)</label>
              <input className="campo" style={cxi} placeholder="ex.: 5 (cinco) horas" value={f.jornadaCustom} onChange={(e) => setF({ ...f, jornadaCustom: e.target.value })} />
            </div>
          )}
          <div>
            <label style={rot}>Bolsa-auxílio (R$)</label>
            <input className="campo" style={cxi} value={f.bolsa} onChange={(e) => setF({ ...f, bolsa: e.target.value })} />
          </div>
          <div>
            <label style={rot}>Valor por extenso</label>
            <input className="campo" style={cxi} value={f.bolsaExtenso} onChange={(e) => setF({ ...f, bolsaExtenso: e.target.value })} />
          </div>
          <div>
            <label style={rot}>Auxílio-transporte</label>
            <select className="campo" style={cxi} value={f.vt} onChange={(e) => setF({ ...f, vt: e.target.value })}>
              <option value="incluso">Incluso na bolsa</option>
              <option value="adicional">Adicional — pago à parte</option>
            </select>
          </div>
          <div>
            <label style={rot}>Horário (folha de rosto)</label>
            <input className="campo" style={cxi} value={f.horario} onChange={(e) => setF({ ...f, horario: e.target.value })} />
          </div>
          <div>
            <label style={rot}>Supervisor responsável</label>
            <select className="campo" style={cxi} value={f.supervisorId} onChange={(e) => setF({ ...f, supervisorId: e.target.value })}>
              <option value="">Escolha…</option>
              {(colabs || []).filter((c) => c.status === "ativo").map((c) => <option key={c.id} value={c.id}>{c.nome}{c.registro_profissional ? " · " + c.registro_profissional : ""}</option>)}
            </select>
          </div>
          <div>
            <label style={rot}>Vínculo (folha de rosto)</label>
            <select className="campo" style={cxi} value={f.vinculo} onChange={(e) => setF({ ...f, vinculo: e.target.value })}>
              {VINCULOS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={rot}>Atribuições — Descrição das Atividades (pré-preenchidas pela área; edite à vontade, uma por linha)</label>
            <textarea className="campo" style={{ ...cxi, minHeight: 90, resize: "vertical" }}
              placeholder={"Apoio ao acolhimento e triagem telefônica de pacientes\nOrganização de agendas e confirmações de atendimento"}
              value={f.atribuicoes} onChange={(e) => setF({ ...f, atribuicoes: e.target.value })} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn-primaria" style={{ padding: "10px 18px", fontSize: 13 }} onClick={gerar}>
            <i className="ti ti-file-type-pdf" style={{ fontSize: 15, marginRight: 6 }} aria-hidden="true"></i>Gerar PDF
          </button>
          {msg && <span className="anim-pop" style={{ fontSize: 12.5, fontWeight: 700, color: msg.indexOf("✓") === 0 ? "var(--verde)" : "var(--vermelho)" }}>{msg}</span>}
        </div>
      </div>

      <div className="card-fl" style={{ padding: "12px 16px", fontSize: 12, color: "var(--sec)", lineHeight: 1.6 }}>
        <b>Próximas peças da família</b> (mesmo layout, quando você pedir): Termo Aditivo · Renovação · Distratos com/sem recesso · Concessão de recesso · Protocolo de retirada · Termo de Responsabilidade · Recibo de documentação clínica.
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
        
        <div className={"aba" + (aba === "notificacoes" ? " on" : "")} onClick={() => setAba("notificacoes")}>Notificações</div>
        <div className={"aba" + (aba === "integracoes" ? " on" : "")} onClick={() => setAba("integracoes")}>Integrações</div>
        <div className={"aba" + (aba === "links" ? " on" : "")} onClick={() => setAba("links")}>Outros CORTEX</div>
      </div>
      {aba === "perfis" && <AbaPerfis ctx={ctx} podeEditar={podeEditar} />}
      {aba === "pessoas" && <AbaPessoas ctx={ctx} podeEditar={podeEditar} />}
      
      {aba === "notificacoes" && <AbaNotificacoes ctx={ctx} />}
      {aba === "integracoes" && <AbaIntegracoes ctx={ctx} />}
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
function PaginaCallCenter({ ctx }) {
  const podeEditar = nivelModulo(ctx, "callcenter") === "editar";
  const [aba, setAba] = useState("informativos");
  return (
    <div>
      <div className="abas" style={{ marginBottom: 14 }}>
        <div className={"aba" + (aba === "informativos" ? " on" : "")} onClick={() => setAba("informativos")}>Informativos</div>
        <div className="aba" style={{ opacity: .45, cursor: "default" }} title="Novas abas em construção">Em breve…</div>
      </div>
      {aba === "informativos" && <AbaInformativosCC ctx={ctx} podeEditar={podeEditar} />}
    </div>
  );
}

function AbaInformativosCC({ ctx, podeEditar }) {
  const AREAS_CC = ["Psicologia — ABA", "Neuropsicologia", "Fonoaudiologia", "Psicologia Clínica", "Psiquiatria", "Administrativo", "Convênios", "Agenda", "Valores", "Geral"];
  const [lista, setLista] = useState(null);
  const [profs, setProfs] = useState([]);
  const [fArea, setFArea] = useState("");
  const [fProf, setFProf] = useState("");
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  async function carregar() {
    const { data, error } = await sb.from("cc_informativos").select("id, titulo, conteudo, area, profissional_id, criado_por, criado_em, colaboradores(nome)").order("criado_em", { ascending: false }).limit(300);
    if (error) { setMsg("Erro ao carregar: " + error.message + (error.message.indexOf("cc_informativos") !== -1 ? " — rode o 30_call_center.sql." : "")); setLista([]); return; }
    setMsg(""); setLista(data || []);
  }
  useEffect(() => {
    carregar();
    (async () => { const r = await sb.from("colaboradores").select("id, nome").neq("status", "desligado").order("nome"); if (!r.error) setProfs(r.data || []); })();
  }, []);

  const dtCC = (iso) => {
    const dt = new Date(iso);
    const dia = dt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const hora = dt.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
    const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const ontem = new Date(Date.now() - 86400000).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    return (dia === hoje ? "hoje" : dia === ontem ? "ontem" : dia) + " \u00b7 " + hora;
  };
  const ehNovo = (iso) => Date.now() - new Date(iso).getTime() < 48 * 3600 * 1000;

  const areasExistentes = Array.from(new Set(AREAS_CC.concat((lista || []).map((i) => i.area).filter(Boolean))));
  const filtrados = (lista || []).filter((i) => {
    if (fArea && i.area !== fArea) return false;
    if (fProf && i.profissional_id !== fProf) return false;
    if (busca) {
      const t = (i.titulo + " " + i.conteudo + " " + ((i.colaboradores && i.colaboradores.nome) || "")).toLowerCase();
      if (t.indexOf(busca.toLowerCase()) === -1) return false;
    }
    return true;
  });

  async function salvar() {
    if (!modal.titulo.trim() || !modal.conteudo.trim()) { setMsg("Erro: título e conteúdo são obrigatórios."); return; }
    setSalvando(true);
    const payload = { titulo: modal.titulo.trim(), conteudo: modal.conteudo.trim(), area: (modal.area || "").trim() || null, profissional_id: modal.profissional_id || null };
    let error;
    if (modal.id) {
      payload.atualizado_em = new Date().toISOString();
      ({ error } = await sb.from("cc_informativos").update(payload).eq("id", modal.id));
      if (!error) registrarEvento("editar", "callcenter", "Editou o informativo \"" + payload.titulo + "\"");
    } else {
      payload.criado_por = (ctx && ctx.profile && (ctx.profile.nome || ctx.profile.email)) || "equipe";
      ({ error } = await sb.from("cc_informativos").insert(payload));
      if (!error) registrarEvento("criar", "callcenter", "Publicou o informativo \"" + payload.titulo + "\"");
    }
    setSalvando(false);
    if (error) { setMsg("Erro: " + error.message + (error.message.indexOf("cc_informativos") !== -1 ? " — rode o 30_call_center.sql." : "")); return; }
    setModal(null); setMsg("\u2713 Informativo " + (payload.criado_por ? "publicado" : "atualizado") + ".");
    carregar();
  }

  async function excluir(it) {
    if (!window.confirm("Excluir o informativo \"" + it.titulo + "\"?")) return;
    const { error } = await sb.from("cc_informativos").delete().eq("id", it.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    registrarEvento("excluir", "callcenter", "Excluiu o informativo \"" + it.titulo + "\"");
    setMsg("\u2713 Informativo exclu\u00eddo.");
    carregar();
  }

  const chip = (fundo, cor) => ({ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, background: fundo, color: cor, borderRadius: 999, padding: "4px 10px" });

  return (
    <div style={{ maxWidth: 880 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <input className="campo" style={{ flex: 1, minWidth: 180, padding: "8px 10px", fontSize: 12.5 }} placeholder="Buscar por texto, título ou doutor(a)…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select className="campo" style={{ width: 190, padding: "8px 10px", fontSize: 12.5 }} value={fArea} onChange={(e) => setFArea(e.target.value)}>
          <option value="">Todas as áreas</option>
          {areasExistentes.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="campo" style={{ width: 200, padding: "8px 10px", fontSize: 12.5 }} value={fProf} onChange={(e) => setFProf(e.target.value)}>
          <option value="">Todos os profissionais</option>
          {profs.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        {podeEditar && <button className="btn-primaria" style={{ padding: "8px 14px", fontSize: 12.5 }} onClick={() => { setMsg(""); setModal({ titulo: "", conteudo: "", area: "", profissional_id: "" }); }}>+ Novo informativo</button>}
      </div>
      {msg && <div className="anim-pop" style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10, color: msg.indexOf("Erro") === 0 ? "var(--vermelho)" : "var(--verde)" }}>{msg}</div>}
      <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 8 }}>{lista === null ? "Carregando\u2026" : filtrados.length + " informativo(s)" + (fArea || fProf || busca ? " no filtro" : "")}</div>

      {lista !== null && filtrados.length === 0 && (
        <div className="card-fl" style={{ padding: 22, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          Nenhum informativo por aqui{fArea || fProf || busca ? " com esses filtros" : " ainda"}.{podeEditar ? " Publique o primeiro no bot\u00e3o acima." : ""}
        </div>
      )}

      {filtrados.map((i) => (
        <div key={i.id} className="card-fl" style={{ padding: "13px 15px", marginBottom: 10, borderLeft: "4px solid #0E7490" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 7 }}>
            {ehNovo(i.criado_em) && <span style={chip("#FFF7E6", "#B45309")}>NOVO</span>}
            <span style={chip("var(--tint)", "var(--marca-texto)")}><i className="ti ti-calendar-event" aria-hidden="true"></i>{dtCC(i.criado_em)}</span>
            {i.colaboradores && i.colaboradores.nome && <span style={chip("#F3E8FF", "#7C3AED")}><i className="ti ti-stethoscope" aria-hidden="true"></i>{i.colaboradores.nome}</span>}
            {i.area && <span style={chip("var(--campo)", "var(--sec)")}>{i.area}</span>}
            <span style={{ flex: 1 }}></span>
            {podeEditar && <i className="ti ti-pencil" style={{ cursor: "pointer", color: "var(--sec)", fontSize: 15 }} title="Editar" onClick={() => { setMsg(""); setModal({ id: i.id, titulo: i.titulo, conteudo: i.conteudo, area: i.area || "", profissional_id: i.profissional_id || "" }); }}></i>}
            {podeEditar && <i className="ti ti-trash" style={{ cursor: "pointer", color: "var(--vermelho)", fontSize: 15 }} title="Excluir" onClick={() => excluir(i)}></i>}
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 4 }}>{i.titulo}</div>
          <div style={{ fontSize: 13, color: "var(--sec)", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{i.conteudo}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 7 }}>publicado por {i.criado_por || "equipe"}</div>
        </div>
      ))}

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,32,.55)", zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }} onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="anim-pop" style={{ background: "var(--branco)", borderRadius: 16, padding: 18, maxWidth: 520, width: "100%", boxShadow: "0 20px 50px rgba(0,0,0,.3)", border: "1px solid var(--linha)" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 10 }}>{modal.id ? "Editar informativo" : "Novo informativo"}</div>
            <input className="campo" style={{ width: "100%", padding: "8px 10px", fontSize: 13, marginBottom: 8 }} placeholder="Título — ex.: Dra. Fulana sem convênio X em setembro" value={modal.titulo} onChange={(e) => setModal({ ...modal, titulo: e.target.value })} />
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input className="campo" list="cc-areas" style={{ flex: 1, padding: "8px 10px", fontSize: 12.5 }} placeholder="Área (opcional)" value={modal.area} onChange={(e) => setModal({ ...modal, area: e.target.value })} />
              <datalist id="cc-areas">{AREAS_CC.map((a) => <option key={a} value={a} />)}</datalist>
              <select className="campo" style={{ flex: 1, padding: "8px 10px", fontSize: 12.5 }} value={modal.profissional_id} onChange={(e) => setModal({ ...modal, profissional_id: e.target.value })}>
                <option value="">Sem profissional específico</option>
                {profs.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <textarea className="campo" rows={5} style={{ width: "100%", padding: "8px 10px", fontSize: 13, resize: "vertical", marginBottom: 12 }} placeholder="O que o call center precisa saber…" value={modal.conteudo} onChange={(e) => setModal({ ...modal, conteudo: e.target.value })}></textarea>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn-fantasma" style={{ width: "auto", padding: "8px 14px", fontSize: 12.5 }} onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-primaria" style={{ padding: "8px 15px", fontSize: 12.5 }} disabled={salvando} onClick={salvar}>{salvando ? "Salvando\u2026" : (modal.id ? "Salvar altera\u00e7\u00f5es" : "Publicar")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Shell({ ctx, aoSair }) {
  const [meuCard, setMeuCard] = useState(null);
  const [alertasExc, setAlertasExc] = useState([]);
  const [meuEmailDir, setMeuEmailDir] = useState("");
  useEffect(() => {
    if (!sb || nivelModulo(ctx, "rh") !== "editar") return;
    let vivo = true;
    async function checarExcessos() {
      try {
        if (!meuEmailDir) { const u = await sb.auth.getUser(); if (vivo && u && u.data && u.data.user) setMeuEmailDir(u.data.user.email || ""); }
        const { data, error } = await sb.from("ponto_alertas_excesso").select("id, data, minutos_realizados, minutos_limite, minutos_excedidos, vistos, colaboradores(nome)").order("criado_em", { ascending: false }).limit(15);
        if (!error && vivo) setAlertasExc(data || []);
      } catch (e) {}
    }
    checarExcessos();
    const t = setInterval(checarExcessos, 60000);
    return () => { vivo = false; clearInterval(t); };
  }, [meuEmailDir]);
  const excPendentes = alertasExc.filter((a) => !((a.vistos || []).indexOf(meuEmailDir || "@") !== -1));
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
  } else if (pagina === "callcenter") {
    conteudo = <PaginaCallCenter ctx={ctx} />;
  } else if (pagina === "demandas") {
    conteudo = <PaginaDemandas ctx={ctx} />;
  } else if (pagina === "infinity") {
    conteudo = <PaginaInfinity ctx={ctx} />;
  } else if (pagina === "relatorios") {
    conteudo = <PaginaRelatorios ctx={ctx} />;
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
    <div className="casca-app" style={{ minHeight: "100vh", background: "var(--fundo)", display: "flex", gap: 14, padding: 14, alignItems: "stretch" }}>
      <Sidebar meuCard={meuCard} ctx={ctx} pagina={pagina} setPagina={setPagina} estado={sbEstado} setEstado={setSbEstado} aoSair={aoSair} />
      <main className="conteudo-app" style={{ flex: 1, minWidth: 0, padding: "6px 6px 20px", paddingLeft: sbEstado === "oculta" ? 64 : 6, transition: "padding-left .3s var(--mola)" }}>
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
      {excPendentes.length > 0 && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(12,18,26,.6)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
          <div className="anim-pop" style={{ background: "var(--branco)", border: "2px solid var(--vermelho)", borderRadius: 18, padding: 20, maxWidth: 580, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,.35)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
              <span style={{ fontSize: 22 }}>⚠️</span>
              <div style={{ fontSize: 15.5, fontWeight: 800, color: "var(--vermelho)" }}>Carga horária ultrapassada sem autorização</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 300, overflowY: "auto" }}>
              {excPendentes.map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#FDECEC", border: "1px solid rgba(220,38,38,.35)", borderRadius: 10, padding: "8px 11px", fontSize: 13 }}>
                  <div style={{ flex: 1 }}>
                    <b>{(a.colaboradores && a.colaboradores.nome) || "Colaborador"}</b> excedeu <b style={{ color: "var(--vermelho)" }}>{fmtHMc(a.minutos_excedidos)}</b> em {(a.data || "").split("-").reverse().join("/")}
                    <div style={{ fontSize: 11.5, color: "var(--sec)" }}>registrado {fmtHMc(a.minutos_realizados)} · limite do dia {fmtHMc(a.minutos_limite)} (previsto + extra autorizada + 10 min)</div>
                  </div>
                  <button className="btn-fantasma" style={{ width: "auto", padding: "6px 11px", fontSize: 11.5 }} onClick={async () => { try { await sb.rpc("alerta_excesso_ciente", { p_id: a.id }); } catch (e) {} setAlertasExc(alertasExc.map((x) => x.id === a.id ? { ...x, vistos: [...(x.vistos || []), meuEmailDir || "@"] } : x)); }}>Ciente</button>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>O aviso some para você ao dar ciente; os demais da direção continuam vendo até o ciente deles. Autorize horas extras na ficha do colaborador (RH › Fichas).</div>
          </div>
        </div>
      )}
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
