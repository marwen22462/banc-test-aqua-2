import { useState } from 'react'
import SerialPortPanel from './components/SerialPortPanel'
import ReportsTable from './components/ReportsTable'
import './App.css'

function App() {
  const [view, setView] = useState('panel')

  return view === 'panel' ? (
    <SerialPortPanel onViewReports={() => setView('reports')} />
  ) : (
    <ReportsTable onBack={() => setView('panel')} />
  )
}

export default App
