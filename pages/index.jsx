import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const CONFIG = {
  n8nWebhookUrl: 'https://nnwb.williamdiscipline.com.br/webhook/prummo-form',
  linkCalendly:  'https://calendly.com/orlandodiscipline/30min',
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getUTMs() {
  if (typeof window === 'undefined') return {}
  const p = new URLSearchParams(window.location.search)
  return {
    utmSource:   p.get('utm_source')   || '',
    utmMedium:   p.get('utm_medium')   || '',
    utmCampaign: p.get('utm_campaign') || '',
    utmContent:  p.get('utm_content')  || '',
    utmTerm:     p.get('utm_term')     || '',
  }
}

function getMetaCookies() {
  if (typeof document === 'undefined') return { fbc: '', fbp: '' }
  const cookies = document.cookie.split(';').reduce((acc, c) => {
    const [k, v] = c.trim().split('=')
    acc[k] = v
    return acc
  }, {})
  return { fbc: cookies['_fbc'] || '', fbp: cookies['_fbp'] || '' }
}

function generateEventId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function normalizeZap(zap = '') {
  const digits = zap.replace(/\D/g, '')
  return digits.startsWith('55') ? `+${digits}` : `+55${digits}`
}

function track(event, params = {}) {
  try {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({ event, ...params, timestamp: new Date().toISOString() })
  } catch {}
}

function sendWebhook(payload) {
  fetch(CONFIG.n8nWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {})
}

// ─── PROGRESS MAP ─────────────────────────────────────────────────────────────
const PROG = {
  capa: 0, q1: 14, q2: 28, q3: 42, q4: 56, q5: 70, q6: 84, q7: 100,
  sucesso: 100, monok: 100,
}

// ─── STYLES (inline — single-file component) ──────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Outfit', Arial, sans-serif;
    background: #ffffff;
    color: #1a1a1a;
    -webkit-font-smoothing: antialiased;
  }

  .wrap {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    max-width: 600px;
    margin: 0 auto;
    padding: 0 20px 32px;
  }

  /* ── Progress bar ── */
  .prog-bar {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: #ececec;
    z-index: 100;
  }
  .prog-fill {
    height: 100%;
    background: #7cc76d;
    transition: width 0.5s ease;
  }

  /* ── Header logo ── */
  .hdr {
    padding: 28px 0 20px;
    display: flex;
    align-items: center;
  }
  .logo {
    height: 36px;
    width: auto;
    object-fit: contain;
  }

  /* ── CAPA ── */
  .cover {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding-top: 8px;
  }
  .cover-tag {
    font-size: 13px;
    font-weight: 600;
    color: #7cc76d;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 14px;
  }
  .cover-h1 {
    font-size: clamp(26px, 6vw, 38px);
    font-weight: 900;
    line-height: 1.15;
    color: #111;
    margin-bottom: 24px;
  }
  .cover-h1 em { font-style: normal; color: #7cc76d; }
  .bullets {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 24px;
  }
  .bullets li {
    font-size: 15px;
    font-weight: 500;
    color: #333;
    line-height: 1.4;
  }
  .aviso {
    font-size: 13px;
    color: #666;
    line-height: 1.5;
    border-left: 3px solid #f0c040;
    padding: 10px 12px;
    background: #fffbea;
    border-radius: 4px;
    margin-bottom: 28px;
  }
  .cta-cover {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: #7cc76d;
    color: #fff;
    font-family: inherit;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border: none;
    border-radius: 4px;
    padding: 16px 24px;
    cursor: pointer;
    margin-top: auto;
    transition: opacity 0.15s, transform 0.1s;
  }
  .cta-cover:hover { opacity: 0.92; transform: translateY(-1px); }
  .cta-cover:active { transform: translateY(0); }

  /* ── Question steps ── */
  .q-body {
    flex: 1;
    padding-top: 12px;
  }
  .q-num {
    font-size: 12px;
    font-weight: 600;
    color: #aaa;
    letter-spacing: 0.05em;
    margin-bottom: 14px;
  }
  .q-title {
    font-size: clamp(18px, 5vw, 24px);
    font-weight: 700;
    line-height: 1.3;
    color: #111;
    margin-bottom: 28px;
  }
  .q-title strong { color: #111; }
  .q-req { color: #e55; margin-left: 2px; }

  /* ── Text inputs ── */
  .inp-line {
    width: 100%;
    border: none;
    border-bottom: 1.5px solid #cccccc;
    outline: none;
    font-family: inherit;
    font-size: 17px;
    color: #111;
    padding: 8px 0;
    background: transparent;
    transition: border-color 0.2s;
    margin-bottom: 6px;
  }
  .inp-line::placeholder { color: #bbb; }
  .inp-line:focus { border-bottom-color: #7cc76d; }
  .inp-line.error { border-bottom-color: #e55; }

  /* ── WhatsApp row ── */
  .zap-row {
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1.5px solid #cccccc;
    padding-bottom: 6px;
    margin-bottom: 6px;
    transition: border-color 0.2s;
  }
  .zap-row:focus-within { border-bottom-color: #7cc76d; }
  .zap-row.error { border-bottom-color: #e55; }
  .zap-row input {
    flex: 1;
    border: none;
    outline: none;
    font-family: inherit;
    font-size: 17px;
    color: #111;
    background: transparent;
  }
  .zap-row input::placeholder { color: #bbb; }
  .zap-prefix {
    font-size: 14px;
    color: #888;
    font-weight: 700;
    white-space: nowrap;
  }

  /* ── Error msg ── */
  .err-msg {
    font-size: 12px;
    color: #e55;
    min-height: 18px;
    margin-top: 4px;
  }

  /* ── Options (multiple choice) ── */
  .opts { display: flex; flex-direction: column; gap: 10px; }
  .opt {
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1.5px solid #d8d8d8;
    border-radius: 6px;
    padding: 12px 14px;
    cursor: pointer;
    background: #fff;
    transition: border-color 0.15s, background 0.15s;
    user-select: none;
  }
  .opt:hover { border-color: #b0dba9; background: #f7fdf6; }
  .opt.sel { border-color: #7cc76d; background: #f0faee; }
  .opt-letter {
    min-width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #efefef;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 700;
    color: #555;
    transition: background 0.15s, color 0.15s;
    flex-shrink: 0;
  }
  .opt.sel .opt-letter { background: #7cc76d; color: #fff; }
  .opt-text { font-size: 14px; font-weight: 500; color: #222; line-height: 1.4; }

  /* ── Continue button ── */
  .cont-wrap {
    padding-top: 24px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .cont-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #7cc76d;
    color: #fff;
    font-family: inherit;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border: none;
    border-radius: 4px;
    padding: 14px 22px;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s;
  }
  .cont-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }
  .cont-btn:not(:disabled):hover { opacity: 0.92; transform: translateY(-1px); }
  .cont-btn:not(:disabled):active { transform: translateY(0); }

  .enter-hint {
    font-size: 12px;
    color: #bbb;
  }
  .enter-hint kbd {
    font-family: inherit;
    background: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 3px;
    padding: 1px 5px;
    font-size: 11px;
  }

  /* ── Sucesso ── */
  .sucesso {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 16px 0;
  }
  .sucesso-icon { font-size: 56px; margin-bottom: 18px; }
  .sucesso-h1 {
    font-size: clamp(22px, 5.5vw, 30px);
    font-weight: 900;
    color: #111;
    margin-bottom: 16px;
    line-height: 1.2;
  }
  .sucesso-p {
    font-size: 15px;
    color: #555;
    line-height: 1.6;
    margin-bottom: 32px;
    max-width: 460px;
  }
  .calendly-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #7cc76d;
    color: #fff;
    font-family: inherit;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border: none;
    border-radius: 4px;
    padding: 18px 28px;
    cursor: pointer;
    text-decoration: none;
    transition: opacity 0.15s, transform 0.1s;
  }
  .calendly-btn:hover { opacity: 0.92; transform: translateY(-1px); }

  /* ── Monok (desqualificado) ── */
  .monok {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 16px 0;
  }
  .monok-icon { font-size: 48px; margin-bottom: 16px; }
  .monok-h2 { font-size: 22px; font-weight: 800; color: #111; margin-bottom: 14px; }
  .monok-p { font-size: 15px; color: #666; line-height: 1.6; max-width: 400px; }

  /* ── Step wrapper ── */
  .step-wrap { flex: 1; display: flex; flex-direction: column; }

  /* ── Animations ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .step-wrap, .cover, .sucesso, .monok {
    animation: fadeUp 0.3s ease both;
  }
`

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function ProgressBar({ pct }) {
  return (
    <div className="prog-bar">
      <div className="prog-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

function Header() {
  return (
    <div className="hdr">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Logo" className="logo" />
    </div>
  )
}

// ── Capa ──────────────────────────────────────────────────────────────────────
function Capa({ onNext }) {
  return (
    <div className="cover">
      <div className="cover-tag">🍔 Dono de delivery,</div>
      <h1 className="cover-h1">
        aumente seus pedidos em <em>50%</em> todos os dias com o tráfego pago
      </h1>
      <ul className="bullets">
        <li>🚫 Chega de pagar comissão para o iFood</li>
        <li>🏍️ Venda mais no seu próprio cardápio</li>
        <li>📱 Mais Pedidos até em dias fracos</li>
        <li>✅ + de 70 deliveries faturando conosco</li>
      </ul>
      <p className="aviso">
        ⚠️ Exclusivo para donos de delivery que estão dispostos a investir no mínimo R$ 1.500/mês em anúncios para deixar de ser sócio do iFood.
      </p>
      <button className="cta-cover" onClick={onNext}>
        QUERO AUMENTAR MEUS PEDIDOS →
      </button>
    </div>
  )
}

// ── Etapa 01 — Nome ───────────────────────────────────────────────────────────
function StepNome({ onNext }) {
  const [val, setVal] = useState('')
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])

  const words = val.trim().split(/\s+/).filter(w => w.length > 0)
  const isValid = /^[a-zA-ZÀ-ÿ\s]{3,}$/.test(val.trim()) && words.length >= 2
  const showError = val.length > 2 && !isValid

  function handleKey(e) { if (e.key === 'Enter' && isValid) onNext(val.trim()) }

  return (
    <div className="step-wrap">
      <div className="q-body">
        <div className="q-num">01 / 07</div>
        <div className="q-title">Qual seu <strong>nome</strong> e sobrenome? <span className="q-req">*</span></div>
        <input
          ref={ref}
          className={`inp-line${showError ? ' error' : ''}`}
          type="text"
          placeholder="Digite sua resposta aqui..."
          autoComplete="name"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={handleKey}
        />
        <div className="err-msg">{showError ? 'Digite seu nome e sobrenome (apenas letras)' : ''}</div>
      </div>
      <div className="cont-wrap">
        <button className="cont-btn" disabled={!isValid} onClick={() => onNext(val.trim())}>
          OK
        </button>
        <div className="enter-hint">pressione <kbd>Enter ↵</kbd></div>
      </div>
    </div>
  )
}

// ── Etapa 02 — WhatsApp ───────────────────────────────────────────────────────
function StepZap({ nome, onNext }) {
  const [val, setVal] = useState('')
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])

  function mask(v) {
    v = v.replace(/\D/g, '').substring(0, 11)
    if (v.length <= 10) v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
    else v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
    return v.replace(/-$/, '')
  }

  const digits = val.replace(/\D/g, '')
  const isValid = digits.length >= 10 && digits.length <= 11
  const showError = digits.length > 3 && !isValid

  function handleKey(e) { if (e.key === 'Enter' && isValid) onNext(val) }

  return (
    <div className="step-wrap">
      <div className="q-body">
        <div className="q-num">02 / 07</div>
        <div className="q-title">Qual seu número de <strong>WhatsApp</strong>? <span className="q-req">*</span></div>
        <div className={`zap-row${showError ? ' error' : ''}`}>
          <span style={{ fontSize: 20 }}>🇧🇷</span>
          <span className="zap-prefix">+55</span>
          <input
            ref={ref}
            type="tel"
            placeholder="(11) 95292-9675"
            value={val}
            onChange={e => setVal(mask(e.target.value))}
            onKeyDown={handleKey}
          />
        </div>
        <div className="err-msg">{showError ? 'Digite um número válido com DDD' : ''}</div>
      </div>
      <div className="cont-wrap">
        <button className="cont-btn" disabled={!isValid} onClick={() => onNext(val)}>
          OK
        </button>
        <div className="enter-hint">pressione <kbd>Enter ↵</kbd></div>
      </div>
    </div>
  )
}

// ── Etapa 03 — Instagram ──────────────────────────────────────────────────────
function StepInsta({ onNext }) {
  const [val, setVal] = useState('')
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])

  const clean = val.trim().replace(/^@/, '')
  const isValid = clean.length >= 2
  const showError = val.length > 0 && !isValid

  function handleKey(e) { if (e.key === 'Enter' && isValid) onNext(clean) }

  return (
    <div className="step-wrap">
      <div className="q-body">
        <div className="q-num">03 / 07</div>
        <div className="q-title">Qual o <strong>@</strong> do Instagram da sua empresa? <span className="q-req">*</span></div>
        <input
          ref={ref}
          className={`inp-line${showError ? ' error' : ''}`}
          type="text"
          placeholder="Digite sua resposta aqui..."
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={handleKey}
        />
        <div className="err-msg">{showError ? 'Preencha o @ do Instagram' : ''}</div>
      </div>
      <div className="cont-wrap">
        <button className="cont-btn" disabled={!isValid} onClick={() => onNext(clean)}>
          OK
        </button>
        <div className="enter-hint">pressione <kbd>Enter ↵</kbd></div>
      </div>
    </div>
  )
}

// ── Etapa 04 — Perda iFood ────────────────────────────────────────────────────
const PERDA_IFOOD_OPTS = [
  { label: 'Não trabalho com iFood' },
  { label: 'Até R$1.000 por semana' },
  { label: 'Entre R$1.000 e R$2.500 por semana' },
  { label: 'Entre R$2.500 e R$5.000 por semana' },
  { label: 'Perco mais de R$5.000 por semana' },
]

function StepPerdaIfood({ onNext }) {
  const [sel, setSel] = useState(null)
  function choose(opt) { setSel(opt); track('option_selected', { question: 'perda_ifood', label: opt.label }) }
  return (
    <div className="step-wrap">
      <div className="q-body">
        <div className="q-num">04 / 07</div>
        <div className="q-title">
          Toda semana o iFood fica com uma parte do seu lucro. Quanto você acha que está <strong>perdendo</strong>? <span className="q-req">*</span>
        </div>
        <div className="opts">
          {PERDA_IFOOD_OPTS.map((opt, i) => (
            <div
              key={i}
              className={`opt${sel?.label === opt.label ? ' sel' : ''}`}
              onClick={() => choose(opt)}
            >
              <div className="opt-letter">{String.fromCharCode(65 + i)}</div>
              <div className="opt-text">{opt.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="cont-wrap">
        <button className="cont-btn" disabled={!sel} onClick={() => onNext(sel)}>
          OK
        </button>
      </div>
    </div>
  )
}

// ── Etapa 05 — Faturamento ────────────────────────────────────────────────────
const FAT_OPTS = [
  { label: 'Menos de R$20.000' },
  { label: 'Entre R$20.000 a R$70.000' },
  { label: 'Entre R$70.000 a R$150.000' },
  { label: 'Acima de R$150.000' },
]

function StepFaturamento({ onNext }) {
  const [sel, setSel] = useState(null)
  function choose(opt) { setSel(opt); track('option_selected', { question: 'faturamento', label: opt.label }) }
  return (
    <div className="step-wrap">
      <div className="q-body">
        <div className="q-num">05 / 07</div>
        <div className="q-title">
          Para entendermos o potencial do seu delivery, qual é o <strong>faturamento mensal atual</strong>? (delivery + loja física) <span className="q-req">*</span>
        </div>
        <div className="opts">
          {FAT_OPTS.map((opt, i) => (
            <div
              key={i}
              className={`opt${sel?.label === opt.label ? ' sel' : ''}`}
              onClick={() => choose(opt)}
            >
              <div className="opt-letter">{String.fromCharCode(65 + i)}</div>
              <div className="opt-text">{opt.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="cont-wrap">
        <button className="cont-btn" disabled={!sel} onClick={() => onNext(sel)}>
          OK
        </button>
      </div>
    </div>
  )
}

// ── Etapa 06 — Investimento ───────────────────────────────────────────────────
const INV_OPTS = [
  { v: 'ok',  label: '✅ Sim, quero mais pedidos com mais lucro' },
  { v: 'nok', label: '❌ Não quero investir no meu negócio' },
]

function StepInvestimento({ onNext }) {
  const [sel, setSel] = useState(null)
  function choose(opt) { setSel(opt); track('option_selected', { question: 'investimento', value: opt.v, label: opt.label }) }
  return (
    <div className="step-wrap">
      <div className="q-body">
        <div className="q-num">06 / 07</div>
        <div className="q-title">
          Para ter volume de pedidos no seu próprio cardápio e parar de dividir o lucro com o iFood, é necessário investir no mínimo <strong>R$1.500/mês</strong> em anúncios. Está disposto a fazer esse investimento? <span className="q-req">*</span>
        </div>
        <div className="opts">
          {INV_OPTS.map((opt, i) => (
            <div
              key={i}
              className={`opt${sel?.label === opt.label ? ' sel' : ''}`}
              onClick={() => choose(opt)}
            >
              <div className="opt-letter">{String.fromCharCode(65 + i)}</div>
              <div className="opt-text">{opt.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="cont-wrap">
        <button className="cont-btn" disabled={!sel} onClick={() => onNext(sel)}>
          OK
        </button>
      </div>
    </div>
  )
}

// ── Etapa 07 — Tomadores de decisão ──────────────────────────────────────────
const DECISAO_OPTS = [
  { label: 'Sim. Estaremos juntos na reunião.' },
  { label: 'Não, só eu tomo as decisões e me comprometo a participar no horário combinado.' },
]

function StepDecisores({ onNext }) {
  const [sel, setSel] = useState(null)
  function choose(opt) { setSel(opt); track('option_selected', { question: 'decisores', label: opt.label }) }
  return (
    <div className="step-wrap">
      <div className="q-body">
        <div className="q-num">07 / 07</div>
        <div className="q-title">
          Caso seu formulário seja aprovado para uma Consultoria Estratégica, é obrigatória a presença de todos os tomadores de decisão na reunião. Tem mais alguém que te ajuda nas <strong>tomadas de decisões</strong> do seu negócio? <span className="q-req">*</span>
        </div>
        <div className="opts">
          {DECISAO_OPTS.map((opt, i) => (
            <div
              key={i}
              className={`opt${sel?.label === opt.label ? ' sel' : ''}`}
              onClick={() => choose(opt)}
            >
              <div className="opt-letter">{String.fromCharCode(65 + i)}</div>
              <div className="opt-text">{opt.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="cont-wrap">
        <button className="cont-btn" disabled={!sel} onClick={() => onNext(sel)}>
          ENVIAR
        </button>
      </div>
    </div>
  )
}

// ── Tela Sucesso ──────────────────────────────────────────────────────────────
function TelaSucesso({ onAgendar }) {
  return (
    <div className="sucesso">
      <div className="sucesso-icon">🚀</div>
      <h1 className="sucesso-h1">Seu delivery tem tudo para escalar!</h1>
      <p className="sucesso-p">
        Analisamos suas respostas e seu negócio está pronto para ter uma fila de pedidos no seu próprio cardápio. Para não perdermos tempo com trocas de mensagens, selecione agora o melhor horário para sua Reunião Estratégica clicando no link abaixo.
      </p>
      <a
        className="calendly-btn"
        href={CONFIG.linkCalendly}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onAgendar}
      >
        📆 AGENDAR REUNIÃO →
      </a>
    </div>
  )
}

// ── Tela Monok (desqualificado) ───────────────────────────────────────────────
function TelaMonok({ nome }) {
  return (
    <div className="monok">
      <div className="monok-icon">🙏</div>
      <h2 className="monok-h2">Obrigado pelo interesse!</h2>
      <p className="monok-p">
        No momento, nosso programa é voltado para empreendedores dispostos a investir no próprio negócio. Quando estiver pronto para dar esse passo, estaremos aqui.
      </p>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function FormularioDelivery() {
  const [step, setStep] = useState('capa')
  const [formState, setFormState] = useState({
    nome: '', zap: '', ig: '',
    perdaIfoodLabel: '',
    faturamentoLabel: '',
    investimentoLabel: '',
    investimentoV: '',
    decisoresLabel: '',
    ...getUTMs(),
  })

  const prog = PROG[step] || 0

  // Captura UTMs no mount e dispara form_view
  useEffect(() => {
    const utms = getUTMs()
    setFormState(s => ({ ...s, ...utms }))
    track('form_view', utms)
  }, [])

  function goTo(nextStep) {
    setStep(nextStep)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleCapa() {
    // DISPARO 1: formulário iniciado
    const payload = {
      event: 'form_start',
      ...getUTMs(),
    }
    track('form_start', payload)
    sendWebhook(payload)
    goTo('q1')
  }

  function handleNome(nome) {
    setFormState(s => ({ ...s, nome }))
    track('step_complete', { step: 'q1', nome })
    goTo('q2')
  }

  function handleZap(zap) {
    setFormState(s => ({ ...s, zap }))
    track('step_complete', { step: 'q2', nome: formState.nome })
    goTo('q3')
  }

  function handleInsta(ig) {
    setFormState(s => ({ ...s, ig }))
    track('step_complete', { step: 'q3', nome: formState.nome, ig })
    goTo('q4')
  }

  function handlePerdaIfood(opt) {
    setFormState(s => ({ ...s, perdaIfoodLabel: opt.label }))
    track('step_complete', { step: 'q4', perda_ifood: opt.label })
    goTo('q5')
  }

  function handleFaturamento(opt) {
    setFormState(s => ({ ...s, faturamentoLabel: opt.label }))
    track('step_complete', { step: 'q5', faturamento: opt.label })
    goTo('q6')
  }

  function handleInvestimento(opt) {
    setFormState(s => ({ ...s, investimentoLabel: opt.label, investimentoV: opt.v }))
    track('step_complete', { step: 'q6', investimento: opt.label, qualification: opt.v })
    goTo('q7')
  }

  function handleDecisores(opt) {
    const newState = { ...formState, decisoresLabel: opt.label }
    setFormState(newState)
    track('step_complete', { step: 'q7', decisores: opt.label })

    if (newState.investimentoV === 'nok') {
      // DISPARO 2: lead desqualificado
      const { fbc, fbp } = getMetaCookies()
      const payload = {
        event: 'form_disqualified',
        reason: 'investimento',
        nome: newState.nome,
        zap: normalizeZap(newState.zap),
        ig: newState.ig,
        trafego: newState.perdaIfoodLabel,      // mapeia para campo "trafego" esperado pelo n8n
        faturamento: newState.faturamentoLabel,
        investimento: newState.investimentoLabel,
        decisores: opt.label,
        fbc, fbp,
        utmSource:   newState.utmSource   || '',
        utmMedium:   newState.utmMedium   || '',
        utmCampaign: newState.utmCampaign || '',
        utmContent:  newState.utmContent  || '',
        utmTerm:     newState.utmTerm     || '',
      }
      track('lead_desqualificado', payload)
      sendWebhook(payload)
      goTo('monok')
    } else {
      goTo('sucesso')
    }
  }

  function handleAgendar() {
    // DISPARO 3: lead qualificado clicou em agendar
    const { fbc, fbp } = getMetaCookies()
    const event_id = generateEventId()
    const payload = {
      event: 'schedule_booked',
      nome: formState.nome,
      zap: normalizeZap(formState.zap),
      ig: formState.ig,
      trafego: formState.perdaIfoodLabel,       // mapeia para campo "trafego" esperado pelo n8n
      faturamento: formState.faturamentoLabel,
      investimento: formState.investimentoLabel,
      decisores: formState.decisoresLabel,
      fbc, fbp,
      event_id,
      utmSource:   formState.utmSource   || '',
      utmMedium:   formState.utmMedium   || '',
      utmCampaign: formState.utmCampaign || '',
      utmContent:  formState.utmContent  || '',
      utmTerm:     formState.utmTerm     || '',
    }
    track('lead_qualificado_agendou', payload)
    sendWebhook(payload)
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>Aumente seus pedidos — Delivery</title>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <meta name="description" content="Aumente seus pedidos em 50% com tráfego pago para delivery." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </Head>

      <ProgressBar pct={prog} />

      <div className="wrap">
        <Header />

        {step === 'capa'    && <Capa onNext={handleCapa} />}
        {step === 'q1'      && <StepNome onNext={handleNome} />}
        {step === 'q2'      && <StepZap nome={formState.nome} onNext={handleZap} />}
        {step === 'q3'      && <StepInsta onNext={handleInsta} />}
        {step === 'q4'      && <StepPerdaIfood onNext={handlePerdaIfood} />}
        {step === 'q5'      && <StepFaturamento onNext={handleFaturamento} />}
        {step === 'q6'      && <StepInvestimento onNext={handleInvestimento} />}
        {step === 'q7'      && <StepDecisores onNext={handleDecisores} />}
        {step === 'sucesso' && <TelaSucesso onAgendar={handleAgendar} />}
        {step === 'monok'   && <TelaMonok nome={formState.nome} />}
      </div>
    </>
  )
}
