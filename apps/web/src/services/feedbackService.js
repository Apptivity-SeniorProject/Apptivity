import { apiRequest } from './apiClient'

export async function submitFeedback(payload) {
    return apiRequest('/feedback', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })
}

export async function getAdminFeedback({ pageNumber = 1, pageSize = 20 } = {}) {
    const query = new URLSearchParams()
    query.set('pageNumber', String(pageNumber))
    query.set('pageSize', String(pageSize))

    return apiRequest(`/admin/feedback?${query.toString()}`, {
        method: 'GET',
    })
}
