import { Descriptions, Drawer, Space, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import DataGrid from '../common/DataGrid'
import { getAdminFeedback } from '../../services/feedbackService'

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
    const [rows, setRows] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [errorText, setErrorText] = useState('')
    const [pageNumber, setPageNumber] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const [totalCount, setTotalCount] = useState(0)
    const [selectedFeedback, setSelectedFeedback] = useState(null)

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
                setErrorText(result.errors?.[0]?.message || 'Geri bildirimler alınamadı.')
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

            setErrorText('Geri bildirimler alınamadı.')
            setRows([])
            setTotalCount(0)
            setIsLoading(false)
        })

        return () => {
            isCancelled = true
        }
    }, [pageNumber, pageSize])

    const columns = useMemo(() => [
        {
            title: 'Ad Soyad',
            dataIndex: 'firstName',
            key: 'fullName',
            render: (_, row) => <span style={{ fontWeight: 600 }}>{getFullName(row)}</span>,
        },
        {
            title: 'E-posta',
            dataIndex: 'email',
            key: 'email',
            render: (value, row) => value || row.Email || '-',
        },
        {
            title: 'Mesaj',
            dataIndex: 'message',
            key: 'message',
            render: (value, row) => {
                const message = value || row.Message || ''
                return message.length > 120 ? `${message.slice(0, 120)}...` : message || '-'
            },
        },
        {
            title: 'Tarih',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (value, row) => formatDateTime(value || row.CreatedAt),
        },
    ], [])

    return (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Typography.Paragraph style={{ marginBottom: 0, color: '#4b5563' }}>
                Landing sayfasından iletilen geri bildirimleri buradan okuyabilirsiniz.
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
                emptyText="Henüz geri bildirim yok."
                onInfoCardClick={(row) => setSelectedFeedback(row)}
                infoCardColumnTitle="Detay"
                infoCardLabel="Oku"
            />

            <Drawer
                title="Geri Bildirim Detayı"
                open={Boolean(selectedFeedback)}
                onClose={() => setSelectedFeedback(null)}
                width={640}
            >
                {selectedFeedback ? (
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="Ad Soyad">{getFullName(selectedFeedback)}</Descriptions.Item>
                        <Descriptions.Item label="E-posta">{selectedFeedback.email || selectedFeedback.Email || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Tarih">{formatDateTime(selectedFeedback.createdAt || selectedFeedback.CreatedAt)}</Descriptions.Item>
                        <Descriptions.Item label="Mesaj">
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
