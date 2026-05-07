import { Button, Descriptions, Drawer, Segmented, Space, Spin, Tag, Typography, message } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DataGrid from '../common/DataGrid'
import { getAdminAccounts, getProfileById, updateAdminAccountStatus } from '../../services/adminService'

const ACCOUNT_STATUS_QUERY = {
    pending: 'Suspended',
    approved: 'Active',
    rejected: 'Banned',
}

function normalizeAccountStatus(value) {
    const numeric = Number(value)
    if (numeric === 1) return 'Active'
    if (numeric === 2) return 'Suspended'
    if (numeric === 4) return 'Banned'
    return String(value || '')
}

function normalizeAccountType(value) {
    const numeric = Number(value)
    if (numeric === 1) return 'Individual'
    if (numeric === 2) return 'Organization'
    if (numeric === 3) return 'Admin'
    return String(value || '')
}

function UserApprovalSection() {
    const { t } = useTranslation()
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
    const [selectedAccount, setSelectedAccount] = useState(null)
    const [isStatusSubmitting, setIsStatusSubmitting] = useState(false)
    const [activeAccountId, setActiveAccountId] = useState('')

    const loadAccounts = useCallback(async ({ nextPageNumber = pageNumber, nextPageSize = pageSize, nextStatusFilter = statusFilter } = {}) => {
        setIsLoading(true)
        setErrorText('')

        const result = await getAdminAccounts({
            status: ACCOUNT_STATUS_QUERY[nextStatusFilter],
            pageNumber: nextPageNumber,
            pageSize: nextPageSize,
        })

        if (!result.isSuccess) {
            const backendMessage = result.errors?.[0]?.message || t('admin.accounts.error')
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
    }, [pageNumber, pageSize, statusFilter, t])

    useEffect(() => {
        let isCancelled = false

        async function run() {
            await loadAccounts()
            if (isCancelled) {
                return
            }
        }

        run().catch(() => {
            if (isCancelled) {
                return
            }

            setErrorText(t('admin.accounts.error'))
            setRows([])
            setTotalCount(0)
            setIsLoading(false)
        })

        return () => {
            isCancelled = true
        }
    }, [loadAccounts, t])

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
            setDetailErrorText(result.errors?.[0]?.message || t('admin.accounts.detailsError'))
            setIsDetailLoading(false)
            return
        }

        const detail = result.data || {}
        setSelectedAccount({
            ...accountRow,
            ...detail,
        })
        setIsDetailLoading(false)
    }, [t])

    const onChangeAccountStatus = async (targetStatus) => {
        if (!activeAccountId) {
            return
        }

        setIsStatusSubmitting(true)
        const result = await updateAdminAccountStatus(activeAccountId, targetStatus)
        if (!result.isSuccess) {
            messageApi.error(result.errors?.[0]?.message || t('admin.accounts.actionError'))
            setIsStatusSubmitting(false)
            return
        }

        messageApi.success(targetStatus === 'Active' ? t('admin.accounts.approveSuccess') : t('admin.accounts.rejectSuccess'))
        setIsStatusSubmitting(false)
        setIsDetailOpen(false)
        await loadAccounts()
    }

    const columns = useMemo(
        () => [
            {
                title: t('admin.accounts.columns.username'),
                dataIndex: 'username',
                key: 'username',
                render: (value, row) => <span style={{ fontWeight: 600 }}>{value || row.Username || '-'}</span>,
            },
            {
                title: t('admin.accounts.columns.contact'),
                key: 'contact',
                render: (_, row) => row.email || row.Email || row.phone || row.Phone || '-',
            },
            {
                title: t('admin.accounts.columns.type'),
                dataIndex: 'type',
                key: 'type',
                render: (value) => {
                    const raw = String(value ?? '')
                    const numeric = Number(raw)
                    const typeByValue = {
                        1: t('admin.accounts.types.individual'),
                        2: t('admin.accounts.types.organization'),
                        3: t('admin.accounts.types.admin'),
                    }
                    const typeByName = {
                        Individual: t('admin.accounts.types.individual'),
                        Organization: t('admin.accounts.types.organization'),
                        Admin: t('admin.accounts.types.admin'),
                    }

                    return typeByValue[numeric] || typeByName[raw] || raw || '-'
                },
            },
            {
                title: t('admin.accounts.columns.status'),
                dataIndex: 'status',
                key: 'status',
                render: (value) => {
                    const raw = String(value ?? '')
                    const numeric = Number(raw)
                    const labelByValue = {
                        1: t('admin.accounts.filters.approved'),
                        2: t('admin.accounts.filters.pending'),
                        4: t('admin.accounts.filters.rejected'),
                    }
                    const labelByName = {
                        Active: t('admin.accounts.filters.approved'),
                        Suspended: t('admin.accounts.filters.pending'),
                        Banned: t('admin.accounts.filters.rejected'),
                    }

                    return (
                        <Tag color="blue">
                            {labelByValue[numeric] || labelByName[raw] || raw}
                        </Tag>
                    )
                },
            },
        ],
        [t],
    )

    const selectedAccountStatus = normalizeAccountStatus(selectedAccount?.status ?? selectedAccount?.Status)
    const canModerateSelectedAccount = selectedAccountStatus === 'Suspended'
    const selectedAccountType = normalizeAccountType(selectedAccount?.type ?? selectedAccount?.Type)
    const userProfile = selectedAccount?.userProfile || selectedAccount?.UserProfile
    const clubProfile = selectedAccount?.clubProfile || selectedAccount?.ClubProfile

    return (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {contextHolder}
            <Segmented
                value={statusFilter}
                onChange={(nextStatus) => {
                    setStatusFilter(nextStatus)
                    setPageNumber(1)
                }}
                options={[
                    { label: t('admin.accounts.filters.pending'), value: 'pending' },
                    { label: t('admin.accounts.filters.approved'), value: 'approved' },
                    { label: t('admin.accounts.filters.rejected'), value: 'rejected' },
                ]}
            />

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
                emptyText={t('admin.accounts.empty')}
                onInfoCardClick={(row) => openAccountDetail(row)}
                infoCardColumnTitle={t('admin.accounts.columns.infoCard')}
                infoCardLabel={t('admin.accounts.infoCard')}
            />

            <Drawer
                title={t('admin.accounts.detailsTitle')}
                open={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                width={720}
                extra={
                    <Space>
                        <Button onClick={() => setIsDetailOpen(false)}>
                            {t('admin.accounts.close')}
                        </Button>
                        <Button
                            type="primary"
                            loading={isStatusSubmitting}
                            disabled={!canModerateSelectedAccount}
                            onClick={() => onChangeAccountStatus('Active')}
                        >
                            {t('admin.accounts.approve')}
                        </Button>
                        <Button
                            danger
                            loading={isStatusSubmitting}
                            disabled={!canModerateSelectedAccount}
                            onClick={() => onChangeAccountStatus('Banned')}
                        >
                            {t('admin.accounts.reject')}
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
                ) : selectedAccount ? (
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label={t('admin.accounts.attributes.accountId')}>{selectedAccount.accountId || selectedAccount.AccountId || '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.accounts.attributes.username')}>{selectedAccount.username || selectedAccount.Username || '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.accounts.attributes.email')}>{selectedAccount.email || selectedAccount.Email || '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.accounts.attributes.phone')}>{selectedAccount.phone || selectedAccount.Phone || '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.accounts.attributes.type')}>{selectedAccountType}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.accounts.attributes.status')}>{selectedAccountStatus || '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.accounts.attributes.isActive')}>{String(selectedAccount.isActive ?? selectedAccount.IsActive ?? false)}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.accounts.attributes.reportCount')}>{String(selectedAccount.reportCount ?? selectedAccount.ReportCount ?? 0)}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.accounts.attributes.createdAt')}>{String(selectedAccount.createdAt || selectedAccount.CreatedAt || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.accounts.attributes.profilePhoto')}>{String(selectedAccount.profilePhoto || selectedAccount.ProfilePhoto || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.accounts.attributes.socialLinks')}>{String(selectedAccount.socialLinks || selectedAccount.SocialLinks || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.accounts.attributes.userProfileName')}>{String(userProfile?.name || userProfile?.Name || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.accounts.attributes.userProfileSurname')}>{String(userProfile?.surname || userProfile?.Surname || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.accounts.attributes.userProfileBio')}>{String(userProfile?.bio || userProfile?.Bio || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.accounts.attributes.clubProfileName')}>{String(clubProfile?.name || clubProfile?.Name || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.accounts.attributes.clubProfileDescription')}>{String(clubProfile?.description || clubProfile?.Description || '-')}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.accounts.attributes.clubProfileCity')}>{String(clubProfile?.city || clubProfile?.City || '-')}</Descriptions.Item>
                    </Descriptions>
                ) : null}
            </Drawer>
        </Space>
    )
}

export default UserApprovalSection
