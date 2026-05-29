import { apiRequest } from './apiClient'

export async function createEvent(payload) {
    return apiRequest('/events', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })
}

export async function uploadEventBanner(eventId, file) {
    const formData = new FormData()
    formData.append('file', file)

    return apiRequest(`/images/events/${eventId}/banner`, {
        method: 'POST',
        body: formData,
    })
}
