import { DeleteOutlined } from '@ant-design/icons'
import { Button, Descriptions, Drawer, Popconfirm, Space, Typography, message } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import DataGrid from '../common/DataGrid'
import { deleteAdminFeedback, getAdminFeedback } from '../../services/feedbackService'

function formatDateTime(value) {
    if (!value) {
        return '-'
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return String(value)
    }

    return new Intl.DateTimeFormat('tr-TR', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date)
}

function getFullName(row) {
    const firstName = row.firstName || row.FirstName || ''
    const lastName = row.lastName || row.LastName || ''
    return `${firstName} ${lastName}`.trim() || '-'
}

function FeedbackSection() {
    const { t } = useTranslation()
    const [rows, setRows] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [errorText, setErrorText] = useState('')
    const [pageNumber, setPageNumber] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const [totalCount, setTotalCount] = useState(0)
    const [selectedFeedback, setSelectedFeedback] = useState(null)
    const [refresh, setRefresh] = useState(0)

    useEffect(() => {
        let isCancelled = false

        async function loadFeedback() {
            setIsLoading(true)
            setErrorText('')

            const result = await getAdminFeedback({
                pageNumber,
                pageSize,
            })

            if (isCancelled) {
                return
            }

            if (!result.isSuccess) {
                setErrorText(result.errors?.[0]?.message || t('admin.feedback.error'))
                setRows([])
                setTotalCount(0)
                setIsLoading(false)
                return
            }

            const data = result.data || {}
            setRows(data.items || data.Items || [])
            setTotalCount(data.totalCount ?? data.TotalCount ?? 0)
            setIsLoading(false)
        }

        loadFeedback().catch(() => {
            if (isCancelled) {
                return
            }

            setErrorText(t('admin.feedback.error'))
            setRows([])
            setTotalCount(0)
            setIsLoading(false)
        })

        return () => {
            isCancelled = true
        }
    }, [pageNumber, pageSize, refresh, t])

    const handleDelete = useCallback(async (id) => {
        setIsLoading(true)
        const result = await deleteAdminFeedback(id)
        if (result.isSuccess) {
            message.success(t('admin.feedback.deleteSuccess'))
            setRefresh((prev) => prev + 1)
        } else {
            message.error(result.errors?.[0]?.message || t('admin.feedback.deleteError'))
            setIsLoading(false)
        }
    }, [t])

    const columns = useMemo(() => [
        {
            title: t('admin.feedback.columns.fullName'),
            dataIndex: 'firstName',
            key: 'fullName',
            render: (_, row) => <span style={{ fontWeight: 600 }}>{getFullName(row)}</span>,
        },
        {
            title: t('admin.feedback.columns.email'),
            dataIndex: 'email',
            key: 'email',
            render: (value, row) => value || row.Email || '-',
        },
        {
            title: t('admin.feedback.columns.message'),
            dataIndex: 'message',
            key: 'message',
            render: (value, row) => {
                const feedbackMessage = value || row.Message || ''
                return feedbackMessage.length > 120 ? `${feedbackMessage.slice(0, 120)}...` : feedbackMessage || '-'
            },
        },
        {
            title: t('admin.feedback.columns.createdAt'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (value, row) => formatDateTime(value || row.CreatedAt),
        },
        {
            title: t('admin.feedback.columns.actions'),
            key: 'actions',
            width: 100,
            render: (_, row) => (
                <Popconfirm
                    title={t('admin.feedback.deleteConfirm')}
                    onConfirm={() => handleDelete(row.feedbackId || row.FeedbackId)}
                    okText={t('admin.feedback.popconfirm.confirm')}
                    cancelText={t('admin.feedback.popconfirm.cancel')}
                >
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={(event) => event.stopPropagation()} />
                </Popconfirm>
            ),
        },
    ], [handleDelete, t])

    return (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Typography.Paragraph style={{ marginBottom: 0, color: '#4b5563' }}>
                {t('admin.feedback.description')}
            </Typography.Paragraph>

            {errorText ? (
                <Typography.Text style={{ color: '#dc2626' }}>{errorText}</Typography.Text>
            ) : null}

            <DataGrid
                columns={columns}
                rows={rows}
                rowKey={(row) => row.feedbackId || row.FeedbackId}
                loading={isLoading}
                currentPage={pageNumber}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={(nextPage, nextPageSize) => {
                    setPageNumber(nextPage)
                    setPageSize(nextPageSize)
                }}
                emptyText={t('admin.feedback.empty')}
                onInfoCardClick={(row) => setSelectedFeedback(row)}
                infoCardColumnTitle={t('admin.feedback.infoCardColumnTitle')}
                infoCardLabel={t('admin.feedback.infoCardLabel')}
            />

            <Drawer
                title={t('admin.feedback.detailsTitle')}
                open={Boolean(selectedFeedback)}
                onClose={() => setSelectedFeedback(null)}
                width={640}
            >
                {selectedFeedback ? (
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label={t('admin.feedback.attributes.fullName')}>{getFullName(selectedFeedback)}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.feedback.attributes.email')}>{selectedFeedback.email || selectedFeedback.Email || '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.feedback.attributes.ipAddress')}>{selectedFeedback.ipAddress || selectedFeedback.IpAddress || '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.feedback.attributes.userAgent')}>{selectedFeedback.userAgent || selectedFeedback.UserAgent || '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.feedback.attributes.createdAt')}>{formatDateTime(selectedFeedback.createdAt || selectedFeedback.CreatedAt)}</Descriptions.Item>
                        <Descriptions.Item label={t('admin.feedback.attributes.message')}>
                            <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                                {selectedFeedback.message || selectedFeedback.Message || '-'}
                            </Typography.Paragraph>
                        </Descriptions.Item>
                    </Descriptions>
                ) : null}
            </Drawer>
        </Space>
    )
}

export default FeedbackSection
