import { Button, Drawer, Select, Space, Table, Tag, Typography, message } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAdminChatReports, getAdminChatReportDetail } from '../../services/adminService';

const { Title, Text } = Typography;

const STATUSES = {
    1: { label: 'Bekliyor', color: 'warning' },
    2: { label: 'Çözüldü', color: 'success' },
    3: { label: 'Yoksayıldı', color: 'default' },
};

const REASONS = {
    1: 'Spam',
    2: 'Uygunsuz İçerik',
    3: 'Sahte İçerik',
    4: 'Taciz',
    5: 'Şiddet',
    6: 'Diğer'
};

export default function ChatReportsSection() {
    const { t } = useTranslation();
    const [pageNumber, setPageNumber] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const [rows, setRows] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    

    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [reportDetail, setReportDetail] = useState(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);

    const [messageApi, contextHolder] = message.useMessage();

    const fetchReports = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await getAdminChatReports({
                pageNumber,
                pageSize: 20,
                status: statusFilter || undefined
            });
            if (response.isSuccess && response.data) {
                setRows(response.data.items || []);
                setTotalCount(response.data.totalCount || 0);
            } else {
                messageApi.error(response.errors?.[0]?.message || 'Raporlar alınamadı.');
                setRows([]);
                setTotalCount(0);
            }
        } catch {
            messageApi.error('Raporlar alınamadı.');
            setRows([]);
            setTotalCount(0);
        } finally {
            setIsLoading(false);
        }
    }, [pageNumber, statusFilter, messageApi]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchReports();
    }, [fetchReports]);

    const openDetail = async (reportId) => {
        setIsDetailOpen(true);
        setIsDetailLoading(true);
        try {
            const response = await getAdminChatReportDetail(reportId);
            if (response.isSuccess && response.data) {
                setReportDetail(response.data);
            } else {
                messageApi.error(response.errors?.[0]?.message || 'Detaylar alınamadı.');
                setIsDetailOpen(false);
            }
        } catch {
            messageApi.error('Detaylar alınamadı.');
            setIsDetailOpen(false);
        } finally {
            setIsDetailLoading(false);
        }
    };

    const columns = [
        {
            title: 'Raporlayan',
            dataIndex: 'reporterUsername',
            key: 'reporterUsername',
        },
        {
            title: 'Etkinlik',
            dataIndex: 'eventName',
            key: 'eventName',
        },
        {
            title: 'Sebep',
            key: 'reasonCategory',
            render: (_, record) => {
                return REASONS[record.reasonCategory] || 'Bilinmiyor';
            }
        },
        {
            title: 'Durum',
            key: 'status',
            render: (_, record) => {
                const info = STATUSES[record.status];
                if (!info) return String(record.status);
                return <Tag color={info.color}>{info.label}</Tag>;
            }
        },
        {
            title: 'Tarih',
            key: 'createdAt',
            render: (_, record) => {
                if (!record.createdAt) return '-';
                return new Date(record.createdAt).toLocaleString();
            }
        },
        {
            title: 'Detay',
            key: 'actions',
            align: 'right',
            render: (_, record) => (
                <Button 
                    type="text" 
                    icon={<EyeOutlined />} 
                    onClick={() => openDetail(record.reportId || record.ReportId)} 
                />
            )
        }
    ];

    return (
        <div style={{ padding: '24px 0' }}>
            {contextHolder}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>{t('admin.menu.reports.chat', 'Sohbet Raporları')}</Title>
                <Space>
                    <Select
                        value={statusFilter}
                        onChange={(val) => {
                            setStatusFilter(val);
                            setPageNumber(1);
                        }}
                        style={{ width: 150 }}
                        options={[
                            { value: '', label: t('admin.reports.statuses.all', 'Tümü') },
                            { value: '1', label: t('admin.reports.statuses.pending', 'Bekliyor') },
                            { value: '2', label: t('admin.reports.statuses.resolved', 'Çözüldü') },
                            { value: '3', label: t('admin.reports.statuses.ignored', 'Yoksayıldı') },
                        ]}
                    />
                    <Button onClick={fetchReports} loading={isLoading}>
                        Yenile
                    </Button>
                </Space>
            </div>

            <Table 
                dataSource={rows}
                columns={columns}
                rowKey={(r) => r.reportId || r.ReportId}
                loading={isLoading}
                pagination={{
                    current: pageNumber,
                    pageSize: 20,
                    total: totalCount,
                    onChange: (page) => setPageNumber(page)
                }}
            />

            <Drawer
                title="Sohbet Raporu Detayı"
                width={500}
                open={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
            >
                {isDetailLoading || !reportDetail ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <Text type="secondary">Yükleniyor...</Text>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                            <Text type="secondary">Raporlayan</Text>
                            <div style={{ fontWeight: 600 }}>{reportDetail.reporterUsername}</div>
                        </div>
                        
                        <div>
                            <Text type="secondary">Etkinlik</Text>
                            <div style={{ fontWeight: 600 }}>{reportDetail.eventName}</div>
                        </div>

                        <div>
                            <Text type="secondary">Sebep</Text>
                            <div>
                                <Tag color="error">{REASONS[reportDetail.reasonCategory] || 'Bilinmiyor'}</Tag>
                            </div>
                        </div>

                        {reportDetail.description && (
                            <div>
                                <Text type="secondary">Açıklama</Text>
                                <div style={{ background: '#fafafa', padding: 12, borderRadius: 8, marginTop: 4 }}>
                                    {reportDetail.description}
                                </div>
                            </div>
                        )}

                        <div>
                            <Title level={5}>Mesaj Geçmişi (Snapshot)</Title>
                            <div style={{ 
                                background: '#f5f5f5', 
                                padding: 16, 
                                borderRadius: 8, 
                                height: 400, 
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 12
                            }}>
                                {!reportDetail.messages || reportDetail.messages.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#999', marginTop: 40 }}>
                                        Snapshot'ta mesaj bulunmuyor.
                                    </div>
                                ) : (
                                    reportDetail.messages.map((msg, idx) => {
                                        const isReporter = msg.senderAccountId === reportDetail.reporterId;
                                        return (
                                            <div 
                                                key={idx} 
                                                style={{ 
                                                    alignSelf: isReporter ? 'flex-end' : 'flex-start',
                                                    maxWidth: '85%',
                                                    display: 'flex',
                                                    flexDirection: 'column'
                                                }}
                                            >
                                                <div style={{ 
                                                    fontSize: 10, 
                                                    color: '#888', 
                                                    marginBottom: 2,
                                                    textAlign: isReporter ? 'right' : 'left'
                                                }}>
                                                    {msg.senderDisplayName} {isReporter && '(Raporlayan)'}
                                                </div>
                                                <div style={{
                                                    background: isReporter ? '#1677ff' : '#fff',
                                                    color: isReporter ? '#fff' : '#000',
                                                    padding: '8px 12px',
                                                    borderRadius: 8,
                                                    border: isReporter ? 'none' : '1px solid #d9d9d9'
                                                }}>
                                                    <div style={{ fontSize: 14 }}>{msg.content}</div>
                                                    <div style={{ 
                                                        fontSize: 10, 
                                                        marginTop: 4, 
                                                        textAlign: 'right',
                                                        color: isReporter ? 'rgba(255,255,255,0.7)' : '#999'
                                                    }}>
                                                        {new Date(msg.originalSentAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    );
}
