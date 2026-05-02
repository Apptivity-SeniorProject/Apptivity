import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './i18n/index.js'
import './styles/global.css'
import './styles/utilities.css'
import './styles/components.css'
import { MainRoutes } from './router/index.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={null}>
        <MainRoutes />
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)

