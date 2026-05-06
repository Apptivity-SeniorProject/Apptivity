import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Button, Card, Form, Input, Space, Typography, message } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getOrCreateDeviceId, loginWithPassword } from '../../services/authService'
import { clearAuthSession, saveAuthSession } from '../../services/sessionService'

const titleKeyByRole = {
    admin: 'login.adminLoginTitle',
    organization: 'login.organizationLoginTitle',
}

const subtitleKeyByRole = {
    admin: 'login.adminLoginSubtitle',
    organization: 'login.organizationLoginSubtitle',
}

const Login = ({ role = 'default' }) => {
    const [form] = Form.useForm()
    const [messageApi, messageContextHolder] = message.useMessage()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorText, setErrorText] = useState('')
    const navigate = useNavigate()
    const { t } = useTranslation()

    const titleKey = titleKeyByRole[role] || 'login.loginTitle'
    const subtitleKey = subtitleKeyByRole[role] || 'login.loginSubtitle'
    const expectedRole = role === 'organization' ? 'organization' : 'admin'

    const onFinish = async (values) => {
        setIsSubmitting(true)
        setErrorText('')

        try {
            const deviceId = getOrCreateDeviceId()

            const result = await loginWithPassword({
                identifier: values.identifier,
                password: values.password,
                deviceId,
            })

            if (!result.isSuccess) {
                const backendMessage = result.errors?.[0]?.message || t('login.unexpectedError')
                setErrorText(backendMessage)
                return
            }

            const accessToken = result.data?.accessToken || ''
            const refreshToken = result.data?.refreshToken || ''

            if (!accessToken || !refreshToken) {
                setErrorText(t('login.unexpectedError'))
                return
            }

            const tokenRole = saveAuthSession(accessToken, refreshToken)
            if (tokenRole !== expectedRole) {
                clearAuthSession()
                setErrorText(t(expectedRole === 'admin' ? 'login.adminRoleRequired' : 'login.organizationRoleRequired'))
                return
            }

            messageApi.success(t('login.loginSuccess'))
            navigate('/')
        } catch {
            setErrorText(t('login.networkError'))
        } finally {
            setIsSubmitting(false)
        }
    }

    const onFinishFailed = (errorInfo) => {
        console.log('Error:', errorInfo)
    }

    return (
        <Card style={{ width: '100%', maxWidth: 460, borderRadius: 14, borderColor: '#e5e7eb' }}>
            {messageContextHolder}
            <Space direction="vertical" size={18} style={{ width: '100%' }}>
                <Space direction="vertical" size={8} style={{ width: '100%', textAlign: 'center' }}>
                    <Avatar
                        size={58}
                        style={{ margin: '0 auto', backgroundColor: '#f5f5f5', color: '#111111', border: '1px solid #d9d9d9' }}
                        icon={<UserOutlined />}
                    />
                    <Typography.Title level={3} style={{ margin: 0, color: '#111111' }}>
                        {t(titleKey)}
                    </Typography.Title>
                    <Typography.Text style={{ color: '#6b7280' }}>
                        {t(subtitleKey)}
                    </Typography.Text>
                </Space>

                <Form
                    layout="vertical"
                    form={form}
                    onFinish={onFinish}
                    onFinishFailed={onFinishFailed}
                    requiredMark={false}
                >
                    <Form.Item
                        name="identifier"
                        label={t('login.identifier')}
                        rules={[
                            { required: true, message: t('login.identifierRequired') },
                            { type: 'string', message: t('login.invalidUserName') },
                        ]}
                    >
                        <Input prefix={<UserOutlined style={{ color: '#9ca3af' }} />} placeholder={t('login.identifier')} />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label={t('login.password')}
                        rules={[{ required: true, message: t('login.passwordRequired') }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                            placeholder={t('login.password')}
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                            type="primary"
                            style={{ backgroundColor: '#111111', borderColor: '#111111', borderRadius: 999, height: 38 }}
                            htmlType="submit"
                            loading={isSubmitting}
                            block
                        >
                            {t(titleKey)}
                        </Button>
                    </Form.Item>

                    {errorText ? (
                        <Typography.Text style={{ color: '#dc2626' }}>
                            {errorText}
                        </Typography.Text>
                    ) : null}
                </Form>
            </Space>
        </Card>
    )
}

export default Login
