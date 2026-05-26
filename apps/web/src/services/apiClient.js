import { getAuthSession } from './sessionService'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

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

export async function apiRequest(path, options = {}) {
    const headers = new Headers(options.headers || {})
    const session = getAuthSession()
    if (session?.accessToken && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${session.accessToken}`)
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
    })
    const payload = await response.json().catch(() => null)
    const normalized = normalizeEnvelope(payload)

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
