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

  useEffect(() => {
    const fs = getNodeFs()
    const path = getNodePath()
    const os = getNodeOs()
    if (!fs || !path || !os) return

    const dir = path.join(os.homedir(), 'device-test-reports')
    try {
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
      const items = files.map((file) => {
        try {
          const content = fs.readFileSync(path.join(dir, file), 'utf8')
          const parsed = JSON.parse(content)
          return { file, parsed }
        } catch (err) {
          return null
        }
      }).filter(Boolean)

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
          {selectedReport ? (
            <>
              <div className="report-detail-header">
                <div>
                  <p className="eyebrow">Selected report</p>
                  <h2>{selectedReport.parsed.deviceLabel || selectedReport.parsed.deviceName || 'Unknown device'}</h2>
                </div>
                <span className={`pill pill--${selectedReport.parsed.status || 'unknown'}`}>
                  {selectedReport.parsed.status || 'unknown'}
                </span>
              </div>

              <div className="report-meta-grid">
                <div><span>File</span><strong>{selectedReport.file}</strong></div>
                <div><span>Device</span><strong>{selectedReport.parsed.deviceName || '—'}</strong></div>
                <div><span>Saved</span><strong>{selectedReport.parsed.savedAt ? new Date(selectedReport.parsed.savedAt).toLocaleString() : '—'}</strong></div>
                <div><span>Final result</span><strong>{selectedReport.parsed.finalResult || '—'}</strong></div>
              </div>

              <pre className="report-json">{JSON.stringify(selectedReport.parsed, null, 2)}</pre>
            </>
          ) : (
            <p className="empty">Select a report to view its JSON data.</p>
          )}
        </div>
      </div>
    </section>
  )
}
