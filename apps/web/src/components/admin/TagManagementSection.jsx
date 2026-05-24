import { Button, ColorPicker, Form, Input, Modal, Popconfirm, Space, Switch, Table, Tag, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createTag, deleteTag, getActiveTags, updateTag } from '../../services/tagService'

function TagManagementSection() {
    const { t } = useTranslation()
    const [rows, setRows] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [isModalVisible, setIsModalVisible] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingTag, setEditingTag] = useState(null)
    const [form] = Form.useForm()
    const [messageApi, contextHolder] = message.useMessage()

    const loadTags = useCallback(async () => {
        setIsLoading(true)
        const result = await getActiveTags()

        if (!result.isSuccess) {
            messageApi.error(result.errors?.[0]?.message || t('admin.tags.messages.loadError'))
            setRows([])
        } else {
            setRows(result.data || [])
        }
        setIsLoading(false)
    }, [messageApi, t])

    useEffect(() => {
        loadTags()
    }, [loadTags])

    const handleAdd = () => {
        setEditingTag(null)
        form.resetFields()
        form.setFieldsValue({ isActive: true })
        setIsModalVisible(true)
    }

    const handleEdit = useCallback((record) => {
        setEditingTag(record)
        form.setFieldsValue({
            name: record.name,
            iconName: record.iconName,
            colorCode: record.colorCode,
            isActive: record.isActive,
        })
        setIsModalVisible(true)
    }, [form])

    const handleDelete = useCallback(async (id) => {
        setIsLoading(true)
        const result = await deleteTag(id)
        if (result.isSuccess) {
            messageApi.success(t('admin.tags.messages.deleteSuccess'))
            await loadTags()
        } else {
            messageApi.error(result.errors?.[0]?.message || t('admin.tags.messages.actionError'))
            setIsLoading(false)
        }
    }, [loadTags, messageApi, t])

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields()
            setIsSubmitting(true)

            // Convert ColorPicker value to string if it's an object
            const colorCode = typeof values.colorCode === 'object' && values.colorCode?.toHexString
                ? values.colorCode.toHexString()
                : values.colorCode

            const payload = {
                ...values,
                colorCode: colorCode || null,
                iconName: values.iconName || null,
            }

            let result
            if (editingTag) {
                result = await updateTag(editingTag.id, payload)
            } else {
                result = await createTag(payload)
            }

            if (result.isSuccess) {
                messageApi.success(
                    editingTag
                        ? t('admin.tags.messages.updateSuccess')
                        : t('admin.tags.messages.createSuccess')
                )
                setIsModalVisible(false)
                await loadTags()
            } else {
                messageApi.error(result.errors?.[0]?.message || t('admin.tags.messages.actionError'))
            }
        } catch (error) {
            console.error('Validation failed:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const columns = useMemo(
        () => [
            {
                title: t('admin.tags.columns.name'),
                dataIndex: 'name',
                key: 'name',
                render: (text) => <strong>{text}</strong>,
            },
            {
                title: t('admin.tags.columns.iconName'),
                dataIndex: 'iconName',
                key: 'iconName',
            },
            {
                title: t('admin.tags.columns.colorCode'),
                dataIndex: 'colorCode',
                key: 'colorCode',
                render: (color) => color ? (
                    <Space>
                        <div style={{ width: 20, height: 20, backgroundColor: color, borderRadius: 4, border: '1px solid #d9d9d9' }} />
                        {color}
                    </Space>
                ) : '-',
            },
            {
                title: t('admin.tags.columns.isActive'),
                dataIndex: 'isActive',
                key: 'isActive',
                render: (isActive) => (
                    <Tag color={isActive ? 'success' : 'error'}>
                        {isActive ? t('admin.tags.form.isActive') : 'Pasif'}
                    </Tag>
                ),
            },
            {
                title: t('admin.tags.columns.actions'),
                key: 'actions',
                render: (_, record) => (
                    <Space size="middle">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record)}
                        >
                            {t('admin.tags.actions.edit')}
                        </Button>
                        <Popconfirm
                            title={t('admin.tags.messages.deleteConfirm')}
                            onConfirm={() => handleDelete(record.id)}
                            okText={t('admin.tags.actions.yes') || 'Evet'}
                            cancelText={t('admin.tags.actions.no') || 'Hayır'}
                        >
                            <Button type="text" danger icon={<DeleteOutlined />}>
                                {t('admin.tags.actions.delete')}
                            </Button>
                        </Popconfirm>
                    </Space>
                ),
            },
        ],
        [handleDelete, handleEdit, t]
    )

    return (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {contextHolder}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    {t('admin.tags.addTag')}
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={rows}
                rowKey="id"
                loading={isLoading}
                pagination={false}
                locale={{ emptyText: t('admin.tags.empty') }}
            />

            <Modal
                title={editingTag ? t('admin.tags.editTag') : t('admin.tags.addTag')}
                open={isModalVisible}
                onOk={handleModalOk}
                onCancel={() => setIsModalVisible(false)}
                confirmLoading={isSubmitting}
                okText={t('admin.tags.actions.save')}
                cancelText={t('admin.tags.actions.cancel')}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ isActive: true }}
                >
                    <Form.Item
                        name="name"
                        label={t('admin.tags.form.name')}
                        rules={[{ required: true, message: t('admin.tags.validation.nameRequired') }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="iconName"
                        label={t('admin.tags.form.iconName')}
                    >
                        <Input placeholder="örn: Activity" />
                    </Form.Item>

                    <Form.Item
                        name="colorCode"
                        label={t('admin.tags.form.colorCode')}
                    >
                        <ColorPicker showText />
                    </Form.Item>

                    {editingTag && (
                        <Form.Item
                            name="isActive"
                            label={t('admin.tags.form.isActive')}
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    )}
                </Form>
            </Modal>
        </Space>
    )
}

export default TagManagementSection
