import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import type { editor as MonacoEditor } from 'monaco-editor'
import {
  Activity, AlertCircle, Bell, Braces, Check, ChevronDown, ChevronRight, Circle,
  Code2, Copy, FilePlus2, Folder, Hash,
  Maximize2, Minimize2, Moon, MoreHorizontal, PanelBottom, Play,
  Plus, Search, Settings, Sun, Terminal, Trash2, X, Zap,
} from 'lucide-react'
import { executeCode, type Language, type RunResult } from './services/executionService'

type IdeFile = { id: string; name: string; language: Language; content: string }
type PanelTab = 'terminal' | 'output' | 'problems'
type Persisted = { files: IdeFile[]; activeId: string; theme: 'dark' | 'light'; minimap: boolean }

const seedFiles: IdeFile[] = [
  { id: 'app-js', name: 'index.js', language: 'javascript', content: `// Welcome to Forge\n// A quiet place to build something great.\n\nconst greet = (name) => {\n  return \`Hello, \${name}!\`;\n};\n\nconst message = greet("world");\nconsole.log(message);\n\n// Try editing this file, then press Run.\n` },
  { id: 'readme-md', name: 'README.md', language: 'javascript', content: `# Hello, Forge\n\nYour workspace is ready.\n\n- Edit a file in the explorer\n- Press **⌘ ↵** to run\n- Save with **⌘ S**\n` },
  { id: 'utils-js', name: 'utils.js', language: 'javascript', content: `export function clamp(value, min, max) {\n  return Math.min(Math.max(value, min), max);\n}\n` },
]

const languages: { id: Language; label: string; ext: string; icon: typeof Code2 }[] = [
  { id: 'javascript', label: 'JavaScript', ext: '.js', icon: Braces },
  { id: 'python', label: 'Python', ext: '.py', icon: Code2 },
  { id: 'cpp', label: 'C++', ext: '.cpp', icon: Hash },
  { id: 'rust', label: 'Rust', ext: '.rs', icon: Code2 },
]
const getLanguage = (name: string): Language => {
  const ext = name.split('.').pop()?.toLowerCase()
  return ext === 'py' ? 'python' : ext === 'cpp' || ext === 'cc' || ext === 'h' ? 'cpp' : ext === 'rs' ? 'rust' : 'javascript'
}
const storageKey = 'forge-ide-v1'

function App() {
  const initial = useMemo<Persisted>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || 'null') || { files: seedFiles, activeId: seedFiles[0].id, theme: 'dark', minimap: false } }
    catch { return { files: seedFiles, activeId: seedFiles[0].id, theme: 'dark', minimap: false } }
  }, [])
  const [files, setFiles] = useState<IdeFile[]>(initial.files)
  const [activeId, setActiveId] = useState(initial.activeId)
  const [saved, setSaved] = useState<Record<string, string>>(() => Object.fromEntries(initial.files.map(f => [f.id, f.content])))
  const [theme, setTheme] = useState<'dark' | 'light'>(initial.theme)
  const [minimap, setMinimap] = useState(initial.minimap)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(246)
  const [panelHeight, setPanelHeight] = useState(224)
  const [panelOpen, setPanelOpen] = useState(true)
  const [panelTab, setPanelTab] = useState<PanelTab>('output')
  const [languageOpen, setLanguageOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [stdin, setStdin] = useState('')
  const [running, setRunning] = useState(false)
  const [terminalValue, setTerminalValue] = useState('')
  const [terminalLines, setTerminalLines] = useState<string[]>(['Welcome to Forge terminal.', 'Execution is connected through your configured runner.'])
  const [toast, setToast] = useState('')
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const active = files.find(file => file.id === activeId) || files[0]
  const tabs = files.filter(file => file.id !== 'readme-md' || file.id === activeId || saved[file.id] !== undefined)

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify({ files, activeId, theme, minimap })) }, [files, activeId, theme, minimap])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const updateFile = useCallback((id: string, content: string) => setFiles(current => current.map(file => file.id === id ? { ...file, content } : file)), [])
  const save = useCallback(() => {
    if (!active) return
    setSaved(current => ({ ...current, [active.id]: active.content }))
    setToast(`${active.name} saved`)
  }, [active])
  const run = useCallback(async () => {
    if (!active || running) return
    setPanelTab('output'); setPanelOpen(true); setRunning(true); setRunResult(null)
    try { setRunResult(await executeCode({ language: active.language, source: active.content, input: stdin, filename: active.name })) }
    catch (error) { setRunResult({ stdout: '', stderr: error instanceof Error ? error.message : 'Runner request failed.', status: 'error' }) }
    finally { setRunning(false) }
  }, [active, running, stdin])
  const openSearch = useCallback(() => { setSearchOpen(value => !value); setTimeout(() => editorRef.current?.getAction('actions.find')?.run(), 20) }, [])
  const onMount: OnMount = editor => {
    editorRef.current = editor
    editor.addCommand(2048 | 49, save) // Ctrl/Cmd + S
    editor.addCommand(2048 | 3, run) // Ctrl/Cmd + Enter
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      if (mod && event.key.toLowerCase() === 's') { event.preventDefault(); save() }
      if (mod && event.key === 'Enter') { event.preventDefault(); void run() }
      if (mod && event.shiftKey && event.key.toLowerCase() === 'f') { event.preventDefault(); setSearchOpen(value => !value); setTimeout(() => editorRef.current?.getAction('actions.find')?.run(), 20) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save, run])

  const startResize = (kind: 'sidebar' | 'panel', event: React.PointerEvent) => {
    event.preventDefault()
    const start = kind === 'sidebar' ? event.clientX : event.clientY
    const initialSize = kind === 'sidebar' ? sidebarWidth : panelHeight
    const move = (e: PointerEvent) => {
      if (kind === 'sidebar') setSidebarWidth(Math.max(190, Math.min(360, initialSize + e.clientX - start)))
      else setPanelHeight(Math.max(150, Math.min(440, initialSize + start - e.clientY)))
    }
    const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', stop)
  }
  const createFile = () => {
    const name = window.prompt('Name your file', 'untitled.js')?.trim()
    if (!name) return
    if (files.some(file => file.name === name)) { setToast('A file with that name already exists'); return }
    const id = `${Date.now()}`
    const file = { id, name, language: getLanguage(name), content: '' }
    setFiles(current => [...current, file]); setSaved(current => ({ ...current, [id]: '' })); setActiveId(id)
  }
  const renameFile = (file: IdeFile) => {
    const name = window.prompt('Rename file', file.name)?.trim()
    if (!name || name === file.name) return
    if (files.some(item => item.id !== file.id && item.name === name)) { setToast('A file with that name already exists'); return }
    setFiles(current => current.map(item => item.id === file.id ? { ...item, name, language: getLanguage(name) } : item))
  }
  const deleteFile = (file: IdeFile) => {
    if (files.length === 1) { setToast('Keep at least one file in your project'); return }
    setFiles(current => current.filter(item => item.id !== file.id))
    setSaved(current => { const next = { ...current }; delete next[file.id]; return next })
    if (file.id === activeId) setActiveId(files.find(item => item.id !== file.id)!.id)
  }
  const selectLanguage = (language: Language) => {
    if (!active) return
    setFiles(current => current.map(item => item.id === active.id ? { ...item, language } : item))
    setLanguageOpen(false)
  }
  const executeTerminal = (event: React.FormEvent) => {
    event.preventDefault()
    const command = terminalValue.trim()
    if (!command) return
    setTerminalLines(lines => [...lines, `❯ ${command}`, command === 'clear' ? '' : 'Terminal commands are visual only in this workspace. Connect a terminal service to execute commands.'].filter(Boolean))
    setTerminalValue('')
  }

  return <div className={`ide ${theme}`} ref={mainRef}>
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Code2 size={17} strokeWidth={2.4} /></div><span>forge</span><span className="brand-badge">IDE</span></div>
      <div className="top-divider" />
      <button className="project-name"><Folder size={15} /><span>my-first-project</span><ChevronDown size={13} /></button>
      <div className="top-spacer" />
      <div className="top-status"><span className={`status-dot ${active && active.content !== saved[active.id] ? 'unsaved-status' : ''}`} />{active && active.content !== saved[active.id] ? 'Unsaved changes' : 'All changes saved'}</div>
      <div className="top-divider short" />
      <div className="language-wrap">
        <button className="language-button" onClick={() => setLanguageOpen(value => !value)}><span className={`language-dot ${active?.language}`} /><span>{languages.find(item => item.id === active?.language)?.label}</span><ChevronDown size={13} /></button>
        {languageOpen && <div className="dropdown lang-menu">{languages.map(lang => <button key={lang.id} onClick={() => selectLanguage(lang.id)}><lang.icon size={15} /><span>{lang.label}</span>{active?.language === lang.id && <Check size={14} />}</button>)}</div>}
      </div>
      <button className="icon-button theme-button" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
      <button className="save-button" onClick={save}><Check size={14} /><span>Save</span><kbd>⌘ S</kbd></button>
      <button className="run-button" onClick={() => void run()} disabled={running}>{running ? <span className="spinner" /> : <Play size={14} fill="currentColor" />}<span>{running ? 'Running' : 'Run'}</span><kbd>⌘ ↵</kbd></button>
      <button className="icon-button" title="Settings" onClick={() => setMinimap(value => !value)}><Settings size={16} /></button>
      <button className="avatar" title="Your profile">Y</button>
    </header>

    <div className="workspace">
      <nav className="activitybar">
        <button className="activity active" title="Explorer" onClick={() => setSidebarOpen(value => !value)}><Copy size={19} /></button>
        <button className={`activity ${searchOpen ? 'active' : ''}`} title="Search (Ctrl+Shift+F)" onClick={openSearch}><Search size={19} /></button>
        <div className="activity-spacer" />
        <button className="activity" title="Settings" onClick={() => setMinimap(value => !value)}><Settings size={19} /></button>
      </nav>

      {sidebarOpen && <aside className="sidebar" style={{ width: sidebarWidth }}>
        <div className="sidebar-heading"><span>EXPLORER</span><button className="quiet-icon" title="More explorer actions"><MoreHorizontal size={17} /></button></div>
        <div className="project-heading"><ChevronDown size={14} /><span>MY-FIRST-PROJECT</span><button className="quiet-icon project-add" title="New file" onClick={createFile}><FilePlus2 size={15} /></button></div>
        <div className="file-list">
          {files.map(file => <div className={`file-row ${file.id === activeId ? 'selected' : ''}`} key={file.id} onClick={() => setActiveId(file.id)} onDoubleClick={() => renameFile(file)}>
            <span className={`file-icon ${file.language}`}>{file.language === 'javascript' ? <Braces size={15} /> : file.language === 'python' ? <Code2 size={15} /> : file.language === 'cpp' ? <Hash size={15} /> : <Code2 size={15} />}</span>
            <span className="file-label">{file.name}</span>{file.content !== saved[file.id] && <span className="dirty-dot" title="Unsaved changes" />}
            <span className="file-actions"><button title="Rename" onClick={e => { e.stopPropagation(); renameFile(file) }}><MoreHorizontal size={14} /></button><button title="Delete" onClick={e => { e.stopPropagation(); deleteFile(file) }}><Trash2 size={13} /></button></span>
          </div>)}
        </div>
        <button className="new-file" onClick={createFile}><Plus size={14} /> New file</button>
        <div className="sidebar-bottom"><div className="side-info"><div className="side-info-icon"><Activity size={15} /></div><div><strong>Workspace ready</strong><span>Local project</span></div><span className="green-pulse" /></div><button className="side-footer"><Circle size={13} /><span>main</span><ChevronDown size={12} /><span className="side-footer-right">UTF-8&nbsp; · &nbsp;LF</span></button></div>
      </aside>}
      {sidebarOpen && <div className="sidebar-resize" onPointerDown={event => startResize('sidebar', event)} />}

      <main className="editor-column">
        <div className="editor-toolbar">
          <div className="breadcrumbs"><span>my-first-project</span><ChevronRight size={12} /><span className="crumb-active">{active?.name}</span></div>
          <div className="editor-actions"><button title="Search and replace" className="quiet-icon" onClick={openSearch}><Search size={15} /></button><button title={minimap ? 'Hide minimap' : 'Show minimap'} className={`quiet-icon ${minimap ? 'is-on' : ''}`} onClick={() => setMinimap(value => !value)}><PanelBottom size={15} /></button><button title="More editor actions" className="quiet-icon"><MoreHorizontal size={16} /></button></div>
        </div>
        <div className="tabs-bar">{tabs.map(file => <button className={`tab ${file.id === activeId ? 'active' : ''}`} key={file.id} onClick={() => setActiveId(file.id)}><span className={`tab-icon ${file.language}`}>{file.language === 'javascript' ? <Braces size={14} /> : file.language === 'cpp' ? <Hash size={14} /> : <Code2 size={14} />}</span><span>{file.name}</span>{file.content !== saved[file.id] ? <span className="tab-dirty" /> : <X className="tab-close" size={13} onClick={e => { e.stopPropagation(); if (files.length > 1) deleteFile(file) }} />}</button>)}<button className="add-tab" title="New file" onClick={createFile}><Plus size={16} /></button><div className="tabs-fill" /><button className="quiet-icon tab-menu" title="Editor layout"><Maximize2 size={14} /></button></div>
        {searchOpen && <div className="search-strip"><Search size={14} /><input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Find" autoFocus onKeyDown={e => { if (e.key === 'Enter') editorRef.current?.getAction('actions.find')?.run() }} /><input value={replaceText} onChange={e => setReplaceText(e.target.value)} placeholder="Replace" /><button onClick={() => { editorRef.current?.getAction('editor.action.startFindReplaceAction')?.run(); setSearchOpen(false) }}>Open in editor</button><button className="quiet-icon" onClick={() => setSearchOpen(false)}><X size={14} /></button></div>}
        <div className="editor-surface">
          {active ? <Editor key={active.id} height="100%" language={active.language} value={active.content} onChange={value => updateFile(active.id, value || '')} onMount={onMount}
            theme={theme === 'dark' ? 'vs-dark' : 'light'} options={{ fontSize: 13, fontFamily: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace', lineHeight: 23, minimap: { enabled: minimap, scale: 0.8 }, padding: { top: 19, bottom: 16 }, scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2, wordWrap: 'on', folding: true, bracketPairColorization: { enabled: true }, guides: { indentation: true }, renderLineHighlight: 'line', cursorBlinking: 'smooth', smoothScrolling: true, scrollbar: { verticalScrollbarSize: 9, horizontalScrollbarSize: 9 } }} /> : <div className="empty-editor">Select a file to start editing.</div>}
          <div className="editor-status"><span><span className="status-dot" />Ready</span><span>Ln {editorRef.current?.getPosition()?.lineNumber || 1}, Col {editorRef.current?.getPosition()?.column || 1}</span><span>{active?.language === 'javascript' ? 'JavaScript' : active?.language}</span><span>UTF-8</span><span>Spaces: 2</span><span className="status-spacer" /><button onClick={() => setMinimap(value => !value)}>{minimap ? <Minimize2 size={13} /> : <Maximize2 size={13} />} {minimap ? 'Minimap on' : 'Minimap off'}</button></div>
        </div>
        {panelOpen && <><div className="panel-resize" onPointerDown={event => startResize('panel', event)} /><section className="bottom-panel" style={{ height: panelHeight }}>
          <div className="panel-heading"><div className="panel-tabs">{(['terminal', 'output', 'problems'] as PanelTab[]).map(tab => <button key={tab} onClick={() => setPanelTab(tab)} className={panelTab === tab ? 'active' : ''}>{tab === 'terminal' ? <Terminal size={14} /> : tab === 'output' ? <Zap size={14} /> : <AlertCircle size={14} />}{tab}<span className="panel-count">{tab === 'problems' ? '0' : ''}</span></button>)}</div><div className="panel-tools"><button className="quiet-icon" title="Clear panel" onClick={() => { setRunResult(null); setTerminalLines([]) }}><Trash2 size={14} /></button><button className="quiet-icon" title="Collapse panel" onClick={() => setPanelOpen(false)}><Minimize2 size={14} /></button></div></div>
          {panelTab === 'output' && <div className="panel-content output-content"><div className="output-meta"><span className={`run-state ${running ? 'loading' : runResult?.status || 'idle'}`}><i />{running ? 'Running' : runResult?.status === 'success' ? 'Finished' : runResult?.status === 'error' ? 'Execution error' : runResult?.status === 'unavailable' ? 'Runner not connected' : 'Ready to run'}</span>{runResult?.durationMs !== undefined && <span>{runResult.durationMs} ms</span>}<span className="output-meta-spacer" /><button className="text-button" onClick={() => setRunResult(null)}>Clear output</button></div>
            <div className="stdin-row"><label htmlFor="program-input">STDIN</label><input id="program-input" value={stdin} onChange={event => setStdin(event.target.value)} placeholder="Optional program input" /><button onClick={() => void run()} disabled={running}>{running ? 'Running…' : 'Run with input'}</button></div>
            {running ? <div className="output-empty"><span className="spinner large" /><span>Running {active?.name}…</span></div> : runResult ? <div className="run-output">{runResult.stdout && <pre className="stdout"><span>stdout</span>{runResult.stdout}</pre>}{runResult.stderr && <pre className="stderr"><span>{runResult.status === 'unavailable' ? 'setup' : 'stderr'}</span>{runResult.stderr}</pre>}{!runResult.stdout && !runResult.stderr && <div className="success-note"><Check size={14} />Program completed with no output.</div>}</div> : <div className="output-empty"><div className="output-empty-icon"><Play size={15} fill="currentColor" /></div><span>Your program output will appear here</span><button onClick={() => void run()}>Run {active?.name} <span>⌘ ↵</span></button></div>}
          </div>}
          {panelTab === 'terminal' && <div className="panel-content terminal-content"><div className="terminal-lines">{terminalLines.map((line, index) => <div key={`${index}-${line}`} className={line.startsWith('❯') ? 'terminal-command' : ''}>{line}</div>)}</div><form className="terminal-input" onSubmit={executeTerminal}><span>❯</span><input value={terminalValue} onChange={e => setTerminalValue(e.target.value)} placeholder="Type a command…" /><kbd>Enter</kbd></form></div>}
          {panelTab === 'problems' && <div className="panel-content problems-content"><div className="problems-empty"><div><Check size={18} /></div><span>No problems detected</span><p>You're all clear in this workspace.</p></div></div>}
        </section></>}
        {!panelOpen && <button className="reopen-panel" onClick={() => setPanelOpen(true)}><ChevronDown size={13} /> Show panel</button>}
      </main>
    </div>
    <footer className="app-footer"><span className="footer-left"><span className="footer-branch"><Circle size={12} /> main</span><span><AlertCircle size={12} /> 0</span><span><AlertCircle size={12} /> 0</span></span><span className="footer-right"><span>Forge workspace</span><Bell size={13} /></span></footer>
    {toast && <div className="toast"><Check size={15} />{toast}</div>}
  </div>
}

export default App
