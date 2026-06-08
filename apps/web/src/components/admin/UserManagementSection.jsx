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

function getUserStatusLabel(status, t) {
    if (status === 'Active') {
        return t('admin.users.manage.statuses.active')
    }

    if (status === 'Suspended') {
        return t('admin.users.manage.statuses.suspended')
    }

    if (status === 'Banned') {
        return t('admin.users.manage.statuses.banned')
    }

    return t('admin.users.manage.statuses.inactive')
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

function UserManagementSection({ mode = 'manage' }) {
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

    const loadUsers = useCallback(async ({
        nextPageNumber = pageNumber,
        nextPageSize = pageSize,
        nextFilterKey = filterKey,
        nextQuery = appliedQuery,
    } = {}) => {
        setIsLoading(true)
        setErrorText('')

        const result = await getAdminAccounts({
            type: 'Individual',
            pageNumber: nextPageNumber,
            pageSize: nextPageSize,
            ...buildAccountFilters(nextFilterKey, nextQuery),
        })

        if (!result.isSuccess) {
            setErrorText(result.errors?.[0]?.message || t(isBannedView ? 'admin.users.banned.error' : 'admin.users.manage.error'))
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
            await loadUsers()
            if (isCancelled) {
                return
            }
        }

        run().catch(() => {
            if (isCancelled) {
                return
            }

            setErrorText(t(isBannedView ? 'admin.users.banned.error' : 'admin.users.manage.error'))
            setRows([])
            setTotalCount(0)
            setIsLoading(false)
        })

        return () => {
            isCancelled = true
        }
    }, [isBannedView, loadUsers, t])

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
            setDetailErrorText(result.errors?.[0]?.message || t(isBannedView ? 'admin.users.banned.detailsError' : 'admin.users.manage.detailsError'))
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
            messageApi.error(result.errors?.[0]?.message || t(isBannedView ? 'admin.users.banned.actionError' : 'admin.users.manage.actionError'))
            setIsStatusSubmitting(false)
            return false
        }

        if (payload.status === 'Active') {
            messageApi.success(t(isBannedView ? 'admin.users.banned.unbanSuccess' : 'admin.users.manage.activateSuccess'))
        } else if (payload.status === 'Deactivated') {
            messageApi.success(t('admin.users.manage.deactivateSuccess'))
        } else if (payload.status === 'Suspended') {
            messageApi.success(t('admin.users.manage.suspendSuccess'))
        } else if (payload.status === 'Banned') {
            messageApi.success(t('admin.users.manage.banSuccess'))
        }

        setIsStatusSubmitting(false)
        setIsDetailOpen(false)
        setIsModerationModalOpen(false)
        await loadUsers()
        return true
    }, [activeAccountId, isBannedView, loadUsers, messageApi, t])

    const columns = useMemo(
        () => [
            {
                title: t('admin.users.manage.columns.name'),
                key: 'name',
                render: (_, row) => <span style={{ fontWeight: 600 }}>{row.displayName || row.DisplayName || row.username || row.Username || '-'}</span>,
            },
            {
                title: t('admin.users.manage.columns.username'),
                dataIndex: 'username',
                key: 'username',
                render: (value, row) => value || row.Username || '-',
            },
            {
                title: t('admin.users.manage.columns.contact'),
                key: 'contact',
                render: (_, row) => row.email || row.Email || row.phone || row.Phone || '-',
            },
            {
                title: t('admin.users.manage.columns.status'),
                dataIndex: 'status',
                key: 'status',
                render: (value) => {
                    const normalizedStatus = normalizeAccountStatus(value)
                    return <Tag color={getStatusColor(normalizedStatus)}>{getUserStatusLabel(normalizedStatus, t)}</Tag>
                },
            },
        ],
        [t],
    )

    const selectedAccountStatus = normalizeAccountStatus(selectedAccount?.status ?? selectedAccount?.Status)
    const suspendedUntilUtc = selectedAccount?.suspendedUntilUtc || selectedAccount?.SuspendedUntilUtc
    const userProfile = selectedAccount?.userProfile || selectedAccount?.UserProfile
    const detailTitle = isBannedView ? t('admin.users.banned.detailsTitle') : t('admin.users.manage.detailsTitle')
    const canActivate = !isBannedView && selectedAccountStatus !== 'Active' && selectedAccountStatus !== 'Banned'
    const canDeactivate = !isBannedView && !['Deactivated', 'Banned'].includes(selectedAccountStatus)
    const canModerate = !isBannedView && selectedAccountStatus !== 'Banned'

    return (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {contextHolder}

            <Typography.Paragraph style={{ marginBottom: 0, color: '#6b7280' }}>
                {t(isBannedView ? 'admin.users.banned.description' : 'admin.users.manage.description')}
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
                            { label: t('admin.users.manage.filters.all'), value: 'all' },
                            { label: t('admin.users.manage.filters.active'), value: 'active' },
                            { label: t('admin.users.manage.filters.inactive'), value: 'inactive' },
                        ]}
                    />
                )}

                <Input.Search
                    allowClear
                    placeholder={t('admin.users.manage.searchPlaceholder')}
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
                emptyText={t(isBannedView ? 'admin.users.banned.empty' : 'admin.users.manage.empty')}
                onInfoCardClick={(row) => openAccountDetail(row)}
                infoCardColumnTitle={t('admin.users.manage.columns.infoCard')}
                infoCardLabel={t('admin.users.manage.infoCard')}
            />

            <Drawer
                title={detailTitle}
                open={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                width={isMobile ? '100%' : 720}
                extra={
                    <Space>
                        <Button onClick={() => setIsDetailOpen(false)}>
                            {t('admin.users.manage.close')}
                        </Button>
                        {isBannedView ? (
                            <Button
                                type="primary"
                                loading={isStatusSubmitting}
                                onClick={() => onChangeAccountStatus('Active')}
                            >
                                {t('admin.users.banned.unban')}
                            </Button>
                        ) : (
                            <>
                                <Button
                                    type="primary"
                                    loading={isStatusSubmitting}
                                    disabled={!canActivate}
                                    onClick={() => onChangeAccountStatus('Active')}
                                >
                                    {t('admin.users.manage.activate')}
                                </Button>
                                <Button
                                    loading={isStatusSubmitting}
                                    disabled={!canDeactivate}
                                    onClick={() => onChangeAccountStatus('Deactivated')}
                                >
                                    {t('admin.users.manage.deactivate')}
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
                                    {t('admin.users.manage.moderate')}
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
                        <Descriptions.Item label={t('admin.users.manage.attributes.accountId')}>{selectedAccount.accountId || selectedAccount.AccountId || '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.users.manage.attributes.name')}>{String(userProfile?.name || userProfile?.Name || selectedAccount.displayName || selectedAccount.DisplayName || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.users.manage.attributes.surname')}>{String(userProfile?.surname || userProfile?.Surname || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.users.manage.attributes.username')}>{selectedAccount.username || selectedAccount.Username || '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.users.manage.attributes.email')}>{selectedAccount.email || selectedAccount.Email || '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.users.manage.attributes.phone')}>{selectedAccount.phone || selectedAccount.Phone || '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.users.manage.attributes.bio')}>{String(userProfile?.bio || userProfile?.Bio || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.users.manage.attributes.status')}>{getUserStatusLabel(selectedAccountStatus, t)}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.users.manage.attributes.isActive')}>{String(selectedAccount.isActive ?? selectedAccount.IsActive ?? false)}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.users.manage.attributes.suspendedUntil')}>{String(suspendedUntilUtc || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.users.manage.attributes.createdAt')}>{String(selectedAccount.createdAt || selectedAccount.CreatedAt || '-')}</Descriptions.Item>
                    </Descriptions>
                ) : null}
            </Drawer>

            <Modal
                title={t('admin.users.manage.moderationModal.title')}
                open={isModerationModalOpen}
                confirmLoading={isStatusSubmitting}
                okText={moderationAction === 'ban' ? t('admin.users.manage.moderationModal.banSubmit') : t('admin.users.manage.moderationModal.suspendSubmit')}
                cancelText={t('admin.users.manage.moderationModal.cancel')}
                onCancel={() => setIsModerationModalOpen(false)}
                onOk={async () => {
                    if (moderationAction === 'suspend') {
                        if (!suspensionDays || suspensionDays <= 0) {
                            messageApi.error(t('admin.users.manage.moderationModal.daysRequired'))
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
                        {t('admin.users.manage.moderationModal.description')}
                    </Typography.Text>

                    <Radio.Group
                        value={moderationAction}
                        onChange={(event) => setModerationAction(event.target.value)}
                    >
                        <Space direction="vertical">
                            <Radio value="suspend">{t('admin.users.manage.moderationModal.suspend')}</Radio>
                            <Radio value="ban">{t('admin.users.manage.moderationModal.ban')}</Radio>
                        </Space>
                    </Radio.Group>

                    {moderationAction === 'suspend' ? (
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            <Typography.Text>{t('admin.users.manage.moderationModal.daysLabel')}</Typography.Text>
                            <InputNumber min={1} max={365} value={suspensionDays} onChange={(value) => setSuspensionDays(Number(value) || 0)} style={{ width: '100%' }} />
                        </Space>
                    ) : (
                        <Typography.Text style={{ color: '#dc2626' }}>
                            {t('admin.users.manage.moderationModal.banWarning')}
                        </Typography.Text>
                    )}
                </Space>
            </Modal>
        </Space>
    )
}

export default UserManagementSection
