import { Button, Card, Form, Input, Space, Typography, message } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createAdminOrganization } from '../../services/adminService'

function OrganizationCreateSection() {
    const { t } = useTranslation()
    const [form] = Form.useForm()
    const [messageApi, contextHolder] = message.useMessage()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorText, setErrorText] = useState('')

    const onFinish = async (values) => {
        setIsSubmitting(true)
        setErrorText('')

        const result = await createAdminOrganization({
            username: values.username,
            phone: values.phone,
            email: values.email || null,
            password: values.password,
            name: values.name,
            locationCity: values.locationCity,
            description: values.description || null,
            latitude: null,
            longitude: null,
        })

        if (!result.isSuccess) {
            setErrorText(result.errors?.[0]?.message || t('admin.organizations.create.messages.error'))
            setIsSubmitting(false)
            return
        }

        messageApi.success(t('admin.organizations.create.messages.success'))
        form.resetFields()
        setIsSubmitting(false)
    }

    return (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {contextHolder}
            <Typography.Paragraph style={{ marginBottom: 0, color: '#6b7280' }}>
                {t('admin.organizations.create.description')}
            </Typography.Paragraph>

            <Card bordered={false} style={{ borderRadius: 16 }}>
                <Form
                    form={form}
                    layout="vertical"
                    requiredMark={false}
                    onFinish={onFinish}
                >
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                            gap: 16,
                        }}
                    >
                        <Form.Item
                            name="name"
                            label={t('admin.organizations.create.fields.name')}
                            rules={[{ required: true, message: t('admin.organizations.create.validation.nameRequired') }]}
                        >
                            <Input placeholder={t('admin.organizations.create.placeholders.name')} />
                        </Form.Item>

                        <Form.Item
                            name="username"
                            label={t('admin.organizations.create.fields.username')}
                            rules={[{ required: true, message: t('admin.organizations.create.validation.usernameRequired') }]}
                        >
                            <Input placeholder={t('admin.organizations.create.placeholders.username')} />
                        </Form.Item>

                        <Form.Item
                            name="phone"
                            label={t('admin.organizations.create.fields.phone')}
                            rules={[{ required: true, message: t('admin.organizations.create.validation.phoneRequired') }]}
                        >
                            <Input placeholder={t('admin.organizations.create.placeholders.phone')} />
                        </Form.Item>

                        <Form.Item name="email" label={t('admin.organizations.create.fields.email')}>
                            <Input placeholder={t('admin.organizations.create.placeholders.email')} />
                        </Form.Item>

                        <Form.Item
                            name="locationCity"
                            label={t('admin.organizations.create.fields.locationCity')}
                            rules={[{ required: true, message: t('admin.organizations.create.validation.locationCityRequired') }]}
                        >
                            <Input placeholder={t('admin.organizations.create.placeholders.locationCity')} />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label={t('admin.organizations.create.fields.password')}
                            rules={[{ required: true, message: t('admin.organizations.create.validation.passwordRequired') }]}
                        >
                            <Input.Password placeholder={t('admin.organizations.create.placeholders.password')} />
                        </Form.Item>
                    </div>

                    <Form.Item
                        name="description"
                        label={t('admin.organizations.create.fields.description')}
                    >
                        <Input.TextArea rows={5} placeholder={t('admin.organizations.create.placeholders.description')} />
                    </Form.Item>

                    {errorText ? (
                        <Typography.Text style={{ color: '#dc2626' }}>
                            {errorText}
                        </Typography.Text>
                    ) : null}

                    <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
                        <Button type="primary" htmlType="submit" loading={isSubmitting}>
                            {t('admin.organizations.create.submit')}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </Space>
    )
}

export default OrganizationCreateSection
