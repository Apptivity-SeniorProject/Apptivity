import { Button, Descriptions, Drawer, Grid, Input, InputNumber, Modal, Radio, Segmented, Space, Spin, Tag, Typography, message } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DataGrid from '../common/DataGrid'
import { deleteAdminEvent, getAdminReports, getProfileById, ignoreAdminReport, updateAdminAccountStatus } from '../../services/adminService'

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

function normalizeAccountStatus(value) {
    const numeric = Number(value)
    if (numeric === 1) return 'Active'
    if (numeric === 2) return 'Suspended'
    if (numeric === 3) return 'Deactivated'
    if (numeric === 4) return 'Banned'
    return String(value || '')
}

function getAccountStatusLabel(status, t) {
    if (status === 'Active') {
        return t('admin.reports.accountModeration.statuses.active')
    }

    if (status === 'Suspended') {
        return t('admin.reports.accountModeration.statuses.suspended')
    }

    if (status === 'Banned') {
        return t('admin.reports.accountModeration.statuses.banned')
    }

    return t('admin.reports.accountModeration.statuses.inactive')
}

function matchesEventReport(row, eventId) {
    return Boolean(row?.eventId) && String(row.eventId) === String(eventId)
}

function matchesReport(row, reportId) {
    return Boolean(row?.reportId) && String(row.reportId) === String(reportId)
}

function normalizeReportStatus(value) {
    return String(value || '').toLowerCase()
}

function ReportsSection({ mode = 'all' }) {
    const { t } = useTranslation()
    const screens = Grid.useBreakpoint()
    const isMobile = !screens.md
    const [reportType, setReportType] = useState('event')
    const [accountScope, setAccountScope] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [searchText, setSearchText] = useState('')
    const [appliedQuery, setAppliedQuery] = useState('')
    const [rows, setRows] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [errorText, setErrorText] = useState('')
    const [pageNumber, setPageNumber] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const [totalCount, setTotalCount] = useState(0)
    const [messageApi, contextHolder] = message.useMessage()
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [selectedReport, setSelectedReport] = useState(null)
    const [selectedAccount, setSelectedAccount] = useState(null)
    const [isAccountLoading, setIsAccountLoading] = useState(false)
    const [isModerationModalOpen, setIsModerationModalOpen] = useState(false)
    const [moderationAction, setModerationAction] = useState('suspend')
    const [suspensionDays, setSuspensionDays] = useState(7)
    const [isStatusSubmitting, setIsStatusSubmitting] = useState(false)
    const [isReportIgnoring, setIsReportIgnoring] = useState(false)
    const [isEventDeleting, setIsEventDeleting] = useState(false)
    const isFixedMode = mode === 'event' || mode === 'account'
    const currentReportType = mode === 'event' || mode === 'account' ? mode : reportType

    const loadReports = useCallback(async ({
        nextPageNumber = pageNumber,
        nextPageSize = pageSize,
        nextStatusFilter = statusFilter,
        nextReportType = currentReportType,
        nextQuery = appliedQuery,
    } = {}) => {
        setIsLoading(true)
        setErrorText('')

        const result = await getAdminReports({
            status: REPORT_STATUS_QUERY[nextStatusFilter],
            targetType: nextReportType === 'event' ? 'Event' : 'Account',
            eventQuery: nextReportType === 'event' ? nextQuery : undefined,
            accountQuery: nextReportType === 'account' && accountScope === 'all' ? nextQuery : undefined,
            userQuery: nextReportType === 'account' && accountScope === 'individual' ? nextQuery : undefined,
            organizationQuery: nextReportType === 'account' && accountScope === 'organization' ? nextQuery : undefined,
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
    }, [accountScope, appliedQuery, currentReportType, pageNumber, pageSize, statusFilter, t])

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

    const accountTypeLabel = useCallback((value) => {
        const normalized = Number(value)
        if (normalized === 1 || value === 'Individual') return t('admin.accounts.types.individual')
        if (normalized === 2 || value === 'Organization') return t('admin.accounts.types.organization')
        if (normalized === 3 || value === 'Admin') return t('admin.accounts.types.admin')
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

    const loadAccountDetail = useCallback(async (accountId) => {
        if (!accountId) {
            setSelectedAccount(null)
            return
        }

        setIsAccountLoading(true)
        const result = await getProfileById(accountId)
        if (!result.isSuccess) {
            setSelectedAccount(null)
            setIsAccountLoading(false)
            return
        }

        setSelectedAccount(result.data || null)
        setIsAccountLoading(false)
    }, [])

    const eventColumns = useMemo(() => [
        {
            title: t('admin.reports.sections.event.columns.reporter'),
            dataIndex: 'reporterUsername',
            key: 'reporterUsername',
            render: (value) => <span style={{ fontWeight: 600 }}>{value || '-'}</span>,
        },
        {
            title: t('admin.reports.sections.event.columns.event'),
            dataIndex: 'eventName',
            key: 'eventName',
            render: (value) => value || '-',
        },
        {
            title: t('admin.reports.sections.event.columns.owner'),
            key: 'owner',
            render: (_, row) => row.relatedOrganizationName || row.relatedUserFullName || row.relatedUsername || '-',
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

    const accountColumns = useMemo(() => [
        {
            title: t('admin.reports.sections.account.columns.reporter'),
            dataIndex: 'reporterUsername',
            key: 'reporterUsername',
            render: (value) => <span style={{ fontWeight: 600 }}>{value || '-'}</span>,
        },
        {
            title: t('admin.reports.sections.account.columns.reportedAccount'),
            key: 'reportedAccount',
            render: (_, row) => row.relatedOrganizationName || row.relatedUserFullName || row.relatedUsername || '-',
        },
        {
            title: t('admin.reports.sections.account.columns.accountType'),
            dataIndex: 'relatedAccountType',
            key: 'relatedAccountType',
            render: (value) => accountTypeLabel(value),
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
    ], [accountTypeLabel, reasonLabel, statusLabel, t])

    const currentColumns = currentReportType === 'event' ? eventColumns : accountColumns
    const searchPlaceholder = currentReportType === 'event'
        ? t('admin.reports.sections.event.searchPlaceholder')
        : accountScope === 'individual'
            ? t('admin.reports.sections.account.searchPlaceholders.individual')
            : accountScope === 'organization'
                ? t('admin.reports.sections.account.searchPlaceholders.organization')
                : t('admin.reports.sections.account.searchPlaceholders.all')
    const selectedReportIsAccount = selectedReport?.targetType === 'Account' || Number(selectedReport?.targetType) === 2
    const normalizedAccountStatus = normalizeAccountStatus(selectedAccount?.status ?? selectedAccount?.Status)
    const canUnban = normalizedAccountStatus === 'Banned'
    const selectedReportStatus = normalizeReportStatus(selectedReport?.status)

    const filterMatchesStatus = useCallback((nextStatus) => {
        if (statusFilter === 'all') {
            return true
        }

        return statusFilter === normalizeReportStatus(nextStatus)
    }, [statusFilter])

    const replaceEventReportStatus = useCallback((eventId, nextStatus) => {
        const affectedCount = rows.filter((row) => matchesEventReport(row, eventId)).length
        const nextRows = rows.reduce((accumulator, row) => {
            if (!matchesEventReport(row, eventId)) {
                accumulator.push(row)
                return accumulator
            }

            if (!filterMatchesStatus(nextStatus)) {
                return accumulator
            }

            accumulator.push({
                ...row,
                status: nextStatus,
            })
            return accumulator
        }, [])

        setRows(nextRows)
        setSelectedReport((previousReport) => {
            if (!matchesEventReport(previousReport, eventId)) {
                return previousReport
            }

            return {
                ...previousReport,
                status: nextStatus,
            }
        })

        if (affectedCount > 0 && !filterMatchesStatus(nextStatus)) {
            setTotalCount((previousTotalCount) => Math.max(0, previousTotalCount - affectedCount))
        }
    }, [filterMatchesStatus, rows])

    const replaceSingleReportStatus = useCallback((reportId, nextStatus) => {
        const existsInRows = rows.some((row) => matchesReport(row, reportId))
        const nextRows = rows.reduce((accumulator, row) => {
            if (!matchesReport(row, reportId)) {
                accumulator.push(row)
                return accumulator
            }

            if (!filterMatchesStatus(nextStatus)) {
                return accumulator
            }

            accumulator.push({
                ...row,
                status: nextStatus,
            })
            return accumulator
        }, [])

        setRows(nextRows)
        setSelectedReport((previousReport) => {
            if (!matchesReport(previousReport, reportId)) {
                return previousReport
            }

            return {
                ...previousReport,
                status: nextStatus,
            }
        })

        if (existsInRows && !filterMatchesStatus(nextStatus)) {
            setTotalCount((previousTotalCount) => Math.max(0, previousTotalCount - 1))
        }
    }, [filterMatchesStatus, rows])

    const onOpenDetail = async (row) => {
        setSelectedReport(row)
        setSelectedAccount(null)
        setIsDetailOpen(true)

        if (row?.targetType === 'Account' || Number(row?.targetType) === 2) {
            await loadAccountDetail(row.relatedAccountId)
        }
    }

    const onModerateAccount = async (statusOrPayload) => {
        if (!selectedReport?.relatedAccountId) {
            return false
        }

        const payload = typeof statusOrPayload === 'object' && statusOrPayload !== null
            ? statusOrPayload
            : { status: statusOrPayload }

        setIsStatusSubmitting(true)
        const result = await updateAdminAccountStatus(selectedReport.relatedAccountId, payload)
        if (!result.isSuccess) {
            messageApi.error(result.errors?.[0]?.message || t('admin.reports.accountModeration.actionError'))
            setIsStatusSubmitting(false)
            return false
        }

        if (payload.status === 'Active') {
            messageApi.success(t('admin.reports.accountModeration.activateSuccess'))
        } else if (payload.status === 'Suspended') {
            messageApi.success(t('admin.reports.accountModeration.suspendSuccess'))
        } else if (payload.status === 'Banned') {
            messageApi.success(t('admin.reports.accountModeration.banSuccess'))
        }

        setIsStatusSubmitting(false)
        setIsModerationModalOpen(false)
        await loadAccountDetail(selectedReport.relatedAccountId)
        await loadReports()
        return true
    }

    const onDeleteEvent = async () => {
        if (!selectedReport?.eventId) {
            return
        }

        setIsEventDeleting(true)
        const result = await deleteAdminEvent(selectedReport.eventId)
        if (!result.isSuccess) {
            messageApi.error(result.errors?.[0]?.message || t('admin.reports.sections.event.deleteError'))
            setIsEventDeleting(false)
            return
        }

        messageApi.success(t('admin.reports.sections.event.deleteSuccess'))
        replaceEventReportStatus(selectedReport.eventId, 'Resolved')
        setIsEventDeleting(false)
        setIsDetailOpen(false)
    }

    const onIgnoreReport = async () => {
        if (!selectedReport?.reportId) {
            return
        }

        setIsReportIgnoring(true)
        const result = await ignoreAdminReport(selectedReport.reportId)
        if (!result.isSuccess) {
            messageApi.error(result.errors?.[0]?.message || t('admin.reports.sections.event.ignoreError'))
            setIsReportIgnoring(false)
            return
        }

        messageApi.success(t('admin.reports.sections.event.ignoreSuccess'))
        replaceSingleReportStatus(selectedReport.reportId, 'Ignored')
        setIsReportIgnoring(false)
    }

    return (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {contextHolder}

            {isFixedMode ? null : (
                <Segmented
                    block={isMobile}
                    value={currentReportType}
                    onChange={(nextType) => {
                        setReportType(nextType)
                        setAccountScope('all')
                        setPageNumber(1)
                        setSearchText('')
                        setAppliedQuery('')
                    }}
                    options={[
                        { label: t('admin.reports.sections.event.title'), value: 'event' },
                        { label: t('admin.reports.sections.account.title'), value: 'account' },
                    ]}
                />
            )}

            <Space direction={isMobile ? 'vertical' : 'horizontal'} size={12} style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space direction={isMobile ? 'vertical' : 'horizontal'} size={12} style={{ width: '100%' }}>
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

                    {currentReportType === 'account' ? (
                        <Segmented
                            block={isMobile}
                            value={accountScope}
                            onChange={(nextScope) => {
                                setAccountScope(nextScope)
                                setPageNumber(1)
                                setSearchText('')
                                setAppliedQuery('')
                            }}
                            options={[
                                { label: t('admin.reports.sections.account.filters.all'), value: 'all' },
                                { label: t('admin.reports.sections.account.filters.individual'), value: 'individual' },
                                { label: t('admin.reports.sections.account.filters.organization'), value: 'organization' },
                            ]}
                        />
                    ) : null}
                </Space>

                <Input.Search
                    allowClear
                    placeholder={searchPlaceholder}
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    onSearch={(value) => {
                        setAppliedQuery(value)
                        setPageNumber(1)
                    }}
                    style={{ width: isMobile ? '100%' : 320 }}
                />
            </Space>

            {errorText ? (
                <Typography.Text style={{ color: '#dc2626' }}>{errorText}</Typography.Text>
            ) : null}

            <DataGrid
                columns={currentColumns}
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
                onInfoCardClick={onOpenDetail}
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
                        {selectedReport?.eventId ? (
                            <>
                                {selectedReportStatus !== 'ignored' && selectedReportStatus !== 'resolved' ? (
                                    <Button loading={isReportIgnoring} onClick={onIgnoreReport}>
                                        {t('admin.reports.sections.event.ignore')}
                                    </Button>
                                ) : null}
                                <Button danger loading={isEventDeleting} onClick={onDeleteEvent}>
                                    {t('admin.reports.sections.event.delete')}
                                </Button>
                            </>
                        ) : selectedReportIsAccount ? (
                            canUnban ? (
                                <Button type="primary" loading={isStatusSubmitting} onClick={() => onModerateAccount('Active')}>
                                    {t('admin.reports.accountModeration.unban')}
                                </Button>
                            ) : (
                                <Button danger onClick={() => {
                                    setModerationAction('suspend')
                                    setSuspensionDays(7)
                                    setIsModerationModalOpen(true)
                                }}>
                                    {t('admin.reports.accountModeration.moderate')}
                                </Button>
                            )
                        ) : null}
                        <Button onClick={() => setIsDetailOpen(false)}>
                            {t('admin.events.close')}
                        </Button>
                    </Space>
                )}
            >
                {selectedReport ? (
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
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

                        {selectedReportIsAccount ? (
                            isAccountLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                                    <Spin />
                                </div>
                            ) : selectedAccount ? (
                                <Descriptions column={1} bordered size="small" title={t('admin.reports.accountModeration.title')}>
                                    <Descriptions.Item label={t('admin.reports.accountModeration.attributes.accountId')}>
                                        {selectedReport.relatedAccountId || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('admin.reports.accountModeration.attributes.accountType')}>
                                        {accountTypeLabel(selectedReport.relatedAccountType)}
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('admin.reports.accountModeration.attributes.username')}>
                                        {selectedReport.relatedUsername || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('admin.reports.accountModeration.attributes.displayName')}>
                                        {selectedReport.relatedOrganizationName || selectedReport.relatedUserFullName || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('admin.reports.accountModeration.attributes.status')}>
                                        {getAccountStatusLabel(normalizedAccountStatus, t)}
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('admin.reports.accountModeration.attributes.suspendedUntil')}>
                                        {String(selectedAccount.suspendedUntilUtc || selectedAccount.SuspendedUntilUtc || '-')}
                                    </Descriptions.Item>
                                </Descriptions>
                            ) : null
                        ) : null}
                    </Space>
                ) : null}
            </Drawer>

            <Modal
                title={t('admin.reports.accountModeration.modal.title')}
                open={isModerationModalOpen}
                confirmLoading={isStatusSubmitting}
                okText={moderationAction === 'ban' ? t('admin.reports.accountModeration.modal.banSubmit') : t('admin.reports.accountModeration.modal.suspendSubmit')}
                cancelText={t('admin.reports.accountModeration.modal.cancel')}
                onCancel={() => setIsModerationModalOpen(false)}
                onOk={async () => {
                    if (moderationAction === 'suspend') {
                        if (!suspensionDays || suspensionDays <= 0) {
                            messageApi.error(t('admin.reports.accountModeration.modal.daysRequired'))
                            return
                        }

                        await onModerateAccount({
                            status: 'Suspended',
                            suspensionDays,
                        })
                        return
                    }

                    await onModerateAccount({ status: 'Banned' })
                }}
            >
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <Typography.Text style={{ color: '#6b7280' }}>
                        {t('admin.reports.accountModeration.modal.description')}
                    </Typography.Text>

                    <Radio.Group
                        value={moderationAction}
                        onChange={(event) => setModerationAction(event.target.value)}
                    >
                        <Space direction="vertical">
                            <Radio value="suspend">{t('admin.reports.accountModeration.modal.suspend')}</Radio>
                            <Radio value="ban">{t('admin.reports.accountModeration.modal.ban')}</Radio>
                        </Space>
                    </Radio.Group>

                    {moderationAction === 'suspend' ? (
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            <Typography.Text>{t('admin.reports.accountModeration.modal.daysLabel')}</Typography.Text>
                            <InputNumber min={1} max={365} value={suspensionDays} onChange={(value) => setSuspensionDays(Number(value) || 0)} style={{ width: '100%' }} />
                        </Space>
                    ) : (
                        <Typography.Text style={{ color: '#dc2626' }}>
                            {t('admin.reports.accountModeration.modal.banWarning')}
                        </Typography.Text>
                    )}
                </Space>
            </Modal>
        </Space>
    )
}

export default ReportsSection
