import React from 'react'
import ReactDOM from 'react-dom/client'
// Import des styles Bootstrap uniquement
import 'bootstrap/dist/css/bootstrap.min.css'
// Thème de l'application (après Bootstrap pour pouvoir le surcharger)
import '@/shared/theme/theme.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
