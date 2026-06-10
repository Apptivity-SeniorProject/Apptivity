import { Button, ConfigProvider, Flex, Grid, Layout, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import LanguageSwitcher from '../common/LanguageSwitcher'
import Login from './Login'

const { useBreakpoint } = Grid

function AuthPage({ role = 'admin' }) {
    const navigate = useNavigate()
    const currentRole = role === 'organization' ? 'organization' : 'admin'
    const { t } = useTranslation()
    const screens = useBreakpoint()
    const isMobile = !screens.md

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#111111',
                    borderRadius: 12,
                    colorText: '#111111',
                },
            }}
        >
            <Layout style={{ minHeight: '100vh', background: '#ffffff' }}>
                <Layout.Header
                    style={{
                        background: '#ffffff',
                        borderBottom: '1px solid #e5e7eb',
                        paddingInline: isMobile ? '16px' : '24px',
                    }}
                >
                    <Flex
                        style={{ width: '100%', maxWidth: '1080px', margin: '0 auto', minHeight: isMobile ? 'auto' : '72px', paddingBlock: isMobile ? 10 : 0 }}
                        vertical={isMobile}
                        justify="space-between"
                        align={isMobile ? 'stretch' : 'center'}
                        gap={isMobile ? 10 : 0}
                    >
                        <Flex justify="space-between" align="center">
                            <Typography.Title
                                level={4}
                                style={{ margin: 0, color: '#111111', cursor: 'pointer', fontWeight: 700, lineHeight: 1 }}
                                onClick={() => navigate('/')}
                            >
                                {t('landing.brand')}
                            </Typography.Title>
                        </Flex>

                        <Flex align="center" gap={8} wrap={isMobile}>
                            {currentRole === 'organization' ? null : (
                                <Button
                                    style={{
                                        borderRadius: 999,
                                        height: 34,
                                        paddingInline: 14,
                                        fontSize: 13,
                                        fontWeight: 500,
                                        backgroundColor: '#ffffff',
                                        borderColor: '#111111',
                                        color: '#111111',
                                        flex: isMobile ? 1 : 'none',
                                        minWidth: isMobile ? 0 : 'auto',
                                    }}
                                    onClick={() => navigate('/login/organization')}
                                >
                                    {t('landing.organizationLogin')}
                                </Button>
                            )}

                            <LanguageSwitcher />
                        </Flex>
                    </Flex>
                </Layout.Header>

                <Layout.Content
                    style={{
                        background: '#ffffff',
                        padding: isMobile ? '32px 16px' : '48px 24px',
                    }}
                >
                    <Flex vertical align="center" style={{ width: '100%', maxWidth: '1080px', margin: '0 auto' }} gap={20}>
                        <Space direction="vertical" size={6} style={{ width: '100%', textAlign: 'center' }}>
                            <Typography.Title level={2} style={{ margin: 0, color: '#111111', fontSize: isMobile ? 28 : undefined }}>
                                {t('login.pageTitle')}
                            </Typography.Title>
                            <Typography.Text style={{ color: '#6b7280' }}>
                                {t('login.pageSubtitle')}
                            </Typography.Text>
                        </Space>

                        <Flex justify="center" style={{ width: '100%' }}>
                            <Login role={currentRole} />
                        </Flex>
                    </Flex>
                </Layout.Content>

                <Layout.Footer style={{ background: '#ffffff', borderTop: '1px solid #e5e7eb', padding: '20px 24px' }}>
                    <Space style={{ width: '100%', maxWidth: '1080px', margin: '0 auto' }} direction="vertical" size={4}>
                        <Typography.Text style={{ color: '#111111', fontWeight: 600 }}>
                            {t('landing.footer.brand')}
                        </Typography.Text>
                        <Typography.Text style={{ color: '#6b7280', fontSize: 13 }}>
                            {t('landing.footer.text')}
                        </Typography.Text>
                    </Space>
                </Layout.Footer>
            </Layout>
        </ConfigProvider>
    )
}

export default AuthPage
