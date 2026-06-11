import { CalendarOutlined, LeftOutlined, LogoutOutlined, MenuOutlined, RightOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
import { Button, ConfigProvider, Drawer, Grid, Layout, Menu, Space, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import LanguageSwitcher from '../components/common/LanguageSwitcher'
import OrganizationApplicationsSection from '../components/organization/OrganizationApplicationsSection'
import OrganizationCreateEventSection from '../components/organization/OrganizationCreateEventSection'
import OrganizationMyEventsSection from '../components/organization/OrganizationMyEventsSection'
import OrganizationProfileSection from '../components/organization/OrganizationProfileSection'
import { clearAuthSession, getAuthSession } from '../services/sessionService'

function OrganizationHomePage() {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const screens = Grid.useBreakpoint()
    const isMobile = !screens.md
    const session = getAuthSession()
    const isOrganization = session?.role === 'organization'
    const [selectedKey, setSelectedKey] = useState('my-events')
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    useEffect(() => {
        if (!isOrganization) {
            navigate('/login/organization', { replace: true })
        }
    }, [isOrganization, navigate])

    const menuItems = [
        {
            key: 'my-events',
            icon: <CalendarOutlined />,
            label: t('organization.menu.myEvents'),
        },
        {
            key: 'create-event',
            icon: <CalendarOutlined />,
            label: t('organization.menu.createEvent'),
        },
        {
            key: 'applications',
            icon: <TeamOutlined />,
            label: t('organization.menu.applications'),
        },
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: t('organization.menu.profile'),
        },
    ]

    if (!isOrganization) {
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
                        paddingInline: isMobile ? 12 : 24,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Space size={10}>
                        {isMobile ? (
                            <Button
                                type="text"
                                icon={<MenuOutlined />}
                                onClick={() => setIsMobileMenuOpen(true)}
                                aria-label={t('organization.navigation.openMenu')}
                            />
                        ) : null}
                        <Typography.Title
                            level={5}
                            style={{
                                margin: 0,
                                maxWidth: isMobile ? '42vw' : 'none',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                fontSize: isMobile ? 14 : undefined,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}
                        >
                            <img src="/logo-monochrome.png" alt="Apptivity" style={{ height: 20, width: 'auto' }} />
                            {t('organization.brand')}
                        </Typography.Title>
                    </Space>
                    <Space size={12}>
                        <LanguageSwitcher />
                        <Button
                            icon={<LogoutOutlined />}
                            onClick={() => {
                                clearAuthSession()
                                navigate('/login/organization', { replace: true })
                            }}
                        >
                            {isMobile ? null : t('organization.logout')}
                        </Button>
                    </Space>
                </Layout.Header>

                <Layout style={{ flex: 1, minHeight: 0 }}>
                    {isMobile ? null : (
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
                                    aria-label={isCollapsed ? t('organization.navigation.openMenu') : t('organization.navigation.closeMenu')}
                                />
                            </div>
                        </Layout.Sider>
                    )}

                    <Layout>
                        <Layout.Content style={{ padding: isMobile ? 12 : 24 }}>
                            <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>
                                {selectedKey === 'applications'
                                    ? t('organization.menu.applications')
                                    : selectedKey === 'create-event'
                                        ? t('organization.menu.createEvent')
                                    : selectedKey === 'my-events'
                                        ? t('organization.menu.myEvents')
                                        : t('organization.menu.profile')}
                            </Typography.Title>
                            {selectedKey === 'profile' ? (
                                <OrganizationProfileSection />
                            ) : selectedKey === 'my-events' ? (
                                <OrganizationMyEventsSection />
                            ) : selectedKey === 'create-event' ? (
                                <OrganizationCreateEventSection />
                            ) : selectedKey === 'applications' ? (
                                <OrganizationApplicationsSection />
                            ) : (
                                <Typography.Text style={{ color: '#6b7280' }}>
                                    {t('organization.placeholderText')}
                                </Typography.Text>
                            )}
                        </Layout.Content>
                    </Layout>
                </Layout>
            </Layout>
            <Drawer
                title={t('organization.brand')}
                placement="left"
                open={isMobile && isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                width={280}
            >
                <Menu
                    mode="inline"
                    selectedKeys={[selectedKey]}
                    items={menuItems}
                    onClick={({ key }) => {
                        setSelectedKey(key)
                        setIsMobileMenuOpen(false)
                    }}
                    style={{ borderInlineEnd: 'none' }}
                />
            </Drawer>
        </ConfigProvider>
    )
}

export default OrganizationHomePage
