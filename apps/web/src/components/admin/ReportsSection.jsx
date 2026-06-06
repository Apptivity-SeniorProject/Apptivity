import { Button, Descriptions, Drawer, Grid, Segmented, Space, Tag, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DataGrid from '../common/DataGrid'
import { getAdminReports } from '../../services/adminService'

const REPORT_STATUS_QUERY = {
    all: undefined,
    pending: 'Pending',
    resolved: 'Resolved',
    ignored: 'Ignored',
}

function formatDateTime(value) {
    if (!value) {
        return '-'
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return String(value)
    }

    return date.toLocaleString()
}

function normalizeReportRow(row) {
    return {
        reportId: row.reportId || row.ReportId || '',
        reporterId: row.reporterId || row.ReporterId || '',
        reporterUsername: row.reporterUsername || row.ReporterUsername || '',
        targetId: row.targetId || row.TargetId || '',
        targetType: row.targetType || row.TargetType || '',
        reasonCategory: row.reasonCategory || row.ReasonCategory || '',
        description: row.description || row.Description || '',
        evidenceImageUrl: row.evidenceImageUrl || row.EvidenceImageUrl || '',
        status: row.status || row.Status || '',
        createdAt: row.createdAt || row.CreatedAt || '',
        eventId: row.eventId || row.EventId || '',
        eventName: row.eventName || row.EventName || '',
        relatedAccountId: row.relatedAccountId || row.RelatedAccountId || '',
        relatedAccountType: row.relatedAccountType || row.RelatedAccountType || '',
        relatedUsername: row.relatedUsername || row.RelatedUsername || '',
        relatedUserFullName: row.relatedUserFullName || row.RelatedUserFullName || '',
        relatedOrganizationName: row.relatedOrganizationName || row.RelatedOrganizationName || '',
    }
}

function ReportsSection() {
    const { t } = useTranslation()
    const screens = Grid.useBreakpoint()
    const isMobile = !screens.md
    const [statusFilter, setStatusFilter] = useState('all')
    const [rows, setRows] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [errorText, setErrorText] = useState('')
    const [pageNumber, setPageNumber] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const [totalCount, setTotalCount] = useState(0)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [selectedReport, setSelectedReport] = useState(null)

    const loadReports = useCallback(async ({
        nextPageNumber = pageNumber,
        nextPageSize = pageSize,
        nextStatusFilter = statusFilter,
    } = {}) => {
        setIsLoading(true)
        setErrorText('')

        const result = await getAdminReports({
            status: REPORT_STATUS_QUERY[nextStatusFilter],
            pageNumber: nextPageNumber,
            pageSize: nextPageSize,
        })

        if (!result.isSuccess) {
            const backendMessage = result.errors?.[0]?.message || t('admin.reports.error')
            setErrorText(backendMessage)
            setRows([])
            setTotalCount(0)
            setIsLoading(false)
            return
        }

        const data = result.data || {}
        const items = data.items || data.Items || []
        const count = data.totalCount ?? data.TotalCount ?? 0

        setRows(items.map(normalizeReportRow))
        setTotalCount(count)
        setIsLoading(false)
    }, [pageNumber, pageSize, statusFilter, t])

    useEffect(() => {
        let isCancelled = false

        async function run() {
            await loadReports()
            if (isCancelled) {
                return
            }
        }

        run().catch(() => {
            if (isCancelled) {
                return
            }

            setErrorText(t('admin.reports.error'))
            setRows([])
            setTotalCount(0)
            setIsLoading(false)
        })

        return () => {
            isCancelled = true
        }
    }, [loadReports, t])

    const reasonLabel = useCallback((value) => {
        const normalized = Number(value)
        const reasonMap = {
            1: t('admin.reports.reasonCategories.spam'),
            2: t('admin.reports.reasonCategories.inappropriate'),
            3: t('admin.reports.reasonCategories.fake'),
            4: t('admin.reports.reasonCategories.harassment'),
            5: t('admin.reports.reasonCategories.violence'),
            6: t('admin.reports.reasonCategories.other'),
        }

        return reasonMap[normalized] || String(value || '-')
    }, [t])

    const targetTypeLabel = useCallback((value) => {
        const normalized = Number(value)
        if (normalized === 1 || value === 'Event') return t('admin.reports.targetTypes.event')
        if (normalized === 2 || value === 'Account') return t('admin.reports.targetTypes.account')
        return String(value || '-')
    }, [t])

    const statusLabel = useCallback((value) => {
        const normalized = Number(value)
        const statusMap = {
            1: t('admin.reports.statuses.pending'),
            2: t('admin.reports.statuses.resolved'),
            3: t('admin.reports.statuses.ignored'),
        }
        const statusByName = {
            Pending: t('admin.reports.statuses.pending'),
            Resolved: t('admin.reports.statuses.resolved'),
            Ignored: t('admin.reports.statuses.ignored'),
        }

        return statusMap[normalized] || statusByName[String(value)] || String(value || '-')
    }, [t])

    const columns = useMemo(() => [
        {
            title: t('admin.reports.columns.reporter'),
            dataIndex: 'reporterUsername',
            key: 'reporterUsername',
            render: (value) => <span style={{ fontWeight: 600 }}>{value || '-'}</span>,
        },
        {
            title: t('admin.reports.columns.event'),
            dataIndex: 'eventName',
            key: 'eventName',
            render: (value) => value || '-',
        },
        {
            title: t('admin.reports.columns.user'),
            key: 'relatedUser',
            render: (_, row) => row.relatedUserFullName || row.relatedUsername || '-',
        },
        {
            title: t('admin.reports.columns.organization'),
            dataIndex: 'relatedOrganizationName',
            key: 'relatedOrganizationName',
            render: (value) => value || '-',
        },
        {
            title: t('admin.reports.columns.reason'),
            dataIndex: 'reasonCategory',
            key: 'reasonCategory',
            render: (value) => <Tag color="orange">{reasonLabel(value)}</Tag>,
        },
        {
            title: t('admin.reports.columns.status'),
            dataIndex: 'status',
            key: 'status',
            render: (value) => <Tag color="blue">{statusLabel(value)}</Tag>,
        },
        {
            title: t('admin.reports.columns.createdAt'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (value) => formatDateTime(value),
        },
    ], [reasonLabel, statusLabel, t])

    return (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Segmented
                block={isMobile}
                value={statusFilter}
                onChange={(nextStatus) => {
                    setStatusFilter(nextStatus)
                    setPageNumber(1)
                }}
                options={[
                    { label: t('admin.reports.filters.all'), value: 'all' },
                    { label: t('admin.reports.filters.pending'), value: 'pending' },
                    { label: t('admin.reports.filters.resolved'), value: 'resolved' },
                    { label: t('admin.reports.filters.ignored'), value: 'ignored' },
                ]}
            />

            {errorText ? (
                <Typography.Text style={{ color: '#dc2626' }}>{errorText}</Typography.Text>
            ) : null}

            <DataGrid
                columns={columns}
                rows={rows}
                rowKey="reportId"
                loading={isLoading}
                currentPage={pageNumber}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={(nextPage, nextPageSize) => {
                    setPageNumber(nextPage)
                    setPageSize(nextPageSize)
                }}
                emptyText={t('admin.reports.empty')}
                onInfoCardClick={(row) => {
                    setSelectedReport(row)
                    setIsDetailOpen(true)
                }}
                infoCardColumnTitle={t('admin.reports.columns.infoCard')}
                infoCardLabel={t('admin.reports.infoCard')}
            />

            <Drawer
                title={t('admin.reports.detailsTitle')}
                open={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                width={isMobile ? '100%' : 720}
                extra={(
                    <Space>
                        <Button onClick={() => setIsDetailOpen(false)}>
                            {t('admin.events.close')}
                        </Button>
                    </Space>
                )}
            >
                {selectedReport ? (
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label={t('admin.reports.attributes.reportId')}>
                            {selectedReport.reportId || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('admin.reports.attributes.reporter')}>
                            {selectedReport.reporterUsername || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('admin.reports.attributes.targetType')}>
                            {targetTypeLabel(selectedReport.targetType)}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('admin.reports.attributes.event')}>
                            {selectedReport.eventName || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('admin.reports.attributes.user')}>
                            {selectedReport.relatedUserFullName || selectedReport.relatedUsername || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('admin.reports.attributes.organization')}>
                            {selectedReport.relatedOrganizationName || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('admin.reports.attributes.reason')}>
                            {reasonLabel(selectedReport.reasonCategory)}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('admin.reports.attributes.status')}>
                            {statusLabel(selectedReport.status)}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('admin.reports.attributes.comment')}>
                            {selectedReport.description || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('admin.reports.attributes.createdAt')}>
                            {formatDateTime(selectedReport.createdAt)}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('admin.reports.attributes.image')}>
                            {selectedReport.evidenceImageUrl ? (
                                <img
                                    src={selectedReport.evidenceImageUrl}
                                    alt="report evidence"
                                    style={{
                                        width: '100%',
                                        maxHeight: 360,
                                        objectFit: 'cover',
                                        borderRadius: 12,
                                        border: '1px solid #e5e7eb',
                                    }}
                                />
                            ) : '-'}
                        </Descriptions.Item>
                    </Descriptions>
                ) : null}
            </Drawer>
        </Space>
    )
}

export default ReportsSection
