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

const ACCOUNT_STATUS_VALUES = {
    Active: 1,
    Suspended: 2,
    Deactivated: 3,
    Banned: 4,
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

function resolveAccountStatusValue(status) {
    if (typeof status === 'number' && Number.isFinite(status)) {
        return status
    }

    if (typeof status === 'string' && Object.prototype.hasOwnProperty.call(ACCOUNT_STATUS_VALUES, status)) {
        return ACCOUNT_STATUS_VALUES[status]
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

export async function getAdminAccounts({
    status,
    excludeStatus,
    type,
    isActive,
    query: searchQuery,
    pageNumber = 1,
    pageSize = 20,
}) {
    const query = new URLSearchParams()
    query.set('pageNumber', String(pageNumber))
    query.set('pageSize', String(pageSize))

    if (status) {
        query.set('status', status)
    }

    if (excludeStatus) {
        query.set('excludeStatus', excludeStatus)
    }

    if (type) {
        query.set('type', type)
    }

    if (typeof isActive === 'boolean') {
        query.set('isActive', String(isActive))
    }

    if (searchQuery?.trim()) {
        query.set('query', searchQuery.trim())
    }

    return apiRequest(`/admin/accounts?${query.toString()}`, {
        method: 'GET',
    })
}

export async function createAdminOrganization(payload) {
    return apiRequest('/admin/organizations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })
}

export async function getAdminReports({
    status,
    targetType,
    accountQuery,
    organizationQuery,
    userQuery,
    eventQuery,
    pageNumber = 1,
    pageSize = 20,
}) {
    const query = new URLSearchParams()
    query.set('pageNumber', String(pageNumber))
    query.set('pageSize', String(pageSize))

    if (status) {
        query.set('status', status)
    }

    if (targetType) {
        query.set('targetType', targetType)
    }

    if (accountQuery?.trim()) {
        query.set('accountQuery', accountQuery.trim())
    }

    if (organizationQuery?.trim()) {
        query.set('organizationQuery', organizationQuery.trim())
    }

    if (userQuery?.trim()) {
        query.set('userQuery', userQuery.trim())
    }

    if (eventQuery?.trim()) {
        query.set('eventQuery', eventQuery.trim())
    }

    return apiRequest(`/admin/reports?${query.toString()}`, {
        method: 'GET',
    })
}

export async function getProfileById(accountId) {
    return apiRequest(`/profiles/${accountId}`, {
        method: 'GET',
    })
}

export async function updateAdminAccountStatus(accountId, statusOrPayload) {
    const payload = typeof statusOrPayload === 'object' && statusOrPayload !== null
        ? statusOrPayload
        : { status: statusOrPayload }

    return apiRequest(`/admin/accounts/${accountId}/status`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            status: resolveAccountStatusValue(payload.status),
            suspensionDays: payload.suspensionDays ?? null,
        }),
    })
}

export async function getEventDetails(eventId) {
    return apiRequest(`/events/${eventId}`, {
        method: 'GET',
    })
}

export async function deleteAdminEvent(eventId) {
    return apiRequest(`/admin/events/${eventId}`, {
        method: 'DELETE',
    })
}

export async function ignoreAdminReport(reportId) {
    return apiRequest(`/admin/reports/${reportId}/ignore`, {
        method: 'PATCH',
    })
}

export async function updateEventStatus(eventId, statusOrPayload) {
    const payload = typeof statusOrPayload === 'object' && statusOrPayload !== null
        ? statusOrPayload
        : { status: statusOrPayload }

    const normalizedStatus = resolveEventStatusValue(payload.status)

    return apiRequest(`/events/${eventId}/status`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            status: normalizedStatus,
            violationReason: payload.violationReason ?? null,
            additionalExplanation: payload.additionalExplanation ?? null,
        }),
    })
}

export async function getAdminChatReports({ status, pageNumber = 1, pageSize = 20 }) {
    const query = new URLSearchParams()
    query.set('pageNumber', String(pageNumber))
    query.set('pageSize', String(pageSize))

    if (status) {
        query.set('status', status)
    }

    return apiRequest(`/admin/chat-reports?${query.toString()}`, {
        method: 'GET',
    })
}

export async function getAdminChatReportDetail(reportId) {
    return apiRequest(`/admin/chat-reports/${reportId}`, {
        method: 'GET',
    })
}
