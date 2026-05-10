import { apiRequest } from './apiClient'

export async function getMyProfile() {
    return apiRequest('/profiles/me', {
        method: 'GET',
    })
}

export async function updateMyProfile(payload) {
    return apiRequest('/profiles/me', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })
}

export async function uploadMyProfilePhoto(file) {
    const formData = new FormData()
    formData.append('file', file)

    return apiRequest('/images/profile-photo', {
        method: 'POST',
        body: formData,
    })
}

export async function setMyInterests(tagIds) {
    return apiRequest('/profiles/me/interests', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            tagIds,
        }),
    })
}

export async function getProfileEvents(accountId, { pageNumber = 1, pageSize = 20 } = {}) {
    const normalizedAccountId = String(accountId || '').trim()
    if (!normalizedAccountId) {
        return {
            isSuccess: false,
            data: null,
            errors: [{ code: 'VAL_001', message: 'Account id is required.' }],
        }
    }

    const query = new URLSearchParams({
        pageNumber: String(pageNumber),
        pageSize: String(pageSize),
    })

    return apiRequest(`/profiles/${normalizedAccountId}/events?${query.toString()}`, {
        method: 'GET',
    })
}

export async function getMyProfileEvents({ pageNumber = 1, pageSize = 200 } = {}) {
    const profileResult = await getMyProfile()
    if (!profileResult.isSuccess) {
        return profileResult
    }

    const profile = profileResult.data || {}
    const accountId = profile.accountId || profile.AccountId
    return getProfileEvents(accountId, { pageNumber, pageSize })
}

export async function getEventDetails(eventId) {
    return apiRequest(`/events/${eventId}`, {
        method: 'GET',
    })
}

export async function getEventParticipants(eventId) {
    return apiRequest(`/events/${eventId}/participants`, {
        method: 'GET',
    })
}

export async function updateEventParticipationStatus(eventId, userId, { status, rejectionReason = null }) {
    return apiRequest(`/events/${eventId}/participants/${userId}/status`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            status,
            rejectionReason,
        }),
    })
}
