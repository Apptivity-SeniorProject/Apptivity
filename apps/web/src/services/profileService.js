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
