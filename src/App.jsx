import React, { useEffect, useMemo, useRef, useState } from 'react'
import Spline from '@splinetool/react-spline'
import {
  Sun,
  Moon,
  Users,
  User,
  MessageSquare,
  Plus,
  Play,
  CheckCircle2,
  Hourglass,
  Clock,
  X,
  ChevronRight,
} from 'lucide-react'

// Inline design system (2025)
const palette = {
  light: {
    bg: '#0b1020', // used behind hero only
    surface: '#ffffff',
    surfaceMuted: '#f6f7fb',
    card: '#ffffff',
    text: '#0f1222',
    textMuted: '#4b5563',
    border: '#e5e7eb',
    indigo: '#6366f1',
    purple: '#8b5cf6',
    green: '#22c55e',
    amber: '#f59e0b',
    red: '#ef4444',
    cyan: '#22d3ee',
  },
  dark: {
    bg: '#0b1020',
    surface: '#0f162f',
    surfaceMuted: '#0b122a',
    card: '#121a38',
    text: '#e5e7eb',
    textMuted: '#9ca3af',
    border: '#1f2a4a',
    indigo: '#818cf8',
    purple: '#a78bfa',
    green: '#34d399',
    amber: '#fbbf24',
    red: '#f87171',
    cyan: '#22d3ee',
  },
}

const base = {
  radius: 12,
  shadow: '0 10px 30px rgba(2,10,60,0.12)'
}

const badgeColorByStatus = (status, theme) => {
  const p = palette[theme]
  switch (status) {
    case 'running':
      return { bg: `${p.indigo}22`, color: p.indigo, dot: p.indigo }
    case 'queued':
      return { bg: `${p.amber}22`, color: p.amber, dot: p.amber }
    case 'complete':
      return { bg: `${p.green}22`, color: p.green, dot: p.green }
    default:
      return { bg: `${p.border}`, color: p.textMuted, dot: p.textMuted }
  }
}

const llmColor = (llm, theme) => {
  const p = palette[theme]
  const name = (llm || '').toLowerCase()
  if (name.includes('claude')) return p.purple
  if (name.includes('gpt')) return p.green
  if (name.includes('kimi')) return p.cyan
  return p.indigo
}

const fmtTime = (date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

function App() {
  const [theme, setTheme] = useState('light')
  const p = palette[theme]

  const [view, setView] = useState('team') // 'team' | 'individual'
  const currentUser = 'You'

  const [tasks, setTasks] = useState(() => seedTasks())
  const [selectedId, setSelectedId] = useState(tasks[0]?.id || null)

  // Chat state for pre-task discussion
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Describe your ops task. I will help plan the multi-LLM pipeline before you run it.' },
  ])
  const [draft, setDraft] = useState('')
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatOpen])

  // Simulate real-time updates for running tasks
  useEffect(() => {
    const t = setInterval(() => {
      setTasks(prev => prev.map(task => {
        if (task.status !== 'running') return task
        let progress = Math.min(100, task.progress + Math.random() * 6)
        // Update steps
        const steps = task.steps.map(step => {
          if (step.status === 'running') {
            const sp = Math.min(100, (step.progress || 0) + Math.random() * 10)
            const nextStatus = sp >= 100 ? 'complete' : 'running'
            return { ...step, progress: sp, status: nextStatus, duration: calcDuration(task.startTime) }
          }
          if (step.status === 'queued' && progress > 10 && Math.random() > 0.7) {
            return { ...step, status: 'running', progress: step.progress || 5, duration: calcDuration(task.startTime) }
          }
          return step
        })
        // Complete task if all steps complete
        const complete = steps.every(s => s.status === 'complete') || progress >= 100
        return {
          ...task,
          progress: complete ? 100 : progress,
          status: complete ? 'complete' : 'running',
          steps,
          duration: calcDuration(task.startTime)
        }
      }))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const filtered = useMemo(() => {
    return view === 'individual' ? tasks.filter(t => t.user === currentUser) : tasks
  }, [tasks, view])

  const selected = useMemo(() => tasks.find(t => t.id === selectedId) || filtered[0], [tasks, selectedId, filtered])

  // Stats
  const stats = useMemo(() => {
    const total = filtered.length
    const running = filtered.filter(t => t.status === 'running').length
    const queued = filtered.filter(t => t.status === 'queued').length
    const complete = filtered.filter(t => t.status === 'complete').length
    return { total, running, queued, complete }
  }, [filtered])

  // Chat handlers (mock AI)
  const sendMessage = () => {
    if (!draft.trim()) return
    const userMsg = { role: 'user', text: draft.trim() }
    setMessages(m => [...m, userMsg])
    setDraft('')
    // mock AI planning
    setTimeout(() => {
      const ai = planReply(userMsg.text)
      setMessages(m => [...m, { role: 'ai', text: ai }])
    }, 500)
  }

  const createTaskFromChat = () => {
    // Synthesize task from last user or whole thread
    const name = summarize(messages)
    const pipeline = derivePipeline(messages)
    const newTask = makeTask(name, currentUser, pipeline)
    setTasks(t => [newTask, ...t])
    setSelectedId(newTask.id)
    setChatOpen(false)
  }

  return (
    <div style={{ fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif", color: p.text, background: p.surfaceMuted, minHeight: '100vh' }}>
      {/* Sticky header with hero */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: p.surface }} aria-label="Header">
        {/* Hero Cover with Spline */}
        <div style={{ position: 'relative', width: '100%', height: 240, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <Spline scene="https://prod.spline.design/LU2mWMPbF3Qi1Qxh/scene.splinecode" />
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(15,18,34,0.65), rgba(15,18,34,0.25), rgba(15,18,34,0))' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div aria-hidden style={{ width: 36, height: 36, borderRadius: 8, background: p.indigo, boxShadow: base.shadow }} />
              <div>
                <div style={{ fontWeight: 700, letterSpacing: 0.2, color: '#fff' }}>OPS Orchestrator</div>
                <div style={{ fontSize: 12, color: '#e5e7eb' }}>Privacy-first ERP multi-LLM queue</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* View toggle */}
              <div role="group" aria-label="View toggle" style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.35)', padding: 4, borderRadius: 999 }}>
                <button onClick={() => setView('individual')} aria-pressed={view==='individual'} aria-label="Individual view" style={pill(view==='individual', theme)}>
                  <User size={16} style={{ marginRight: 6 }} /> Individual
                </button>
                <button onClick={() => setView('team')} aria-pressed={view==='team'} aria-label="Team view" style={pill(view==='team', theme)}>
                  <Users size={16} style={{ marginRight: 6 }} /> Team
                </button>
              </div>
              {/* Theme toggle */}
              <button onClick={() => setTheme(t => t==='light'?'dark':'light')} aria-label="Toggle theme" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius: 10, border: `1px solid ${p.border}`, background: p.card, color: p.text, boxShadow: base.shadow }}>
                {theme==='light' ? <Sun size={16}/> : <Moon size={16}/>} {theme==='light'?'Light':'Dark'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, padding: 16, borderTop: `1px solid ${p.border}`, background: p.surface }}>
          {[
            { label: 'Total', value: stats.total, color: p.text },
            { label: 'Running', value: stats.running, color: p.indigo },
            { label: 'Queued', value: stats.queued, color: p.amber },
            { label: 'Complete', value: stats.complete, color: p.green },
          ].map((s, i) => (
            <div key={i} style={{ background: p.card, border: `1px solid ${p.border}`, borderRadius: base.radius, padding: 16, boxShadow: base.shadow }}>
              <div style={{ fontSize: 12, color: p.textMuted, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontWeight: 700, fontSize: 20, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </header>

      {/* Main layout */}
      <main style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 16, padding: 16 }}>
        {/* Left: Task queue and composer */}
        <section aria-label="Task queue" style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* Task composer */}
          <div style={{ background: p.card, border: `1px solid ${p.border}`, borderRadius: base.radius, padding: 12, boxShadow: base.shadow }}>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input aria-label="Task name" placeholder="Describe a new ops task..." style={{ flex:1, padding:'10px 12px', borderRadius: 10, border:`1px solid ${p.border}`, background: theme==='light'?'#fff':'#0c1430', color: p.text, outlineColor: p.indigo }} />
              <button onClick={() => setChatOpen(true)} aria-label="Discuss with AI" style={primaryGhost(p)}>
                <MessageSquare size={16} style={{ marginRight: 6 }} /> Discuss with AI
              </button>
              <button onClick={() => {
                const input = document.querySelector('input[aria-label="Task name"]')
                const val = (input?.value || '').trim()
                if (!val) return
                const t = makeTask(val, currentUser)
                setTasks(prev => [t, ...prev])
                setSelectedId(t.id)
                input.value = ''
              }} aria-label="Add task" style={primarySolid(p)}>
                <Plus size={16} style={{ marginRight: 6 }} /> Add Task
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: p.textMuted }}>Tip: Use “Discuss with AI” to co-design the multi-LLM pipeline before you start.</div>
          </div>

          {/* Task list */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {filtered.map(task => (
              <button key={task.id} onClick={() => setSelectedId(task.id)} aria-label={`Open ${task.name}`} style={{ textAlign:'left', background: selected?.id===task.id ? (theme==='light'?'#eef2ff':'#0d1638') : p.card, border: `1px solid ${selected?.id===task.id ? p.indigo : p.border}`, borderRadius: base.radius, padding: 12, boxShadow: base.shadow, outlineColor: p.indigo }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                  <div style={{ fontWeight: 600 }}>{task.name}</div>
                  <StatusBadge status={task.status} theme={theme} />
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop: 6, color: p.textMuted, fontSize: 12 }}>
                  <span style={dot(llmColor(task.llm, theme))} />
                  <span>{task.llm}</span>
                  <span aria-hidden>•</span>
                  <span title={`Started at ${fmtTime(task.startTime)}`} style={{ display:'inline-flex', alignItems:'center', gap:6 }}><Clock size={14}/> {fmtTime(task.startTime)}</span>
                  {task.duration && (<><span aria-hidden>•</span><span>{task.duration}</span></>)}
                  {view==='team' && (<><span aria-hidden>•</span><span>by {task.user}</span></>)}
                </div>
                {task.status==='running' && (
                  <Progress value={task.progress} color={p.indigo} pulse />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Right: Details panel */}
        <aside aria-label="Details" style={{ position:'sticky', top: 0, alignSelf:'start', height: 'calc(100vh - 16px - 240px - 88px)', /* viewport minus hero+stats approx */ overflow:'auto', display:'flex', flexDirection:'column', gap:12 }}>
          {selected ? (
            <div style={{ background: p.card, border:`1px solid ${p.border}`, borderRadius: base.radius, padding: 16, boxShadow: base.shadow }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight:700 }}>{selected.name}</div>
                <div style={{ display:'flex', alignItems:'center', gap:8, color: p.textMuted, fontSize: 12 }}>
                  <span style={dot(llmColor(selected.llm, theme))} />
                  <span>{selected.llm}</span>
                  <span aria-hidden>•</span>
                  <span>{selected.duration || '—'}</span>
                </div>
              </div>

              {/* Pipeline steps */}
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {selected.steps.map((step, idx) => (
                  <div key={idx} style={{ display:'grid', gridTemplateColumns:'24px 1fr', gap:12, alignItems:'start' }}>
                    {/* Connector */}
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                      <StatusIcon status={step.status} theme={theme} />
                      {idx < selected.steps.length - 1 && (
                        <div aria-hidden style={{ width: 2, height: 28, marginTop: 6, background: step.status==='complete' ? palette[theme].green : palette[theme].border }} />
                      )}
                    </div>
                    {/* Content */}
                    <div style={{ background: theme==='light'?'#fff': '#0b1330', border:`1px solid ${p.border}`, borderRadius: 10, padding: 12 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <div style={{ fontWeight:600 }}>{step.name}</div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, color: p.textMuted, fontSize: 12 }}>
                          <span style={dot(llmColor(step.llm, theme))} />
                          <span>{step.llm}</span>
                          <span aria-hidden>•</span>
                          <span>{step.duration || '—'}</span>
                        </div>
                      </div>
                      {step.status==='running' && (
                        <div style={{ marginTop: 8 }}>
                          <Progress value={Math.round(step.progress || 0)} color={llmColor(step.llm, theme)} pulse />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: p.textMuted }}>Select a task to see details</div>
          )}
        </aside>
      </main>

      {/* Chat modal */}
      {chatOpen && (
        <div role="dialog" aria-modal="true" aria-label="Discuss with AI" style={{ position:'fixed', inset:0, background:'rgba(0,8,20,0.55)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ width: 'min(960px, 96vw)', background: p.card, color: p.text, border:`1px solid ${p.border}`, borderRadius: 16, boxShadow: base.shadow, display:'grid', gridTemplateRows:'auto 1fr auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:16, borderBottom:`1px solid ${p.border}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:600 }}>
                <MessageSquare size={18} /> Plan with AI
              </div>
              <button onClick={() => setChatOpen(false)} aria-label="Close dialog" style={iconBtn(p)}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding:16, height: 380, overflow:'auto' }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display:'flex', justifyContent: m.role==='user'?'flex-end':'flex-start', marginBottom:8 }}>
                  <div style={{ maxWidth:'70%', padding:'10px 12px', borderRadius: 12, background: m.role==='user' ? `${p.indigo}22` : (theme==='light'?'#f3f4f6':'#0c1430'), border:`1px solid ${p.border}` }}>
                    <div style={{ fontSize: 12, color: p.textMuted, marginBottom: 4 }}>{m.role==='user'?'You':'AI'}</div>
                    <div style={{ whiteSpace:'pre-wrap' }}>{m.text}</div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding:16, borderTop:`1px solid ${p.border}`, display:'flex', alignItems:'center', gap:8 }}>
              <input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=> e.key==='Enter' && sendMessage()} aria-label="Message" placeholder="Ask the AI to help design the pipeline..." style={{ flex:1, padding:'12px 14px', borderRadius:12, border:`1px solid ${p.border}`, outlineColor: p.indigo, background: theme==='light'?'#fff':'#0c1430', color:p.text }} />
              <button onClick={sendMessage} aria-label="Send" style={primarySolid(p)}>
                <Play size={16} style={{ marginRight: 6 }} /> Send
              </button>
              <button onClick={createTaskFromChat} aria-label="Create task from plan" style={successSolid(p)}>
                <CheckCircle2 size={16} style={{ marginRight: 6 }} /> Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responsive: stack on mobile */}
      <style>{`
        @media (max-width: 768px) {
          main { grid-template-columns: 1fr; }
          aside[aria-label="Details"] { position: relative; height: auto; }
        }
        button:focus-visible, input:focus-visible { outline: 2px solid ${p.indigo}; outline-offset: 2px; }
      `}</style>
    </div>
  )
}

// UI helpers
const StatusBadge = ({ status, theme }) => {
  const { bg, color, dot: dotColor } = badgeColorByStatus(status, theme)
  return (
    <span aria-label={`${status} status`} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 10px', borderRadius: 999, background:bg, color, fontSize:12, fontWeight:600 }}>
      <span aria-hidden style={{ width:8, height:8, borderRadius:999, background: dotColor, boxShadow: status==='running' ? `0 0 0 3px ${color}33` : 'none', animation: status==='running' ? 'pulse 1.2s infinite' : 'none' }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
      <style>{`@keyframes pulse { 0%{ box-shadow: 0 0 0 0 ${color}55 } 70%{ box-shadow: 0 0 0 8px transparent } 100%{ box-shadow: 0 0 0 0 transparent } }`}</style>
    </span>
  )
}

const Progress = ({ value, color, pulse }) => (
  <div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} style={{ width:'100%', height:8, borderRadius:999, background: '#e5e7eb33', overflow:'hidden', outline:'none' }}>
    <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height:'100%', background: color, transition: 'width 200ms ease', boxShadow: pulse ? `0 0 0 0 ${color}55` : 'none', animation: pulse ? 'barPulse 1.6s infinite' : 'none' }} />
    <style>{`@keyframes barPulse { 0%{ box-shadow: 0 0 0 0 ${color}55 } 70%{ box-shadow: 0 0 0 8px transparent } 100%{ box-shadow: 0 0 0 0 transparent } }`}</style>
  </div>
)

const StatusIcon = ({ status, theme }) => {
  const p = palette[theme]
  const color = status==='complete' ? p.green : status==='running' ? p.indigo : p.amber
  const Icon = status==='complete' ? CheckCircle2 : status==='running' ? Play : Hourglass
  return <Icon size={18} color={color} aria-hidden />
}

const dot = (color) => ({ display:'inline-block', width:8, height:8, borderRadius:999, background: color })

const pill = (active, theme) => {
  const p = palette[theme]
  return {
    display:'inline-flex', alignItems:'center', gap:6,
    padding:'6px 12px', borderRadius: 999, border: 'none',
    background: active ? p.card : 'transparent', color: active ? p.text : '#fff',
    cursor:'pointer', transition: 'background 200ms',
  }
}

const primarySolid = (p) => ({
  display:'inline-flex', alignItems:'center', gap:6, cursor:'pointer',
  padding:'10px 12px', borderRadius: 10, border:`1px solid ${p.indigo}`, background: p.indigo, color:'#fff', fontWeight:600,
})

const successSolid = (p) => ({
  display:'inline-flex', alignItems:'center', gap:6, cursor:'pointer',
  padding:'10px 12px', borderRadius: 10, border:`1px solid ${p.green}`, background: p.green, color:'#0b1020', fontWeight:700,
})

const primaryGhost = (p) => ({
  display:'inline-flex', alignItems:'center', gap:6, cursor:'pointer',
  padding:'10px 12px', borderRadius: 10, border:`1px solid ${p.border}`, background: 'transparent', color:p.text, fontWeight:600,
})

const iconBtn = (p) => ({
  display:'inline-flex', alignItems:'center', justifyContent:'center', width:36, height:36, borderRadius:10, border:`1px solid ${p.border}`, background: 'transparent', color: p.text
})

// Data + logic
function calcDuration(start) {
  const s = new Date(start).getTime()
  const now = Date.now()
  const sec = Math.max(0, Math.round((now - s) / 1000))
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec/60)
  const r = sec % 60
  return `${m}m ${r}s`
}

let idCounter = 1000
function makeTask(name, user, steps) {
  const start = new Date().toISOString()
  const pipeline = steps || [
    { name: 'Ingest Requirements', status: 'running', llm: 'GPT-4', progress: 15 },
    { name: 'Spec Synthesis', status: 'queued', llm: 'Claude Sonnet 4.5' },
    { name: 'Ops Plan + Checks', status: 'queued', llm: 'Kimi K2' },
    { name: 'Execution & Verify', status: 'queued', llm: 'GPT-4' },
  ]
  return {
    id: ++idCounter,
    name,
    status: 'running',
    progress: 5,
    user: user || 'You',
    llm: pipeline.find(s=>s.status==='running')?.llm || 'GPT-4',
    startTime: start,
    duration: '0s',
    steps: pipeline,
  }
}

function seedTasks() {
  const now = new Date()
  const ago = (min) => new Date(now.getTime() - min*60000).toISOString()
  const t1 = {
    id: 1,
    name: 'Reconcile Q3 Invoices',
    status: 'running',
    progress: 42,
    user: 'You',
    llm: 'GPT-4',
    startTime: ago(5),
    duration: '5m 0s',
    steps: [
      { name: 'Parse PDFs', status: 'complete', llm: 'GPT-4', progress: 100, duration: '2m 10s' },
      { name: 'Vendor Matching', status: 'running', llm: 'Claude Sonnet 4.5', progress: 35, duration: '1m 10s' },
      { name: 'Anomaly Check', status: 'queued', llm: 'Kimi K2' },
      { name: 'Ledger Update', status: 'queued', llm: 'GPT-4' },
    ]
  }
  const t2 = {
    id: 2,
    name: 'Procurement: Monitor RFP replies',
    status: 'queued',
    progress: 0,
    user: 'Ava',
    llm: 'Claude Sonnet 4.5',
    startTime: ago(1),
    steps: [
      { name: 'Collect Emails', status: 'queued', llm: 'Kimi K2' },
      { name: 'Summarize Replies', status: 'queued', llm: 'GPT-4' },
      { name: 'Score Vendors', status: 'queued', llm: 'Claude Sonnet 4.5' },
    ]
  }
  const t3 = {
    id: 3,
    name: 'IT: Access Review Batch',
    status: 'complete',
    progress: 100,
    user: 'Ben',
    llm: 'Kimi K2',
    startTime: ago(45),
    duration: '12m 14s',
    steps: [
      { name: 'Export Accounts', status: 'complete', llm: 'GPT-4', progress: 100, duration: '3m 00s' },
      { name: 'Policy Diff', status: 'complete', llm: 'Claude Sonnet 4.5', progress: 100, duration: '4m 40s' },
      { name: 'Notify Owners', status: 'complete', llm: 'Kimi K2', progress: 100, duration: '4m 34s' },
    ]
  }
  return [t1,t2,t3]
}

function planReply(text) {
  // naive: propose 3-4 steps with LLM allocation
  const base = [
    { name: 'Ingest Inputs', llm: 'GPT-4' },
    { name: 'Plan & Branch', llm: 'Claude Sonnet 4.5' },
    { name: 'Execute Tools', llm: 'Kimi K2' },
    { name: 'Verify & Report', llm: 'GPT-4' },
  ]
  return `Here is a concise pipeline for “${text}”:\n\n` + base.map((s,i)=>`${i+1}. ${s.name} — ${s.llm}`).join('\n') + "\n\nYou can start as-is or ask me to adjust steps/LLMs."
}

function derivePipeline(messages) {
  // look for last AI proposal lines starting with numbers
  const lastPlan = [...messages].reverse().find(m => m.role==='ai' && /1\./.test(m.text))
  if (!lastPlan) return undefined
  const lines = lastPlan.text.split('\n').filter(l=>/^\d+\./.test(l))
  const steps = lines.map(l=>{
    const [idxRest, rest] = l.split('. ')
    const [namePart, llmPart] = rest.split(' — ')
    return { name: namePart.trim(), status: 'queued', llm: (llmPart||'GPT-4').trim() }
  })
  if (steps.length) steps[0].status = 'running'
  return steps
}

function summarize(messages) {
  const lastUser = [...messages].reverse().find(m=>m.role==='user')
  return lastUser ? lastUser.text.slice(0, 60) : 'New Orchestrated Task'
}

export default App
