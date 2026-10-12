import { useEffect, useMemo, useState } from 'react'

function getNodeFs() {
  if (typeof window === 'undefined' || !window.require) return null
  try {
    return window.require('node:fs')
  } catch (e) {
    try {
      return window.require('fs')
    } catch (err) {
      return null
    }
  }
}

function getNodePath() {
  if (typeof window === 'undefined' || !window.require) return null
  try {
    return window.require('node:path')
  } catch (e) {
    try {
      return window.require('path')
    } catch (err) {
      return null
    }
  }
}

function getNodeOs() {
  if (typeof window === 'undefined' || !window.require) return null
  try {
    return window.require('node:os')
  } catch (e) {
    try {
      return window.require('os')
    } catch (err) {
      return null
    }
  }
}

export default function ReportsTable({ onBack }) {
  const [reports, setReports] = useState([])
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deviceFilter, setDeviceFilter] = useState('all')
  const [selectedFile, setSelectedFile] = useState('')

  const parseJsonSafely = (content) => {
    if (!content || typeof content !== 'string') {
      return null
    }

    const sanitized = content
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .trim()

    if (!sanitized) {
      return null
    }

    try {
      return JSON.parse(sanitized)
    } catch (error) {
      return null
    }
  }

  useEffect(() => {
    const fs = getNodeFs()
    const path = getNodePath()
    if (!fs || !path) return

    const dir = path.resolve(process.cwd(), 'src', 'data')
    const dataFile = path.join(dir, 'data.json')

    try {
      const files = fs.existsSync(dir)
        ? fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
        : []

      const items = files.flatMap((file) => {
        try {
          const content = fs.readFileSync(path.join(dir, file), 'utf8')
          const parsed = parseJsonSafely(content)
          if (!parsed) {
            return []
          }

          if (Array.isArray(parsed)) {
            return parsed.map((entry, index) => ({ file: `${file}#${index}`, parsed: entry }))
          }

          if (parsed && Array.isArray(parsed.reports)) {
            const reportEntries = parsed.reports.map((entry, index) => ({ file: `${file}#${index}`, parsed: entry }))
            if (parsed.latest) {
              return [{ file: `${file}#latest`, parsed: parsed.latest }, ...reportEntries.filter((entry) => entry.parsed?.reportId !== parsed.latest.reportId)]
            }
            return reportEntries
          }

          return [{ file, parsed }]
        } catch (err) {
          return []
        }
      })

      if (!items.length && fs.existsSync(dataFile)) {
        try {
          const content = fs.readFileSync(dataFile, 'utf8')
          const parsed = parseJsonSafely(content)
          if (!parsed) {
            return
          }

          if (Array.isArray(parsed)) {
            items.push(...parsed.map((entry, index) => ({ file: `data.json#${index}`, parsed: entry })))
          } else if (parsed && Array.isArray(parsed.reports)) {
            const reportEntries = parsed.reports.map((entry, index) => ({ file: `data.json#${index}`, parsed: entry }))
            if (parsed.latest) {
              items.push({ file: 'data.json#latest', parsed: parsed.latest })
              items.push(...reportEntries.filter((entry) => entry.parsed?.reportId !== parsed.latest.reportId))
            } else {
              items.push(...reportEntries)
            }
          } else {
            items.push({ file: 'data.json', parsed })
          }
        } catch (err) {
          // ignore invalid JSON
        }
      }

      setReports(items.reverse())
      if (items[0]) {
        setSelectedFile(items[0].file)
      }
    } catch (err) {
      setReports([])
      setSelectedFile('')
    }
  }, [])

  const deviceOptions = useMemo(() => {
    const names = reports.map(({ parsed }) => parsed.deviceLabel || parsed.deviceName || 'Unknown device')
    return [...new Set(names)].sort((a, b) => a.localeCompare(b))
  }, [reports])

  const filteredReports = useMemo(() => reports.filter(({ file, parsed }) => {
    const q = filter.trim().toLowerCase()
    const deviceName = String(parsed.deviceLabel || parsed.deviceName || 'Unknown device').toLowerCase()
    const rawText = `${file} ${deviceName} ${parsed.status || ''} ${parsed.finalResult || ''} ${JSON.stringify(parsed).toLowerCase()}`

    const matchesSearch = !q || rawText.toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'all' || parsed.status === statusFilter
    const matchesDevice = deviceFilter === 'all' || deviceName === deviceFilter.toLowerCase()

    return matchesSearch && matchesStatus && matchesDevice
  }), [reports, filter, statusFilter, deviceFilter])

  useEffect(() => {
    if (!filteredReports.length) {
      setSelectedFile('')
      return
    }

    if (!selectedFile || !filteredReports.some((report) => report.file === selectedFile)) {
      setSelectedFile(filteredReports[0].file)
    }
  }, [filteredReports, selectedFile])

  const selectedReport = filteredReports.find((report) => report.file === selectedFile) || filteredReports[0] || null
  const normalizedSelectedReport = selectedReport ? ({
    ...selectedReport,
    parsed: selectedReport.parsed?.latest || selectedReport.parsed,
  }) : null

  const formatDateTime = (value) => {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
  }

  const formatTimeOnly = (value) => {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  }

  const formatDuration = (durationMs) => {
    if (!Number.isFinite(durationMs) || durationMs <= 0) return '00:00:00'
    const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
  }

  const getSequentialStepDuration = (step, index, stepList) => {
    const currentStart = step.startedAt ? Date.parse(step.startedAt) : null
    const nextStep = stepList[index + 1]
    const nextStart = nextStep && nextStep.startedAt ? Date.parse(nextStep.startedAt) : null

    if (Number.isFinite(currentStart) && Number.isFinite(nextStart)) {
      return Math.max(0, nextStart - currentStart)
    }

    if (Number.isFinite(currentStart) && step.completedAt) {
      const completedAt = Date.parse(step.completedAt)
      if (Number.isFinite(completedAt)) {
        return Math.max(0, completedAt - currentStart)
      }
    }

    if (Number.isFinite(step.durationMs)) {
      return step.durationMs
    }

    return 0
  }

  const exportSelectedReportPdf = () => {
    if (!normalizedSelectedReport) {
      return
    }

    const report = normalizedSelectedReport.parsed
    const steps = Array.isArray(report.steps) ? report.steps : []
    const totalDurationLabel = report.duration?.totalDurationLabel || report.metadata?.totalDurationLabel || '00:00:00'
    const suite = Array.isArray(report.passedSteps) && report.passedSteps.length ? report.passedSteps : steps.filter((step) => step.status === 'passed')
    const totalPassed = suite.length
    const totalFailed = steps.filter((step) => step.status === 'failed').length
    const totalPending = steps.filter((step) => step.status === 'pending').length

    const stepMarkup = steps.map((step, index) => {
      const status = step.statusLabel || step.status || 'Pending'
      const statusClass = step.status === 'passed' ? 'green' : step.status === 'failed' ? 'red' : 'blue'
      const startText = step.startedAt ? formatDateTime(step.startedAt) : '—'
      const endText = step.completedAt ? formatDateTime(step.completedAt) : '—'
      const sequentialDurationMs = getSequentialStepDuration(step, index, steps)
      const durationText = formatDuration(sequentialDurationMs)
      return `
        <tr>
          <td>${(step.title || step.id || 'Step').replace(/</g, '&lt;')}</td>
          <td><span class="status-badge ${statusClass}">${status}</span></td>
          <td>${startText}</td>
          <td>${endText}</td>
          <td>${durationText}</td>
        </tr>
      `
    }).join('') || '<tr><td colspan="5">No steps recorded for this test.</td></tr>'

    const passedMarkup = suite.map((step, index) => {
      const matchIndex = steps.findIndex((candidate) => candidate.id === step.id)
      const stepIndex = matchIndex >= 0 ? matchIndex : index
      const durationMs = getSequentialStepDuration(step, stepIndex, steps)
      return `
        <li>
          <strong>${(step.title || step.id || 'Step').replace(/</g, '&lt;')}</strong>
          <span>${step.statusLabel || step.status || 'Passed'}</span>
          <small>${step.startedAt ? formatTimeOnly(step.startedAt) : '—'} → ${step.completedAt ? formatTimeOnly(step.completedAt) : '—'} • ${formatDuration(durationMs)}</small>
        </li>
      `
    }).join('') || '<li>No passed steps recorded.</li>'

    const fullStepChecklist = steps.map((step, index) => `
      <li>
        <div><strong>${index + 1}. ${(step.title || step.id || 'Step').replace(/</g, '&lt;')}</strong> <span class="status-badge ${step.status === 'passed' ? 'green' : step.status === 'failed' ? 'red' : 'blue'}">${step.statusLabel || step.status || 'Pending'}</span></div>
        <small>${step.message || 'No details recorded.'}</small>
      </li>
    `).join('') || '<li>No steps recorded.</li>'

    const printableContent = `
      <html>
        <head>
          <title>${(report.deviceLabel || report.deviceName || 'CF Cover Test').replace(/</g, '&lt;')}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 30px; color: #111827; background: #f8fafc; }
            h1 { margin: 0 0 12px; font-size: 30px; }
            .header { border-bottom: 3px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; }
            .meta { display: grid; grid-template-columns: repeat(2, minmax(160px, 1fr)); gap: 12px; margin-bottom: 18px; }
            .meta div { background: white; border: 1px solid #dfe7f0; border-radius: 10px; padding: 10px 12px; }
            .summary { background: #0f172a; color: white; border-radius: 12px; padding: 16px; margin-bottom: 18px; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 10px; }
            .chip { display: inline-block; padding: 6px 10px; border-radius: 8px; background: rgba(255,255,255,0.1); margin-top: 8px; }
            .passed-list { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 16px; margin-bottom: 18px; }
            .passed-list ul { margin: 0; padding-left: 18px; }
            .passed-list li { margin-bottom: 8px; }
            .passed-list strong { display: block; margin-bottom: 2px; }
            .passed-list small { display: block; color: #334155; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; background: white; }
            th, td { border: 1px solid #dfe7f0; padding: 9px 10px; text-align: left; font-size: 12px; }
            th { background: #eaf2ff; }
            .status-badge { display: inline-block; padding: 4px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
            .status-badge.green { background: #dcfce7; color: #166534; }
            .status-badge.red { background: #fee2e2; color: #991b1b; }
            .status-badge.blue { background: #dbeafe; color: #1d4ed8; }
            .footnote { margin-top: 16px; color: #475569; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CF Cover Test Report</h1>
            <div><strong>Device:</strong> ${report.deviceLabel || report.deviceName || 'Unknown device'} • <strong>Status:</strong> ${report.status || 'unknown'}</div>
          </div>

          <div class="meta">
            <div><strong>Saved at:</strong><br>${report.savedAt ? formatDateTime(report.savedAt) : '—'}</div>
            <div><strong>Final result:</strong><br>${report.finalResult || '—'}</div>
            <div><strong>Test start:</strong><br>${report.duration?.startedAt ? formatDateTime(report.duration.startedAt) : '—'}</div>
            <div><strong>Total time:</strong><br>${totalDurationLabel}</div>
          </div>

          <div class="summary">
            <strong>Process summary</strong>
            <div class="summary-grid" style="margin-top: 12px;">
              <div><div class="chip">Passed</div><div>${totalPassed}</div></div>
              <div><div class="chip">Failed</div><div>${totalFailed}</div></div>
              <div><div class="chip">Pending</div><div>${totalPending}</div></div>
              <div><div class="chip">Total</div><div>${steps.length}</div></div>
            </div>
          </div>

          <div class="passed-list">
            <strong>Passed steps (${totalPassed}/${steps.length})</strong>
            <ul>${passedMarkup}</ul>
          </div>

          <div class="passed-list" style="background: #f8fafc; border-color: #cbd5e1;">
            <strong>Full 19-step checklist</strong>
            <ul>${fullStepChecklist}</ul>
          </div>

          <h2>Step timeline</h2>
          <table>
            <thead>
              <tr>
                <th>Step</th>
                <th>Status</th>
                <th>Start</th>
                <th>End</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>${stepMarkup}</tbody>
          </table>

          <div class="footnote">Generated from the test bench step states and timestamps recorded in the project report.</div>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank', 'width=1100,height=900')
    if (!printWindow) {
      return
    }

    printWindow.document.write(printableContent)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 300)
  }

  return (
    <section className="serial-port-panel">
      <div className="serial-header">
        <div>
          <p className="eyebrow">Saved reports</p>
          <h1>Test Reports</h1>
        </div>
        <div className="header-right">
          <button type="button" onClick={onBack} className="secondary">Back</button>
        </div>
      </div>

      <div className="toolbar report-toolbar">
        <label className="field field--wide">
          <span>Search reports</span>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search by device, status, filename or value" />
        </label>

        <label className="field">
          <span>Status</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="in-progress">In progress</option>
          </select>
        </label>

        <label className="field">
          <span>Device</span>
          <select value={deviceFilter} onChange={(e) => setDeviceFilter(e.target.value)}>
            <option value="all">All devices</option>
            {deviceOptions.map((device) => (
              <option key={device} value={device}>{device}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="report-summary-grid">
        <div className="summary-card summary-card--primary">
          <div>
            <span className="summary-label">Total</span>
            <strong>{reports.length}</strong>
          </div>
        </div>
        <div className="summary-card summary-card--success">
          <div>
            <span className="summary-label">Passed</span>
            <strong>{reports.filter(({ parsed }) => parsed.status === 'passed').length}</strong>
          </div>
        </div>
        <div className="summary-card summary-card--danger">
          <div>
            <span className="summary-label">Failed</span>
            <strong>{reports.filter(({ parsed }) => parsed.status === 'failed').length}</strong>
          </div>
        </div>
      </div>

      <div className="report-layout">
        <div className="report-list-panel">
          {filteredReports.length === 0 ? (
            <p className="empty">No reports found.</p>
          ) : (
            <table className="report-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Device</th>
                  <th>Status</th>
                  <th>Saved At</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map(({ file, parsed }) => (
                  <tr
                    key={file}
                    className={selectedReport?.file === file ? 'is-selected' : ''}
                    onClick={() => setSelectedFile(file)}
                  >
                    <td>{file}</td>
                    <td>{parsed.deviceLabel || parsed.deviceName || 'Unknown device'}</td>
                    <td><span className={`pill pill--${parsed.status || 'unknown'}`}>{parsed.status || 'unknown'}</span></td>
                    <td>{parsed.savedAt ? new Date(parsed.savedAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="report-detail-panel">
          {normalizedSelectedReport ? (
            <>
              <div className="report-detail-header">
                <div>
                  <p className="eyebrow">Selected report</p>
                  <h2>{normalizedSelectedReport.parsed.deviceLabel || normalizedSelectedReport.parsed.deviceName || 'Unknown device'}</h2>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className={`pill pill--${normalizedSelectedReport.parsed.status || 'unknown'}`}>
                    {normalizedSelectedReport.parsed.status || 'unknown'}
                  </span>
                  <button type="button" className="secondary" onClick={exportSelectedReportPdf}>Export PDF</button>
                </div>
              </div>

              <div className="report-summary-strip">
                <div className="summary-chip summary-chip--primary">
                  <span>Total</span>
                  <strong>{normalizedSelectedReport.parsed.totals?.totalSteps ?? (normalizedSelectedReport.parsed.steps || []).length}</strong>
                </div>
                <div className="summary-chip summary-chip--success">
                  <span>Passed</span>
                  <strong>{normalizedSelectedReport.parsed.totals?.passed ?? (normalizedSelectedReport.parsed.passedSteps || []).length}</strong>
                </div>
                <div className="summary-chip summary-chip--danger">
                  <span>Failed</span>
                  <strong>{normalizedSelectedReport.parsed.totals?.failed ?? 0}</strong>
                </div>
                <div className="summary-chip summary-chip--neutral">
                  <span>Duration</span>
                  <strong>{normalizedSelectedReport.parsed.duration?.totalDurationLabel || normalizedSelectedReport.parsed.metadata?.totalDurationLabel || '00:00:00'}</strong>
                </div>
              </div>

              <div className="report-meta-grid">
                <div><span>File</span><strong>{normalizedSelectedReport.file}</strong></div>
                <div><span>Device</span><strong>{normalizedSelectedReport.parsed.deviceName || '—'}</strong></div>
                <div><span>Saved</span><strong>{normalizedSelectedReport.parsed.savedAt ? formatDateTime(normalizedSelectedReport.parsed.savedAt) : '—'}</strong></div>
                <div><span>Final result</span><strong>{normalizedSelectedReport.parsed.finalResult || '—'}</strong></div>
                <div><span>Started</span><strong>{normalizedSelectedReport.parsed.duration?.startedAt ? formatDateTime(normalizedSelectedReport.parsed.duration.startedAt) : '—'}</strong></div>
                <div><span>Total time</span><strong>{normalizedSelectedReport.parsed.duration?.totalDurationLabel || normalizedSelectedReport.parsed.metadata?.totalDurationLabel || '00:00:00'}</strong></div>
              </div>

              <div className="report-passed-box">
                <h3>Passed steps ({(normalizedSelectedReport.parsed.passedSteps && normalizedSelectedReport.parsed.passedSteps.length) || ((normalizedSelectedReport.parsed.steps || []).filter((step) => step.status === 'passed')).length}/{(normalizedSelectedReport.parsed.steps || []).length})</h3>
                <ul>
                  {((normalizedSelectedReport.parsed.passedSteps && normalizedSelectedReport.parsed.passedSteps.length)
                    ? normalizedSelectedReport.parsed.passedSteps
                    : (normalizedSelectedReport.parsed.steps || []).filter((step) => step.status === 'passed')).map((step, index) => {
                    const stepList = normalizedSelectedReport.parsed.steps || []
                    const stepIndex = stepList.findIndex((candidate) => candidate.id === step.id)
                    const sequentialDuration = getSequentialStepDuration(step, stepIndex >= 0 ? stepIndex : index, stepList)

                    return (
                      <li key={`${step.id || index}-passed`}>
                        <div className="passed-step-row">
                          <span className="passed-step-title">{index + 1}. {step.title || step.id || 'Step'}</span>
                          <span className="pill pill--passed">{step.statusLabel || 'Passed'}</span>
                        </div>
                        <small>
                          {step.startedAt ? formatTimeOnly(step.startedAt) : '—'} → {step.completedAt ? formatTimeOnly(step.completedAt) : '—'} • {formatDuration(sequentialDuration)}
                        </small>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div className="report-timeline-card">
                <div className="timeline-header">
                  <h3>Step timeline</h3>
                </div>
                <div className="timeline-list">
                  {(normalizedSelectedReport.parsed.steps || []).map((step, index) => {
                    const sequentialDuration = getSequentialStepDuration(step, index, normalizedSelectedReport.parsed.steps || [])

                    return (
                      <div key={`${step.id || index}`} className={`timeline-item status-${step.status || 'pending'}`}>
                        <div className="timeline-marker" />
                        <div className="timeline-content">
                          <div className="timeline-topline">
                            <strong>{index + 1}. {step.title || step.id || 'Step'}</strong>
                            <span className={`pill pill--${step.status || 'unknown'}`}>{step.statusLabel || step.status || 'Pending'}</span>
                          </div>
                          <div className="timeline-details">
                            <span>Start: {step.startedAt ? formatTimeOnly(step.startedAt) : '—'}</span>
                            <span>End: {step.completedAt ? formatTimeOnly(step.completedAt) : '—'}</span>
                            <span>Duration: {formatDuration(sequentialDuration)}</span>
                          </div>
                          <small>{step.message || 'No message recorded for this step.'}</small>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <p className="empty">Select a report to view its JSON data.</p>
          )}
        </div>
      </div>
    </section>
  )
}
