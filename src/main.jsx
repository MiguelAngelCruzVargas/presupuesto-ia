import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Inicializar Sentry (solo si está configurado)
import './lib/sentry'

// Configurar handlers de errores globales
import './lib/errorHandlers'

// Utilidades de prueba en desarrollo
if (import.meta.env.DEV) {
  import('./utils/testErrorHandling.js')
}

// Prevenir problemas de seguridad con el cache del navegador (Back/Forward Cache)
// Esto asegura que al dar "Atrás" después de cerrar sesión, la página se recargue y verifique auth
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
