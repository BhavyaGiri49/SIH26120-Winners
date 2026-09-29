import { useEffect } from 'react'
import AppShell from './components/layout/AppShell'
import { connectSocket, disconnectSocket } from './lib/ws'

export default function App() {
  useEffect(() => {
    connectSocket()
    return () => disconnectSocket()
  }, [])

  return <AppShell />
}
