import { apiRequest } from './apiClient'

const EVENT_STATUS_VALUES = {
    Draft: 1,
    Published: 2,
    Ongoing: 3,
    Completed: 4,
    Cancelled: 5,
    PendingApproval: 6,
    Rejected: 7,
}

function resolveEventStatusValue(status) {
    if (typeof status === 'number' && Number.isFinite(status)) {
        return status
    }

    if (typeof status === 'string' && Object.prototype.hasOwnProperty.call(EVENT_STATUS_VALUES, status)) {
        return EVENT_STATUS_VALUES[status]
    }

    return status
}

export async function getAdminEvents({ status, pageNumber = 1, pageSize = 20 }) {
    const query = new URLSearchParams()
    query.set('pageNumber', String(pageNumber))
    query.set('pageSize', String(pageSize))

    if (status) {
        query.set('status', status)
    }

    return apiRequest(`/admin/events?${query.toString()}`, {
        method: 'GET',
    })
}

export async function getAdminAccounts({ status, pageNumber = 1, pageSize = 20 }) {
    const query = new URLSearchParams()
    query.set('pageNumber', String(pageNumber))
    query.set('pageSize', String(pageSize))

    if (status) {
        query.set('status', status)
    }

    return apiRequest(`/admin/accounts?${query.toString()}`, {
        method: 'GET',
    })
}

export async function getProfileById(accountId) {
    return apiRequest(`/profiles/${accountId}`, {
        method: 'GET',
    })
}

export async function updateAdminAccountStatus(accountId, status) {
    return apiRequest(`/admin/accounts/${accountId}/status`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
    })
}

export async function getEventDetails(eventId) {
    return apiRequest(`/events/${eventId}`, {
        method: 'GET',
    })
}

export async function updateEventStatus(eventId, status) {
    return apiRequest(`/events/${eventId}/status`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: resolveEventStatusValue(status) }),
    })
}
