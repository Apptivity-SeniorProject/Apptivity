const AUTH_STORAGE_KEY = 'apptivity.auth'
const roleClaimType = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'

function decodeJwtPayload(token) {
    try {
        const payload = token.split('.')[1]
        if (!payload) {
            return null
        }

        const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
        const padding = '='.repeat((4 - (normalizedPayload.length % 4)) % 4)
        return JSON.parse(atob(normalizedPayload + padding))
    } catch {
        return null
    }
}

export function extractRoleFromAccessToken(accessToken) {
    const payload = decodeJwtPayload(accessToken)
    const rawRole = payload?.role || payload?.[roleClaimType] || ''
    return String(rawRole).toLowerCase()
}

export function saveAuthSession(accessToken, refreshToken) {
    const role = extractRoleFromAccessToken(accessToken)
    localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
            accessToken,
            refreshToken,
            role,
        }),
    )
    return role
}

export function clearAuthSession() {
    localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function getAuthSession() {
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY)
        if (!raw) {
            return null
        }

        const parsed = JSON.parse(raw)
        if (!parsed?.accessToken || !parsed?.refreshToken) {
            return null
        }

        return parsed
    } catch {
        return null
    }
}
