import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './app/providers/AuthProvider'
import { CompanyBrandProvider } from './app/providers/CompanyBrandProvider'
import { router } from './app/routes/router'
import { Toaster } from './components/ui/sonner'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <CompanyBrandProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" />
      </CompanyBrandProvider>
    </AuthProvider>
  </StrictMode>,
)
