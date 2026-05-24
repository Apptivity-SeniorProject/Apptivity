import { apiRequest } from './apiClient'

export async function getActiveTags() {
    return apiRequest('/tags', {
        method: 'GET',
    })
}

export async function createTag(payload) {
    return apiRequest('/admin/tags', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })
}

export async function updateTag(id, payload) {
    return apiRequest(`/admin/tags/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })
}

export async function deleteTag(id) {
    return apiRequest(`/admin/tags/${id}`, {
        method: 'DELETE',
    })
}
