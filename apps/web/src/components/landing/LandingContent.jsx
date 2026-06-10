import {
    BellOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    EnvironmentOutlined,
    HeartOutlined,
    SafetyOutlined,
    UsergroupAddOutlined,
} from '@ant-design/icons'
import { Button, Card, Col, Divider, Flex, Form, Image, Input, Row, Space, Steps, Typography, message } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import communityEventImg from '../../assets/images/community-event.jpg'
import heroSocialImg from '../../assets/images/hero-social.jpg'
import { submitFeedback } from '../../services/feedbackService'

const sectionTitleStyle = {
    color: '#111111',
    marginBottom: 4,
}

const mutedTextStyle = {
    color: '#4b5563',
    marginBottom: 0,
}

const featureCardStyle = {
    borderRadius: 12,
    borderColor: '#e5e7eb',
    height: '100%',
}

const iconBoxStyle = {
    width: 34,
    height: 34,
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    color: '#111111',
    background: '#fafafa',
}

const ctaButtonStyle = {
    borderRadius: 999,
    height: 36,
    paddingInline: 16,
    fontSize: 13,
    fontWeight: 500,
}

function LandingContent() {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const appDownloadUrl = (import.meta.env.VITE_MOBILE_APP_DOWNLOAD_URL || '').trim()
    const [feedbackForm] = Form.useForm()
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
    const [messageApi, contextHolder] = message.useMessage()

    const featureItems = [
        {
            icon: <SafetyOutlined style={{ fontSize: 16 }} />,
            title: t('landing.features.safeTitle'),
            body: t('landing.features.safeBody'),
        },
        {
            icon: <CalendarOutlined style={{ fontSize: 16 }} />,
            title: t('landing.features.eventTitle'),
            body: t('landing.features.eventBody'),
        },
        {
            icon: <UsergroupAddOutlined style={{ fontSize: 16 }} />,
            title: t('landing.features.interestTitle'),
            body: t('landing.features.interestBody'),
        },
        {
            icon: <EnvironmentOutlined style={{ fontSize: 16 }} />,
            title: t('landing.features.locationTitle'),
            body: t('landing.features.locationBody'),
        },
        {
            icon: <HeartOutlined style={{ fontSize: 16 }} />,
            title: t('landing.features.communityTitle'),
            body: t('landing.features.communityBody'),
        },
        {
            icon: <BellOutlined style={{ fontSize: 16 }} />,
            title: t('landing.features.instantTitle'),
            body: t('landing.features.instantBody'),
        },
    ]

    const handleTestAppClick = () => {
        if (!appDownloadUrl) {
            return
        }

        window.location.assign(appDownloadUrl)
    }

    const handleFeedbackSubmit = async (values) => {
        setIsSubmittingFeedback(true)

        const result = await submitFeedback({
            firstName: values.firstName?.trim(),
            lastName: values.lastName?.trim(),
            email: values.email?.trim() || null,
            message: values.message?.trim(),
        })

        if (!result.isSuccess) {
            messageApi.error(result.errors?.[0]?.message || 'Geri bildiriminiz gönderilemedi.')
            setIsSubmittingFeedback(false)
            return
        }

        feedbackForm.resetFields()
        messageApi.success('Geri bildiriminiz alındı. Teşekkür ederiz.')
        setIsSubmittingFeedback(false)
    }

    return (
        <Space direction="vertical" size={28} style={{ width: '100%' }}>
            {contextHolder}

            <Card style={{ borderRadius: 12, borderColor: '#e5e7eb' }}>
                <Row gutter={[24, 24]} align="middle">
                    <Col xs={24} lg={16}>
                        <Space direction="vertical" size={12}>
                            <Typography.Title level={1} style={{ color: '#111111', margin: 0 }}>
                                {t('landing.title')}
                            </Typography.Title>
                            <Typography.Paragraph style={mutedTextStyle}>
                                {t('landing.subtitle')}
                            </Typography.Paragraph>
                            <Space>
                                <Button
                                    type="primary"
                                    style={{ ...ctaButtonStyle, backgroundColor: '#111111', borderColor: '#111111' }}
                                    onClick={() => navigate('/login/organization')}
                                >
                                    {t('landing.organizationLogin')}
                                </Button>
                            </Space>
                        </Space>
                    </Col>
                    <Col xs={24} lg={8}>
                        <div style={{ width: '100%', maxWidth: 360, margin: '0 auto' }}>
                            <Image
                                src={heroSocialImg}
                                alt={t('landing.images.heroAlt')}
                                preview={false}
                                width="100%"
                                style={{
                                    height: 300,
                                    objectFit: 'cover',
                                    borderRadius: 12,
                                    display: 'block',
                                }}
                            />
                        </div>
                    </Col>
                </Row>
            </Card>

            <Card id="about" style={{ borderRadius: 12, borderColor: '#e5e7eb', scrollMarginTop: 92 }}>
                <Row gutter={[24, 24]} align="middle">
                    <Col xs={24} lg={8}>
                        <div style={{ width: '100%', maxWidth: 320, margin: '0 auto' }}>
                            <Image
                                src={communityEventImg}
                                alt={t('landing.images.aboutAlt')}
                                preview={false}
                                width="100%"
                                style={{
                                    height: 320,
                                    objectFit: 'cover',
                                    borderRadius: 12,
                                    display: 'block',
                                }}
                            />
                        </div>
                    </Col>
                    <Col xs={24} lg={14}>
                        <Space direction="vertical" size={10} style={{ width: '100%' }}>
                            <Typography.Title level={3} style={sectionTitleStyle}>
                                {t('landing.about.title')}
                            </Typography.Title>
                            <Typography.Title level={4} style={{ color: '#111111', marginBottom: 0 }}>
                                {t('landing.about.headline')}
                            </Typography.Title>
                            <Typography.Paragraph style={mutedTextStyle}>
                                {t('landing.about.body')}
                            </Typography.Paragraph>
                            <Typography.Paragraph style={mutedTextStyle}>
                                {t('landing.about.mission')}
                            </Typography.Paragraph>
                        </Space>
                    </Col>
                </Row>
            </Card>

            <Card id="features" style={{ borderRadius: 12, borderColor: '#e5e7eb', scrollMarginTop: 92 }}>
                <Space direction="vertical" size={18} style={{ width: '100%' }}>
                    <div>
                        <Typography.Title level={3} style={sectionTitleStyle}>
                            {t('landing.features.title')}
                        </Typography.Title>
                        <Typography.Paragraph style={mutedTextStyle}>
                            {t('landing.features.subtitle')}
                        </Typography.Paragraph>
                    </div>

                    <Row gutter={[16, 16]}>
                        {featureItems.map((item) => (
                            <Col key={item.title} xs={24} md={12} lg={8}>
                                <Card style={featureCardStyle}>
                                    <Space direction="vertical" size={10} style={{ width: '100%', textAlign: 'center' }} align="center">
                                        <Flex align="center" justify="center" style={iconBoxStyle}>
                                            {item.icon}
                                        </Flex>
                                        <Typography.Title level={5} style={{ margin: 0 }}>
                                            {item.title}
                                        </Typography.Title>
                                        <Typography.Paragraph style={mutedTextStyle}>
                                            {item.body}
                                        </Typography.Paragraph>
                                    </Space>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Space>
            </Card>

            <Card id="how" style={{ borderRadius: 12, borderColor: '#e5e7eb', scrollMarginTop: 92 }}>
                <Space direction="vertical" size={14} style={{ width: '100%' }}>
                    <Typography.Title level={3} style={sectionTitleStyle}>
                        {t('landing.how.title')}
                    </Typography.Title>
                    <Typography.Paragraph style={mutedTextStyle}>
                        {t('landing.how.subtitle')}
                    </Typography.Paragraph>
                    <Steps
                        direction="vertical"
                        size="small"
                        items={[
                            {
                                status: 'finish',
                                icon: <CheckCircleOutlined />,
                                title: <span style={{ color: '#111111' }}>{t('landing.how.step1Title')}</span>,
                                description: <span style={{ color: '#4b5563' }}>{t('landing.how.step1Body')}</span>,
                            },
                            {
                                status: 'finish',
                                icon: <ClockCircleOutlined />,
                                title: <span style={{ color: '#111111' }}>{t('landing.how.step2Title')}</span>,
                                description: <span style={{ color: '#4b5563' }}>{t('landing.how.step2Body')}</span>,
                            },
                            {
                                status: 'finish',
                                icon: <HeartOutlined />,
                                title: <span style={{ color: '#111111' }}>{t('landing.how.step4Title')}</span>,
                                description: <span style={{ color: '#4b5563' }}>{t('landing.how.step4Body')}</span>,
                            },
                        ]}
                    />
                </Space>
            </Card>

            <Card style={{ borderRadius: 12, borderColor: '#111111', background: '#fafafa' }}>
                <Flex vertical align="center" gap={10}>
                    <Typography.Title level={4} style={{ margin: 0, color: '#111111' }}>
                        {t('landing.cta.title')}
                    </Typography.Title>
                    <Typography.Paragraph style={{ ...mutedTextStyle, textAlign: 'center' }}>
                        {t('landing.cta.subtitle')}
                    </Typography.Paragraph>
                    <Button
                        type="primary"
                        style={{ ...ctaButtonStyle, backgroundColor: '#111111', borderColor: '#111111' }}
                        onClick={handleTestAppClick}
                    >
                        Uygulamayı İndir
                    </Button>
                    <Typography.Text style={{ color: '#4b5563', textAlign: 'center' }}>
                        Şu Anlık Sadece Android
                    </Typography.Text>
                </Flex>
            </Card>

            <Card id="feedback" style={{ borderRadius: 12, borderColor: '#e5e7eb', scrollMarginTop: 92 }}>
                <Space direction="vertical" size={18} style={{ width: '100%' }}>
                    <div>
                        <Typography.Title level={3} style={sectionTitleStyle}>
                            Geri Bildirim Bırakın
                        </Typography.Title>
                        <Typography.Paragraph style={mutedTextStyle}>
                            Deneyiminizi, önerilerinizi veya gördüğünüz eksikleri bize iletebilirsiniz.
                        </Typography.Paragraph>
                    </div>

                    <Form form={feedbackForm} layout="vertical" onFinish={handleFeedbackSubmit}>
                        <Row gutter={[16, 0]}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    label="İsim"
                                    name="firstName"
                                    rules={[{ required: true, message: 'İsim zorunludur.' }]}
                                >
                                    <Input placeholder="İsminizi girin" maxLength={100} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    label="Soyisim"
                                    name="lastName"
                                    rules={[{ required: true, message: 'Soyisim zorunludur.' }]}
                                >
                                    <Input placeholder="Soyisminizi girin" maxLength={100} />
                                </Form.Item>
                            </Col>
                            <Col xs={24}>
                                <Form.Item
                                    label="E-posta (Opsiyonel)"
                                    name="email"
                                    rules={[{ type: 'email', message: 'Geçerli bir e-posta girin.' }]}
                                >
                                    <Input placeholder="ornek@mail.com" maxLength={320} />
                                </Form.Item>
                            </Col>
                            <Col xs={24}>
                                <Form.Item
                                    label="Geri Bildiriminiz"
                                    name="message"
                                    rules={[{ required: true, message: 'Lütfen mesajınızı yazın.' }]}
                                >
                                    <Input.TextArea
                                        rows={5}
                                        maxLength={2000}
                                        showCount
                                        placeholder="Bize iletmek istediğiniz notu yazın"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Flex justify="flex-end">
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={isSubmittingFeedback}
                                style={{ ...ctaButtonStyle, backgroundColor: '#111111', borderColor: '#111111' }}
                            >
                                Gonder
                            </Button>
                        </Flex>
                    </Form>
                </Space>
            </Card>

            <Divider style={{ margin: '4px 0 0', borderColor: '#e5e7eb' }} />
        </Space>
    )
}

export default LandingContent
