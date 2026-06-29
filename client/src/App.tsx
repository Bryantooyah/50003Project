import { useState, useEffect } from 'react'

function App() {
  const [status, setStatus] = useState<string>('checking...')

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setStatus(data.status))
      .catch(() => setStatus('offline'))
  }, [])

  return (
    <div>
      <h1>App</h1>
      <p>API status: {status}</p>
    </div>
  )
}

export default App
