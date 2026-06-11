import { EyeOutlined } from '@ant-design/icons'
import { Button, Drawer, Select, Space, Table, Tag, Typography, message } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getAdminChatReportDetail, getAdminChatReports } from '../../services/adminService'

const { Title, Text } = Typography

export default function ChatReportsSection() {
    const { t } = useTranslation()
    const [pageNumber, setPageNumber] = useState(1)
    const [statusFilter, setStatusFilter] = useState('')
    const [rows, setRows] = useState([])
    const [totalCount, setTotalCount] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [reportDetail, setReportDetail] = useState(null)
    const [isDetailLoading, setIsDetailLoading] = useState(false)
    const [messageApi, contextHolder] = message.useMessage()

    const statuses = useMemo(() => ({
        1: { label: t('admin.reports.statuses.pending'), color: 'warning' },
        2: { label: t('admin.reports.statuses.resolved'), color: 'success' },
        3: { label: t('admin.reports.statuses.ignored'), color: 'default' },
    }), [t])

    const reasons = useMemo(() => ({
        1: t('admin.reports.reasonCategories.spam'),
        2: t('admin.reports.reasonCategories.inappropriate'),
        3: t('admin.reports.reasonCategories.fake'),
        4: t('admin.reports.reasonCategories.harassment'),
        5: t('admin.reports.reasonCategories.violence'),
        6: t('admin.reports.reasonCategories.other'),
    }), [t])

    const fetchReports = useCallback(async () => {
        setIsLoading(true)
        try {
            const response = await getAdminChatReports({
                pageNumber,
                pageSize: 20,
                status: statusFilter || undefined,
            })

            if (response.isSuccess && response.data) {
                setRows(response.data.items || [])
                setTotalCount(response.data.totalCount || 0)
            } else {
                messageApi.error(response.errors?.[0]?.message || t('admin.chatReports.error'))
                setRows([])
                setTotalCount(0)
            }
        } catch {
            messageApi.error(t('admin.chatReports.error'))
            setRows([])
            setTotalCount(0)
        } finally {
            setIsLoading(false)
        }
    }, [messageApi, pageNumber, statusFilter, t])

    useEffect(() => {
        const timerId = setTimeout(() => {
            void fetchReports()
        }, 0)

        return () => {
            clearTimeout(timerId)
        }
    }, [fetchReports])

    const openDetail = useCallback(async (reportId) => {
        setIsDetailOpen(true)
        setIsDetailLoading(true)

        try {
            const response = await getAdminChatReportDetail(reportId)
            if (response.isSuccess && response.data) {
                setReportDetail(response.data)
            } else {
                messageApi.error(response.errors?.[0]?.message || t('admin.chatReports.detailsError'))
                setIsDetailOpen(false)
            }
        } catch {
            messageApi.error(t('admin.chatReports.detailsError'))
            setIsDetailOpen(false)
        } finally {
            setIsDetailLoading(false)
        }
    }, [messageApi, t])

    const columns = useMemo(() => [
        {
            title: t('admin.chatReports.columns.reporter'),
            dataIndex: 'reporterUsername',
            key: 'reporterUsername',
        },
        {
            title: t('admin.chatReports.columns.event'),
            dataIndex: 'eventName',
            key: 'eventName',
        },
        {
            title: t('admin.chatReports.columns.reason'),
            key: 'reasonCategory',
            render: (_, record) => reasons[record.reasonCategory] || t('admin.chatReports.unknown'),
        },
        {
            title: t('admin.chatReports.columns.status'),
            key: 'status',
            render: (_, record) => {
                const info = statuses[record.status]
                if (!info) return String(record.status)
                return <Tag color={info.color}>{info.label}</Tag>
            },
        },
        {
            title: t('admin.chatReports.columns.createdAt'),
            key: 'createdAt',
            render: (_, record) => {
                if (!record.createdAt) return '-'
                return new Date(record.createdAt).toLocaleString()
            },
        },
        {
            title: t('admin.chatReports.columns.details'),
            key: 'actions',
            align: 'right',
            render: (_, record) => (
                <Button
                    type="text"
                    icon={<EyeOutlined />}
                    onClick={() => openDetail(record.reportId || record.ReportId)}
                    aria-label={t('admin.chatReports.columns.details')}
                />
            ),
        },
    ], [openDetail, reasons, statuses, t])

    return (
        <div style={{ padding: '24px 0' }}>
            {contextHolder}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>{t('admin.menu.reports.chat')}</Title>
                <Space>
                    <Select
                        value={statusFilter}
                        onChange={(value) => {
                            setStatusFilter(value)
                            setPageNumber(1)
                        }}
                        style={{ width: 150 }}
                        options={[
                            { value: '', label: t('admin.reports.statuses.all') },
                            { value: '1', label: t('admin.reports.statuses.pending') },
                            { value: '2', label: t('admin.reports.statuses.resolved') },
                            { value: '3', label: t('admin.reports.statuses.ignored') },
                        ]}
                    />
                    <Button onClick={() => void fetchReports()} loading={isLoading}>
                        {t('admin.chatReports.refresh')}
                    </Button>
                </Space>
            </div>

            <Table
                dataSource={rows}
                columns={columns}
                rowKey={(row) => row.reportId || row.ReportId}
                loading={isLoading}
                pagination={{
                    current: pageNumber,
                    pageSize: 20,
                    total: totalCount,
                    onChange: (page) => setPageNumber(page),
                }}
            />

            <Drawer
                title={t('admin.chatReports.detailsTitle')}
                width={500}
                open={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
            >
                {isDetailLoading || !reportDetail ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <Text type="secondary">{t('admin.chatReports.loading')}</Text>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                            <Text type="secondary">{t('admin.chatReports.fields.reporter')}</Text>
                            <div style={{ fontWeight: 600 }}>{reportDetail.reporterUsername}</div>
                        </div>

                        <div>
                            <Text type="secondary">{t('admin.chatReports.fields.event')}</Text>
                            <div style={{ fontWeight: 600 }}>{reportDetail.eventName}</div>
                        </div>

                        <div>
                            <Text type="secondary">{t('admin.chatReports.fields.reason')}</Text>
                            <div>
                                <Tag color="error">{reasons[reportDetail.reasonCategory] || t('admin.chatReports.unknown')}</Tag>
                            </div>
                        </div>

                        {reportDetail.description ? (
                            <div>
                                <Text type="secondary">{t('admin.chatReports.fields.description')}</Text>
                                <div style={{ background: '#fafafa', padding: 12, borderRadius: 8, marginTop: 4 }}>
                                    {reportDetail.description}
                                </div>
                            </div>
                        ) : null}

                        <div>
                            <Title level={5}>{t('admin.chatReports.snapshotTitle')}</Title>
                            <div
                                style={{
                                    background: '#f5f5f5',
                                    padding: 16,
                                    borderRadius: 8,
                                    height: 400,
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 12,
                                }}
                            >
                                {!reportDetail.messages || reportDetail.messages.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#999', marginTop: 40 }}>
                                        {t('admin.chatReports.emptySnapshot')}
                                    </div>
                                ) : (
                                    reportDetail.messages.map((messageItem, index) => {
                                        const isReporter = messageItem.senderAccountId === reportDetail.reporterId
                                        return (
                                            <div
                                                key={index}
                                                style={{
                                                    alignSelf: isReporter ? 'flex-end' : 'flex-start',
                                                    maxWidth: '85%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontSize: 10,
                                                        color: '#888',
                                                        marginBottom: 2,
                                                        textAlign: isReporter ? 'right' : 'left',
                                                    }}
                                                >
                                                    {messageItem.senderDisplayName} {isReporter ? t('admin.chatReports.reporterBadge') : ''}
                                                </div>
                                                <div
                                                    style={{
                                                        background: isReporter ? '#1677ff' : '#fff',
                                                        color: isReporter ? '#fff' : '#000',
                                                        padding: '8px 12px',
                                                        borderRadius: 8,
                                                        border: isReporter ? 'none' : '1px solid #d9d9d9',
                                                    }}
                                                >
                                                    <div style={{ fontSize: 14 }}>{messageItem.content}</div>
                                                    <div
                                                        style={{
                                                            fontSize: 10,
                                                            marginTop: 4,
                                                            textAlign: 'right',
                                                            color: isReporter ? 'rgba(255,255,255,0.7)' : '#999',
                                                        }}
                                                    >
                                                        {new Date(messageItem.originalSentAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    )
}
