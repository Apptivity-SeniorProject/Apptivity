import { ApartmentOutlined, CalendarOutlined, FlagOutlined, LeftOutlined, LogoutOutlined, MenuOutlined, RightOutlined, UserSwitchOutlined, TagOutlined } from '@ant-design/icons'
import { Button, ConfigProvider, Drawer, Grid, Layout, Menu, Space, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import EventApprovalSection from '../components/admin/EventApprovalSection'
import OrganizationCreateSection from '../components/admin/OrganizationCreateSection'
import OrganizationManagementSection from '../components/admin/OrganizationManagementSection'
import ReportsSection from '../components/admin/ReportsSection'
import ChatReportsSection from '../components/admin/ChatReportsSection'
import UserApprovalSection from '../components/admin/UserApprovalSection'
import UserManagementSection from '../components/admin/UserManagementSection'
import TagManagementSection from '../components/admin/TagManagementSection'
import LanguageSwitcher from '../components/common/LanguageSwitcher'
import { clearAuthSession, getAuthSession } from '../services/sessionService'

function getSelectedAdminMenuKey(pathname) {
    if (pathname === '/admin/reports' || pathname === '/admin/reports/events') {
        return 'report-events'
    }

    if (pathname === '/admin/reports/accounts') {
        return 'report-accounts'
    }

    if (pathname === '/admin/reports/chats') {
        return 'report-chats'
    }

    if (pathname === '/admin/organizations/create') {
        return 'organization-create'
    }

    if (pathname === '/admin/organizations/manage') {
        return 'organization-manage'
    }

    if (pathname === '/admin/organizations/banned') {
        return 'organization-banned'
    }

    if (pathname === '/admin/users' || pathname === '/admin/users/approval') {
        return 'user-approval'
    }

    if (pathname === '/admin/users/manage') {
        return 'user-manage'
    }

    if (pathname === '/admin/users/banned') {
        return 'user-banned'
    }

    if (pathname === '/admin/tags') {
        return 'tag-management'
    }

    return 'event-approval'
}

function AdminHomePage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { t } = useTranslation()
    const screens = Grid.useBreakpoint()
    const isMobile = !screens.md
    const session = getAuthSession()
    const isAdmin = session?.role === 'admin'
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const selectedKey = getSelectedAdminMenuKey(location.pathname)

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
            key: 'users',
            icon: <UserSwitchOutlined />,
            label: t('admin.menu.users.title'),
            children: [
                {
                    key: 'user-approval',
                    label: t('admin.menu.users.approval'),
                },
                {
                    key: 'user-manage',
                    label: t('admin.menu.users.manage'),
                },
                {
                    key: 'user-banned',
                    label: t('admin.menu.users.banned'),
                },
            ],
        },
        {
            key: 'organizations',
            icon: <ApartmentOutlined />,
            label: t('admin.menu.organizations.title'),
            children: [
                {
                    key: 'organization-create',
                    label: t('admin.menu.organizations.create'),
                },
                {
                    key: 'organization-manage',
                    label: t('admin.menu.organizations.manage'),
                },
                {
                    key: 'organization-banned',
                    label: t('admin.menu.organizations.banned'),
                },
            ],
        },
        {
            key: 'reports',
            icon: <FlagOutlined />,
            label: t('admin.menu.reports.title'),
            children: [
                {
                    key: 'report-events',
                    label: t('admin.menu.reports.event'),
                },
                {
                    key: 'report-accounts',
                    label: t('admin.menu.reports.account'),
                },
                {
                    key: 'report-chats',
                    label: t('admin.menu.reports.chat'),
                },
            ],
        },
        {
            key: 'tag-management',
            icon: <TagOutlined />,
            label: t('admin.menu.tagManagement'),
        },
    ]

    if (!isAdmin) {
        return null
    }

    const pageTitleByKey = {
        'event-approval': t('admin.menu.eventApproval'),
        'user-approval': t('admin.menu.users.approval'),
        'user-manage': t('admin.menu.users.manage'),
        'user-banned': t('admin.menu.users.banned'),
        'organization-create': t('admin.menu.organizations.create'),
        'organization-manage': t('admin.menu.organizations.manage'),
        'organization-banned': t('admin.menu.organizations.banned'),
        'report-events': t('admin.menu.reports.event'),
        'report-accounts': t('admin.menu.reports.account'),
        'report-chats': t('admin.menu.reports.chat'),
        'tag-management': t('admin.menu.tagManagement'),
    }

    const pathByKey = {
        'event-approval': '/admin',
        'user-approval': '/admin/users/approval',
        'user-manage': '/admin/users/manage',
        'user-banned': '/admin/users/banned',
        'organization-create': '/admin/organizations/create',
        'organization-manage': '/admin/organizations/manage',
        'organization-banned': '/admin/organizations/banned',
        'report-events': '/admin/reports/events',
        'report-accounts': '/admin/reports/accounts',
        'report-chats': '/admin/reports/chats',
        'tag-management': '/admin/tags',
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
                                aria-label="Open admin menu"
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
                            }}
                        >
                            {t('admin.brand')}
                        </Typography.Title>
                    </Space>
                    <Space size={12}>
                        <LanguageSwitcher />
                        <Button
                            icon={<LogoutOutlined />}
                            onClick={() => {
                                clearAuthSession()
                                navigate('/login/admin', { replace: true })
                            }}
                        >
                            {isMobile ? null : t('admin.logout')}
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
                                    defaultOpenKeys={['users', 'organizations', 'reports']}
                                    selectedKeys={[selectedKey]}
                                    items={menuItems}
                                    onClick={({ key }) => {
                                        const nextPath = pathByKey[key]
                                        if (nextPath) {
                                            navigate(nextPath)
                                        }
                                    }}
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
                    )}

                <Layout>
                    <Layout.Content style={{ padding: isMobile ? 12 : 24 }}>
                        <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>
                            {pageTitleByKey[selectedKey] || t('admin.menu.eventApproval')}
                        </Typography.Title>

                        {selectedKey === 'event-approval' ? (
                            <EventApprovalSection />
                        ) : selectedKey === 'user-approval' ? (
                            <UserApprovalSection />
                        ) : selectedKey === 'user-manage' ? (
                            <UserManagementSection />
                        ) : selectedKey === 'user-banned' ? (
                            <UserManagementSection mode="banned" />
                        ) : selectedKey === 'organization-create' ? (
                            <OrganizationCreateSection />
                        ) : selectedKey === 'organization-manage' ? (
                            <OrganizationManagementSection />
                        ) : selectedKey === 'organization-banned' ? (
                            <OrganizationManagementSection mode="banned" />
                        ) : selectedKey === 'report-events' ? (
                            <ReportsSection mode="event" />
                        ) : selectedKey === 'report-accounts' ? (
                            <ReportsSection mode="account" />
                        ) : selectedKey === 'report-chats' ? (
                            <ChatReportsSection />
                        ) : selectedKey === 'tag-management' ? (
                            <TagManagementSection />
                        ) : (
                            <Typography.Text style={{ color: '#6b7280' }}>
                                {t('admin.placeholderText')}
                            </Typography.Text>
                        )}
                    </Layout.Content>
                </Layout>
                </Layout>
            </Layout>
            <Drawer
                title={t('admin.brand')}
                placement="left"
                open={isMobile && isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                width={280}
            >
                <Menu
                    mode="inline"
                    defaultOpenKeys={['users', 'organizations', 'reports']}
                    selectedKeys={[selectedKey]}
                    items={menuItems}
                    onClick={({ key }) => {
                        setIsMobileMenuOpen(false)
                        const nextPath = pathByKey[key]
                        if (nextPath) {
                            navigate(nextPath)
                        }
                    }}
                    style={{ borderInlineEnd: 'none' }}
                />
            </Drawer>
        </ConfigProvider>
    )
}

export default AdminHomePage
