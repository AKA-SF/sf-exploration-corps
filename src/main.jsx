import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { LogProvider } from './context/LogContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LogProvider>
      <BrowserRouter>
        <div className="mobile-container">
          <App />
        </div>
      </BrowserRouter>
    </LogProvider>
  </React.StrictMode>,
)
