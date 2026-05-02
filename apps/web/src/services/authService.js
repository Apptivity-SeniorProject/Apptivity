const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
const LOGIN_ENDPOINT = `${API_BASE_URL}/auth/login`
const DEVICE_ID_STORAGE_KEY = 'apptivity.deviceId'

function normalizeEnvelope(payload) {
    if (!payload || typeof payload !== 'object') {
        return {
            isSuccess: false,
            data: null,
            errors: [{ code: 'AUTH_UNKNOWN', message: 'Unexpected response.' }],
        }
    }

    return {
        isSuccess: payload.isSuccess ?? payload.IsSuccess ?? false,
        data: payload.data ?? payload.Data ?? null,
        errors: payload.errors ?? payload.Errors ?? [],
    }
}

export function getOrCreateDeviceId() {
    const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY)
    if (existing) {
        return existing
    }

    const created = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, created)
    return created
}

export async function loginWithPassword({ identifier, password, deviceId }) {
    const response = await fetch(LOGIN_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            identifier,
            password,
            deviceId,
        }),
    })

    const payload = await response.json().catch(() => null)

    const normalized = normalizeEnvelope(payload)

    if (!response.ok || !normalized.isSuccess) {
        return {
            ...normalized,
            isSuccess: false,
            errors: normalized.errors.length > 0
                ? normalized.errors
                : [{ code: 'AUTH_UNKNOWN', message: 'Login request failed.' }],
        }
    }

    return normalized
}
