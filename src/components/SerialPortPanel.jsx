import { useCallback, useEffect, useRef, useState } from 'react'

const TEST_STEP_DEFINITIONS = [
  { key: 'banc-pret', title: 'Banc prêt', patterns: [/Banc de test prêt|Etape 0|Etape0|Etape 0 🔧 Banc de test prêt|Appuyer sur START pour commencer/i] },
  { key: 'demarrage-test', title: 'Démarrage test', patterns: [/Etape 1|Etape1|Appuyer sur START pour démarrer le test|Démarrer le test|Etape 1 🟢 Appuyer sur START pour démarrer le test/i] },
  { key: 'carte-detectee', title: 'Carte détectée - vérification de la présence de la carte', patterns: [/Etape 2|Etape2|Carte détectée|carte détectée/i] },
  { key: 'tension-circuit', title: 'Tension 30V Circuit - vérification tension 30V Circuit', patterns: [/Etape 3|Etape3|Tension 30V Circuit|Circuit\s*=|Circuit\s+Tension\s+30V/i] },
  { key: 'tension-moteur', title: 'Tension 30V Moteur - vérification tension 30V Moteur', patterns: [/Etape 4|Etape4|Tension 30V Moteur|Moteur\s*=|Tension\s+30V\s+Moteur\s*=/i] },
  { key: 'tension-3v', title: 'Tension 3.3V', patterns: [/Etape 5|Etape5|Tension 3\.3V|3\.3V =/i] },
  { key: 'televersement', title: 'Téléversement', patterns: [/Etape 7|Etape7|Téléversement|televersement|Téléversement confirmé|Fin du téléversement/i] },
  { key: 'ble-connection-success', title: 'Connexion réussie au CF cover', patterns: [/Etape\s*21\b/i] },
  { key: 'ble-connection', title: 'Connexion BLE - vérification connexion BLE', patterns: [/Etape 81|Etape81|BLE connecté|Connecté au serveur BLE|Connexion à .*|MTU CLIENT|Connexion BLE|Connexion\s+à\s+[0-9a-fA-F:]+/i] },
  { key: 'forcage', title: 'Forçage - vérification switch', patterns: [/Etape 83|Etape83|FORÇAGE OK|forc = 1|forc =|FORCAGE|switch/i] },
  { key: 'programmation', title: 'Programmation - switch programation', patterns: [/Etape 84|Etape84|PROGRAMMATION OK|prog = 1|prog =/i] },
  { key: 'roue-codeuse', title: 'Roue codeuse', patterns: [/Etape\s*85|Etape85|ROUE\s*CODEUSE|RoueCodeuse|Roue codeuse|Régler\s+ROUE\s+CODEUSE\s+sur\s*:\s*\d+|Valeur\s+BLE\s+reçue\s+pour\s+RoueCodeuse\s*=|TEST HARDWARE BLE TERMINÉ|SENSITIVITY CHANGED/i] },
  { key: 'moteur-volet', title: 'Test moteur volet dans les 2 sens', patterns: [/Etape 8|Etape8|Etape 9|Etape9|Etape 10|Etape10|Etape 11|Etape11|Test moteur initié|moteur volet|Ouverture volet|Fermeture volet|Moteur volet fonctionne correctement/i] },
  { key: 'programmation-fins-course', title: 'Programmation fins de course', patterns: [/Etape 12|Etape12|Etape 13|Etape13|fins de course|Programmation.*fins|Impulsions\s*:\s*\d+|15 impulsions atteintes|fin de course fermée programmée|Ensuite, mettre l'interrupteur de PROGRAMMATION sur ON|Appuyer sur START pour lancer la programmation|Appuyer sur START lorsque c'est fait|Programmation initiée par START/i] },
  { key: 'verification-fins-course', title: 'Vérification des fins de course programmées et contact Sel', patterns: [/Étape\s*14|Etape\s*14|Etape14|🔍\s*Étape\s*14|Vérification\s+des\s+fins\s+de\s+course\s+programmées\s+et\s+contact\s+Sel|Vérification.*fins de course.*contact Sel|Etape15|Etape 15|Etape16|Etape 16|Etape17|Etape 17|Merci de mettre l.?interrupteur de PROGRAMMATION sur OFF|Appuyer sur START lorsque c’est fait|Appuyer sur START lorsque c'est fait|Ouverture atteinte|Fermeture atteinte|Contact Sel fonctionne|Etape16.*Fermeture atteinte.*15 impulsions/i] },
  { key: 'defaut-capteur', title: 'Défaut capteur', patterns: [/Etape 18|Etape18|Etape 19|Etape19|Défaut capteur|défaut capteur|Simulation défaut capteur|Appuyer sur START pour quitter le panne/i] },
  { key: 'ble-fermeture-volet', title: 'Fermeture volet avec Bluetooth pendant 20s', patterns: [/Etape\s*22\b/i] },
  { key: 'ble-ouverture-volet', title: 'Ouverture volet avec Bluetooth pendant 20s', patterns: [/Etape\s*23\b/i] },
  { key: 'remise-a-zero', title: 'Remise a zero', patterns: [/RESTORED|restored|Remise a zero|remise a zero|remise à zéro|remise a zero/i] },
  { key: 'fin-test', title: 'Fin complète du banc de test', patterns: [/Etape 26|Etape26|Fin complète du banc de test|Fin complète.*banc|Fin complète.*test|Fin complète|Etape26\s*🏁\s*Fin complète du banc de test/i] },
]

const API_ENDPOINT = import.meta.env.VITE_API_URL || ''

const EXPLICIT_ETAPE_MATCHERS = {
  'remise-a-zero': /RESTORED|restored|Etape\s*27\b|cliquer\s+sur\s+la\s+bouton\s+setup/i,
  'ble-connection-success': /Etape\s*21\b/i,
  'ble-fermeture-volet': /Etape\s*22\b|fermeture\s+volet\s+avec\s+bluetooth\s+pendant\s*20s/i,
  'ble-ouverture-volet': /Etape\s*23\b|ouverture\s+volet\s+avec\s+bluetooth\s+pendant\s*20s/i,
  'programmation-fins-course': /Etape\s*13\b|15\s*\/\s*15|15 impulsions atteintes|fin de course fermée programmée/i,
}

function getSerialPortModule() {
  if (typeof window === 'undefined') {
    return null
  }

  if (window.electronAPI?.SerialPort) {
    return window.electronAPI.SerialPort
  }

  if (window.require) {
    try {
      return window.require('serialport')
    } catch (error) {
      console.error('Unable to load serialport:', error)
      return null
    }
  }

  return null
}

function getReadlineParser() {
  if (typeof window === 'undefined') {
    return null
  }

  if (window.electronAPI?.Readline) {
    return window.electronAPI.Readline
  }

  if (window.require) {
    try {
      return window.require('@serialport/parser-readline')
    } catch (error) {
      console.error('Unable to load parser-readline:', error)
      return null
    }
  }

  return null
}

function SerialPortPanel({ onViewReports }) {
  const [ports, setPorts] = useState([])
  const [programPortPath, setProgramPortPath] = useState('')
  const [deviceNamePortPath, setDeviceNamePortPath] = useState('')
  const [programConnected, setProgramConnected] = useState(false)
  const [deviceNameConnected, setDeviceNameConnected] = useState(false)
  const [programOutput, setProgramOutput] = useState('No program output yet')
  const [deviceName, setDeviceName] = useState('No device name yet')
  const [capturedName, setCapturedName] = useState('')
  const [nameSendStatus, setNameSendStatus] = useState('not-sent') // 'not-sent' | 'sent' | 'failed'
  const [message, setMessage] = useState('AT\r')
  const [logEntries, setLogEntries] = useState([])
  const [serialTrace, setSerialTrace] = useState([])
  const [traceFilter, setTraceFilter] = useState('both')
  const [runtimeErrors, setRuntimeErrors] = useState([])
  const [cycleCount, setCycleCount] = useState(0)
  const [lastResult, setLastResult] = useState('Waiting for test')
  const [deviceLabel, setDeviceLabel] = useState('Current device')
  const [activePortPath, setActivePortPath] = useState('')
  const [lastPortActivity, setLastPortActivity] = useState({ program: 0, device: 0 })
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('idle')
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('Prêt pour le téléversement')
  const bothConnected = programConnected && deviceNameConnected
  const [steps, setSteps] = useState(() =>
    TEST_STEP_DEFINITIONS.map((step) => ({
      id: step.key,
      title: step.title,
      status: 'pending',
      message: '',
      timestamp: '',
    })),
  )
  const programPortRef = useRef(null)
  const deviceNamePortRef = useRef(null)
  const portBuffersRef = useRef({ program: '', device: '' })
  const lastVoltageReadingsRef = useRef({})
  const traceListRef = useRef(null)
  const logListRef = useRef(null)
  const [traceLimit, setTraceLimit] = useState(() => 5000)
  const traceLimitRef = useRef(traceLimit)
  const uploadProgressTimerRef = useRef(null)

  useEffect(() => {
    traceLimitRef.current = traceLimit
  }, [traceLimit])

  const stopUploadProgressFallback = () => {
    if (uploadProgressTimerRef.current) {
      clearInterval(uploadProgressTimerRef.current)
      uploadProgressTimerRef.current = null
    }
  }

  const startUploadProgressFallback = () => {
    stopUploadProgressFallback()
    let fallbackProgress = 8
    uploadProgressTimerRef.current = setInterval(() => {
      fallbackProgress = Math.min(94, fallbackProgress + Math.random() * 9 + 4)
      setUploadProgress(Math.round(fallbackProgress))
      setUploadStatus('uploading')
      setUploadMessage(`Téléversement en cours: ${Math.round(fallbackProgress)}%`)
      setLastResult(`Téléversement ${Math.round(fallbackProgress)}%`)
      setSteps((current) => current.map((step) => step.id === 'televersement'
        ? {
            ...step,
            status: 'pending',
            message: `Téléversement ${Math.round(fallbackProgress)}%`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
          }
        : step,
      ))
    }, 700)
  }

  // fixed textarea visual size (users can still resize textarea manually)
  const defaultTraceHeight = 220
  const reportSavedRef = useRef(null)

  const resetCurrentDevice = () => {
    reportSavedRef.current = null
    setSteps(TEST_STEP_DEFINITIONS.map((step) => ({
      id: step.key,
      title: step.title,
      status: 'pending',
      message: '',
    })))
    setProgramOutput('Waiting for next device output...')
    setDeviceName('No device name yet')
    setLastResult('Ready for next device')
    setSerialTrace([])
    setRuntimeErrors([])
    setLogEntries([])
    setCapturedName('')
    setNameSendStatus('not-sent')
    nameSendAttemptsRef.current = {}
    nameConfirmedRef.current = {}
    setDeviceLabel(`Device ${cycleCount + 1}`)
    addLog('New device cycle started.')
  }

  const getNodeFs = () => {
    if (typeof window === 'undefined' || !window.require) {
      return null
    }

    try {
      return window.require('node:fs')
    } catch (error) {
      try {
        return window.require('fs')
      } catch (fsError) {
        console.error('Unable to load fs module:', fsError)
        return null
      }
    }
  }

  const getNodePath = () => {
    if (typeof window === 'undefined' || !window.require) {
      return null
    }

    try {
      return window.require('node:path')
    } catch (error) {
      try {
        return window.require('path')
      } catch (pathError) {
        console.error('Unable to load path module:', pathError)
        return null
      }
    }
  }

  const getNodeOs = () => {
    if (typeof window === 'undefined' || !window.require) {
      return null
    }

    try {
      return window.require('node:os')
    } catch (error) {
      try {
        return window.require('os')
      } catch (osError) {
        console.error('Unable to load os module:', osError)
        return null
      }
    }
  }

  const getChildProcess = () => {
    if (typeof window === 'undefined' || !window.require) {
      return null
    }

    try {
      return window.require('node:child_process')
    } catch (error) {
      try {
        return window.require('child_process')
      } catch (childError) {
        console.error('Unable to load child_process module:', childError)
        return null
      }
    }
  }

  const resolveLocalBinPath = (relativePath) => {
    const fs = getNodeFs()
    const path = getNodePath()

    if (!fs || !path) {
      return relativePath
    }

    const candidates = [
      path.join(process.cwd(), relativePath),
      path.join(process.cwd(), 'src', 'components', relativePath.replace(/^.*?bin\//, 'bin/')),
      path.join(process.cwd(), 'src', 'components', 'bin', path.basename(relativePath)),
      path.join(process.cwd(), 'bin', path.basename(relativePath)),
    ]

    const existing = candidates.find((candidate) => fs.existsSync(candidate))
    return existing || candidates[0]
  }

  const buildEspToolFlashCommand = (portPath, files) => {
    const cmd = [
      'esptool.exe',
      '--chip',
      'esp32',
      '--port',
      portPath,
      '--baud',
      '921600',
      '--before',
      'default_reset',
      '--after',
      'hard_reset',
      'write_flash',
      '-e',
      '-z',
      '--flash_mode',
      'keep',
      '--flash_freq',
      'keep',
      '--flash_size',
      'keep',
    ]

    files.forEach((file) => {
      cmd.push(file.address)
      cmd.push(file.path)
    })

    return cmd
  }

  const runEspToolCommand = (args, { cwd, onStdout, onStderr, onExit } = {}) => {
    const cp = getChildProcess()
    if (!cp) {
      console.error('esptool command unavailable because child_process is unavailable.')
      return null
    }

    const child = cp.spawn(args[0], args.slice(1), {
      shell: false,
      windowsHide: true,
      cwd: cwd || process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PATH: `${process.env.PATH || ''}${process.platform === 'win32' ? ';' : ':'}${process.cwd()}`,
      },
    })

    child.stdout?.on('data', (chunk) => {
      const text = chunk.toString()
      onStdout?.(text)
    })

    child.stderr?.on('data', (chunk) => {
      const text = chunk.toString()
      onStderr?.(text)
    })

    child.on('exit', (code, signal) => {
      onExit?.(code, signal)
    })

    return child
  }

  const addLog = (entry) => {
    setLogEntries((current) => {
      const limit = traceLimitRef.current || 5000
      const next = [...current, entry]
      return next.length > limit ? next.slice(next.length - limit) : next
    })
  }

  const [toast, setToast] = useState(null)
  const showToast = (text, ms = 2500) => {
    setToast(text)
    setTimeout(() => setToast(null), ms)
  }

  const addSerialTrace = (portType, line) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const traceEntry = {
      id: `${timestamp}-${portType}-${Math.random().toString(16).slice(2)}`,
      portType,
      line,
      timestamp,
    }

    setSerialTrace((current) => {
      const limit = traceLimitRef.current || 5000
      const next = [...current, traceEntry]
      return next.length > limit ? next.slice(next.length - limit) : next
    })
  }

  const addRuntimeError = (line) => {
    const message = String(line || '').trim()
    if (!message) {
      return
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    const errorEntry = {
      id: `${timestamp}-${Math.random().toString(16).slice(2)}`,
      message,
      timestamp,
    }

    setRuntimeErrors((current) => {
      const next = [...current, errorEntry]
      return next.slice(-25)
    })
  }

  // scrolling utilities for trace and log
  const scrollTraceToTop = () => {
    const el = traceListRef.current
    if (el) el.scrollTop = 0
  }

  const scrollTraceToBottom = () => {
    const el = traceListRef.current
    if (el) el.scrollTop = el.scrollHeight
  }

  const scrollLogToTop = () => {
    const el = logListRef.current
    if (el) el.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const scrollLogToBottom = () => {
    const el = logListRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }

  useEffect(() => {
    // Auto-scroll the trace list to bottom when new entries arrive
    try {
      const el = traceListRef.current
      if (el) {
        const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
        // Use smooth scrolling when allowed, otherwise jump instantly
        // For a textarea element set scrollTop directly; smooth behavior is not required here
        el.scrollTop = el.scrollHeight
      }
    } catch (err) {
      // ignore scroll errors
    }
  }, [serialTrace])

  const nameSendAttemptsRef = useRef({})
  const nameConfirmedRef = useRef({})

  const trySendNameToBench = (name) => {
    if (!name) return

    const sanitized = String(name).trim()
    if (!sanitized) return

    const confirmed = !!nameConfirmedRef.current[sanitized]
    if (confirmed) {
      setNameSendStatus('confirmed')
      return
    }

    const attempts = nameSendAttemptsRef.current[sanitized] || 0
    if (attempts >= 3) {
      addLog(`MAX retries reached for name ${sanitized}. Waiting for confirmation.`)
      setNameSendStatus('failed')
      return
    }

    const port = programPortRef.current
    if (!port || !programConnected) {
      setNameSendStatus('not-sent')
      return
    }

    const nextAttempts = attempts + 1
    nameSendAttemptsRef.current[sanitized] = nextAttempts

    try {
      const payload = `${sanitized}\n`
      port.write(payload, (err) => {
        if (err) {
          addLog(`Name send failed: ${err.message}`)
          setNameSendStatus('failed')
          return
        }

        addLog(`Sent name to bench port (${nextAttempts}/3): ${sanitized}`)
        setNameSendStatus(nextAttempts >= 3 ? 'retrying' : 'sent')
      })
    } catch (err) {
      addLog(`Name send exception: ${err.message}`)
      setNameSendStatus('failed')
    }
  }

  const detectActivePort = () => {
    const candidates = [
      { path: programPortPath, kind: 'program', time: lastPortActivity.program },
      { path: deviceNamePortPath, kind: 'device', time: lastPortActivity.device },
    ].filter((item) => item.path && item.time > 0)

    if (candidates.length === 0) {
      setActivePortPath('')
      addLog('No active serial traffic detected yet.')
      return
    }

    const newest = candidates.reduce((latest, current) =>
      current.time > latest.time ? current : latest,
    )

    setActivePortPath(newest.path)
    addLog(`Active receiving port detected: ${newest.path} (${newest.kind})`)
  }

  const buildTestPayload = () => {
    const passed = steps.filter((step) => step.status === 'passed').length
    const failed = steps.filter((step) => step.status === 'failed').length
    const pending = steps.filter((step) => step.status === 'pending').length

    const overallStatus = failed > 0 ? 'failed' : pending === 0 ? 'passed' : 'in-progress'

    const registerData = Object.entries(lastVoltageReadingsRef.current || {}).reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {})

    return {
      reportId: `${(deviceLabel || 'device').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${cycleCount}-${new Date().toISOString()}`,
      savedAt: new Date().toISOString(),
      status: overallStatus,
      finalResult: lastResult,
      deviceLabel,
      cycleCount,
      deviceName,
      capturedName,
      programOutput,
      message,
      registerData,
      totals: {
        totalSteps: steps.length,
        passed,
        failed,
        pending,
      },
      steps: steps.map((step) => ({
        id: step.id,
        title: step.title,
        status: step.status,
        message: step.message,
        timestamp: step.timestamp,
      })),
      portsDetected: ports,
      selectedPorts: {
        testBenchPort: programPortPath,
        cfCartePort: deviceNamePortPath,
      },
      activePortPath,
      lastPortActivity,
      programConnected,
      deviceNameConnected,
      runtimeErrors,
      serialTrace,
      logEntries,
      metadata: {
        benchPort: programPortPath,
        cfCartePort: deviceNamePortPath,
        testStartedAt: steps.find((step) => step.status !== 'pending')?.timestamp || null,
        testFinishedAt: steps.findLast((step) => step.status !== 'pending')?.timestamp || null,
      },
    }
  }

  const saveTestReport = useCallback(async (force = false) => {
    if (!force && reportSavedRef.current === cycleCount) {
      return
    }

    const payload = buildTestPayload()
    const fs = getNodeFs()
    const path = getNodePath()
    const os = getNodeOs()

    if (!fs || !path || !os) {
      addLog('Local JSON export is unavailable outside Electron.')
      return
    }

    try {
      const reportDir = path.join(os.homedir(), 'device-test-reports')
      fs.mkdirSync(reportDir, { recursive: true })

      const safeLabel = String(deviceLabel || payload.deviceLabel || 'device').replace(/[^a-z0-9-_]/gi, '_')
      const timeStamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `device-test-${safeLabel}-${timeStamp}.json`
      const filePath = path.join(reportDir, fileName)

      reportSavedRef.current = cycleCount
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8')
      addLog(`JSON report saved locally: ${filePath}`)

      if (!API_ENDPOINT) {
        addLog('No API URL configured in environment. Local JSON saved only.')
        return
      }

      try {
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const responseText = await response.text()
        addLog(`Server sync successful: ${responseText || 'OK'}`)
      } catch (serverError) {
        addLog(`Server sync failed: ${serverError.message}`)
      }
    } catch (error) {
      addLog(`Report save failed: ${error.message}`)
    }
  }, [addLog, buildTestPayload, cycleCount, deviceLabel])

  useEffect(() => {
    // When all steps complete or the 'fin-test' step passes, save the report once per cycle
    try {
      const allDone = steps.length > 0 && steps.every((s) => s.status !== 'pending')
      const finStep = steps.find((s) => s.id === 'fin-test')
      const finPassed = !!(finStep && finStep.status === 'passed')

      if ((allDone || finPassed) && reportSavedRef.current !== cycleCount) {
        ;(async () => {
          try {
            await saveTestReport(true)
            addLog('Auto-saved test report.')
          } catch (err) {
            addLog(`Auto-save failed: ${err.message}`)
          }
        })()
      }
    } catch (err) {
      // ignore
    }
  }, [steps, cycleCount, saveTestReport, addLog])

  const extractStepMessage = (stepKey, line) => {
    const cleanedLine = line.trim()
    if (!cleanedLine) {
      return ''
    }

    if (stepKey === 'banc-pret') {
      if (/Etape\s*0\s*🔧\s*Banc de test prêt|Banc de test prêt/i.test(cleanedLine)) {
        return 'Etape 0 🔧 Banc de test prêt. Appuyer sur START pour commencer.'
      }
    }

    if (stepKey === 'tension-circuit') {
      const match = cleanedLine.match(/(?:Tension\s+)?30V\s+Circuit\s*=\s*([0-9]+(?:[.,][0-9]+)?)\s*V/i)
      if (match) {
        const value = match[1].replace(',', '.')
        lastVoltageReadingsRef.current[stepKey] = value
        return `Circuit Tension 30V = ${value} V`
      }

      const shortMatch = cleanedLine.match(/Circuit\s*=\s*([0-9]+(?:[.,][0-9]+)?)\s*V/i)
      if (shortMatch) {
        const value = shortMatch[1].replace(',', '.')
        lastVoltageReadingsRef.current[stepKey] = value
        return `Circuit Tension 30V = ${value} V`
      }

      if (lastVoltageReadingsRef.current[stepKey]) {
        return `Circuit Tension 30V = ${lastVoltageReadingsRef.current[stepKey]} V`
      }
    }

    if (stepKey === 'tension-moteur') {
      const match = cleanedLine.match(/Tension\s+30V\s+Moteur\s*=\s*([0-9]+(?:[.,][0-9]+)?)\s*V/i)
      if (match) {
        const value = match[1].replace(',', '.')
        lastVoltageReadingsRef.current[stepKey] = value
        return `Tension 30V Moteur = ${value} V`
      }

      const shortMatch = cleanedLine.match(/Moteur\s*=\s*([0-9]+(?:[.,][0-9]+)?)\s*V/i)
      if (shortMatch) {
        const value = shortMatch[1].replace(',', '.')
        lastVoltageReadingsRef.current[stepKey] = value
        return `Tension 30V Moteur = ${value} V`
      }

      if (lastVoltageReadingsRef.current[stepKey]) {
        return `Tension 30V Moteur = ${lastVoltageReadingsRef.current[stepKey]} V`
      }
    }

    if (stepKey === 'tension-3v') {
      const match = cleanedLine.match(/3\.3V\s*=\s*([0-9]+(?:[.,][0-9]+)?)\s*V/i)
      if (match) {
        const value = match[1].replace(',', '.')
        lastVoltageReadingsRef.current[stepKey] = value
        return `Tension 3.3V = ${value} V`
      }

      if (lastVoltageReadingsRef.current[stepKey]) {
        return `Tension 3.3V = ${lastVoltageReadingsRef.current[stepKey]} V`
      }
    }

    if (stepKey === 'televersement') {
      if (/Veuillez téléverser le programme dans la carte maintenant|Veuillez téléverser le programme|Téléversement complet|Téléversement en cours/i.test(cleanedLine)) {
        if (uploadStatus === 'uploading' && uploadProgress > 0) {
          return `Téléversement ${uploadProgress}%`
        }

        if (uploadStatus === 'complete') {
          return '🟢 Reconnecter le COM de la cart + Appuyer sur START'
        }

        return cleanedLine
      }

      if (/Téléversement/i.test(cleanedLine)) {
        return cleanedLine
      }
    }

    if (stepKey === 'moteur-volet') {
      if (/Fermeture volet|Ouverture volet|Moteur volet fonctionne correctement|Relais (?:CLOSE|OPEN) activé/i.test(cleanedLine)) {
        return '🟢 Appuyer sur START'
      }
    }

    if (stepKey === 'defaut-capteur') {
      if (/Simulation défaut capteur/i.test(cleanedLine)) {
        return '⚠️⚠️⚠️⚠️⚠️ Simulation défaut capteur et  Appuyer sur START pour quitter le panne ⚠️⚠️⚠️⚠️⚠️'
      }

      if (/Appuyer sur START pour quitter le panne/i.test(cleanedLine)) {
        return 'Appuyer sur START pour quitter le panne'
      }
    }

    if (stepKey === 'ble-connection') {
      const match = cleanedLine.match(/Connexion\s+à\s+([0-9a-fA-F]{2}(?::[0-9a-fA-F]{2}){5})/i)
      if (match) {
        return `Connexion à ${match[1].toLowerCase()}`
      }
    }

    if (stepKey === 'forcage') {
      const match = cleanedLine.match(/forc(?:age)?\s*[:=]?\s*([01]|on|off|ok|nok)/i)
      if (match) {
        return `Forçage ${match[1]}`
      }
    }

    if (stepKey === 'ble-connection-success') {
      if (/Etape\s*21\b/i.test(cleanedLine)) {
        return 'Connecté avec succès au carte cf cover'
      }
    }

    if (stepKey === 'ble-fermeture-volet') {
      if (/Etape\s*22\b|fermeture\s+volet\s+avec\s+bluetooth\s+pendant\s*20s/i.test(cleanedLine)) {
        return 'Fermeture volet avec Bluetooth pendant 20s'
      }
    }

    if (stepKey === 'ble-ouverture-volet') {
      if (/Etape\s*23\b|ouverture\s+volet\s+avec\s+bluetooth\s+pendant\s*20s/i.test(cleanedLine)) {
        return 'Ouverture volet avec Bluetooth pendant 20s'
      }
    }

    if (stepKey === 'remise-a-zero') {
      if (/Etape\s*27\b|cliquer\s+sur\s+la\s+bouton\s+setup\s+ne\s+la\s+relache\s+pas\s+cliquer\s+sur\s+start\s+pour\s+confirmer|cliquer\s+sur\s+la\s+bouton\s+setup/i.test(cleanedLine)) {
        return 'cliquer sur la bouton setup ne la relache pas cliquer sur start pour confirmer'
      }

      if (/RESTORED|restored/i.test(cleanedLine)) {
        return 'Remise a zero avec success, Appuier start pour finir le test'
      }
    }

  if (stepKey === 'programmation-fins-course') {
  const FINAL_MSG =
    '15/15 — ✅ Fin de course fermée programmée. mettre l’interrupteur de PROGRAMMATION sur OFF  Appuyer sur START'

  // 1. Final state first (count >= 15 or "15 impulsions atteintes")
  const countMatch = cleanedLine.match(/Impulsions\s*:?\s*(\d+)/i)
  const count = countMatch ? Number(countMatch[1]) : null

  if (
    (count !== null && Number.isFinite(count) && count >= 15) ||
    /15 impulsions atteintes|fin de course fermée programmée/i.test(cleanedLine)
  ) {
    return FINAL_MSG
  }

  // 2. Intermediate count
  if (count !== null && Number.isFinite(count) && count >= 0) {
    return `${count}/15`
  }

  // 3. Step messages
  if (/Ensuite, mettre l'interrupteur de PROGRAMMATION sur ON/i.test(cleanedLine)) {
    return 'Etape 12 👉 Ensuite, mettre l’interrupteur de PROGRAMMATION sur ON.'
  }

  if (/Programmation initiée par START/i.test(cleanedLine)) {
    return 'Etape 12 ✅ Programmation initiée par START.'
  }

  // 4. Etape 13 last, so it no longer overrides the count
  if (/Etape\s*13\b/i.test(cleanedLine)) {
    return 'programmation fin de course mettre l’interrupteur de FORÇAGE sur OFF et PROGRAMMATION sur ON  Appuyer sur START'
  }
}
    if (stepKey === 'roue-codeuse') {
      if (/Régler\s+ROUE\s+CODEUSE\s+sur\s*:\s*(\d+)/i.test(cleanedLine)) {
        const value = cleanedLine.match(/Régler\s+ROUE\s+CODEUSE\s+sur\s*:\s*(\d+)/i)?.[1]
        return `👉 Régler ROUE CODEUSE sur : ${value}`
      }

      if (/Valeur\s+BLE\s+reçue\s+pour\s+RoueCodeuse\s*=\s*(\d+)/i.test(cleanedLine)) {
        const value = cleanedLine.match(/Valeur\s+BLE\s+reçue\s+pour\s+RoueCodeuse\s*=\s*(\d+)/i)?.[1]
        return `VAL BLE = ${value}`
      }

      if (/Etape85\s*✅\s*ROUE\s*CODEUSE\s*=\s*(\d+)\s*OK/i.test(cleanedLine)) {
        const value = cleanedLine.match(/Etape85\s*✅\s*ROUE\s*CODEUSE\s*=\s*(\d+)\s*OK/i)?.[1]
        return `Etape 85 ✅ ROUE CODEUSE = ${value} OK`
      }

      if (/TEST HARDWARE BLE TERMINÉ/i.test(cleanedLine)) {
        return '✅ TEST HARDWARE BLE TERMINÉ'
      }
    }

    if (stepKey === 'fin-test') {
      if (/Etape\s*28\b/i.test(cleanedLine)) {
        return 'Etape 28 🏁 Fin complète du banc de test'
      }
    }

    if (stepKey === 'verification-fins-course') {
      if (/🔍\s*Étape\s*14|Vérification\s+des\s+fins\s+de\s+course\s+programmées\s+et\s+contact\s+Sel/i.test(cleanedLine)) {
        return 'Etape 14 🔍 Vérification des fins de course programmées et contact Sel.'
      }

      if (/Sauvegarde fins de course confirmée par START|Sauvegarde.*confirmée/i.test(cleanedLine)) {
        return 'Etape 14 ✅ Sauvegarde fins de course confirmée par START.'
      }

      if (/Ouverture atteinte|Etape\s*15\s*✅\s*Ouverture\s+atteinte/i.test(cleanedLine)) {
        return 'Etape 14 ✅ Ouverture atteinte (15 impulsions).'
      }

      if (/Fermeture atteinte|Etape\s*16\s*✅\s*Fermeture\s+atteinte/i.test(cleanedLine)) {
        return 'Etape 14 ✅ Fermeture atteinte (15 impulsions).'
      }

      if (/Contact Sel fonctionne correctement|Etape\s*17\s*✅\s*Contact Sel fonctionne correctement/i.test(cleanedLine)) {
        return 'Etape 14 ✅ Contact Sel fonctionne correctement.'
      }

      if (/Merci de mettre l.?interrupteur de PROGRAMMATION sur OFF/i.test(cleanedLine)) {
        return 'Merci de mettre l’interrupteur de PROGRAMMATION sur OFF pour sauvegarder les fins de course. et Appuyer sur START'
      }

      if (/Appuyer sur START lorsque c[’\']est fait/i.test(cleanedLine)) {
        return 'Merci de mettre l’interrupteur de PROGRAMMATION sur OFF pour sauvegarder les fins de course. et Appuyer sur START'
      }
    }

    return cleanedLine
  }

  const updateStepFromSerialLine = (line) => {
    const cleanedLine = line.trim()
    if (!cleanedLine) {
      return
    }

    const runtimeErrorPattern = /(🔴|❌|ERROR|ERREUR|FAIL|FAILED|ECHEC|ÉCHEC|NOK|KO|non trouvée|Arrêt du test|Erreur|fatal|exception|Exception|\bX\b|\bNON\b|\bINCORRECT\b)/i
    if (runtimeErrorPattern.test(cleanedLine)) {
      addRuntimeError(cleanedLine)
      return
    }

    const passPattern = /(✅|🟢|OK|SUCCESS|SUCCES|VALIDE|TERMINÉ|TERMINE|REUSSI|PASSÉ|PASSE|connecté|connectée|détectée|fonctionne|atteinte|reçu|démarré|OK :|réussie|réussi)/i
    const failPattern = /(🔴|❌|ERROR|ERREUR|FAIL|FAILED|ECHEC|ÉCHEC|NOK|KO|non trouvée|Arrêt du test|Erreur|\bX\b|\bNON\b|\bINCORRECT\b)(?!.*réussi|.*réussie)/i

    if (/RESTORED|restored/i.test(cleanedLine)) {
      const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      setSteps((current) => current.map((step) => step.id === 'remise-a-zero'
        ? {
            ...step,
            status: 'passed',
            message: 'Remise a zero avec success Appuier start pour finir le test',
            timestamp: ts,
          }
        : step,
      ))
      setLastResult('PASS - Remise a zero')
      return
    }

    const explicitMatchedStepKey = /DATA\s*RESTORED|RESTORED|restored|Etape\s*27\b|cliquer\s+sur\s+la\s+bouton\s+setup/i.test(cleanedLine)
      ? 'remise-a-zero'
      : Object.entries(EXPLICIT_ETAPE_MATCHERS).find(([, pattern]) => pattern.test(cleanedLine))?.[0]
    const matchedStep = explicitMatchedStepKey
      ? TEST_STEP_DEFINITIONS.find((step) => step.key === explicitMatchedStepKey)
      : TEST_STEP_DEFINITIONS.find((step) =>
        step.patterns.some((pattern) => pattern.test(cleanedLine)),
      )

    if (!matchedStep) {
      return
    }

    setSteps((current) =>
      current.map((step) => {
        if (step.id !== matchedStep.key) {
          return step
        }

        const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        const measuredMessage = extractStepMessage(step.id, cleanedLine)
        const displayMessage = (/tension-circuit|tension-moteur|tension-3v/i.test(step.id) && lastVoltageReadingsRef.current[step.id])
          ? `${measuredMessage || `Tension ${step.title}`}`
          : measuredMessage || cleanedLine

        if (failPattern.test(cleanedLine)) {
          const nextState = { ...step, status: 'failed', message: displayMessage || cleanedLine, timestamp: ts }
          setLastResult(`FAIL - ${step.title}`)
          return nextState
        }

        if (step.id === 'programmation-fins-course') {
          const countMatch = cleanedLine.match(/Impulsions\s*:??\s*(\d+)/i)
          const reached15 = countMatch ? Number(countMatch[1]) >= 15 : false
          const completed = reached15 || /15 impulsions atteintes|fin de course fermée programmée|15\/15|Etape 13\s*✅\s*15 impulsions atteintes/i.test(cleanedLine)
          const nextState = {
            ...step,
            status: completed ? 'passed' : 'pending',
            message: displayMessage || cleanedLine,
            timestamp: ts,
          }

          if (completed) {
            setLastResult(`PASS - ${step.title} (15/15)`)
          } else {
            setLastResult(`${step.title} - ${displayMessage || 'En cours'}`)
          }
          return nextState
        }

        if (step.id === 'ble-connection-success') {
          const completed = /Etape\s*21\b/i.test(cleanedLine)
          const nextState = {
            ...step,
            status: completed ? 'passed' : 'pending',
            message: displayMessage || cleanedLine,
            timestamp: ts,
          }

          if (completed) {
            setLastResult(`PASS - ${step.title}`)
          } else {
            setLastResult(`${step.title} - ${displayMessage || 'En cours'}`)
          }
          return nextState
        }

        if (step.id === 'verification-fins-course') {
          const verificationSuccess = /Sauvegarde fins de course confirmée|Défaut capteur|défaut capteur|Etape\s*16\b.*Défaut capteur|Etape\s*20\b.*Ouverture atteinte \(15 impulsions\)|Ouverture atteinte.*15 impulsions|Fermeture atteinte|Contact Sel fonctionne correctement|Etape\s*(14|15|16|17|20)\s*✅.*(Ouverture|Fermeture|Contact Sel|Sauvegarde|Défaut capteur)/i.test(cleanedLine)
          const nextState = {
            ...step,
            status: verificationSuccess ? 'passed' : 'pending',
            message: displayMessage || cleanedLine,
            timestamp: ts,
          }

          if (verificationSuccess) {
            setLastResult(`PASS - ${step.title} (vérification OK)`)
          } else {
            setLastResult(`${step.title} - ${displayMessage || 'En cours'}`)
          }
          return nextState
        }

        if (step.id === 'ble-fermeture-volet') {
          const completed = /Etape\s*22\b|fermeture\s+volet\s+avec\s+bluetooth\s+pendant\s*20s/i.test(cleanedLine)
          const nextState = {
            ...step,
            status: completed ? 'passed' : 'pending',
            message: displayMessage || cleanedLine,
            timestamp: ts,
          }

          if (completed) {
            setLastResult(`PASS - ${step.title}`)
          } else {
            setLastResult(`${step.title} - ${displayMessage || 'En cours'}`)
          }
          return nextState
        }

        if (step.id === 'ble-ouverture-volet') {
          const completed = /Etape\s*23\b|ouverture\s+volet\s+avec\s+bluetooth\s+pendant\s*20s/i.test(cleanedLine)
          const nextState = {
            ...step,
            status: completed ? 'passed' : 'pending',
            message: displayMessage || cleanedLine,
            timestamp: ts,
          }

          if (completed) {
            setLastResult(`PASS - ${step.title}`)
          } else {
            setLastResult(`${step.title} - ${displayMessage || 'En cours'}`)
          }
          return nextState
        }

        if (step.id === 'remise-a-zero') {
          const completed = /RESTORED|restored/i.test(cleanedLine)
          const nextState = {
            ...step,
            status: completed ? 'passed' : 'pending',
            message: displayMessage || cleanedLine,
            timestamp: ts,
          }

          if (completed) {
            setLastResult(`PASS - ${step.title}`)
          } else {
            setLastResult(`${step.title} - ${displayMessage || 'En cours'}`)
          }
          return nextState
        }

        if (step.id === 'fin-test') {
          const completed = /Etape\s*28\b/i.test(cleanedLine)
          const nextState = {
            ...step,
            status: completed ? 'passed' : 'pending',
            message: displayMessage || cleanedLine,
            timestamp: ts,
          }

          if (completed) {
            setLastResult('PASS - Fin complète du banc de test')
            setTimeout(() => {
              saveTestReport(true)
            }, 0)
          } else {
            setLastResult(`${step.title} - ${displayMessage || 'En cours'}`)
          }
          return nextState
        }

        if (step.id === 'roue-codeuse') {
          const finished = /TEST HARDWARE BLE TERMINÉ|Etape85\s*✅\s*ROUE\s*CODEUSE\s*=\s*\d+\s*OK/i.test(cleanedLine)
          const nextState = {
            ...step,
            status: finished ? 'passed' : 'pending',
            message: displayMessage || cleanedLine,
            timestamp: ts,
          }

          if (finished) {
            setLastResult(`PASS - ${step.title} (BLE OK)`)
          } else {
            setLastResult(`${step.title} - ${displayMessage || 'En cours'}`)
          }
          return nextState
        }

        const nextState = { ...step, status: 'passed', message: displayMessage || cleanedLine, timestamp: ts }
        setLastResult(`PASS - ${step.title}`)
        return nextState
      }),
    )
  }

  const refreshPorts = useCallback(async (preserveSelection = false) => {
    const SerialPort = getSerialPortModule()
    if (!SerialPort) {
      const listPorts = window.electronAPI?.listSerialPorts
      if (typeof listPorts === 'function') {
        try {
          const detectedPorts = await listPorts()
          setPorts(detectedPorts)

          if (preserveSelection) {
            if (!programPortPath && detectedPorts[0]?.path) {
              setProgramPortPath(detectedPorts[0].path)
            }
            if (!deviceNamePortPath && detectedPorts[1]?.path) {
              setDeviceNamePortPath(detectedPorts[1].path)
            }
          }
          return
        } catch (error) {
          addLog(`serialport list failed: ${error.message}`)
          return
        }
      }

      addLog('serialport is unavailable in this environment.')
      return
    }

    try {
      const detectedPorts = await SerialPort.list()
      setPorts(detectedPorts)

      if (detectedPorts.length === 0) {
        addLog('No serial ports detected.')
        return
      }

      if (preserveSelection) {
        if (!programPortPath && detectedPorts[0]?.path) {
          setProgramPortPath(detectedPorts[0].path)
        }

        if (!deviceNamePortPath && detectedPorts[1]?.path) {
          setDeviceNamePortPath(detectedPorts[1].path)
        }
      }

      addLog(`Detected ${detectedPorts.length} port(s).`)
    } catch (error) {
      addLog(`Port scan failed: ${error.message}`)
    }
  }, [deviceNamePortPath, programPortPath])

  useEffect(() => {
    refreshPorts()
    const interval = setInterval(() => refreshPorts(true), 5000)
    return () => clearInterval(interval)
  }, [refreshPorts])

  const disconnectProgramPort = () => {
    if (programPortRef.current) {
      try {
        programPortRef.current.close()
      } catch (error) {
        console.error('Program port disconnect error:', error)
      }
    }

    programPortRef.current = null
    setProgramConnected(false)
    addLog('Program output port disconnected.')
  }

  const disconnectDeviceNamePort = () => {
    if (deviceNamePortRef.current) {
      try {
        deviceNamePortRef.current.close()
      } catch (error) {
        console.error('Device name port disconnect error:', error)
      }
    }

    deviceNamePortRef.current = null
    setDeviceNameConnected(false)
    addLog('Device name port disconnected.')
  }

  const releasePortForFirmwareFlash = () => {
    const port = deviceNamePortRef.current || programPortRef.current
    if (!port) {
      return
    }

    try {
      if (typeof port.close === 'function') {
        port.close()
      }
    } catch (error) {
      console.warn('Flash release port close failed:', error)
    }

    if (deviceNamePortRef.current === port) {
      deviceNamePortRef.current = null
      setDeviceNameConnected(false)
    }

    if (programPortRef.current === port) {
      programPortRef.current = null
      setProgramConnected(false)
    }

    addLog(`Released COM port before firmware flash: ${port.path || port.port || 'unknown'}`)
  }

  const connectSerialPort = async ({ portPath, kind }) => {
    addLog(`Attempting to connect ${kind} port: ${portPath || '<none>'}`)
    console.log('[serial] connectSerialPort called', { portPath, kind })

    if (!portPath) {
      addLog(`${kind === 'program' ? 'Program output' : 'Device name'} port is not selected.`)
      return
    }

    const SerialPort = getSerialPortModule()
    const ReadlineParser = getReadlineParser()

    if (!SerialPort || !ReadlineParser) {
      addLog('Electron is not running with Node access enabled for serialport.')
      return
    }

    const existingRef = kind === 'program' ? programPortRef.current : deviceNamePortRef.current
    if (existingRef) {
      if (kind === 'program') {
        disconnectProgramPort()
      } else {
        disconnectDeviceNamePort()
      }
    }

    try {
      const port = new SerialPort({
        path: portPath,
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        autoOpen: false,
        lock: false,
        rtscts: false,
        xon: false,
        xoff: false,
        xany: false,
      })

      if (kind === 'program') {
        setCycleCount((current) => current + 1)
        setDeviceLabel(`Device ${cycleCount + 1}`)
      }

      const processIncomingData = (rawChunk) => {
        const chunkText = Buffer.isBuffer(rawChunk) ? rawChunk.toString('utf8') : String(rawChunk ?? '')
        if (!chunkText) {
          return
        }

        const bufferKey = kind === 'program' ? 'program' : 'device'
        const currentBuffer = portBuffersRef.current[bufferKey] || ''
        const combined = `${currentBuffer}${chunkText}`
        const lines = combined.split(/\r?\n/)
        const remaining = lines.pop() || ''
        portBuffersRef.current[bufferKey] = remaining

        lines.forEach((line) => {
          const value = line.trim()
          if (!value) {
            return
          }

          console.log(`[serial][${kind}][line] ${value}`)

          setLastPortActivity((current) => ({
            ...current,
            [kind]: Date.now(),
          }))
          setActivePortPath(portPath)

          updateStepFromSerialLine(value)

          if (kind === 'program') {
            setProgramOutput(value)
            addLog(`Program RX: ${value}`)
            addSerialTrace('program', value)
          } else {
            setDeviceName(value)
            addLog(`Device RX: ${value}`)
            addSerialTrace('device', value)
          }

          // Detect equipment name pattern from any incoming serial line
          const nameMatch = value.match(/([A-Za-z0-9_-]{5,}-[A-Za-z0-9]{8,})/)
          if (nameMatch) {
            const name = nameMatch[0]
            if (!capturedName || capturedName !== name) {
              setCapturedName(name)
              addLog(`Captured name: ${name}`)
              // attempt to auto-send if bench port connected
              trySendNameToBench(name)
            }
          }

          const confirmationMatch = value.match(/Nom\s+reçu\s*:\s*([A-Za-z0-9_-]{5,}-[A-Za-z0-9]{8,})/i)
          if (confirmationMatch) {
            const confirmedName = confirmationMatch[1].trim()
            nameConfirmedRef.current[confirmedName] = true
            nameSendAttemptsRef.current[confirmedName] = 3
            setNameSendStatus('confirmed')
            setCapturedName(confirmedName)
            addLog(`Bench confirmed device name: ${confirmedName}`)
          }

          const startUploadTrigger = value.match(/Veuillez\s+téléverser\s+le\s+programme\s+dans\s+la\s+carte\s+maintenant|Veuillez\s+téléverser\s+le\s+programme/i)
          if (startUploadTrigger && !uploading) {
            addLog('Bench requested firmware upload. Starting upload to cart port.')
            setTimeout(() => {
              startFirmwareUpload()
            }, 250)
          }
        })

        if (chunkText.trim()) {
          const rawValue = chunkText.trim()
          console.log(`[serial][${kind}][raw] ${rawValue}`)
          setLastPortActivity((current) => ({
            ...current,
            [kind]: Date.now(),
          }))
          setActivePortPath(portPath)
          addSerialTrace(kind, rawValue)
        }
      }

      // Prefer the Readline parser for consistent line-delimited data.
      // Use '\n' delimiter to accept both '\n' and '\r\n' terminated lines from devices.
      let parserAttached = false
      if (ReadlineParser && typeof port.pipe === 'function') {
        try {
          const parserInstance = port.pipe(new ReadlineParser({ delimiter: '\n' }))
          parserInstance.on('data', (line) => {
            console.log(`[serial][${kind}][parser data]`, line)
            processIncomingData(line)
          })
          addLog(`Using Readline parser for ${portPath}`)
          parserAttached = true
        } catch (err) {
          console.error('Parser attach failed', err)
        }
      }

      // Always attach a generic data/readable listener as a fallback so we don't miss
      // any incoming bytes if the parser isn't compatible in this environment.
      if (!parserAttached) {
        // prefer 'data' if available, otherwise 'readable'
        if (typeof port.on === 'function') {
          try {
            port.on('data', (chunk) => {
              console.log(`[serial][${kind}][data event]`, chunk)
              processIncomingData(chunk)
            })
          } catch (err) {
            // fallback to readable
            port.on('readable', () => {
              const chunk = port.read()
              if (chunk) processIncomingData(chunk)
            })
          }
        }
      }

      // Some SerialPort implementations resolve open() but may not set isOpen
      // reliably or emit 'open' synchronously. Track both the event and
      // a post-open check to ensure UI reflects actual connection state.
      let openedSignalled = false
      port.on('open', () => {
        openedSignalled = true
        if (kind === 'program') {
          setProgramConnected(true)
        } else {
          setDeviceNameConnected(true)
        }
        addLog(`Connected to ${portPath} (open event)`)
        addSerialTrace(kind, `--- OPENED ${portPath} ---`)
      })

      port.on('error', (error) => {
        addLog(`Port error for ${portPath}: ${error.message}`)
        addSerialTrace(kind, `--- ERROR ${error.message}`)
        if (kind === 'program') {
          setProgramConnected(false)
        } else {
          setDeviceNameConnected(false)
        }
      })

      port.on('close', () => {
        if (kind === 'program') {
          setProgramConnected(false)
        } else {
          setDeviceNameConnected(false)
        }
        addLog(`Closed ${portPath}`)
        addSerialTrace(kind, `--- CLOSED ${portPath} ---`)
      })

      // Try opening the port and wait up to a short timeout for the 'open' event.
      await port.open()

      // wait briefly for the 'open' event to fire; fallback to checking port.isOpen
      await new Promise((resolve) => {
        const timer = setTimeout(() => resolve(), 150)
        if (openedSignalled) {
          clearTimeout(timer)
          return resolve()
        }
        // If open event arrives later, resolve then
        port.once('open', () => {
          clearTimeout(timer)
          resolve()
        })
      })

      try {
        // Some SerialPort variants expose `isOpen` or `open` property; test both
        const actuallyOpen = !!port.isOpen || !!port.open || openedSignalled
        if (kind === 'program') {
          programPortRef.current = port
          setProgramConnected(Boolean(actuallyOpen))
        } else {
          deviceNamePortRef.current = port
          setDeviceNameConnected(Boolean(actuallyOpen))
        }

        addLog(`Opened port ${portPath} (post-open check). isOpen=${!!port.isOpen} openedSignalled=${openedSignalled}`)
        console.log('[serial] opened', kind, portPath, 'isOpen=', !!port.isOpen, 'openedSignalled=', openedSignalled)
      } catch (err) {
        addLog(`Post-open handling failed for ${portPath}: ${err.message}`)
        console.error('Post-open handling error', err)
      }
    } catch (error) {
      addLog(`Unable to open ${kind === 'program' ? 'program output' : 'device name'} port: ${error.message}`)
      console.error('[serial] open error', error)
      if (kind === 'program') {
        setProgramConnected(false)
      } else {
        setDeviceNameConnected(false)
      }
    }
  }

  // selection handlers — only change selection, connection occurs on explicit button click
  const handleProgramSelect = (event) => setProgramPortPath(event.target.value)
  const handleDeviceSelect = (event) => setDeviceNamePortPath(event.target.value)

  const sendMessage = () => {
    if (!bothConnected) {
      addLog('Connect BOTH serial ports before sending data.')
      return
    }

    const targetPort = programPortRef.current || deviceNamePortRef.current
    if (!targetPort) {
      addLog('No writable port available.')
      return
    }

    const payload = `${message}\n`
    targetPort.write(payload, (error) => {
      if (error) {
        addLog(`Write failed: ${error.message}`)
        return
      }

      addLog(`TX: ${message}`)
    })
  }

  const sendCapturedName = () => {
    if (!capturedName) {
      addLog('No captured name to send.')
      return
    }

    if (!programConnected || !programPortRef.current) {
      addLog('Bench port is not connected. Connect bench port to send the name.')
      setNameSendStatus('not-sent')
      return
    }

    // sanitize captured name: remove whitespace and ensure pattern exactly NAME-HEX
    const sanitized = (capturedName || '').trim().match(/([A-Za-z0-9_-]{5,}-[A-Za-z0-9]{8,})/)
    const toSend = sanitized ? sanitized[0] : capturedName
    trySendNameToBench(toSend)
  }

  const startFirmwareUpload = useCallback(async () => {
    const targetPort = deviceNamePortRef.current || programPortRef.current
    if (!targetPort) {
      addLog('No serial port is connected for the firmware upload.')
      showToast('Connect a port first')
      return
    }

    if (uploading) {
      addLog('Firmware upload is already in progress.')
      return
    }

    stopUploadProgressFallback()
    setUploading(true)
    setUploadStatus('uploading')
    setUploadProgress(0)
    setUploadMessage('Téléversement en cours...')
    setLastResult('Téléversement en cours')
    startUploadProgressFallback()

    setSteps((current) => current.map((step) => step.id === 'televersement'
      ? { ...step, status: 'pending', message: 'Téléversement en cours...', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) }
      : step,
    ))

    try {
      releasePortForFirmwareFlash()

      const portPath = targetPort?.path || targetPort?.port || deviceNamePortPath || programPortPath
      const fs = getNodeFs()
      const path = getNodePath()

      if (!fs || !path) {
        throw new Error('Node filesystem is not available for the ESP32 flash command.')
      }

      const flashFiles = [
        { address: '0x1000', path: resolveLocalBinPath('src/components/bin/CF-COVER-5.ino.bootloader.bin') },
        { address: '0x8000', path: resolveLocalBinPath('src/components/bin/CF-COVER-5.ino.partitions.bin') },
        { address: '0xe000', path: resolveLocalBinPath('src/components/bin/boot_app0.bin') },
        { address: '0x10000', path: resolveLocalBinPath('src/components/bin/CF-COVER-5.ino.bin') },
      ]

      flashFiles.forEach((file) => {
        if (!fs.existsSync(file.path)) {
          throw new Error(`Missing firmware file for upload: ${file.path}`)
        }
      })

      const flashCommand = buildEspToolFlashCommand(portPath, flashFiles)
      const flashCommandText = flashCommand.join(' ')
      addLog(`Flashing via ESP32 esptool: ${flashCommandText}`)

      const flashProcess = runEspToolCommand(flashCommand, {
        cwd: process.cwd(),
        onStdout: (text) => {
          const cleanText = text.toString().trim()
          if (!cleanText) {
            return
          }
          addLog(`esptool flash: ${cleanText}`)

          const percentMatch = cleanText.match(/(\d{1,3})%/)
          if (percentMatch) {
            const nextPercent = Math.min(100, Number(percentMatch[1]))
            setUploadProgress(nextPercent)
            setUploadMessage(`Téléversement en cours: ${nextPercent}%`)
            setLastResult(`Téléversement ${nextPercent}%`)
            setSteps((current) => current.map((step) => step.id === 'televersement'
              ? {
                  ...step,
                  status: 'pending',
                  message: `Téléversement ${nextPercent}%`,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
                }
              : step,
            ))
          } else if (/Writing at|Erasing|Compressed|Hash of data/i.test(cleanText)) {
            setUploadMessage('Téléversement en cours...')
            setSteps((current) => current.map((step) => step.id === 'televersement'
              ? {
                  ...step,
                  status: 'pending',
                  message: 'Téléversement en cours...',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
                }
              : step,
            ))
          }
        },
        onStderr: (text) => {
          const cleanText = text.toString().trim()
          if (!cleanText) {
            return
          }
          addLog(`esptool flash stderr: ${cleanText}`)
        },
      })

      if (!flashProcess) {
        throw new Error('esptool flash process could not be started.')
      }

      await new Promise((resolve, reject) => {
        flashProcess.on('error', reject)
        flashProcess.on('close', (code) => {
          if (code === 0) {
            stopUploadProgressFallback()
            setUploadProgress(100)
            setUploadStatus('complete')
            setUploadMessage('🟢 Reconnecter le COM de la cart + Appuyer sur START')
            setLastResult('Téléversement complet (100%)')
            setSteps((current) => current.map((step) => step.id === 'televersement'
              ? {
                  ...step,
                  status: 'passed',
                  message: '🟢 Reconnecter le COM de la cart + Appuyer sur START',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
                }
              : step,
            ))
            addLog('Téléversement complet (100%) — 🟢 Reconnecter le COM de la cart + Appuyer sur START')
            showToast('🟢 Reconnecter le COM de la cart + Appuyer sur START')

            const cartPortPath = deviceNamePortPath || targetPort?.path || targetPort?.port
            if (cartPortPath) {
              setTimeout(() => {
                try {
                  connectSerialPort({ portPath: cartPortPath, kind: 'device' })
                  addLog(`Reconnected CF carte port automatically after firmware upload: ${cartPortPath}`)
                } catch (error) {
                  addLog(`Auto-reconnect after firmware upload failed: ${error.message}`)
                }
              }, 600)
            }

            resolve()
            return
          }

          reject(new Error(`esptool flash failed with code ${code}`))
        })
      })
    } catch (error) {
      const message = error?.message || 'Téléversement échoué'
      setUploadStatus('error')
      setUploadMessage(message)
      setLastResult(message)
      setSteps((current) => current.map((step) => step.id === 'televersement'
        ? {
            ...step,
            status: 'failed',
            message: message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
          }
        : step,
      ))
      addLog(`Firmware upload failed: ${message}`)
      showToast('Téléversement échoué')
    } finally {
      stopUploadProgressFallback()
      setUploading(false)
    }
  }, [addLog, buildEspToolFlashCommand, programPortPath, deviceNamePortPath, showToast, uploading])

  const uploadProgressWidth = `${Math.min(100, Math.max(0, uploadProgress))}%`
  const passedCount = steps.filter((step) => step.status === 'passed').length
  const failedCount = steps.filter((step) => step.status === 'failed').length
  const pendingCount = steps.filter((step) => step.status === 'pending').length
  const overallStatus = failedCount > 0 ? 'Failed' : pendingCount === steps.length ? 'Idle' : 'Passed'
  const visibleTrace = serialTrace.filter((entry) => traceFilter === 'both' || entry.portType === traceFilter)

  return (
    <section className="serial-port-panel">
      <div className="serial-header">
        <div>
          <p className="eyebrow">Device console</p>
          <h1>Serial Port Integration</h1>
        </div>
        <div className="header-right">
          <span className="meta-badge">Cycle {cycleCount}</span>
          <span className={`status ${bothConnected ? 'online' : programConnected || deviceNameConnected ? 'partial' : 'offline'}`}>
            {bothConnected ? 'Connected' : programConnected || deviceNameConnected ? 'Partially connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className={`result-banner result-banner--${overallStatus.toLowerCase()}`}>
        <span className="result-label">Overall result</span>
        <strong>{overallStatus}</strong>
      </div>

      <div className="summary-grid">
        <div className="summary-card summary-card--primary">
          <span className="summary-label">Current device</span>
          <strong>{deviceLabel}</strong>
        </div>
        <div className="summary-card summary-card--success">
          <span className="summary-label">Passed</span>
          <strong>{passedCount}</strong>
        </div>
        <div className="summary-card summary-card--danger">
          <span className="summary-label">Failed</span>
          <strong>{failedCount}</strong>
        </div>
      </div>

      <div className="summary-grid summary-grid--bottom">
        <div className="summary-card summary-card--warning">
          <span className="summary-label">Pending</span>
          <strong>{pendingCount}</strong>
        </div>
        <div className="summary-card summary-card--neutral">
          <span className="summary-label">Cycle</span>
          <strong>{cycleCount}</strong>
        </div>
        <div className="summary-card summary-card--neutral">
          <span className="summary-label">Last result</span>
          <strong>{lastResult}</strong>
        </div>
      </div>

      <div className="toolbar toolbar--group">
        <div className="toolbar-section">
          <label className="field">
            <span>Test bench port</span>
            <select value={programPortPath} onChange={handleProgramSelect}>
              <option value="">Select a port</option>
              {ports.map((port) => (
                <option key={port.path} value={port.path} disabled={port.path === deviceNamePortPath}>
                  {port.path} {port.manufacturer ? `- ${port.manufacturer}` : ''}
                </option>
              ))}
            </select>
            {programPortPath ? <small className="selected-port">Selected: {programPortPath}</small> : null}
            <small className={`port-status ${programConnected ? 'online' : 'offline'}`}>{programConnected ? 'Connected' : 'Disconnected'}</small>
          </label>

          <div className="button-row">
            <button type="button" onClick={() => connectSerialPort({ portPath: programPortPath, kind: 'program' })} disabled={!programPortPath}>
              Connect test bench port
            </button>
            <button type="button" className="secondary" onClick={disconnectProgramPort} disabled={!programPortRef.current}>
              Disconnect
            </button>
          </div>
        </div>

        <div className="toolbar-section">
          <label className="field">
            <span>CF carte port</span>
            <select value={deviceNamePortPath} onChange={handleDeviceSelect}>
              <option value="">Select a port</option>
              {ports.map((port) => (
                <option key={`${port.path}-device`} value={port.path} disabled={port.path === programPortPath}>
                  {port.path} {port.manufacturer ? `- ${port.manufacturer}` : ''}
                </option>
              ))}
            </select>
            {deviceNamePortPath ? <small className="selected-port">Selected: {deviceNamePortPath}</small> : null}
            <small className={`port-status ${deviceNameConnected ? 'online' : 'offline'}`}>{deviceNameConnected ? 'Connected' : 'Disconnected'}</small>
          </label>

          <div className="button-row">
            <button type="button" onClick={() => connectSerialPort({ portPath: deviceNamePortPath, kind: 'device' })} disabled={!deviceNamePortPath}>
              Connect CF carte port
            </button>
            <button type="button" className="secondary" onClick={disconnectDeviceNamePort} disabled={!deviceNamePortRef.current}>
              Disconnect
            </button>
          </div>
        </div>

        <div className="toolbar-section toolbar--actions">
          <div className="button-row">
            <button type="button" onClick={startFirmwareUpload} disabled={uploading || !deviceNamePortRef.current && !programPortRef.current}>
              {uploading ? `Téléversement ${uploadProgress}%` : 'Téléverser programme'}
            </button>
            <button type="button" className="secondary" onClick={() => refreshPorts(true)}>
              Refresh ports
            </button>
            <button type="button" className="secondary" onClick={resetCurrentDevice}>
              Reset trace & steps
            </button>
            <button type="button" className="secondary" onClick={resetCurrentDevice}>
              New device test
            </button>
            <button type="button" onClick={() => onViewReports && onViewReports()}>View Reports</button>
          </div>
        </div>
      </div>

      <div className="toolbar toolbar--compact" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="meta-badge">
          Active receiving port: {activePortPath || 'No traffic yet'}
        </span>
        <div style={{ minWidth: 240, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#dfe7ef' }}>
            <strong>Firmware upload</strong>
            <span>{uploadStatus === 'complete' ? '100%' : `${uploadProgress}%`}</span>
          </div>
          <div style={{ width: '100%', height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: uploadProgressWidth, height: '100%', background: 'linear-gradient(90deg, #22c55e, #0ea5e9)', borderRadius: 999, transition: 'width 0.2s ease' }} />
          </div>
          <small style={{ color: uploadStatus === 'complete' ? '#a6f6bf' : '#dfe7ef' }}>
            {uploadMessage}
          </small>
          <small style={{ color: uploadStatus === 'uploading' ? '#7dd3fc' : uploadStatus === 'complete' ? '#a6f6bf' : '#dfe7ef' }}>
            {uploadStatus === 'uploading' ? 'Auto-upload triggered by bench message' : uploadStatus === 'complete' ? 'Upload finished successfully' : uploadStatus === 'error' ? 'Upload failed' : 'Waiting for bench upload request'}
          </small>
        </div>
      </div>

      {runtimeErrors.length > 0 ? (
        <div className="runtime-error-panel" style={{ marginBottom: 16 }}>
          <div className="runtime-error-header">
            <span className="runtime-error-icon" aria-label="warning">⚠</span>
            <h2>Errors</h2>
          </div>
          <div className="runtime-error-list">
            {runtimeErrors.map((entry) => (
              <div key={entry.id} className="runtime-error-item">
                <div className="runtime-error-item__content">
                  <span className="runtime-error-time">{entry.timestamp}</span>
                  <p>{entry.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="readout" style={{ marginBottom: 18 }}>
        <h2>Steps</h2>
        <div className="steps-list">
          {steps.length === 0 ? (
            <p className="empty">No test steps detected yet.</p>
          ) : (
            steps.map((step, index) => (
              <div key={step.id} className={`step-item ${step.status}`}>
                <div className="step-main">
                  <span className="step-index">{index + 1}</span>
                  <div className="step-text">
                    <strong>{step.title}</strong>
                    {step.id === 'moteur-volet' && step.status === 'passed' ? (
                      <small>Merci de mettre l’interrupteur de forçage sur ON (sur la carte testée). Puis appuyer sur START</small>
                    ) : step.timestamp ? (
                      <small>{step.timestamp} · {step.message}</small>
                    ) : step.message ? (
                      <small>{step.message}</small>
                    ) : null}
                  </div>
                </div>
                <span className={`status-dot ${step.status}`} aria-label={step.status} />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="trace-panel">
        <div className="trace-header">
          <h2>Serial input trace</h2>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="trace-filter-group" aria-label="Serial trace source filter">
              <button
                type="button"
                className={`secondary trace-filter-button ${traceFilter === 'program' ? 'active' : ''}`}
                onClick={() => setTraceFilter('program')}
              >
                Bench
              </button>
              <button
                type="button"
                className={`secondary trace-filter-button ${traceFilter === 'device' ? 'active' : ''}`}
                onClick={() => setTraceFilter('device')}
              >
                Cart
              </button>
              <button
                type="button"
                className={`secondary trace-filter-button ${traceFilter === 'both' ? 'active' : ''}`}
                onClick={() => setTraceFilter('both')}
              >
                Both
              </button>
            </div>
            <div style={{ color: '#9fe8ff' }}>Captured name: {capturedName || '-'}</div>
            <div style={{ color: nameSendStatus === 'sent' ? '#a6f6bf' : nameSendStatus === 'failed' ? '#ef4444' : '#d5d6d6' }}>
              Name send: {nameSendStatus}
            </div>
            <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
              <button type="button" className="secondary" onClick={scrollTraceToTop}>Top</button>
              <button type="button" className="secondary" onClick={scrollTraceToBottom}>Bottom</button>
            </div>
            <div style={{ marginLeft: 12 }} />
          </div>
        </div>
        <textarea
          ref={traceListRef}
          readOnly
          className="trace-textarea"
          style={{ height: defaultTraceHeight, width: '100%' }}
          value={visibleTrace.length > 0 ? visibleTrace.map((entry) => `${entry.timestamp} [${entry.portType === 'program' ? 'Bench' : entry.portType === 'device' ? 'CF carte' : entry.portType}] ${entry.line}`).join('\n') : 'No trace data for the selected port filter.'}
        />
      </div>

      

      <div className="command-box">
        <label className="field">
          <span>Outgoing command</span>
          <input
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="AT\r"
          />
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" onClick={sendMessage} disabled={!bothConnected}>Send</button>
          <button type="button" className="secondary" onClick={sendCapturedName} disabled={!capturedName || !programConnected}>
            Send name
          </button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="text" value={capturedName} readOnly style={{ minWidth: 220, padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.2)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.04)' }} />
            <button type="button" className="secondary" onClick={() => {
              try {
                navigator.clipboard.writeText(capturedName || '')
                addLog('Captured name copied to clipboard.')
                showToast('Name copied')
              } catch (err) {
                addLog('Copy to clipboard failed.')
                showToast('Copy failed')
              }
            }} disabled={!capturedName}>
              Copy
            </button>
          </div>
        </div>
      </div>

      <div className="log-box">
        <h2>Communication log</h2>
        <div className="log-list" ref={logListRef}>
          {logEntries.length === 0 ? (
            <p className="empty">No activity yet.</p>
          ) : (
            logEntries.map((entry, index) => (
              <div key={`${entry}-${index}`} className="log-item">
                {entry}
              </div>
            ))
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="button" className="secondary" onClick={scrollLogToTop}>Log Top</button>
          <button type="button" className="secondary" onClick={scrollLogToBottom}>Log Bottom</button>
        </div>
      </div>
      {toast ? <div className="toast">{toast}</div> : null}
    </section>
  )
}

export default SerialPortPanel
