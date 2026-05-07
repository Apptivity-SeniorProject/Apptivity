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
