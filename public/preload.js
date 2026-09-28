import { SerialPort } from 'serialport'
import Readline from '@serialport/parser-readline'

window.addEventListener('DOMContentLoaded', () => {
  window.electronAPI = {
    isElectron: true,
    SerialPort,
    Readline,
    listSerialPorts: async () => SerialPort.list(),
  }
})
