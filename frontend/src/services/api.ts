/**
 * Thin fetch wrapper for the Laravel API (same-origin via the Vite proxy).
 * Uses Sanctum's cookie-based SPA auth: no tokens are stored in localStorage.
 */

export class ApiError extends Error {
  status: number
  errors: Record<string, string[]>

  constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
    super(message)
    this.status = status
    this.errors = errors
  }

  /** First validation message for a field, if any. */
  field(name: string): string | undefined {
    return this.errors[name]?.[0]
  }
}

const BASE = '/api/v1'
let csrfReady: Promise<void> | null = null

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

function ensureCsrf(): Promise<void> {
  if (readCookie('XSRF-TOKEN')) return Promise.resolve()
  csrfReady ??= fetch('/sanctum/csrf-cookie', { credentials: 'include' }).then(() => undefined)
  return csrfReady
}

type Options = { method?: string; body?: unknown; signal?: AbortSignal }

export async function api<T>(path: string, { method = 'GET', body, signal }: Options = {}): Promise<T> {
  const mutating = method !== 'GET'
  if (mutating) await ensureCsrf()

  const headers: Record<string, string> = { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
  const xsrf = readCookie('XSRF-TOKEN')
  if (xsrf) headers['X-XSRF-TOKEN'] = xsrf
  const isForm = body instanceof FormData
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

  const res = await fetch(BASE + path, {
    method,
    headers,
    credentials: 'include',
    signal,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  })

  if (res.status === 419 && mutating) {
    // CSRF token expired — refresh once and retry.
    csrfReady = null
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/'
    await ensureCsrf()
    return api<T>(path, { method, body, signal })
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    const message = data?.message && !String(data.message).startsWith('Server Error') ? data.message : 'Something went wrong. Please try again.'
    throw new ApiError(res.status, message, data?.errors ?? {})
  }
  return data as T
}

export const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const s = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== false) s.set(k, String(v))
  })
  const str = s.toString()
  return str ? `?${str}` : ''
}
