import { useEffect, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Play, Share2 } from 'lucide-react'
import { executeCode, type Language, type RunResult } from './services/executionService'
import { retrieveSharedCode } from './services/shareService'
import ShareDialog from './components/ShareDialog'

const examples: Record<Language, string> = {
  python: 'name = "world"\nprint(f"Hello, {name}!")\n',
  rust: 'fn main() {\n    println!("Hello, world!");\n}\n',
}

function App() {
  const [language, setLanguage] = useState<Language>('python')
  const [codeByLanguage, setCodeByLanguage] = useState(examples)
  const [result, setResult] = useState<RunResult | null>(null)
  const [running, setRunning] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [sharedLinkStatus, setSharedLinkStatus] = useState('')

  useEffect(() => {
    const match = window.location.pathname.match(/^\/share\/([^/]+)\/?$/)
    if (!match) return

    let active = true
    setSharedLinkStatus('Loading shared code…')
    void retrieveSharedCode(decodeURIComponent(match[1])).then(shared => {
      if (!active) return
      setLanguage(shared.language)
      setCodeByLanguage(current => ({ ...current, [shared.language]: shared.code }))
      setSharedLinkStatus(`Loaded “${shared.title}” from IPFS.`)
    }).catch(error => {
      if (!active) return
      setSharedLinkStatus(error instanceof Error ? error.message : 'Could not load shared code.')
    })

    return () => { active = false }
  }, [])

  const run = async () => {
    if (running) return
    setRunning(true)
    setResult(null)
    try {
      setResult(await executeCode({ language, source: codeByLanguage[language] }))
    } catch (error) {
      setResult({
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Could not run the code.',
        status: 'error',
      })
    } finally {
      setRunning(false)
    }
  }

  return (
    <main className="playground">
      <header className="toolbar">
        <a className="brand" href="/">Forge</a>
        <div className="toolbar-actions">
          <label className="language-picker">
            <span>Language</span>
            <select value={language} onChange={event => setLanguage(event.target.value as Language)}>
              <option value="python">Python</option>
              <option value="rust">Rust</option>
            </select>
          </label>
          <button className="share-button" onClick={() => setSharing(true)}>
            <Share2 size={15} />
            Share
          </button>
          <button className="run-button" onClick={() => void run()} disabled={running}>
            <Play size={15} fill="currentColor" />
            {running ? 'Running…' : 'Run'}
          </button>
        </div>
      </header>

      <section className="panes" aria-label="Code playground">
        <div className="pane editor-pane">
          <div className="pane-heading">Code</div>
          <div className="editor">
            <Editor
              height="100%"
              language={language}
              value={codeByLanguage[language]}
              onChange={value => setCodeByLanguage(current => ({ ...current, [language]: value ?? '' }))}
              theme="light"
              options={{
                automaticLayout: true,
                fontSize: 14,
                lineNumbers: 'on',
                minimap: { enabled: false },
                padding: { top: 18, bottom: 18 },
                scrollBeyondLastLine: false,
                tabSize: 4,
              }}
            />
          </div>
        </div>

        <div className="pane output-pane">
          <div className="pane-heading">
            <span>Output</span>
            <span className={`run-status ${running ? 'is-running' : result?.status === 'error' ? 'is-error' : ''}`}>
              {running ? 'Running' : result ? (result.status === 'error' ? 'Error' : 'Finished') : 'Ready'}
            </span>
          </div>
          <div className="output" aria-live="polite">
            {sharedLinkStatus && <div className="share-notice">{sharedLinkStatus}</div>}
            {running ? <span className="placeholder">Running your code…</span> : result ? (
              <>
                {result.stdout && <pre>{result.stdout}</pre>}
                {result.stderr && <pre className="error-output">{result.stderr}</pre>}
                {!result.stdout && !result.stderr && <span className="placeholder">Program finished with no output.</span>}
              </>
            ) : <span className="placeholder">Run your code to see the result.</span>}
          </div>
        </div>
      </section>
      {sharing && <ShareDialog
        code={codeByLanguage[language]}
        language={language}
        onClose={() => setSharing(false)}
        onLoad={(code, loadedLanguage) => {
          setLanguage(loadedLanguage)
          setCodeByLanguage(current => ({ ...current, [loadedLanguage]: code }))
          setSharedLinkStatus('Shared code loaded from IPFS.')
        }}
      />}
    </main>
  )
}

export default App
