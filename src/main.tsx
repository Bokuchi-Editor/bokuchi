// Configure Monaco to use the locally bundled instance (no CDN) before anything
// renders the editor. Must run before <Editor> first mounts.
import './setupMonaco'
import React from 'react'
import ReactDOM from 'react-dom/client'
import AppDesktop from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppDesktop />
  </React.StrictMode>,
)
