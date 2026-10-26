import { Navigate } from 'react-router-dom'
import { paths } from '../../../shared/constants/paths'

export function RegisterPage() {
  return <Navigate to={paths.startCompany} replace />
}
