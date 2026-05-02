import { MenuOutlined } from '@ant-design/icons'
import { Button, Drawer, Flex, Grid, Layout, Space, Typography } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import LanguageSwitcher from '../common/LanguageSwitcher'

const { useBreakpoint } = Grid

const headerStyle = {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    width: '100%',
    background: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
}

const contentStyle = {
    width: '100%',
    maxWidth: '1080px',
    margin: '0 auto',
    minHeight: '72px',
}

const actionButtonStyle = {
    borderRadius: 999,
    height: 34,
    paddingInline: 14,
    fontSize: 13,
    fontWeight: 500,
}

function LandingNavbar() {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const screens = useBreakpoint()
    const isMobile = !screens.md
    const [open, setOpen] = useState(false)

    if (isMobile) {
        return (
            <Layout.Header style={{ ...headerStyle, paddingInline: 16 }}>
                <Flex style={{ ...contentStyle, minHeight: 64 }} justify="space-between" align="center" gap={12}>
                    <Typography.Title
                        level={4}
                        style={{ margin: 0, color: '#111111', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        onClick={() => navigate('/')}
                    >
                        {t('landing.brand')}
                    </Typography.Title>

                    <Flex align="center" gap={8}>
                        <LanguageSwitcher />
                        <Button
                            aria-label="Open menu"
                            icon={<MenuOutlined />}
                            style={{ borderRadius: 10, borderColor: '#d1d5db', color: '#111111' }}
                            onClick={() => setOpen(true)}
                        />
                    </Flex>
                </Flex>

                <Drawer
                    title={t('landing.brand')}
                    placement="right"
                    open={open}
                    onClose={() => setOpen(false)}
                    width={290}
                >
                    <Space direction="vertical" size={14} style={{ width: '100%' }}>
                        <Typography.Link href="#about" style={{ color: '#374151', fontSize: 15 }} onClick={() => setOpen(false)}>
                            {t('landing.nav.about')}
                        </Typography.Link>
                        <Typography.Link href="#features" style={{ color: '#374151', fontSize: 15 }} onClick={() => setOpen(false)}>
                            {t('landing.nav.features')}
                        </Typography.Link>
                        <Typography.Link href="#how" style={{ color: '#374151', fontSize: 15 }} onClick={() => setOpen(false)}>
                            {t('landing.nav.how')}
                        </Typography.Link>

                        <Space direction="vertical" size={10} style={{ width: '100%', marginTop: 8 }}>
                            <Button
                                style={{ ...actionButtonStyle, width: '100%', borderColor: '#111111', color: '#111111' }}
                                onClick={() => {
                                    setOpen(false)
                                    navigate('/login/admin')
                                }}
                            >
                                {t('landing.adminLogin')}
                            </Button>
                            <Button
                                type="primary"
                                style={{ ...actionButtonStyle, width: '100%', backgroundColor: '#111111', borderColor: '#111111' }}
                                onClick={() => {
                                    setOpen(false)
                                    navigate('/login/organization')
                                }}
                            >
                                {t('landing.organizationLogin')}
                            </Button>
                        </Space>
                    </Space>
                </Drawer>
            </Layout.Header>
        )
    }

    return (
        <Layout.Header style={{ ...headerStyle, paddingInline: 24 }}>
            <Flex style={contentStyle} justify="space-between" align="center" gap={16}>
                <Typography.Title
                    level={4}
                    style={{ margin: 0, color: '#111111', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    onClick={() => navigate('/')}
                >
                    {t('landing.brand')}
                </Typography.Title>

                <Space size={20} wrap>
                    <Typography.Link href="#about" style={{ color: '#374151', fontSize: 14 }}>
                        {t('landing.nav.about')}
                    </Typography.Link>
                    <Typography.Link href="#features" style={{ color: '#374151', fontSize: 14 }}>
                        {t('landing.nav.features')}
                    </Typography.Link>
                    <Typography.Link href="#how" style={{ color: '#374151', fontSize: 14 }}>
                        {t('landing.nav.how')}
                    </Typography.Link>
                </Space>

                <Flex align="center" gap={10}>
                    <Button
                        style={{ ...actionButtonStyle, borderColor: '#111111', color: '#111111' }}
                        onClick={() => navigate('/login/admin')}
                    >
                        {t('landing.adminLogin')}
                    </Button>

                    <Button
                        type="primary"
                        style={{ ...actionButtonStyle, backgroundColor: '#111111', borderColor: '#111111' }}
                        onClick={() => navigate('/login/organization')}
                    >
                        {t('landing.organizationLogin')}
                    </Button>

                    <LanguageSwitcher />
                </Flex>
            </Flex>
        </Layout.Header>
    )
}

export default LandingNavbar
