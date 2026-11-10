import type { Session } from '../../shared/types/session'
import { apiRequest } from '../../services/api'

type ServerUser = {
  id?: number
  email?: string
  displayName?: string
  name?: string
  role: Session['role']
  status?: Session['status']
  companyId?: number | null
  companyName?: string | null
}

function companyIdFrom(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : null
}

export type TotpEnrollmentChallenge = {
  totpEnrollmentRequired: true
  otpauthUrl: string
  secret: string
  qrSvg: string
  totpReset?: true
}

export type TotpLoginChallenge = {
  totpRequired: true
}

export type LoginAccountOption = {
  id: number
  companyName: string | null
  role: Session['role']
}

export type LoginResult =
  | TotpEnrollmentChallenge
  | TotpLoginChallenge
  | { accountSelectionRequired: true; accounts: LoginAccountOption[] }

export type EnrollResult = Session & { recoveryCodes: string[] }

function mapSession(user: ServerUser): Session {
  return {
    id: user.id ?? 0,
    email: user.email ?? '',
    displayName: user.displayName ?? user.name ?? user.email ?? '',
    role: user.role,
    status: user.status ?? 'active',
    companyId: companyIdFrom(user.companyId),
    companyName: user.companyName ?? null,
  }
}

export function getMe() {
  return apiRequest<ServerUser>('/api/auth/me').then(mapSession)
}

export function login(email: string, password: string, accountId?: number) {
  return apiRequest<LoginResult>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, ...(accountId ? { accountId } : {}) }),
  })
}

export function startCompanySso(identifier: string) {
  return apiRequest<{ authorizationUrl: string }>('/api/auth/sso/start', {
    method: 'POST',
    body: JSON.stringify({ identifier }),
  })
}

export function confirmTotpEnroll(email: string, code: string) {
  return apiRequest<ServerUser & { recoveryCodes?: string[] }>(
    '/api/auth/login/totp/enroll',
    {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    },
  ).then((user) => ({
    ...mapSession(user),
    recoveryCodes: Array.isArray(user.recoveryCodes) ? user.recoveryCodes : [],
  }))
}

export function verifyTotpLogin(email: string, code: string) {
  return apiRequest<ServerUser>('/api/auth/login/totp', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  }).then(mapSession)
}

export function verifyTotpRecovery(email: string, recoveryCode: string) {
  return apiRequest<TotpEnrollmentChallenge>('/api/auth/login/totp', {
    method: 'POST',
    body: JSON.stringify({ email, recoveryCode }),
  })
}

export function register(email: string, password: string) {
  return apiRequest<void>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function onboard(
  token: string,
  email: string,
  password: string,
  displayName: string,
) {
  return apiRequest<ServerUser>('/api/auth/onboard', {
    method: 'POST',
    body: JSON.stringify({ token, email, password, displayName }),
  })
}

export type SignupCheckout = {
  checkoutToken: string
  email: string
  companyName: string
  plan: {
    code: string
    name: string
    seatLimit: number
  }
  amountCents: number
  vatCents: number
  totalCents: number
  currency: string
  amountLabel: string
  vatLabel: string
  totalLabel: string
  expiresAt: string
}

const SIGNUP_CHECKOUT_KEY = 'lrs_signup_checkout'

export function storeSignupCheckout(checkout: SignupCheckout) {
  sessionStorage.setItem(SIGNUP_CHECKOUT_KEY, JSON.stringify(checkout))
}

export function readSignupCheckout(): SignupCheckout | null {
  const raw = sessionStorage.getItem(SIGNUP_CHECKOUT_KEY)
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as SignupCheckout
    if (!parsed.checkoutToken || !parsed.email) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearSignupCheckout() {
  sessionStorage.removeItem(SIGNUP_CHECKOUT_KEY)
}

export function startCompanyCheckout(
  companyName: string,
  displayName: string,
  email: string,
  password: string,
  planCode: string,
) {
  return apiRequest<SignupCheckout>('/api/companies/signup', {
    method: 'POST',
    body: JSON.stringify({
      companyName,
      displayName,
      email,
      password,
      planCode,
    }),
  })
}

export function mockPayCompanySignup(token: string) {
  return apiRequest<{
    id: number
    email: string
    displayName: string
    role: Session['role']
    status: Session['status']
    companyName: string
    company: {
      id: number
      name: string
      slug: string
      trialEndsAt: string | null
    }
  }>('/api/companies/signup/mock-pay', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export function logout() {
  return apiRequest<void>('/api/auth/logout', {
    method: 'POST',
  })
}

export function verifyEmail(token: string) {
  return apiRequest<{ ok: true }>('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export function resendVerification(email: string) {
  return apiRequest<{ ok: true; message?: string }>(
    '/api/auth/resend-verification',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
  )
}

export function forgotPassword(email: string) {
  return apiRequest<{ ok: true; message?: string }>(
    '/api/auth/forgot-password',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
  )
}

export function resetPassword(token: string, password: string) {
  return apiRequest<{ ok: true }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}

export function updateMe(displayName: string) {
  return apiRequest<ServerUser>('/api/auth/me', {
    method: 'PATCH',
    body: JSON.stringify({ displayName }),
  }).then(mapSession)
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiRequest<{ ok: true }>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export function requestTotpReset() {
  return apiRequest<{ ok: true; message?: string }>(
    '/api/auth/totp/reset-request',
    { method: 'POST' },
  )
}

export function confirmTotpReset(token: string) {
  return apiRequest<TotpEnrollmentChallenge | { ok: true; totpReset: true }>(
    '/api/auth/totp/reset-confirm',
    {
      method: 'POST',
      body: JSON.stringify({ token }),
    },
  )
}

export function getTotpEnrollment() {
  return apiRequest<TotpEnrollmentChallenge>('/api/auth/totp/enrollment')
}

export function isTotpEnrollment(
  value: TotpEnrollmentChallenge | { ok: true; totpReset: true },
): value is TotpEnrollmentChallenge {
  return 'totpEnrollmentRequired' in value && value.totpEnrollmentRequired
}

export function confirmSignedInTotpEnroll(code: string) {
  return apiRequest<ServerUser & { recoveryCodes?: string[] }>(
    '/api/auth/totp/enroll',
    {
      method: 'POST',
      body: JSON.stringify({ code }),
    },
  ).then((user) => ({
    ...mapSession(user),
    recoveryCodes: Array.isArray(user.recoveryCodes) ? user.recoveryCodes : [],
  }))
}
