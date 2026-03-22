import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './hooks/useAuth'
import { ContactsProvider } from './hooks/useContacts'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ContactsProvider>
          <App />
        </ContactsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
