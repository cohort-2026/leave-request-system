export class ApiError extends Error {
  status: number
  fieldErrors: Record<string, string>

  constructor(
    message: string,
    status: number,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

type ApiErrorBody = {
  message?: unknown
  error?: unknown
  errors?: unknown
}

function getFieldErrors(errors: unknown): Record<string, string> {
  if (Array.isArray(errors)) {
    return Object.fromEntries(
      errors.flatMap((item) => {
        if (!item || typeof item !== 'object') return []

        const field =
          'field' in item ? item.field : 'path' in item ? item.path : null

        const message =
          'message' in item ? item.message : 'msg' in item ? item.msg : null

        return typeof field === 'string' && typeof message === 'string'
          ? [[field, message]]
          : []
      }),
    )
  }

  if (!errors || typeof errors !== 'object') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(errors).flatMap(([field, value]) => {
      if (typeof value === 'string') return [[field, value]]

      if (Array.isArray(value) && typeof value[0] === 'string') {
        return [[field, value[0]]]
      }

      return []
    }),
  )
}

async function parseError(response: Response) {
  let body: ApiErrorBody = {}

  try {
    body = (await response.json()) as ApiErrorBody
  } catch {
    // Keep the status-based fallback below.
  }

  const message =
    typeof body.message === 'string'
      ? body.message
      : typeof body.error === 'string'
        ? body.error
        : 'Something went wrong. Please try again.'

  return new ApiError(
    message,
    response.status,
    getFieldErrors(body.errors),
  )
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (!response.ok) {
    throw await parseError(response)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

