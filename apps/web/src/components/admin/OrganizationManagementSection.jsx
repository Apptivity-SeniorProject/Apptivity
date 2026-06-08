import { Button, Descriptions, Drawer, Grid, Input, InputNumber, Modal, Radio, Segmented, Space, Spin, Tag, Typography, message } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DataGrid from '../common/DataGrid'
import { getAdminAccounts, getProfileById, updateAdminAccountStatus } from '../../services/adminService'

function normalizeAccountStatus(value) {
    const numeric = Number(value)
    if (numeric === 1) return 'Active'
    if (numeric === 2) return 'Suspended'
    if (numeric === 3) return 'Deactivated'
    if (numeric === 4) return 'Banned'
    return String(value || '')
}

function getOrganizationStatusLabel(status, t) {
    if (status === 'Active') {
        return t('admin.organizations.manage.statuses.active')
    }

    if (status === 'Suspended') {
        return t('admin.organizations.manage.statuses.suspended')
    }

    if (status === 'Banned') {
        return t('admin.organizations.manage.statuses.banned')
    }

    return t('admin.organizations.manage.statuses.inactive')
}

function getStatusColor(status) {
    if (status === 'Active') {
        return 'green'
    }

    if (status === 'Banned') {
        return 'red'
    }

    if (status === 'Suspended') {
        return 'orange'
    }

    return 'gold'
}

function OrganizationManagementSection({ mode = 'manage' }) {
    const { t } = useTranslation()
    const screens = Grid.useBreakpoint()
    const isMobile = !screens.md
    const isBannedView = mode === 'banned'
    const [filterKey, setFilterKey] = useState('all')
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
    const [isDetailLoading, setIsDetailLoading] = useState(false)
    const [detailErrorText, setDetailErrorText] = useState('')
    const [selectedAccount, setSelectedAccount] = useState(null)
    const [isStatusSubmitting, setIsStatusSubmitting] = useState(false)
    const [activeAccountId, setActiveAccountId] = useState('')
    const [isModerationModalOpen, setIsModerationModalOpen] = useState(false)
    const [moderationAction, setModerationAction] = useState('suspend')
    const [suspensionDays, setSuspensionDays] = useState(7)

    const buildAccountFilters = useCallback((nextFilterKey, nextQuery) => {
        if (isBannedView) {
            return {
                status: 'Banned',
                query: nextQuery,
            }
        }

        if (nextFilterKey === 'active') {
            return {
                status: 'Active',
                query: nextQuery,
            }
        }

        if (nextFilterKey === 'inactive') {
            return {
                isActive: false,
                excludeStatus: 'Banned',
                query: nextQuery,
            }
        }

        return {
            excludeStatus: 'Banned',
            query: nextQuery,
        }
    }, [isBannedView])

    const loadOrganizations = useCallback(async ({
        nextPageNumber = pageNumber,
        nextPageSize = pageSize,
        nextFilterKey = filterKey,
        nextQuery = appliedQuery,
    } = {}) => {
        setIsLoading(true)
        setErrorText('')

        const result = await getAdminAccounts({
            type: 'Organization',
            pageNumber: nextPageNumber,
            pageSize: nextPageSize,
            ...buildAccountFilters(nextFilterKey, nextQuery),
        })

        if (!result.isSuccess) {
            setErrorText(result.errors?.[0]?.message || t(isBannedView ? 'admin.organizations.banned.error' : 'admin.organizations.manage.error'))
            setRows([])
            setTotalCount(0)
            setIsLoading(false)
            return
        }

        const data = result.data || {}
        setRows(data.items || data.Items || [])
        setTotalCount(data.totalCount ?? data.TotalCount ?? 0)
        setIsLoading(false)
    }, [appliedQuery, buildAccountFilters, filterKey, isBannedView, pageNumber, pageSize, t])

    useEffect(() => {
        let isCancelled = false

        async function run() {
            await loadOrganizations()
            if (isCancelled) {
                return
            }
        }

        run().catch(() => {
            if (isCancelled) {
                return
            }

            setErrorText(t(isBannedView ? 'admin.organizations.banned.error' : 'admin.organizations.manage.error'))
            setRows([])
            setTotalCount(0)
            setIsLoading(false)
        })

        return () => {
            isCancelled = true
        }
    }, [isBannedView, loadOrganizations, t])

    const openAccountDetail = useCallback(async (accountRow) => {
        const accountId = accountRow.accountId || accountRow.AccountId
        if (!accountId) {
            return
        }

        setIsDetailOpen(true)
        setIsDetailLoading(true)
        setDetailErrorText('')
        setSelectedAccount(null)
        setActiveAccountId(accountId)

        const result = await getProfileById(accountId)
        if (!result.isSuccess) {
            setDetailErrorText(result.errors?.[0]?.message || t(isBannedView ? 'admin.organizations.banned.detailsError' : 'admin.organizations.manage.detailsError'))
            setIsDetailLoading(false)
            return
        }

        setSelectedAccount({
            ...accountRow,
            ...(result.data || {}),
        })
        setIsDetailLoading(false)
    }, [isBannedView, t])

    const onChangeAccountStatus = useCallback(async (statusOrPayload) => {
        if (!activeAccountId) {
            return false
        }

        const payload = typeof statusOrPayload === 'object' && statusOrPayload !== null
            ? statusOrPayload
            : { status: statusOrPayload }

        setIsStatusSubmitting(true)
        const result = await updateAdminAccountStatus(activeAccountId, payload)
        if (!result.isSuccess) {
            messageApi.error(result.errors?.[0]?.message || t(isBannedView ? 'admin.organizations.banned.actionError' : 'admin.organizations.manage.actionError'))
            setIsStatusSubmitting(false)
            return false
        }

        if (payload.status === 'Active') {
            messageApi.success(t('admin.organizations.manage.activateSuccess'))
        } else if (payload.status === 'Deactivated') {
            messageApi.success(t('admin.organizations.manage.deactivateSuccess'))
        } else if (payload.status === 'Suspended') {
            messageApi.success(t('admin.organizations.manage.suspendSuccess'))
        } else if (payload.status === 'Banned') {
            messageApi.success(t('admin.organizations.manage.banSuccess'))
        }

        setIsStatusSubmitting(false)
        setIsDetailOpen(false)
        setIsModerationModalOpen(false)
        await loadOrganizations()
        return true
    }, [activeAccountId, isBannedView, loadOrganizations, messageApi, t])

    const columns = useMemo(
        () => [
            {
                title: t('admin.organizations.manage.columns.name'),
                key: 'name',
                render: (_, row) => <span style={{ fontWeight: 600 }}>{row.organizationName || row.OrganizationName || row.username || row.Username || '-'}</span>,
            },
            {
                title: t('admin.organizations.manage.columns.username'),
                dataIndex: 'username',
                key: 'username',
                render: (value, row) => value || row.Username || '-',
            },
            {
                title: t('admin.organizations.manage.columns.contact'),
                key: 'contact',
                render: (_, row) => row.email || row.Email || row.phone || row.Phone || '-',
            },
            {
                title: t('admin.organizations.manage.columns.city'),
                key: 'city',
                render: (_, row) => row.organizationCity || row.OrganizationCity || '-',
            },
            {
                title: t('admin.organizations.manage.columns.status'),
                dataIndex: 'status',
                key: 'status',
                render: (value) => {
                    const normalizedStatus = normalizeAccountStatus(value)
                    return <Tag color={getStatusColor(normalizedStatus)}>{getOrganizationStatusLabel(normalizedStatus, t)}</Tag>
                },
            },
        ],
        [t],
    )

    const selectedAccountStatus = normalizeAccountStatus(selectedAccount?.status ?? selectedAccount?.Status)
    const clubProfile = selectedAccount?.clubProfile || selectedAccount?.ClubProfile
    const suspendedUntilUtc = selectedAccount?.suspendedUntilUtc || selectedAccount?.SuspendedUntilUtc
    const detailTitle = isBannedView ? t('admin.organizations.banned.detailsTitle') : t('admin.organizations.manage.detailsTitle')
    const canActivate = !isBannedView && selectedAccountStatus !== 'Active' && selectedAccountStatus !== 'Banned'
    const canDeactivate = !isBannedView && !['Deactivated', 'Banned'].includes(selectedAccountStatus)
    const canModerate = !isBannedView && selectedAccountStatus !== 'Banned'

    return (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {contextHolder}

            <Typography.Paragraph style={{ marginBottom: 0, color: '#6b7280' }}>
                {t(isBannedView ? 'admin.organizations.banned.description' : 'admin.organizations.manage.description')}
            </Typography.Paragraph>

            <Space direction={isMobile ? 'vertical' : 'horizontal'} size={12} style={{ width: '100%', justifyContent: 'space-between' }}>
                {isBannedView ? null : (
                    <Segmented
                        block={isMobile}
                        value={filterKey}
                        onChange={(nextFilterKey) => {
                            setFilterKey(nextFilterKey)
                            setPageNumber(1)
                        }}
                        options={[
                            { label: t('admin.organizations.manage.filters.all'), value: 'all' },
                            { label: t('admin.organizations.manage.filters.active'), value: 'active' },
                            { label: t('admin.organizations.manage.filters.inactive'), value: 'inactive' },
                        ]}
                    />
                )}

                <Input.Search
                    allowClear
                    placeholder={t('admin.organizations.manage.searchPlaceholder')}
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
                columns={columns}
                rows={rows}
                rowKey={(row) => row.accountId || row.AccountId}
                loading={isLoading}
                currentPage={pageNumber}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={(nextPage, nextPageSize) => {
                    setPageNumber(nextPage)
                    setPageSize(nextPageSize)
                }}
                emptyText={t(isBannedView ? 'admin.organizations.banned.empty' : 'admin.organizations.manage.empty')}
                onInfoCardClick={(row) => openAccountDetail(row)}
                infoCardColumnTitle={t('admin.organizations.manage.columns.infoCard')}
                infoCardLabel={t('admin.organizations.manage.infoCard')}
            />

            <Drawer
                title={detailTitle}
                open={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                width={isMobile ? '100%' : 720}
                extra={
                    <Space>
                        <Button onClick={() => setIsDetailOpen(false)}>
                            {t('admin.organizations.manage.close')}
                        </Button>
                        {isBannedView ? (
                            <Button
                                type="primary"
                                loading={isStatusSubmitting}
                                onClick={() => onChangeAccountStatus('Active')}
                            >
                                {t('admin.organizations.banned.unban')}
                            </Button>
                        ) : (
                            <>
                                <Button
                                    type="primary"
                                    loading={isStatusSubmitting}
                                    disabled={!canActivate}
                                    onClick={() => onChangeAccountStatus('Active')}
                                >
                                    {t('admin.organizations.manage.activate')}
                                </Button>
                                <Button
                                    loading={isStatusSubmitting}
                                    disabled={!canDeactivate}
                                    onClick={() => onChangeAccountStatus('Deactivated')}
                                >
                                    {t('admin.organizations.manage.deactivate')}
                                </Button>
                                <Button
                                    danger
                                    disabled={!canModerate}
                                    onClick={() => {
                                        setModerationAction('suspend')
                                        setSuspensionDays(7)
                                        setIsModerationModalOpen(true)
                                    }}
                                >
                                    {t('admin.organizations.manage.moderate')}
                                </Button>
                            </>
                        )}
                    </Space>
                }
            >
                {isDetailLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                        <Spin />
                    </div>
                ) : detailErrorText ? (
                    <Typography.Text style={{ color: '#dc2626' }}>{detailErrorText}</Typography.Text>
                ) : selectedAccount ? (
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label={t('admin.organizations.manage.attributes.accountId')}>{selectedAccount.accountId || selectedAccount.AccountId || '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.organizations.manage.attributes.name')}>{String(clubProfile?.name || clubProfile?.Name || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.organizations.manage.attributes.username')}>{selectedAccount.username || selectedAccount.Username || '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.organizations.manage.attributes.email')}>{selectedAccount.email || selectedAccount.Email || '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.organizations.manage.attributes.phone')}>{selectedAccount.phone || selectedAccount.Phone || '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.organizations.manage.attributes.city')}>{String(clubProfile?.city || clubProfile?.City || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.organizations.manage.attributes.description')}>{String(clubProfile?.description || clubProfile?.Description || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.organizations.manage.attributes.status')}>{getOrganizationStatusLabel(selectedAccountStatus, t)}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.organizations.manage.attributes.isActive')}>{String(selectedAccount.isActive ?? selectedAccount.IsActive ?? false)}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.organizations.manage.attributes.suspendedUntil')}>{String(suspendedUntilUtc || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.organizations.manage.attributes.createdAt')}>{String(selectedAccount.createdAt || selectedAccount.CreatedAt || '-')}</Descriptions.Item>
                    </Descriptions>
                ) : null}
            </Drawer>

            <Modal
                title={t('admin.organizations.manage.moderationModal.title')}
                open={isModerationModalOpen}
                confirmLoading={isStatusSubmitting}
                okText={moderationAction === 'ban' ? t('admin.organizations.manage.moderationModal.banSubmit') : t('admin.organizations.manage.moderationModal.suspendSubmit')}
                cancelText={t('admin.organizations.manage.moderationModal.cancel')}
                onCancel={() => setIsModerationModalOpen(false)}
                onOk={async () => {
                    if (moderationAction === 'suspend') {
                        if (!suspensionDays || suspensionDays <= 0) {
                            messageApi.error(t('admin.organizations.manage.moderationModal.daysRequired'))
                            return
                        }

                        await onChangeAccountStatus({
                            status: 'Suspended',
                            suspensionDays,
                        })
                        return
                    }

                    await onChangeAccountStatus({ status: 'Banned' })
                }}
            >
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <Typography.Text style={{ color: '#6b7280' }}>
                        {t('admin.organizations.manage.moderationModal.description')}
                    </Typography.Text>

                    <Radio.Group
                        value={moderationAction}
                        onChange={(event) => setModerationAction(event.target.value)}
                    >
                        <Space direction="vertical">
                            <Radio value="suspend">{t('admin.organizations.manage.moderationModal.suspend')}</Radio>
                            <Radio value="ban">{t('admin.organizations.manage.moderationModal.ban')}</Radio>
                        </Space>
                    </Radio.Group>

                    {moderationAction === 'suspend' ? (
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            <Typography.Text>{t('admin.organizations.manage.moderationModal.daysLabel')}</Typography.Text>
                            <InputNumber min={1} max={365} value={suspensionDays} onChange={(value) => setSuspensionDays(Number(value) || 0)} style={{ width: '100%' }} />
                        </Space>
                    ) : (
                        <Typography.Text style={{ color: '#dc2626' }}>
                            {t('admin.organizations.manage.moderationModal.banWarning')}
                        </Typography.Text>
                    )}
                </Space>
            </Modal>
        </Space>
    )
}

export default OrganizationManagementSection
