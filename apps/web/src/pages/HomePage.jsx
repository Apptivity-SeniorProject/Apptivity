import { ConfigProvider, Layout, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import LandingContent from '../components/landing/LandingContent'
import LandingNavbar from '../components/landing/LandingNavbar'
import '../components/landing/landing.css'

function HomePage() {
    const { t } = useTranslation()

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
            <Layout className="landing-shell">
                <LandingNavbar />
                <Layout.Content className="landing-main">
                    <LandingContent />
                </Layout.Content>
                <Layout.Footer style={{ background: '#ffffff', borderTop: '1px solid #e5e7eb', padding: '20px 24px' }}>
                    <Space
                        style={{ width: '100%', maxWidth: '1080px', margin: '0 auto' }}
                        direction="vertical"
                        size={4}
                    >
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

export default HomePage
