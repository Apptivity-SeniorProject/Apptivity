import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Button, Card, Form, Input, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'

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
    const { t } = useTranslation()

    const titleKey = titleKeyByRole[role] || 'login.loginTitle'
    const subtitleKey = subtitleKeyByRole[role] || 'login.loginSubtitle'

    const onFinish = (values) => {
        console.log('Form Values:', values)
    }

    const onFinishFailed = (errorInfo) => {
        console.log('Error:', errorInfo)
    }

    return (
        <Card style={{ width: '100%', maxWidth: 460, borderRadius: 14, borderColor: '#e5e7eb' }}>
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
                        name="userName"
                        label={t('login.userName')}
                        rules={[
                            { required: true, message: t('login.userNameRequired') },
                            { type: 'string', message: t('login.invalidUserName') },
                        ]}
                    >
                        <Input prefix={<UserOutlined style={{ color: '#9ca3af' }} />} placeholder={t('login.userName')} />
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
                            block
                        >
                            {t(titleKey)}
                        </Button>
                    </Form.Item>
                </Form>
            </Space>
        </Card>
    )
}

export default Login
