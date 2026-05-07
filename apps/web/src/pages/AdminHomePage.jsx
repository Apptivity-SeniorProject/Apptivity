import { CalendarOutlined, LeftOutlined, LogoutOutlined, RightOutlined, UserSwitchOutlined } from '@ant-design/icons'
import { Button, ConfigProvider, Layout, Menu, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import EventApprovalSection from '../components/admin/EventApprovalSection'
import UserApprovalSection from '../components/admin/UserApprovalSection'
import { clearAuthSession, getAuthSession } from '../services/sessionService'

function AdminHomePage() {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const session = getAuthSession()
    const isAdmin = session?.role === 'admin'
    const [selectedKey, setSelectedKey] = useState('event-approval')
    const [isCollapsed, setIsCollapsed] = useState(false)

    useEffect(() => {
        if (!isAdmin) {
            navigate('/login/admin', { replace: true })
        }
    }, [isAdmin, navigate])

    const menuItems = [
        {
            key: 'event-approval',
            icon: <CalendarOutlined />,
            label: t('admin.menu.eventApproval'),
        },
        {
            key: 'user-approval',
            icon: <UserSwitchOutlined />,
            label: t('admin.menu.userApproval'),
        },
    ]

    if (!isAdmin) {
        return null
    }

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#1677ff',
                    borderRadius: 12,
                    colorText: '#111111',
                },
                components: {
                    Menu: {
                        itemColor: '#1f2937',
                        itemHoverColor: '#1677ff',
                        itemSelectedColor: '#ffffff',
                        itemSelectedBg: '#1677ff',
                    },
                },
            }}
        >
            <Layout style={{ minHeight: '100vh', background: '#f7f7f7' }}>
                <Layout.Header
                    style={{
                        background: '#ffffff',
                        borderBottom: '1px solid #e5e7eb',
                        paddingInline: 24,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Typography.Title level={5} style={{ margin: 0 }}>
                        {t('admin.brand')}
                    </Typography.Title>
                    <Button
                        icon={<LogoutOutlined />}
                        onClick={() => {
                            clearAuthSession()
                            navigate('/login/admin', { replace: true })
                        }}
                    >
                        {t('admin.logout')}
                    </Button>
                </Layout.Header>

                <Layout style={{ flex: 1, minHeight: 0 }}>
                <Layout.Sider
                    width={280}
                    collapsedWidth={72}
                    collapsed={isCollapsed}
                    trigger={null}
                    style={{
                        background: '#ffffff',
                        borderRight: '1px solid #e5e7eb',
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0,
                        overflow: 'hidden',
                    }}
                >
                    <div style={{ width: '100%', flex: 1, minHeight: 0, overflow: 'hidden', padding: '12px 10px 8px' }}>
                        <Menu
                            mode="inline"
                            inlineCollapsed={isCollapsed}
                            selectedKeys={[selectedKey]}
                            items={menuItems}
                            onClick={({ key }) => setSelectedKey(key)}
                            style={{ borderInlineEnd: 'none', height: '100%', overflowY: 'auto', overflowX: 'hidden' }}
                        />
                    </div>

                    <div
                        style={{
                            borderTop: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            flexShrink: 0,
                            background: '#ffffff',
                            minHeight: 38,
                        }}
                    >
                        <Button
                            type="text"
                            icon={isCollapsed ? <RightOutlined /> : <LeftOutlined />}
                            onClick={() => setIsCollapsed((prev) => !prev)}
                            style={{
                                color: '#374151',
                                paddingInline: 8,
                                height: 28,
                            }}
                            aria-label={isCollapsed ? 'Open admin menu' : 'Close admin menu'}
                        />
                    </div>
                </Layout.Sider>

                <Layout>
                    <Layout.Content style={{ padding: 24 }}>
                        <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>
                            {selectedKey === 'user-approval' ? t('admin.menu.userApproval') : t('admin.menu.eventApproval')}
                        </Typography.Title>

                        {selectedKey === 'event-approval' ? (
                            <EventApprovalSection />
                        ) : selectedKey === 'user-approval' ? (
                            <UserApprovalSection />
                        ) : (
                            <Typography.Text style={{ color: '#6b7280' }}>
                                {t('admin.placeholderText')}
                            </Typography.Text>
                        )}
                    </Layout.Content>
                </Layout>
                </Layout>
            </Layout>
        </ConfigProvider>
    )
}

export default AdminHomePage
