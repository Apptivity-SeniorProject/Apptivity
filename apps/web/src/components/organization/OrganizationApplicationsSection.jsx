import { Avatar, Button, Descriptions, Drawer, Grid, Segmented, Space, Spin, Tag, Typography, message } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DataGrid from '../common/DataGrid'
import { getEventParticipants, getMyProfileEvents, updateEventParticipationStatus } from '../../services/profileService'

function resolveIsPast(value, dateValue) {
    if (typeof value === 'boolean') {
        return value
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        if (normalized === 'true') return true
        if (normalized === 'false') return false
    }

    const numeric = Number(value)
    if (!Number.isNaN(numeric)) {
        return numeric === 1
    }

    const parsedDate = Date.parse(String(dateValue || ''))
    if (!Number.isNaN(parsedDate)) {
        return parsedDate < Date.now()
    }

    return false
}

function normalizeParticipationStatus(value) {
    const numeric = Number(value)
    if (numeric === 1) return 'Pending'
    if (numeric === 2) return 'Approved'
    if (numeric === 3) return 'Rejected'
    if (numeric === 4) return 'Withdrawn'
    return String(value || '')
}

function getParticipantInitials(displayName) {
    const parts = String(displayName || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)

    if (parts.length === 0) {
        return '?'
    }

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase()
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function OrganizationApplicationsSection() {
    const { t } = useTranslation()
    const screens = Grid.useBreakpoint()
    const isMobile = !screens.md
    const [statusFilter, setStatusFilter] = useState('pending')
    const [allRows, setAllRows] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [errorText, setErrorText] = useState('')
    const [pageNumber, setPageNumber] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [messageApi, contextHolder] = message.useMessage()
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [selectedApplication, setSelectedApplication] = useState(null)
    const [isStatusSubmitting, setIsStatusSubmitting] = useState(false)

    const loadApplications = useCallback(async () => {
        setIsLoading(true)
        setErrorText('')

        const eventsResult = await getMyProfileEvents({
            pageNumber: 1,
            pageSize: 500,
        })

        if (!eventsResult.isSuccess) {
            setErrorText(eventsResult.errors?.[0]?.message || t('organization.applications.error'))
            setAllRows([])
            setIsLoading(false)
            return
        }

        const eventsData = eventsResult.data || {}
        const allEvents = eventsData.items || eventsData.Items || []
        const futureEvents = allEvents.filter((eventRow) => !resolveIsPast(eventRow.isPast ?? eventRow.IsPast, eventRow.date ?? eventRow.Date))

        if (futureEvents.length === 0) {
            setAllRows([])
            setIsLoading(false)
            return
        }

        const participantResults = await Promise.all(
            futureEvents.map(async (eventRow) => {
                const eventId = eventRow.eventId || eventRow.EventId
                const participantsResult = await getEventParticipants(eventId)
                return {
                    eventRow,
                    participantsResult,
                }
            }),
        )

        const nextRows = []
        for (const item of participantResults) {
            if (!item.participantsResult.isSuccess) {
                continue
            }

            const eventRow = item.eventRow
            const eventId = eventRow.eventId || eventRow.EventId
            const eventName = eventRow.eventName || eventRow.EventName || '-'
            const eventDate = String(eventRow.date || eventRow.Date || '-')
            const eventTime = String(eventRow.time || eventRow.Time || '-')
            const participantsData = item.participantsResult.data || {}
            const participants = participantsData.participants || participantsData.Participants || []

            for (const participant of participants) {
                nextRows.push({
                    key: `${eventId}-${participant.accountId || participant.AccountId}`,
                    eventId,
                    eventName,
                    eventDate,
                    eventTime,
                    accountId: participant.accountId || participant.AccountId,
                    type: participant.type || participant.Type,
                    username: participant.username || participant.Username || '-',
                    profilePhoto: participant.profilePhoto || participant.ProfilePhoto || '',
                    displayName: participant.displayName || participant.DisplayName || '-',
                    status: participant.status || participant.Status,
                })
            }
        }

        setAllRows(nextRows)
        setIsLoading(false)
    }, [t])

    useEffect(() => {
        const timerId = setTimeout(() => {
            loadApplications().catch(() => {
                setErrorText(t('organization.applications.error'))
                setAllRows([])
                setIsLoading(false)
            })
        }, 0)

        return () => {
            clearTimeout(timerId)
        }
    }, [loadApplications, t])

    const filteredRows = useMemo(() => {
        return allRows.filter((row) => {
            const status = normalizeParticipationStatus(row.status)
            if (statusFilter === 'pending') return status === 'Pending'
            if (statusFilter === 'approved') return status === 'Approved'
            if (statusFilter === 'rejected') return status === 'Rejected'
            return true
        })
    }, [allRows, statusFilter])

    const totalCount = filteredRows.length
    const pagedRows = useMemo(() => {
        const startIndex = (pageNumber - 1) * pageSize
        return filteredRows.slice(startIndex, startIndex + pageSize)
    }, [filteredRows, pageNumber, pageSize])

    const columns = useMemo(
        () => [
            {
                title: t('organization.applications.columns.eventName'),
                dataIndex: 'eventName',
                key: 'eventName',
                render: (value) => <span style={{ fontWeight: 600 }}>{String(value || '-')}</span>,
            },
            {
                title: t('organization.applications.columns.participant'),
                dataIndex: 'displayName',
                key: 'displayName',
                render: (value, row) => {
                    const displayName = String(value || row.displayName || '-')

                    return (
                        <Space size={10}>
                            <Avatar src={row.profilePhoto || undefined} size="small">
                                {getParticipantInitials(displayName)}
                            </Avatar>
                            <span>{displayName}</span>
                        </Space>
                    )
                },
            },
            {
                title: t('organization.applications.columns.username'),
                dataIndex: 'username',
                key: 'username',
                render: (value) => String(value || '-'),
            },
            {
                title: t('organization.applications.columns.status'),
                dataIndex: 'status',
                key: 'status',
                render: (value) => {
                    const normalizedStatus = normalizeParticipationStatus(value)
                    const labels = {
                        Pending: t('organization.applications.filters.pending'),
                        Approved: t('organization.applications.filters.approved'),
                        Rejected: t('organization.applications.filters.rejected'),
                        Withdrawn: t('organization.applications.filters.withdrawn'),
                    }

                    return (
                        <Tag color="blue">
                            {labels[normalizedStatus] || normalizedStatus}
                        </Tag>
                    )
                },
            },
        ],
        [t],
    )

    const openApplicationDetail = useCallback((row) => {
        setSelectedApplication(row)
        setIsDetailOpen(true)
    }, [])

    const selectedStatus = normalizeParticipationStatus(selectedApplication?.status)
    const canModerateSelectedApplication = selectedStatus === 'Pending'

    const onChangeParticipationStatus = async (targetStatus) => {
        if (!selectedApplication) {
            return
        }

        setIsStatusSubmitting(true)
        const result = await updateEventParticipationStatus(
            selectedApplication.eventId,
            selectedApplication.accountId,
            {
                status: targetStatus,
                rejectionReason: targetStatus === 'Rejected' ? t('organization.applications.defaultRejectionReason') : null,
            },
        )

        if (!result.isSuccess) {
            messageApi.error(result.errors?.[0]?.message || t('organization.applications.actionError'))
            setIsStatusSubmitting(false)
            return
        }

        messageApi.success(targetStatus === 'Approved' ? t('organization.applications.approveSuccess') : t('organization.applications.rejectSuccess'))
        setIsStatusSubmitting(false)
        setIsDetailOpen(false)
        setSelectedApplication(null)
        await loadApplications()
    }

    return (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {contextHolder}
            <Segmented
                block={isMobile}
                value={statusFilter}
                onChange={(nextStatus) => {
                    setStatusFilter(nextStatus)
                    setPageNumber(1)
                }}
                options={[
                    { label: t('organization.applications.filters.pending'), value: 'pending' },
                    { label: t('organization.applications.filters.approved'), value: 'approved' },
                    { label: t('organization.applications.filters.rejected'), value: 'rejected' },
                ]}
            />

            {errorText ? (
                <Typography.Text style={{ color: '#dc2626' }}>{errorText}</Typography.Text>
            ) : null}

            <DataGrid
                columns={columns}
                rows={pagedRows}
                rowKey={(row) => row.key}
                loading={isLoading}
                currentPage={pageNumber}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={(nextPage, nextPageSize) => {
                    setPageNumber(nextPage)
                    setPageSize(nextPageSize)
                }}
                emptyText={t('organization.applications.empty')}
                onInfoCardClick={openApplicationDetail}
                infoCardColumnTitle={t('organization.applications.columns.infoCard')}
                infoCardLabel={t('organization.applications.infoCard')}
            />

            <Drawer
                title={t('organization.applications.detailsTitle')}
                open={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                width={isMobile ? '100%' : 720}
                extra={(
                    <Space>
                        <Button onClick={() => setIsDetailOpen(false)}>
                            {t('organization.applications.close')}
                        </Button>
                        <Button
                            type="primary"
                            loading={isStatusSubmitting}
                            disabled={!canModerateSelectedApplication}
                            onClick={() => onChangeParticipationStatus('Approved')}
                        >
                            {t('organization.applications.approve')}
                        </Button>
                        <Button
                            danger
                            loading={isStatusSubmitting}
                            disabled={!canModerateSelectedApplication}
                            onClick={() => onChangeParticipationStatus('Rejected')}
                        >
                            {t('organization.applications.reject')}
                        </Button>
                    </Space>
                )}
            >
                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                        <Spin />
                    </div>
                ) : selectedApplication ? (
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label={t('organization.applications.attributes.participantName')}>
                            <Space size={12}>
                                <Avatar src={selectedApplication.profilePhoto || undefined} size={48}>
                                    {getParticipantInitials(selectedApplication.displayName)}
                                </Avatar>
                                <span>{String(selectedApplication.displayName || '-')}</span>
                            </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label={t('organization.applications.attributes.eventName')}>{String(selectedApplication.eventName || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('organization.applications.attributes.eventDate')}>{String(selectedApplication.eventDate || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('organization.applications.attributes.eventTime')}>{String(selectedApplication.eventTime || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('organization.applications.attributes.username')}>{String(selectedApplication.username || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('organization.applications.attributes.accountId')}>{String(selectedApplication.accountId || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('organization.applications.attributes.type')}>{String(selectedApplication.type || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('organization.applications.attributes.status')}>{String(normalizeParticipationStatus(selectedApplication.status) || '-')}</Descriptions.Item>
                    </Descriptions>
                ) : null}
            </Drawer>
        </Space>
    )
}

export default OrganizationApplicationsSection
