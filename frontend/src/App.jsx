import { useEffect, useState } from 'react'

const API = 'http://127.0.0.1:8000'
const money = value => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value)

function App() {
  const [tab, setTab] = useState('assess')
  const [form, setForm] = useState({
    family_income: '80000',
    academic_performance: 'good',
    has_outstanding_loan: false,
    applying_for_new_loan: false,
  })
  const [assessment, setAssessment] = useState(null)
  const [tests, setTests] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [apiStatus, setApiStatus] = useState('checking')

  useEffect(() => {
    fetch(`${API}/api/health`).then(r => {
      if (!r.ok) throw new Error('Backend unavailable')
      return r.json()
    }).then(() => setApiStatus('connected')).catch(() => setApiStatus('offline'))
  }, [])

  const update = (key, value) => setForm(old => ({ ...old, [key]: value }))

  async function submit(e) {
    e.preventDefault()
    setLoading(true); setError(''); setAssessment(null)
    try {
      const response = await fetch(`${API}/api/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, family_income: Number(form.family_income) })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail?.[0]?.msg || 'Please check the submitted information.')
      setAssessment(data)
    } catch (err) {
      setError(err.message || 'Cannot connect to the backend. Start the backend first.')
    } finally { setLoading(false) }
  }

  async function runTests() {
    setLoading(true); setError('')
    try {
      const response = await fetch(`${API}/api/tests/run`, { method: 'POST' })
      if (!response.ok) throw new Error('Test run failed')
      setTests(await response.json())
    } catch { setError('Cannot run tests. Check that the FastAPI backend is running.') }
    finally { setLoading(false) }
  }

  const resultClass = value => value === 'high' ? 'high' : value === 'rejected' ? 'rejected' : 'review'

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-mark">ES</div>
      <div className="brand-text"><strong>YABATECH</strong><span>Expert System Prototype · Case 9</span></div>
      <div className={`api-pill ${apiStatus}`}><span className="status-dot" /> API {apiStatus}</div>
    </header>

    <main className="main">
      <section className="hero">
        <div className="eyebrow">STUDENT SUPPORT · DECISION ASSISTANCE</div>
        <h1>Financial Aid Eligibility<br /><span>Assessment System</span></h1>
        <p>A rule-based prototype that assesses submitted facts, explains its conclusion, and compares expected versus actual outputs in system tests.</p>
        <div className="hero-note"><span className="note-icon">i</span><span><b>Academic prototype:</b> assignment rules are examples, not verified official YABATECH or government policy. Cases requiring criteria not provided are referred for human review.</span></div>
      </section>

      <nav className="tabs" aria-label="Main sections">
        <button className={tab === 'assess' ? 'tab active' : 'tab'} onClick={() => setTab('assess')}> <span>01</span> Assess application</button>
        <button className={tab === 'tests' ? 'tab active' : 'tab'} onClick={() => setTab('tests')}> <span>02</span> System tests</button>
        <button className={tab === 'rules' ? 'tab active' : 'tab'} onClick={() => setTab('rules')}> <span>03</span> Knowledge base</button>
      </nav>

      {error && <div className="error-banner" role="alert">{error}</div>}

      {tab === 'assess' && <div className="content-grid">
        <section className="panel">
          <div className="panel-heading"><div><div className="section-kicker">APPLICATION INPUT</div><h2>Student information</h2></div><span className="step-badge">STEP 1</span></div>
          <p className="muted">Enter the facts used by the rule engine. All income figures are annual amounts in naira.</p>
          <form onSubmit={submit}>
            <label className="field-label" htmlFor="income">Annual family income (₦)</label>
            <input id="income" type="number" min="0" step="1" required value={form.family_income} onChange={e => update('family_income', e.target.value)} placeholder="e.g. 80000" />
            <div className="field-help">The assignment example uses a threshold of ₦100,000 per year.</div>

            <label className="field-label" htmlFor="academic">Academic performance</label>
            <select id="academic" value={form.academic_performance} onChange={e => update('academic_performance', e.target.value)}>
              <option value="good">Good</option><option value="average">Average</option><option value="poor">Poor</option>
            </select>

            <div className="toggle-row">
              <div><b>Outstanding loan?</b><small>Does the student have an unpaid existing loan?</small></div>
              <input aria-label="Outstanding loan" type="checkbox" checked={form.has_outstanding_loan} onChange={e => update('has_outstanding_loan', e.target.checked)} />
            </div>
            <div className="toggle-row">
              <div><b>Applying for a new loan?</b><small>Is the student applying for another loan now?</small></div>
              <input aria-label="Applying for a new loan" type="checkbox" checked={form.applying_for_new_loan} onChange={e => update('applying_for_new_loan', e.target.checked)} />
            </div>
            <button className="primary-button" type="submit" disabled={loading}>{loading ? 'Processing…' : 'Assess eligibility'} <span>→</span></button>
          </form>
        </section>

        <section className="panel result-panel">
          <div className="panel-heading"><div><div className="section-kicker">INFERENCE OUTPUT</div><h2>Assessment result</h2></div><span className="step-badge">STEP 2</span></div>
          {!assessment ? <div className="empty-state"><div className="empty-icon">⌕</div><h3>Result will appear here</h3><p>Submit the student information to run the backward-chaining inference engine and see the rule-based explanation.</p><div className="mini-flow"><span>Facts</span><b>→</b><span>Rules</span><b>→</b><span>Conclusion</span></div></div> :
            <div className="assessment-result">
              <div className={`result-banner ${resultClass(assessment.result.eligibility)}`}>
                <span className="result-label">ELIGIBILITY OUTCOME</span>
                <h3>{assessment.result.eligibility === 'high' ? 'High eligibility' : assessment.result.eligibility === 'rejected' ? 'Rejected under assignment rule' : 'Further assessment required'}</h3>
                <p>{assessment.result.advice}</p>
              </div>
              <div className="result-details">
                <div className="detail"><span>Rule applied</span><strong>{assessment.result.rule_id}</strong></div>
                <div className="detail"><span>Rule category</span><strong>{assessment.result.rule_type}</strong></div>
                <div className="detail"><span>Inference strategy</span><strong>{assessment.result.method}</strong></div>
              </div>
              <div className="explanation"><h4>Why this result?</h4><p>{assessment.result.explanation}</p><h4>Conditions considered</h4>{assessment.result.conditions_checked.length ? <ul>{assessment.result.conditions_checked.map((c, i) => <li key={i}>{c}</li>)}</ul> : <p>No rule conditions conclusively matched.</p>}</div>
              <div className="fact-summary"><b>Submitted facts</b><p>Annual income: {money(assessment.facts.family_income)} · Academic performance: {assessment.facts.academic_performance} · Outstanding loan: {assessment.facts.has_outstanding_loan ? 'Yes' : 'No'} · New loan: {assessment.facts.applying_for_new_loan ? 'Yes' : 'No'}</p></div>
            </div>}
        </section>
      </div>}

      {tab === 'tests' && <section className="panel test-panel">
        <div className="panel-heading"><div><div className="section-kicker">VALIDATION & VERIFICATION</div><h2>Expected vs actual output</h2></div><span className="step-badge">STEP 3</span></div>
        <p className="muted">Run the predefined test cases. Expected values are compared with output generated by the live Python inference engine. A test passes only when the compared fields match.</p>
        <button className="primary-button run-tests" onClick={runTests} disabled={loading}>{loading ? 'Running tests…' : 'Run all system tests'} <span>▶</span></button>
        {tests && <>
          <div className="test-summary">
            <div><span>Total tests</span><strong>{tests.total}</strong></div>
            <div className="summary-pass"><span>Passed</span><strong>{tests.passed}</strong></div>
            <div className="summary-fail"><span>Failed</span><strong>{tests.failed}</strong></div>
            <div><span>Pass rate</span><strong>{tests.total ? Math.round(tests.passed / tests.total * 100) : 0}%</strong></div>
          </div>
          <div className="test-list">{tests.results.map(t => <article className="test-card" key={t.id}>
            <div className="test-card-head"><div><span className="test-id">{t.id}</span><h3>{t.name}</h3><p>{t.description}</p></div><span className={`status-tag ${t.status.toLowerCase()}`}>{t.status}</span></div>
            <div className="compare-grid">
              <div className="compare-box"><div className="compare-label">EXPECTED OUTPUT</div><pre>{JSON.stringify(t.expected_output, null, 2)}</pre></div>
              <div className="compare-box actual"><div className="compare-label">ACTUAL OUTPUT</div><pre>{JSON.stringify(t.actual_output, null, 2)}</pre></div>
            </div>
            <div className="test-explanation"><b>System explanation:</b> {t.explanation}</div>
          </article>)}</div>
          <p className="field-help">Use these generated results to fill the testing table in your report after you have run the application. If any case fails, investigate it rather than changing the expected output just to obtain PASS.</p>
        </>}
      </section>}

      {tab === 'rules' && <section className="panel rules-panel">
        <div className="panel-heading"><div><div className="section-kicker">KNOWLEDGE REPRESENTATION</div><h2>Rule knowledge base</h2></div><span className="step-badge">IF–THEN</span></div>
        <p className="muted">Rules R1 and R2 are taken from the assignment description. R3 and R4 are proposed fallback rules for this prototype and must not be presented as official eligibility policy.</p>
        <div className="rule-item assignment"><div className="rule-top"><span>R1</span><span className="rule-type">ASSIGNMENT EXAMPLE</span></div><p><b>IF</b> family income is below ₦100,000 per year <b>AND</b> academic performance is good,</p><p><b>THEN</b> eligibility is high.</p><div className="rule-advice">Advice: Recommend applying for a full bursary.</div></div>
        <div className="rule-item assignment"><div className="rule-top"><span>R2</span><span className="rule-type">ASSIGNMENT EXAMPLE</span></div><p><b>IF</b> an outstanding loan exists <b>AND</b> the student is applying for a new loan,</p><p><b>THEN</b> eligibility is rejected under the assignment example.</p><div className="rule-advice">Advice: Must clear existing loan first.</div></div>
        <div className="rule-item proposed"><div className="rule-top"><span>R3</span><span className="rule-type">PROPOSED DEMONSTRATION RULE</span></div><p><b>IF</b> income is at least ₦100,000, academic performance is good, and no outstanding-loan conflict exists,</p><p><b>THEN</b> refer the application for further assessment.</p></div>
        <div className="rule-item proposed"><div className="rule-top"><span>R4</span><span className="rule-type">PROPOSED DEMONSTRATION RULE</span></div><p><b>IF</b> academic performance is average or poor and no outstanding-loan conflict exists,</p><p><b>THEN</b> refer the application for further assessment.</p></div>
        <div className="hero-note"><span className="note-icon">i</span><span>The rule engine checks the goal “eligibility” first and works backward through rules that can conclude that goal, then checks their conditions against the facts supplied.</span></div>
      </section>}

      <footer><div><strong>YABATECH · Expert Systems Project</strong><span>Case 9 — Student Loan / Financial Aid Eligibility Assessment</span></div><span>Prototype v1.0 · Human review recommended</span></footer>
    </main>
  </div>
}

export default App
