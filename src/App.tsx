import { useState, useEffect } from 'react'

// ============================================================
// TIPE DATA
// ============================================================

type Priority   = 'high' | 'medium' | 'low'
type ColumnType = 'todo' | 'doing' | 'done'

type Task = {
  id:       number
  title:    string
  status:   ColumnType
  priority: Priority
  dueDate:  string
}

// ============================================================
// KONFIGURASI
// ============================================================

const COLUMN_CONFIG: Record<ColumnType, {
  title:      string
  dot:        string
  dotDark:    string
  accent:     string
  accentDark: string
  badge:      string
  badgeDark:  string
}> = {
  todo: {
    title:      'To Do',
    dot:        '#2563eb', dotDark:    '#90cdf4',
    accent:     'rgba(37,99,235,0.7)',  accentDark: 'rgba(99,179,237,0.6)',
    badge:      'bg-blue-100 text-blue-700 border border-blue-200',
    badgeDark:  'bg-blue-400/20 text-blue-200 border border-blue-400/30',
  },
  doing: {
    title:      'In Progress',
    dot:        '#d97706', dotDark:    '#fcd34d',
    accent:     'rgba(217,119,6,0.7)',  accentDark: 'rgba(251,191,36,0.6)',
    badge:      'bg-amber-100 text-amber-700 border border-amber-200',
    badgeDark:  'bg-amber-400/20 text-amber-200 border border-amber-400/30',
  },
  done: {
    title:      'Done',
    dot:        '#059669', dotDark:    '#6ee7b7',
    accent:     'rgba(5,150,105,0.7)',  accentDark: 'rgba(52,211,153,0.6)',
    badge:      'bg-emerald-100 text-emerald-700 border border-emerald-200',
    badgeDark:  'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30',
  },
}

const PRIORITY_CONFIG: Record<Priority, { label: string; light: string; dark: string; dot: string; dotDark: string }> = {
  high:   { label: 'High',   light: 'bg-red-100 text-red-600 border border-red-200',       dark: 'bg-red-400/20 text-red-300 border border-red-400/30',       dot: '#dc2626', dotDark: '#f87171' },
  medium: { label: 'Medium', light: 'bg-amber-100 text-amber-600 border border-amber-200', dark: 'bg-amber-400/20 text-amber-300 border border-amber-400/30', dot: '#d97706', dotDark: '#fbbf24' },
  low:    { label: 'Low',    light: 'bg-green-100 text-green-600 border border-green-200', dark: 'bg-green-400/20 text-green-300 border border-green-400/30',  dot: '#059669', dotDark: '#86efac' },
}

const COLS: ColumnType[] = ['todo', 'doing', 'done']
const NEXT: Partial<Record<ColumnType, ColumnType>> = { todo: 'doing', doing: 'done' }
const PREV: Partial<Record<ColumnType, ColumnType>> = { doing: 'todo', done: 'doing'  }

// ============================================================
// HELPERS
// ============================================================

const today = () => new Date().toISOString().split('T')[0]

const dueDateStatus = (dueDate: string, status: ColumnType) => {
  if (!dueDate || status === 'done') return 'none'
  const diff = (new Date(dueDate).getTime() - new Date(today()).getTime()) / 86400000
  if (diff < 0)  return 'overdue'
  if (diff <= 2) return 'soon'
  return 'ok'
}

const formatDate = (d: string) => {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

// Helper audio sintetis (Web Audio API) biar tidak perlu file aset eksternal
const playSuccessSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1) // A5
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
  } catch (e) {
    console.log("Audio play blocked or not supported")
  }
}

// ============================================================
// KOMPONEN UTAMA
// ============================================================

export default function App() {
  // ── STATE ────────────────────────────────────────────────
  // Inisialisasi state langsung membaca dari localStorage
  const [tasks, setTasks]           = useState<Task[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kanban_tasks')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  const [input, setInput]           = useState('')
  const [priority, setPriority]     = useState<Priority>('medium')
  const [dueDate, setDueDate]       = useState('')
  const [selected, setSelected]     = useState<Set<number>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [dark, setDark]             = useState(true)
  
  // State baru untuk Fitur Pencarian & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')

  // Sinkronisasi Tema Ke Document Element
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  // Sinkronisasi Tasks ke LocalStorage setiap ada perubahan data
  useEffect(() => {
    localStorage.setItem('kanban_tasks', JSON.stringify(tasks))
  }, [tasks])

  // ── HANDLERS ─────────────────────────────────────────────

  const addTask = () => {
    if (!input.trim()) return
    setTasks(prev => [...prev, { id: Date.now(), title: input.trim(), status: 'todo', priority, dueDate }])
    setInput('')
    setDueDate('')
    setPriority('medium')
  }

  const moveTask = (id: number, status: ColumnType) => {
    if (status === 'done') {
      playSuccessSound()
    }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  const deleteTask = (id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  const toggleSelect = (id: number) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const deleteSelected = () => {
    setTasks(prev => prev.filter(t => !selected.has(t.id)))
    setSelected(new Set())
    setSelectMode(false)
  }

  const toggleSelectAll = () =>
    selected.size === filteredTasks.length
      ? setSelected(new Set())
      : setSelected(new Set(filteredTasks.map(t => t.id)))

  const cancelSelect = () => { setSelected(new Set()); setSelectMode(false) }

  // ── DRAG AND DROP HANDLERS (NATIVE) ──────────────────────
  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('text/plain', taskId.toString())
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault() // Wajib dipanggil supaya area bisa menerima drop
  }

  const handleDrop = (e: React.DragEvent, targetStatus: ColumnType) => {
    e.preventDefault()
    const taskIdStr = e.dataTransfer.getData('text/plain')
    if (!taskIdStr) return
    const taskId = parseInt(taskIdStr, 10)
    moveTask(taskId, targetStatus)
  }

  // ── FILTER DATA LOGIC ─────────────────────────────────────
  // Menyaring task berdasarkan keyword pencarian dan filter prioritas
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority
    return matchesSearch && matchesPriority
  })

  const getByStatus = (s: ColumnType) => filteredTasks.filter(t => t.status === s)
  const getRawCountByStatus = (s: ColumnType) => tasks.filter(t => t.status === s).length

  // ── DERIVED ───────────────────────────────────────────────
  const total    = tasks.length
  const totalDone = tasks.filter(t => t.status === 'done').length
  const donePct  = total === 0 ? 0 : Math.round((totalDone / total) * 100)

  // ── THEME HELPERS ─────────────────────────────────────────
  const bg = dark
    ? { background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }
    : { background: 'linear-gradient(135deg, #e0e7ff, #f0f9ff, #faf5ff)' }

  const glass = dark
    ? { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }
    : { background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)',       backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }

  const inputStyle = dark
    ? { background: 'rgba(255,255,255,0.1)',  border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }
    : { background: 'rgba(255,255,255,0.8)',  border: '1px solid rgba(0,0,0,0.15)',      color: '#1e1b4b' }

  const textPrimary   = dark ? 'text-white'      : 'text-indigo-950'
  const textSecondary = dark ? 'text-white/60'   : 'text-indigo-500'
  const textMuted     = dark ? 'text-white/25'   : 'text-indigo-300'
  const taskCardBase  = dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.6)'
  const taskCardHover = dark ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.95)'
  const taskBorder    = dark ? 'rgba(255,255,255,0.1)'  : 'rgba(0,0,0,0.06)'

  // ── RENDER ────────────────────────────────────────────────

  return (
    <div className="min-h-screen transition-all duration-300 pb-12" style={bg}>
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="w-10" />
          <h1 className={`text-3xl font-semibold tracking-tight ${textPrimary}`}>
              Todo Board
          </h1>
          <button
            onClick={() => setDark(d => !d)}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm"
            style={glass}
            title="Toggle theme"
          >
            <span className="text-lg">{dark ? '☀️' : '🌙'}</span>
          </button>
        </div>

        {/* Overall progress bar */}
        {total > 0 && (
          <div className="max-w-lg mx-auto mb-6">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(79,70,229,0.7)' }}>
              <span>Progres Keseluruhan</span>
              <span className="font-medium">{donePct}% Selesai</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden shadow-inner" style={{ background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(79,70,229,0.1)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${donePct}%`, background: dark ? 'linear-gradient(90deg,#818cf8,#6ee7b7)' : 'linear-gradient(90deg,#4f46e5,#10b981)' }}
              />
            </div>
          </div>
        )}

        {/* Form & Search Container */}
        <div className="max-w-lg mx-auto mb-6 space-y-3">
          
          {/* Input card */}
          <div className="rounded-2xl p-4 shadow-xl transition-all" style={glass}>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                placeholder="Tambah task baru..."
                className="flex-1 px-4 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 placeholder-opacity-40 transition-all shadow-inner"
                style={{ ...inputStyle, fontSize: '14px' }}
              />
              <button
                onClick={addTask}
                className="px-5 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95 shadow-md"
                style={{ background: 'rgba(99,102,241,0.85)', border: '1px solid rgba(99,102,241,1)' }}
              >
                + Add
              </button>
            </div>

            {/* Priority + Due date */}
            <div className="flex gap-2 flex-wrap items-center">
              {(['high', 'medium', 'low'] as Priority[]).map(p => {
                const pc = PRIORITY_CONFIG[p]
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`text-xs px-3 py-1 rounded-lg transition-all ${dark ? pc.dark : pc.light} font-medium`}
                    style={{ opacity: priority === p ? 1 : 0.4, transform: priority === p ? 'scale(1.05)' : 'scale(1)' }}
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: dark ? pc.dotDark : pc.dot }} />
                    {pc.label}
                  </button>
                )
              })}
              <input
                type="date"
                value={dueDate}
                min={today()}
                onChange={e => setDueDate(e.target.value)}
                className="text-xs px-3 py-1 rounded-lg outline-none cursor-pointer transition-all shadow-sm"
                style={{ ...inputStyle, fontSize: '12px', colorScheme: dark ? 'dark' : 'light' }}
              />
              {dueDate && (
                <button onClick={() => setDueDate('')} className={`text-xs ${textSecondary} hover:text-red-400 font-bold ml-1`}>✕</button>
              )}
            </div>
          </div>

          {/* 🔍 FITUR BARU: Cari & Filter Box */}
          {total > 0 && (
            <div className="rounded-xl p-3 flex gap-2 items-center shadow-md" style={glass}>
              <input 
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="🔍 Cari nama task..."
                className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-400 placeholder-opacity-40 shadow-inner"
                style={inputStyle}
              />
              <select
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value as Priority | 'all')}
                className="text-xs px-2 py-1.5 rounded-lg outline-none border cursor-pointer"
                style={inputStyle}
              >
                <option value="all" className={dark ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>Semua Prioritas</option>
                <option value="high" className={dark ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>High</option>
                <option value="medium" className={dark ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>Medium</option>
                <option value="low" className={dark ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>Low</option>
              </select>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {COLS.map(col => {
            const cfg = COLUMN_CONFIG[col]
            return (
              <span key={col} className={`text-xs px-3 py-1.5 rounded-full ${textSecondary} font-medium`}
                style={{ background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.05)', border: dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(99,102,241,0.12)' }}>
                <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ background: dark ? cfg.dotDark : cfg.dot }} />
                {cfg.title}: {getRawCountByStatus(col)}
              </span>
            )
          })}
        </div>

        {/* Select toolbar */}
        {total > 0 && (
          <div className="flex justify-center gap-2 mb-5 flex-wrap h-8 items-center">
            {!selectMode ? (
              <button onClick={() => setSelectMode(true)} className={`text-xs px-4 py-1.5 rounded-lg ${textSecondary} transition-all hover:scale-105 shadow-sm`}
                style={{ background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.08)', border: dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(99,102,241,0.15)' }}>
                ☑ Mode Pilih Banyak
              </button>
            ) : (
              <>
                <button onClick={toggleSelectAll} className={`text-xs px-4 py-1.5 rounded-lg ${textSecondary} transition-all hover:opacity-80`}
                  style={{ background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.08)', border: dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(99,102,241,0.15)' }}>
                  {selected.size === filteredTasks.length ? 'Batal pilih semua' : 'Pilih semua hasil'}
                </button>
                {selected.size > 0 && (
                  <button onClick={deleteSelected} className="text-xs px-4 py-1.5 rounded-lg font-medium transition-all hover:opacity-90 shadow-sm animate-pulse"
                    style={{ background: 'rgba(239,68,68,0.4)', border: '1px solid rgba(239,68,68,0.6)', color: '#fca5a5' }}>
                    🗑 Hapus {selected.size} task
                  </button>
                )}
                <button onClick={cancelSelect} className={`text-xs px-4 py-1.5 rounded-lg transition-all hover:opacity-80 ${textMuted}`}
                  style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)' }}>
                  ✕ Keluar Mode
                </button>
              </>
            )}
          </div>
        )}

        {/* Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLS.map(col => {
            const cfg      = COLUMN_CONFIG[col]
            const colTasks = getByStatus(col)
            const colPct   = total === 0 ? 0 : Math.round((colTasks.length / total) * 100)

            return (
              <div 
                key={col} 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col)}
                className="p-4 transition-all duration-300 shadow-lg rounded-b-2xl relative" 
                style={{ 
                  ...glass, 
                  borderTop: `3px solid ${dark ? cfg.accentDark : cfg.accent}`,
                  minHeight: '400px'
                }}
              >
                {/* Column header */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-semibold flex items-center gap-2 ${textPrimary}`}>
                    <span className="w-2 h-2 rounded-full animate-ping" style={{ background: dark ? cfg.dotDark : cfg.dot }} />
                    {cfg.title}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${dark ? cfg.badgeDark : cfg.badge}`}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Per-column progress bar */}
                <div className="mb-4">
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${colPct}%`, background: dark ? cfg.accentDark : cfg.accent }}
                    />
                  </div>
                  <p className={`text-[11px] mt-1 ${textMuted}`}>{colPct}% dari papan saat ini</p>
                </div>

                {/* Tasks Container */}
                <div className="space-y-2.5">
                  {colTasks.length === 0 ? (
                    <div className="border border-dashed border-gray-500/20 rounded-xl py-12 flex flex-col items-center justify-center">
                      <span className="text-xl mb-1 opacity-40">🍃</span>
                      <p className={`text-xs ${textMuted} italic`}>Kosong atau terfilter</p>
                    </div>
                  ) : (
                    colTasks.map(task => {
                      const isSelected = selected.has(task.id)
                      const ds         = dueDateStatus(task.dueDate, task.status)
                      const pc         = PRIORITY_CONFIG[task.priority]

                      return (
                        <div
                          key={task.id}
                          draggable={!selectMode}
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => selectMode && toggleSelect(task.id)}
                          className="rounded-xl p-3 transition-all duration-200 group relative shadow-sm"
                          style={{
                            background: isSelected ? 'rgba(99,102,241,0.25)' : taskCardBase,
                            border:     isSelected ? '1px solid rgba(99,102,241,0.5)' : `1px solid ${taskBorder}`,
                            cursor:     selectMode ? 'pointer' : 'grab',
                          }}
                          onMouseEnter={e => { if (!selectMode && !isSelected) (e.currentTarget as HTMLElement).style.background = taskCardHover; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
                          onMouseLeave={e => { if (!isSelected) { (e.currentTarget as HTMLElement).style.background = taskCardBase; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' } }}
                        >
                          {/* Drag Indicator Accent Line */}
                          <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r" style={{ background: dark ? pc.dotDark : pc.dot }} />

                          <div className="flex items-start gap-2 mb-2 pl-1.5">
                            {selectMode && (
                              <div className="mt-0.5 w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-all"
                                style={{ background: isSelected ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.1)', border: isSelected ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.3)' }}>
                                {isSelected && <span className="text-white text-xs leading-none">✓</span>}
                              </div>
                            )}
                            <p className={`text-xs leading-relaxed flex-1 font-medium ${textPrimary}`}>{task.title}</p>
                          </div>

                          {/* Badges */}
                          <div className="flex items-center gap-1.5 flex-wrap mb-2 pl-1.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-md ${dark ? pc.dark : pc.light} font-semibold`}>
                              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: dark ? pc.dotDark : pc.dot }} />
                              {pc.label}
                            </span>
                            {task.dueDate && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                                style={{
                                  background: ds === 'overdue' ? 'rgba(239,68,68,0.2)' : ds === 'soon' ? 'rgba(251,191,36,0.15)' : dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                  border:     ds === 'overdue' ? '1px solid rgba(239,68,68,0.3)' : ds === 'soon' ? '1px solid rgba(251,191,36,0.3)' : dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.06)',
                                  color:      ds === 'overdue' ? '#f87171' : ds === 'soon' ? '#fbbf24' : dark ? 'rgba(255,255,255,0.5)' : 'rgba(79,70,229,0.6)',
                                }}>
                                {ds === 'overdue' ? '⚠ ' : '📅 '}{formatDate(task.dueDate)}
                                {ds === 'overdue' && ' · Terlambat'}{ds === 'soon' && ' · Segera'}
                              </span>
                            )}
                          </div>

                          {/* Action buttons */}
                          {!selectMode && (
                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 pl-1.5 pt-1 border-t border-gray-500/10">
                              {PREV[col] && (
                                <button onClick={() => moveTask(task.id, PREV[col]!)}
                                  className={`text-[10px] px-2 py-0.5 rounded-md transition-all ${textSecondary} hover:bg-black/10`}
                                  style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', border: dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.08)' }}>
                                  ← Back
                                </button>
                              )}
                              {NEXT[col] && (
                                <button onClick={() => moveTask(task.id, NEXT[col]!)}
                                  className="text-[10px] px-2 py-0.5 rounded-md transition-all font-medium"
                                  style={{ background: 'rgba(99,102,241,0.35)', border: '1px solid rgba(99,102,241,0.5)', color: dark ? '#c7d2fe' : '#4f46e5' }}>
                                  Next →
                                </button>
                              )}
                              <button onClick={() => deleteTask(task.id)}
                                className="text-[10px] px-2 py-0.5 rounded-md ml-auto transition-all hover:bg-red-500/30"
                                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                                🗑
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}