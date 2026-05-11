import { Button, Descriptions, Drawer, Grid, Segmented, Space, Spin, Tag, Typography, message } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DataGrid from '../common/DataGrid'
import { getAdminEvents, getEventDetails, updateEventStatus } from '../../services/adminService'

const EVENT_STATUS_QUERY = {
    pending: 'PendingApproval',
    approved: 'Published',
    rejected: 'Rejected',
}

function normalizeEventStatus(value) {
    const numeric = Number(value)
    if (numeric === 6) return 'PendingApproval'
    if (numeric === 2) return 'Published'
    if (numeric === 7) return 'Rejected'
    return String(value || '')
}

function EventApprovalSection() {
    const { t } = useTranslation()
    const screens = Grid.useBreakpoint()
    const isMobile = !screens.md
    const [statusFilter, setStatusFilter] = useState('pending')
    const [rows, setRows] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [errorText, setErrorText] = useState('')
    const [pageNumber, setPageNumber] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const [totalCount, setTotalCount] = useState(0)
    const [messageApi, contextHolder] = message.useMessage()
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [isDetailLoading, setIsDetailLoading] = useState(false)
    const [detailErrorText, setDetailErrorText] = useState('')
    const [selectedEvent, setSelectedEvent] = useState(null)
    const [isStatusSubmitting, setIsStatusSubmitting] = useState(false)
    const [activeEventId, setActiveEventId] = useState('')

    useEffect(() => {
        let isCancelled = false

        async function loadEvents() {
            setIsLoading(true)
            setErrorText('')

            const result = await getAdminEvents({
                status: EVENT_STATUS_QUERY[statusFilter],
                pageNumber,
                pageSize,
            })

            if (isCancelled) {
                return
            }

            if (!result.isSuccess) {
                const backendMessage = result.errors?.[0]?.message || t('admin.events.error')
                setErrorText(backendMessage)
                setRows([])
                setTotalCount(0)
                setIsLoading(false)
                return
            }

            const data = result.data || {}
            const items = data.items || data.Items || []
            const count = data.totalCount ?? data.TotalCount ?? 0

            setRows(items)
            setTotalCount(count)
            setIsLoading(false)
        }

        loadEvents().catch(() => {
            if (isCancelled) {
                return
            }

            setErrorText(t('admin.events.error'))
            setRows([])
            setTotalCount(0)
            setIsLoading(false)
        })

        return () => {
            isCancelled = true
        }
    }, [pageNumber, pageSize, statusFilter, t])

    const loadEvents = async ({ nextPageNumber = pageNumber, nextPageSize = pageSize, nextStatusFilter = statusFilter } = {}) => {
        setIsLoading(true)
        setErrorText('')

        const result = await getAdminEvents({
            status: EVENT_STATUS_QUERY[nextStatusFilter],
            pageNumber: nextPageNumber,
            pageSize: nextPageSize,
        })

        if (!result.isSuccess) {
            const backendMessage = result.errors?.[0]?.message || t('admin.events.error')
            setErrorText(backendMessage)
            setRows([])
            setTotalCount(0)
            setIsLoading(false)
            return
        }

        const data = result.data || {}
        const items = data.items || data.Items || []
        const count = data.totalCount ?? data.TotalCount ?? 0

        setRows(items)
        setTotalCount(count)
        setIsLoading(false)
    }

    const openEventDetail = useCallback(async (eventId) => {
        setIsDetailOpen(true)
        setIsDetailLoading(true)
        setDetailErrorText('')
        setSelectedEvent(null)
        setActiveEventId(eventId)

        const result = await getEventDetails(eventId)
        if (!result.isSuccess) {
            setDetailErrorText(result.errors?.[0]?.message || t('admin.events.detailsError'))
            setIsDetailLoading(false)
            return
        }

        setSelectedEvent(result.data || {})
        setIsDetailLoading(false)
    }, [t])

    const onChangeEventStatus = async (targetStatus) => {
        if (!activeEventId) {
            return
        }

        setIsStatusSubmitting(true)
        const result = await updateEventStatus(activeEventId, targetStatus)
        if (!result.isSuccess) {
            messageApi.error(result.errors?.[0]?.message || t('admin.events.actionError'))
            setIsStatusSubmitting(false)
            return
        }

        messageApi.success(targetStatus === 'Published' ? t('admin.events.approveSuccess') : t('admin.events.rejectSuccess'))
        setIsStatusSubmitting(false)
        setIsDetailOpen(false)
        await loadEvents()
    }

    const selectedEventStatus = normalizeEventStatus(selectedEvent?.status ?? selectedEvent?.Status)
    const canModerateSelectedEvent = selectedEventStatus === 'PendingApproval'

    const columns = useMemo(
        () => [
            {
                title: t('admin.events.columns.eventName'),
                dataIndex: 'eventName',
                key: 'eventName',
                render: (value, row) => <span style={{ fontWeight: 600 }}>{value || row.EventName || '-'}</span>,
            },
            {
                title: t('admin.events.columns.status'),
                dataIndex: 'status',
                key: 'status',
                render: (value) => {
                    const numeric = Number(value)
                    const labelByStatus = {
                        6: t('admin.events.filters.pending'),
                        2: t('admin.events.filters.approved'),
                        7: t('admin.events.filters.rejected'),
                    }
                    const labelByName = {
                        PendingApproval: t('admin.events.filters.pending'),
                        Published: t('admin.events.filters.approved'),
                        Rejected: t('admin.events.filters.rejected'),
                    }

                    return (
                        <Tag color="blue">
                            {labelByStatus[numeric] || labelByName[String(value)] || String(value)}
                        </Tag>
                    )
                },
            },
            {
                title: t('admin.events.columns.featured'),
                dataIndex: 'isFeatured',
                key: 'isFeatured',
                align: 'center',
                render: (value) => (value ? t('admin.events.yes') : t('admin.events.no')),
            },
        ],
        [t],
    )

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
                    { label: t('admin.events.filters.pending'), value: 'pending' },
                    { label: t('admin.events.filters.approved'), value: 'approved' },
                    { label: t('admin.events.filters.rejected'), value: 'rejected' },
                ]}
            />

            {errorText ? (
                <Typography.Text style={{ color: '#dc2626' }}>{errorText}</Typography.Text>
            ) : null}

            <DataGrid
                columns={columns}
                rows={rows}
                rowKey={(row) => row.eventId || row.EventId}
                loading={isLoading}
                currentPage={pageNumber}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={(nextPage, nextPageSize) => {
                    setPageNumber(nextPage)
                    setPageSize(nextPageSize)
                }}
                emptyText={t('admin.events.empty')}
                onInfoCardClick={(row) => openEventDetail(row.eventId || row.EventId)}
                infoCardColumnTitle={t('admin.events.columns.infoCard')}
                infoCardLabel={t('admin.events.infoCard')}
            />

            <Drawer
                title={t('admin.events.detailsTitle')}
                open={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                width={isMobile ? '100%' : 720}
                extra={
                    <Space>
                        <Button onClick={() => setIsDetailOpen(false)}>
                            {t('admin.events.close')}
                        </Button>
                        <Button
                            type="primary"
                            loading={isStatusSubmitting}
                            disabled={!canModerateSelectedEvent}
                            onClick={() => onChangeEventStatus('Published')}
                        >
                            {t('admin.events.approve')}
                        </Button>
                        <Button
                            danger
                            loading={isStatusSubmitting}
                            disabled={!canModerateSelectedEvent}
                            onClick={() => onChangeEventStatus('Rejected')}
                        >
                            {t('admin.events.reject')}
                        </Button>
                    </Space>
                }
            >
                {isDetailLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                        <Spin />
                    </div>
                ) : detailErrorText ? (
                    <Typography.Text style={{ color: '#dc2626' }}>{detailErrorText}</Typography.Text>
                ) : selectedEvent ? (
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label={t('admin.events.attributes.id')}>{selectedEvent.id || selectedEvent.Id}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.events.attributes.ownerId')}>{selectedEvent.ownerId || selectedEvent.OwnerId}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.events.attributes.ownerName')}>{selectedEvent.ownerName || selectedEvent.OwnerName}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.events.attributes.ownerType')}>{String(selectedEvent.ownerType || selectedEvent.OwnerType || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.events.attributes.primaryTagId')}>{String(selectedEvent.primaryTagId || selectedEvent.PrimaryTagId || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.events.attributes.primaryTagName')}>{String(selectedEvent.primaryTagName || selectedEvent.PrimaryTagName || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.events.attributes.name')}>{selectedEvent.name || selectedEvent.Name}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.events.attributes.description')}>{selectedEvent.description || selectedEvent.Description}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.events.attributes.date')}>{String(selectedEvent.date || selectedEvent.Date || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.events.attributes.time')}>{String(selectedEvent.time || selectedEvent.Time || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.events.attributes.durationMinutes')}>{String(selectedEvent.durationMinutes || selectedEvent.DurationMinutes || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.events.attributes.capacity')}>{String(selectedEvent.capacity || selectedEvent.Capacity || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.events.attributes.remainingParticipationCount')}>{String(selectedEvent.remainingParticipationCount || selectedEvent.RemainingParticipationCount || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.events.attributes.status')}>{String(selectedEvent.status || selectedEvent.Status || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.events.attributes.price')}>{String(selectedEvent.price || selectedEvent.Price || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.events.attributes.locationData')}>{String(selectedEvent.locationData || selectedEvent.LocationData || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.events.attributes.isBookmarkedByCurrentUser')}>{String(selectedEvent.isBookmarkedByCurrentUser ?? selectedEvent.IsBookmarkedByCurrentUser ?? false)}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.events.attributes.currentUserParticipationStatus')}>{String(selectedEvent.currentUserParticipationStatus || selectedEvent.CurrentUserParticipationStatus || '-')}</Descriptions.Item>
                    </Descriptions>
                ) : null}
            </Drawer>
        </Space>
    )
}

export default EventApprovalSection
