import { Button, Descriptions, Drawer, Grid, Segmented, Space, Spin, Tag, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DataGrid from '../common/DataGrid'
import { getEventDetails, getMyProfileEvents } from '../../services/profileService'

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

function OrganizationMyEventsSection() {
    const { t } = useTranslation()
    const screens = Grid.useBreakpoint()
    const isMobile = !screens.md
    const [timeFilter, setTimeFilter] = useState('future')
    const [allRows, setAllRows] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [errorText, setErrorText] = useState('')
    const [pageNumber, setPageNumber] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [isDetailLoading, setIsDetailLoading] = useState(false)
    const [detailErrorText, setDetailErrorText] = useState('')
    const [selectedEvent, setSelectedEvent] = useState(null)

    useEffect(() => {
        let isCancelled = false

        async function loadEvents() {
            setIsLoading(true)
            setErrorText('')

            const result = await getMyProfileEvents({
                pageNumber: 1,
                pageSize: 500,
            })

            if (isCancelled) {
                return
            }

            if (!result.isSuccess) {
                setErrorText(result.errors?.[0]?.message || t('organization.events.error'))
                setAllRows([])
                setIsLoading(false)
                return
            }

            const data = result.data || {}
            const items = data.items || data.Items || []

            setAllRows(items)
            setIsLoading(false)
        }

        loadEvents().catch(() => {
            if (isCancelled) {
                return
            }

            setErrorText(t('organization.events.error'))
            setAllRows([])
            setIsLoading(false)
        })

        return () => {
            isCancelled = true
        }
    }, [t])

    const filteredRows = useMemo(() => {
        return allRows.filter((row) => {
            const isPast = resolveIsPast(row.isPast ?? row.IsPast, row.date ?? row.Date)
            return timeFilter === 'past' ? isPast : !isPast
        })
    }, [allRows, timeFilter])

    const totalCount = filteredRows.length
    const pagedRows = useMemo(() => {
        const startIndex = (pageNumber - 1) * pageSize
        return filteredRows.slice(startIndex, startIndex + pageSize)
    }, [filteredRows, pageNumber, pageSize])

    const columns = useMemo(
        () => [
            {
                title: t('organization.events.columns.name'),
                dataIndex: 'name',
                key: 'name',
                render: (value, row) => <span style={{ fontWeight: 600 }}>{String(value || row.Name || '-')}</span>,
            },
            {
                title: t('organization.events.columns.date'),
                dataIndex: 'date',
                key: 'date',
                render: (value, row) => String(value || row.Date || '-'),
            },
            {
                title: t('organization.events.columns.time'),
                dataIndex: 'time',
                key: 'time',
                render: (value, row) => String(value || row.Time || '-'),
            },
            {
                title: t('organization.events.columns.status'),
                dataIndex: 'status',
                key: 'status',
                render: (value, row) => <Tag color="blue">{String(value || row.Status || '-')}</Tag>,
            },
        ],
        [t],
    )

    const openEventDetail = useCallback(async (eventId) => {
        setIsDetailOpen(true)
        setIsDetailLoading(true)
        setDetailErrorText('')
        setSelectedEvent(null)

        const result = await getEventDetails(eventId)
        if (!result.isSuccess) {
            setDetailErrorText(result.errors?.[0]?.message || t('organization.events.detailsError'))
            setIsDetailLoading(false)
            return
        }

        setSelectedEvent(result.data || {})
        setIsDetailLoading(false)
    }, [t])

    return (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Segmented
                block={isMobile}
                value={timeFilter}
                onChange={(nextFilter) => {
                    setTimeFilter(nextFilter)
                    setPageNumber(1)
                }}
                options={[
                    { label: t('organization.events.filters.future'), value: 'future' },
                    { label: t('organization.events.filters.past'), value: 'past' },
                ]}
            />

            {errorText ? (
                <Typography.Text style={{ color: '#dc2626' }}>{errorText}</Typography.Text>
            ) : null}

            <DataGrid
                columns={columns}
                rows={pagedRows}
                rowKey={(row) => row.eventId || row.EventId}
                loading={isLoading}
                currentPage={pageNumber}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={(nextPage, nextPageSize) => {
                    setPageNumber(nextPage)
                    setPageSize(nextPageSize)
                }}
                emptyText={t('organization.events.empty')}
                onInfoCardClick={(row) => openEventDetail(row.eventId || row.EventId)}
                infoCardColumnTitle={t('organization.events.columns.infoCard')}
                infoCardLabel={t('organization.events.infoCard')}
            />

            <Drawer
                title={t('organization.events.detailsTitle')}
                open={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                width={isMobile ? '100%' : 720}
                extra={(
                    <Button onClick={() => setIsDetailOpen(false)}>
                        {t('organization.events.close')}
                    </Button>
                )}
            >
                {isDetailLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                        <Spin />
                    </div>
                ) : detailErrorText ? (
                    <Typography.Text style={{ color: '#dc2626' }}>{detailErrorText}</Typography.Text>
                ) : selectedEvent ? (
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label={t('organization.events.attributes.id')}>{String(selectedEvent.id || selectedEvent.Id || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('organization.events.attributes.name')}>{String(selectedEvent.name || selectedEvent.Name || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('organization.events.attributes.description')}>{String(selectedEvent.description || selectedEvent.Description || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('organization.events.attributes.date')}>{String(selectedEvent.date || selectedEvent.Date || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('organization.events.attributes.time')}>{String(selectedEvent.time || selectedEvent.Time || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('organization.events.attributes.durationMinutes')}>{String(selectedEvent.durationMinutes || selectedEvent.DurationMinutes || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('organization.events.attributes.capacity')}>{String(selectedEvent.capacity || selectedEvent.Capacity || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('organization.events.attributes.remainingParticipationCount')}>{String(selectedEvent.remainingParticipationCount || selectedEvent.RemainingParticipationCount || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('organization.events.attributes.status')}>{String(selectedEvent.status || selectedEvent.Status || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('organization.events.attributes.price')}>{String(selectedEvent.price || selectedEvent.Price || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('organization.events.attributes.locationData')}>{String(selectedEvent.locationData || selectedEvent.LocationData || '-')}</Descriptions.Item>
                    </Descriptions>
                ) : null}
            </Drawer>
        </Space>
    )
}

export default OrganizationMyEventsSection
