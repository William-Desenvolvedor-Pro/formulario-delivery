import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const CONFIG = {
  n8nWebhookUrl: 'SUA_URL_DO_N8N_AQUI',
  linkCalendly:  'SEU_LINK_DO_CALENDLY_AQUI',
  linkInstagram: 'https://www.instagram.com/orlandodiscipline/',
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

// ─── PROGRESS ────────────────────────────────────────────────────────────────
const PROG = { q1: 0, q2: 20, q3: 40, q4: 60, q5: 80, sucesso: 100, monok: 100 }

// ─── STYLES ──────────────────────────────────────────────────────────────────
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
    max-width: 560px;
    margin: 0 auto;
    padding: 0 24px 40px;
  }

  /* ── Progress bar ── */
  .prog-bar {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 4px;
    background: #ececec;
    z-index: 100;
  }
  .prog-fill {
    height: 100%;
    background: #4CAF50;
    transition: width 0.5s ease;
  }

  /* ── Top spacer (sem logo) ── */
  .hdr { padding: 48px 0 0; }

  /* ── Question steps ── */
  .step-wrap { flex: 1; display: flex; flex-direction: column; }

  .q-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 16px 0;
  }
  .q-num {
    font-size: 12px;
    font-weight: 600;
    color: #aaa;
    letter-spacing: 0.05em;
    margin-bottom: 16px;
  }
  .q-title {
    font-size: clamp(20px, 5vw, 26px);
    font-weight: 700;
    line-height: 1.35;
    color: #111;
    margin-bottom: 32px;
  }
  .q-req { color: #e55; margin-left: 2px; }

  /* ── Text inputs ── */
  .inp-line {
    width: 100%;
    border: none;
    border-bottom: 1.5px solid #cccccc;
    outline: none;
    font-family: inherit;
    font-size: 18px;
    color: #111;
    padding: 10px 0;
    background: transparent;
    transition: border-color 0.2s;
    margin-bottom: 6px;
  }
  .inp-line::placeholder { color: #bbb; }
  .inp-line:focus { border-bottom-color: #4CAF50; }
  .inp-line.error { border-bottom-color: #e55; }

  /* ── WhatsApp row ── */
  .zap-row {
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1.5px solid #cccccc;
    padding-bottom: 8px;
    margin-bottom: 6px;
    transition: border-color 0.2s;
  }
  .zap-row:focus-within { border-bottom-color: #4CAF50; }
  .zap-row.error { border-bottom-color: #e55; }
  .zap-row input {
    flex: 1;
    border: none;
    outline: none;
    font-family: inherit;
    font-size: 18px;
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

  /* ── Options ── */
  .opts { display: flex; flex-direction: column; gap: 10px; }
  .opt {
    display: flex;
    align-items: center;
    gap: 14px;
    border: 1.5px solid #e0e0e0;
    border-radius: 6px;
    padding: 13px 16px;
    cursor: pointer;
    background: #fff;
    transition: border-color 0.15s, background 0.15s;
    user-select: none;
  }
  .opt:hover { border-color: #4CAF50; background: #f6fdf6; }
  .opt.sel { border-color: #4CAF50; background: #f0faf0; }
  .opt-letter {
    min-width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0f0f0;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 700;
    color: #555;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;
  }
  .opt.sel .opt-letter { background: #4CAF50; color: #fff; }
  .opt-text { font-size: 14px; font-weight: 500; color: #222; line-height: 1.4; }

  /* ── Buttons ── */
  .cont-wrap {
    padding-top: 24px;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 8px;
    width: 100%;
  }
  .back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #4CAF50;
    color: #fff;
    font-family: inherit;
    font-size: 20px;
    font-weight: 700;
    border: none;
    border-radius: 6px;
    padding: 0 18px;
    cursor: pointer;
    flex-shrink: 0;
    min-width: 52px;
    transition: opacity 0.15s;
  }
  .back-btn:hover { opacity: 0.85; }

  .cont-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #4CAF50;
    color: #fff;
    font-family: inherit;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    border: none;
    border-radius: 6px;
    padding: 18px 24px;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .cont-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .cont-btn:not(:disabled):hover { opacity: 0.88; }

  .enter-hint {
    font-size: 12px;
    color: #ccc;
    margin-top: 8px;
  }
  .enter-hint kbd {
    font-family: inherit;
    background: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 3px;
    padding: 1px 5px;
    font-size: 11px;
    color: #888;
  }

  /* ── Sucesso ── */
  .sucesso {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 24px 0;
  }
  .sucesso-icon { font-size: 56px; margin-bottom: 20px; }
  .sucesso-h1 {
    font-size: clamp(22px, 5.5vw, 28px);
    font-weight: 900;
    color: #111;
    margin-bottom: 16px;
    line-height: 1.2;
  }
  .sucesso-p {
    font-size: 15px;
    color: #555;
    line-height: 1.7;
    margin-bottom: 36px;
    max-width: 460px;
  }
  .calendly-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: #4CAF50;
    color: #fff;
    font-family: inherit;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    border: none;
    border-radius: 6px;
    padding: 18px 28px;
    cursor: pointer;
    text-decoration: none;
    transition: opacity 0.15s;
  }
  .calendly-btn:hover { opacity: 0.9; }

  /* ── Monok ── */
  .monok {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 24px 0;
  }
  .monok-icon { font-size: 48px; margin-bottom: 16px; }
  .monok-h2 {
    font-size: clamp(20px, 5vw, 26px);
    font-weight: 900;
    color: #111;
    margin-bottom: 16px;
    line-height: 1.2;
  }
  .monok-p {
    font-size: 15px;
    color: #555;
    line-height: 1.7;
    margin-bottom: 32px;
    max-width: 440px;
  }
  .insta-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: #4CAF50;
    color: #fff;
    font-family: inherit;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    border: none;
    border-radius: 6px;
    padding: 16px 24px;
    cursor: pointer;
    text-decoration: none;
    transition: opacity 0.15s;
  }
  .insta-btn:hover { opacity: 0.9; }

  /* ── Animations ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .step-wrap, .sucesso, .monok { animation: fadeUp 0.3s ease both; }
`

// ─── STEP 01 — Nome ───────────────────────────────────────────────────────────
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
        <div className="q-num">01 / 05</div>
        <div className="q-title">Qual o seu <strong>nome</strong>? <span className="q-req">*</span></div>
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
      </div>
      <div className="enter-hint">pressione <kbd>Enter ↵</kbd></div>
    </div>
  )
}

// ─── STEP 02 — Telefone ───────────────────────────────────────────────────────
function StepTelefone({ onNext, onBack }) {
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
  const isValid = digits.length >= 10
  const showError = digits.length > 3 && !isValid

  function handleKey(e) { if (e.key === 'Enter' && isValid) onNext(val) }

  return (
    <div className="step-wrap">
      <div className="q-body">
        <div className="q-num">02 / 05</div>
        <div className="q-title">Qual seu <strong>telefone</strong>? <span className="q-req">*</span></div>
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
        <button className="back-btn" onClick={onBack}>‹</button>
        <button className="cont-btn" disabled={!isValid} onClick={() => onNext(val)}>
          OK
        </button>
      </div>
      <div className="enter-hint">pressione <kbd>Enter ↵</kbd></div>
    </div>
  )
}

// ─── STEP 03 — Instagram ──────────────────────────────────────────────────────
function StepInstagram({ onNext, onBack }) {
  const [val, setVal] = useState('')
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])

  const clean = val.trim().replace(/^@/, '')
  const isValid = clean.length >= 2

  function handleKey(e) { if (e.key === 'Enter' && isValid) onNext(clean) }

  return (
    <div className="step-wrap">
      <div className="q-body">
        <div className="q-num">03 / 05</div>
        <div className="q-title">Qual o seu <strong>Instagram</strong>? <span className="q-req">*</span></div>
        <input
          ref={ref}
          className="inp-line"
          type="text"
          placeholder="@seuinstagram"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={handleKey}
        />
        <div className="err-msg" />
      </div>
      <div className="cont-wrap">
        <button className="back-btn" onClick={onBack}>‹</button>
        <button className="cont-btn" disabled={!isValid} onClick={() => onNext(clean)}>
          OK
        </button>
      </div>
      <div className="enter-hint">pressione <kbd>Enter ↵</kbd></div>
    </div>
  )
}

// ─── STEP 04 — Faturamento ────────────────────────────────────────────────────
const FAT_OPTS = [
  { v: 'ate30k',       label: 'Até 30 mil reais',           disqualify: true },
  { v: '30k-70k',      label: 'Entre 30 mil a 70 mil',      disqualify: false },
  { v: '70k-150k',     label: 'Entre 70 mil a 150 mil',     disqualify: false },
  { v: '150k-300k',    label: 'Entre 150 mil a 300 mil',    disqualify: false },
  { v: 'acima300k',    label: 'Acima de 300 mil',           disqualify: false },
]

function StepFaturamento({ onNext, onBack }) {
  const [sel, setSel] = useState(null)
  return (
    <div className="step-wrap">
      <div className="q-body">
        <div className="q-num">04 / 05</div>
        <div className="q-title">Qual o <strong>faturamento médio mensal</strong> da sua empresa? <span className="q-req">*</span></div>
        <div className="opts">
          {FAT_OPTS.map((opt, i) => (
            <div key={i} className={`opt${sel?.v === opt.v ? ' sel' : ''}`} onClick={() => setSel(opt)}>
              <div className="opt-letter">{String.fromCharCode(65 + i)}</div>
              <div className="opt-text">{opt.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="cont-wrap">
        <button className="back-btn" onClick={onBack}>‹</button>
        <button className="cont-btn" disabled={!sel} onClick={() => onNext(sel)}>
          OK
        </button>
      </div>
    </div>
  )
}

// ─── STEP 05 — Investimento ───────────────────────────────────────────────────
const INV_OPTS = [
  { v: 'ok',  label: '✅ Sim! Preciso de tráfego profissional', disqualify: false },
  { v: 'nok', label: '❌ Não quero investir no meu negócio',    disqualify: true  },
]

function StepInvestimento({ onNext, onBack }) {
  const [sel, setSel] = useState(null)
  return (
    <div className="step-wrap">
      <div className="q-body">
        <div className="q-num">05 / 05</div>
        <div className="q-title">
          Nossa Assessoria se inicia em <strong>R$1.500,00/mês</strong>. Está disposto a investir esse valor e elevar seu negócio a um novo patamar? <span className="q-req">*</span>
        </div>
        <div className="opts">
          {INV_OPTS.map((opt, i) => (
            <div key={i} className={`opt${sel?.v === opt.v ? ' sel' : ''}`} onClick={() => setSel(opt)}>
              <div className="opt-letter">{String.fromCharCode(65 + i)}</div>
              <div className="opt-text">{opt.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="cont-wrap">
        <button className="back-btn" onClick={onBack}>‹</button>
        <button className="cont-btn" disabled={!sel} onClick={() => onNext(sel)}>
          ENVIAR
        </button>
      </div>
    </div>
  )
}

// ─── TELA SUCESSO ─────────────────────────────────────────────────────────────
function TelaSucesso({ onAgendar }) {
  return (
    <div className="sucesso">
      <div className="sucesso-icon">✅</div>
      <h1 className="sucesso-h1">Perfeito, sua empresa está no perfil certo!</h1>
      <p className="sucesso-p">
        Analisamos suas respostas e o seu negócio tem exatamente o perfil que atendemos. Para não perdermos tempo com trocas de mensagens, selecione agora o melhor horário para nossa Reunião Estratégica clicando no link abaixo.
      </p>
      <a
        className="calendly-btn"
        href={CONFIG.linkCalendly}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onAgendar}
      >
        🗓 AGENDAR REUNIÃO →
      </a>
    </div>
  )
}

// ─── TELA MONOK ───────────────────────────────────────────────────────────────
function TelaMonok() {
  return (
    <div className="monok">
      <div className="monok-icon">🙏</div>
      <h2 className="monok-h2">Agradecemos seu interesse!</h2>
      <p className="monok-p">
        Por enquanto, nossa assessoria é voltada para empresas dispostas a investir no crescimento do negócio. No momento, não conseguiríamos te entregar o resultado que você merece.
        <br /><br />
        Mas convido você a acompanhar nossos conteúdos exclusivos no Instagram! 👇
      </p>
      <a
        className="insta-btn"
        href={CONFIG.linkInstagram}
        target="_blank"
        rel="noopener noreferrer"
      >
        📱 Acessar Instagram →
      </a>
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Formulario() {
  const [step, setStep] = useState('q1')
  const [formState, setFormState] = useState({
    nome: '', telefone: '', ig: '',
    faturamentoLabel: '', faturamentoV: '', faturamentoDisqualify: false,
    investimentoLabel: '', investimentoV: '', investimentoDisqualify: false,
    ...getUTMs(),
  })

  const prog = PROG[step] || 0

  useEffect(() => {
    track('form_view', getUTMs())
    const payload = { event: 'form_start', ...getUTMs() }
    sendWebhook(payload)
  }, [])

  function goTo(next) {
    setStep(next)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleNome(nome) {
    setFormState(s => ({ ...s, nome }))
    goTo('q2')
  }

  function handleTelefone(telefone) {
    setFormState(s => ({ ...s, telefone }))
    goTo('q3')
  }

  function handleInstagram(ig) {
    setFormState(s => ({ ...s, ig }))
    goTo('q4')
  }

  function handleFaturamento(opt) {
    setFormState(s => ({ ...s, faturamentoLabel: opt.label, faturamentoV: opt.v, faturamentoDisqualify: opt.disqualify }))
    goTo('q5')
  }

  function handleInvestimento(opt) {
    const newState = {
      ...formState,
      investimentoLabel: opt.label,
      investimentoV: opt.v,
      investimentoDisqualify: opt.disqualify,
    }
    setFormState(newState)

    const isDisqualified = newState.faturamentoDisqualify || opt.disqualify
    const { fbc, fbp } = getMetaCookies()

    const payload = {
      event: isDisqualified ? 'form_disqualified' : 'form_qualified',
      nome: newState.nome,
      zap: normalizeZap(newState.telefone),
      ig: newState.ig,
      faturamento: newState.faturamentoLabel,
      investimento: opt.label,
      fbc, fbp,
      utmSource:   newState.utmSource   || '',
      utmMedium:   newState.utmMedium   || '',
      utmCampaign: newState.utmCampaign || '',
      utmContent:  newState.utmContent  || '',
      utmTerm:     newState.utmTerm     || '',
    }

    track(isDisqualified ? 'lead_desqualificado' : 'lead_qualificado', payload)
    if (isDisqualified) sendWebhook(payload)

    goTo(isDisqualified ? 'monok' : 'sucesso')
  }

  function handleAgendar() {
    const { fbc, fbp } = getMetaCookies()
    const payload = {
      event: 'schedule_booked',
      nome: formState.nome,
      zap: normalizeZap(formState.telefone),
      ig: formState.ig,
      faturamento: formState.faturamentoLabel,
      investimento: formState.investimentoLabel,
      event_id: generateEventId(),
      fbc, fbp,
      utmSource:   formState.utmSource   || '',
      utmMedium:   formState.utmMedium   || '',
      utmCampaign: formState.utmCampaign || '',
      utmContent:  formState.utmContent  || '',
      utmTerm:     formState.utmTerm     || '',
    }
    track('lead_agendou', payload)
    sendWebhook(payload)
  }

  return (
    <>
      <Head>
        <title>Formulário — Disciplin's Marketing</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </Head>

      <div className="prog-bar">
        <div className="prog-fill" style={{ width: `${prog}%` }} />
      </div>

      <div className="wrap">
        <div className="hdr" />

        {step === 'q1' && <StepNome onNext={handleNome} />}
        {step === 'q2' && <StepTelefone onNext={handleTelefone} onBack={() => goTo('q1')} />}
        {step === 'q3' && <StepInstagram onNext={handleInstagram} onBack={() => goTo('q2')} />}
        {step === 'q4' && <StepFaturamento onNext={handleFaturamento} onBack={() => goTo('q3')} />}
        {step === 'q5' && <StepInvestimento onNext={handleInvestimento} onBack={() => goTo('q4')} />}
        {step === 'sucesso' && <TelaSucesso onAgendar={handleAgendar} />}
        {step === 'monok' && <TelaMonok />}
      </div>
    </>
  )
}
