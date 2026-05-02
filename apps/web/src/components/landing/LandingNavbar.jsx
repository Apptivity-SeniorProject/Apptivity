import { Button, Flex, Layout, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import LanguageSwitcher from '../common/LanguageSwitcher'

const headerStyle = {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    width: '100%',
    background: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    paddingInline: '24px',
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

    return (
        <Layout.Header style={headerStyle}>
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

