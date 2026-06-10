import { clearAuthSession, getAuthSession, saveAuthSession } from './sessionService'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
const DEVICE_ID_STORAGE_KEY = 'apptivity.deviceId'

let refreshPromise = null

function normalizeEnvelope(payload) {
    if (!payload || typeof payload !== 'object') {
        return {
            isSuccess: false,
            data: null,
            errors: [{ code: 'API_UNKNOWN', message: 'Unexpected response.' }],
        }
    }

    // ASP.NET Core validation/problem-details fallback
    if (!('isSuccess' in payload) && !('IsSuccess' in payload) && ('title' in payload || 'errors' in payload)) {
        const validationErrors = []

        if (payload?.errors && typeof payload.errors === 'object' && !Array.isArray(payload.errors)) {
            Object.values(payload.errors).forEach((messages) => {
                if (Array.isArray(messages)) {
                    messages.forEach((message) => {
                        if (typeof message === 'string' && message.trim()) {
                            validationErrors.push({ code: 'API_VALIDATION', message })
                        }
                    })
                }
            })
        }

        const fallbackMessage =
            typeof payload.detail === 'string' && payload.detail.trim()
                ? payload.detail
                : typeof payload.title === 'string' && payload.title.trim()
                    ? payload.title
                    : 'Request failed.'

        return {
            isSuccess: false,
            data: null,
            errors: validationErrors.length > 0 ? validationErrors : [{ code: 'API_UNKNOWN', message: fallbackMessage }],
        }
    }

    return {
        isSuccess: payload.isSuccess ?? payload.IsSuccess ?? false,
        data: payload.data ?? payload.Data ?? null,
        errors: payload.errors ?? payload.Errors ?? [],
    }
}

function getOrCreateDeviceId() {
    const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY)
    if (existing) {
        return existing
    }

    const created = typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
        })

    localStorage.setItem(DEVICE_ID_STORAGE_KEY, created)
    return created
}

function resolveLoginPath() {
    if (typeof window === 'undefined') {
        return '/admin/login'
    }

    const currentPath = window.location.pathname || ''
    if (currentPath.startsWith('/admin')) {
        return '/admin/login'
    }

    return currentPath.startsWith('/organization') ? '/login/organization' : '/login/admin'
}

function redirectToLoginIfNeeded() {
    if (typeof window === 'undefined') {
        return
    }

    const currentPath = window.location.pathname || ''
    if (!currentPath.startsWith('/login')) {
        window.location.replace(resolveLoginPath())
    }
}

async function refreshAuthTokens() {
    try {
        const session = getAuthSession()
        if (!session?.refreshToken) {
            return null
        }

        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                refreshToken: session.refreshToken,
                deviceId: getOrCreateDeviceId(),
            }),
        })

        const payload = await response.json().catch(() => null)
        const normalized = normalizeEnvelope(payload)

        if (!response.ok || !normalized.isSuccess) {
            return null
        }

        const accessToken = normalized.data?.accessToken
        const refreshToken = normalized.data?.refreshToken

        if (!accessToken || !refreshToken) {
            return null
        }

        saveAuthSession(accessToken, refreshToken)
        return { accessToken, refreshToken }
    } catch {
        return null
    }
}

export async function apiRequest(path, options = {}) {
    const {
        skipAuthRefresh = false,
        _retry = false,
        ...requestOptions
    } = options

    const headers = new Headers(requestOptions.headers || {})
    const session = getAuthSession()
    if (session?.accessToken && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${session.accessToken}`)
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...requestOptions,
        headers,
    })
    const payload = await response.json().catch(() => null)
    const normalized = normalizeEnvelope(payload)

    const isRefreshEndpoint = path.startsWith('/auth/refresh')
    const isLoginEndpoint = path.startsWith('/auth/login')
    const canTryRefresh =
        response.status === 401 &&
        !_retry &&
        !skipAuthRefresh &&
        !isRefreshEndpoint &&
        !isLoginEndpoint &&
        Boolean(session?.refreshToken)

    if (canTryRefresh) {
        if (!refreshPromise) {
            refreshPromise = refreshAuthTokens().finally(() => {
                refreshPromise = null
            })
        }

        const refreshed = await refreshPromise
        if (refreshed?.accessToken) {
            return apiRequest(path, {
                ...options,
                _retry: true,
            })
        }
    }

    if (response.status === 401) {
        clearAuthSession()
        redirectToLoginIfNeeded()
    }

    if (!response.ok || !normalized.isSuccess) {
        return {
            ...normalized,
            isSuccess: false,
            errors: normalized.errors.length > 0
                ? normalized.errors
                : [{ code: 'API_UNKNOWN', message: 'Request failed.' }],
        }
    }

    return normalized
}
