import { apiRequest } from './apiClient'

export async function getActiveTags() {
    return apiRequest('/tags', {
        method: 'GET',
    })
}
