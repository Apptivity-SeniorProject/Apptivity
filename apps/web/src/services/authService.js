import { apiRequest } from './apiClient'

const LOGIN_PATH = '/auth/login'
const DEVICE_ID_STORAGE_KEY = 'apptivity.deviceId'

export function getOrCreateDeviceId() {
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

export async function loginWithPassword({ identifier, password, deviceId }) {
    return apiRequest(LOGIN_PATH, {
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
}
