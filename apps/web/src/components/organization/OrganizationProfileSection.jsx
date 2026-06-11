import { MinusCircleOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Button, Card, Checkbox, Col, Form, Input, Modal, Row, Space, Typography, Upload, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getMyProfile, setMyInterests, updateMyProfile, uploadMyProfilePhoto } from '../../services/profileService'
import { getActiveTags } from '../../services/tagService'

const MAX_PROFILE_PHOTO_MB = 10

function buildPhotoFileList(url) {
    if (!url) {
        return []
    }

    return [{
        uid: 'profile-photo',
        name: 'profile-photo',
        status: 'done',
        url,
    }]
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result || '')
        reader.onerror = reject
    })
}

function normalizeHobbyTagIds(profile) {
    const interests = profile.interests || profile.Interests || []
    if (Array.isArray(interests) && interests.length > 0) {
        return interests
            .map((tag) => String(tag?.id || tag?.Id || '').trim())
            .filter(Boolean)
    }

    const hobbyTags = profile.hobbyTags || profile.HobbyTags || []
    if (Array.isArray(hobbyTags) && hobbyTags.length > 0) {
        return hobbyTags
            .map((tag) => String(tag?.id || tag?.Id || '').trim())
            .filter(Boolean)
    }

    const hobbyTagIds = profile.hobbyTagIds || profile.HobbyTagIds || profile.tagIds || profile.TagIds || profile.hobbies || profile.Hobbies || []
    if (Array.isArray(hobbyTagIds)) {
        return hobbyTagIds
            .map((id) => String(id || '').trim())
            .filter(Boolean)
    }

    return []
}

function OrganizationProfileSection() {
    const { t } = useTranslation()
    const [form] = Form.useForm()
    const [messageApi, contextHolder] = message.useMessage()
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorText, setErrorText] = useState('')
    const [profileImageUrl, setProfileImageUrl] = useState('')
    const [photoFileList, setPhotoFileList] = useState([])
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
    const [isPhotoUploadModalOpen, setIsPhotoUploadModalOpen] = useState(false)
    const [previewOpen, setPreviewOpen] = useState(false)
    const [previewImage, setPreviewImage] = useState('')
    const [availableTags, setAvailableTags] = useState([])

    const hobbyOptions = useMemo(
        () => availableTags.map((tag) => ({ label: tag.name, value: tag.id })),
        [availableTags]
    )

    useEffect(() => {
        let isCancelled = false

        async function loadProfileAndTags() {
            setIsLoading(true)
            setErrorText('')

            const [profileResult, tagsResult] = await Promise.all([getMyProfile(), getActiveTags()])
            if (isCancelled) {
                return
            }

            if (tagsResult.isSuccess) {
                const tags = (tagsResult.data || [])
                    .map((tag) => ({
                        id: String(tag.id || tag.Id || '').trim(),
                        name: String(tag.name || tag.Name || '').trim(),
                    }))
                    .filter((tag) => tag.id && tag.name)

                setAvailableTags(tags)
            } else {
                setAvailableTags([])
            }

            if (!profileResult.isSuccess) {
                setErrorText(profileResult.errors?.[0]?.message || t('organization.profile.loadError'))
                setProfileImageUrl('')
                setPhotoFileList([])
                setIsLoading(false)
                return
            }

            const profile = profileResult.data || {}
            const clubProfile = profile.clubProfile || profile.ClubProfile || {}
            const resolvedProfileImageUrl =
                profile.profilePhoto
                || profile.ProfilePhoto
                || clubProfile.profilePhoto
                || clubProfile.ProfilePhoto
                || clubProfile.logoUrl
                || clubProfile.LogoUrl
                || ''
            const socialLinksRaw = profile.socialLinks || profile.SocialLinks || ''
            const socialLinks = String(socialLinksRaw)
                .split('\n')
                .map((x) => x.trim())
                .filter(Boolean)
                .map((link) => ({ value: link }))
            const resolvedUsername =
                profile.username
                || profile.Username
                || profile.userName
                || profile.UserName
                || ''
            const resolvedClubName =
                clubProfile.name
                || clubProfile.Name
                || profile.clubName
                || profile.ClubName
                || profile.organizationName
                || profile.OrganizationName
                || ''
            const resolvedClubDescription =
                clubProfile.description
                || clubProfile.Description
                || profile.clubDescription
                || profile.ClubDescription
                || ''
            const resolvedCity =
                clubProfile.city
                || clubProfile.City
                || clubProfile.locationCity
                || clubProfile.LocationCity
                || profile.city
                || profile.City
                || ''
            const resolvedHobbyTagIds = normalizeHobbyTagIds(profile)

            const normalizedImageUrl = String(resolvedProfileImageUrl || '')
            setProfileImageUrl(normalizedImageUrl)
            setPhotoFileList(buildPhotoFileList(normalizedImageUrl))

            form.setFieldsValue({
                username: resolvedUsername,
                socialLinks,
                clubName: resolvedClubName,
                clubDescription: resolvedClubDescription,
                city: resolvedCity,
                hobbies: resolvedHobbyTagIds,
            })

            setIsLoading(false)
        }

        loadProfileAndTags().catch(() => {
            if (isCancelled) {
                return
            }

            setErrorText(t('organization.profile.loadError'))
            setProfileImageUrl('')
            setPhotoFileList([])
            setAvailableTags([])
            setIsLoading(false)
        })

        return () => {
            isCancelled = true
        }
    }, [form, t])

    const onFinish = async (values) => {
        setIsSubmitting(true)
        setErrorText('')
        const normalizedSocialLinks = (values.socialLinks || [])
            .map((item) => (item?.value || '').trim())
            .filter(Boolean)
            .join('\n')

        const result = await updateMyProfile({
            username: values.username,
            socialLinks: normalizedSocialLinks,
            clubName: values.clubName,
            clubDescription: values.clubDescription,
            city: values.city,
        })

        if (!result.isSuccess) {
            setErrorText(result.errors?.[0]?.message || t('organization.profile.saveError'))
            setIsSubmitting(false)
            return
        }

        const interestsResult = await setMyInterests(values.hobbies || [])
        if (!interestsResult.isSuccess) {
            setErrorText(interestsResult.errors?.[0]?.message || t('organization.profile.saveError'))
            setIsSubmitting(false)
            return
        }

        messageApi.success(t('organization.profile.saveSuccess'))
        setIsSubmitting(false)
    }

    const beforePhotoUpload = (file) => {
        const isImage = file.type?.startsWith('image/')
        if (!isImage) {
            messageApi.error(t('organization.profile.photoInvalidType', { defaultValue: 'Sadece görsel dosyası yükleyebilirsiniz.' }))
            return Upload.LIST_IGNORE
        }

        const isWithinSizeLimit = (file.size || 0) / 1024 / 1024 < MAX_PROFILE_PHOTO_MB
        if (!isWithinSizeLimit) {
            messageApi.error(t('organization.profile.photoTooLarge', { defaultValue: 'Görsel boyutu en fazla 10MB olabilir.' }))
            return Upload.LIST_IGNORE
        }

        return true
    }

    const handlePhotoUpload = async (options) => {
        const { file, onError, onSuccess } = options
        setIsUploadingPhoto(true)

        try {
            const result = await uploadMyProfilePhoto(file)

            if (!result.isSuccess) {
                const errorMessage = result.errors?.[0]?.message || t('organization.profile.photoUploadError', { defaultValue: 'Profil fotoğrafı yüklenemedi.' })
                messageApi.error(errorMessage)
                setPhotoFileList(buildPhotoFileList(profileImageUrl))
                onError?.(new Error(errorMessage))
                return
            }

            const data = result.data || {}
            const uploadedUrl = String(data.profilePhotoUrl || data.ProfilePhotoUrl || '')
            if (uploadedUrl) {
                setProfileImageUrl(uploadedUrl)
                setPhotoFileList(buildPhotoFileList(uploadedUrl))
            }

            messageApi.success(t('organization.profile.photoUploadSuccess', { defaultValue: 'Profil fotoğrafı güncellendi.' }))
            onSuccess?.(data)
        } catch {
            const fallbackMessage = t('organization.profile.photoUploadError', { defaultValue: 'Profil fotoğrafı yüklenemedi.' })
            messageApi.error(fallbackMessage)
            setPhotoFileList(buildPhotoFileList(profileImageUrl))
            onError?.(new Error(fallbackMessage))
        } finally {
            setIsUploadingPhoto(false)
        }
    }

    const handlePhotoPreview = async (file) => {
        let src = file.url || file.thumbUrl || ''
        if (!src && file.originFileObj) {
            src = await getBase64(file.originFileObj)
        }

        setPreviewImage(src)
        setPreviewOpen(true)
    }

    const handlePhotoChange = ({ fileList }) => {
        setPhotoFileList([...fileList].slice(-1))
    }

    return (
        <Card loading={isLoading} style={{ borderRadius: 12, borderColor: '#e5e7eb' }}>
            {contextHolder}
            <Space direction="vertical" size={18} style={{ width: '100%' }}>
                <div
                    style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: 12,
                        background: '#f8fafc',
                        padding: '20px 16px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 12,
                    }}
                >
                    <Avatar
                        size={112}
                        src={profileImageUrl || undefined}
                        icon={!profileImageUrl ? <UserOutlined /> : null}
                        style={{
                            border: '3px solid #ffffff',
                            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.14)',
                            backgroundColor: '#dbeafe',
                            color: '#1d4ed8',
                            flexShrink: 0,
                        }}
                    />

                    <button
                        type="button"
                        onClick={() => setIsPhotoUploadModalOpen(true)}
                        style={{
                            border: 0,
                            background: 'none',
                            cursor: 'pointer',
                            color: '#1d4ed8',
                            fontWeight: 500,
                            padding: 0,
                            textDecoration: 'underline',
                        }}
                    >
                        {isUploadingPhoto
                            ? t('organization.profile.photoUploading', { defaultValue: 'Yükleniyor...' })
                            : t('organization.profile.changePhoto', { defaultValue: 'Profil fotoğrafını değiştir' })}
                    </button>
                </div>

                <Typography.Text style={{ color: '#6b7280' }}>
                    {t('organization.profile.description')}
                </Typography.Text>

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    requiredMark={false}
                >
                    <div
                        style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: 12,
                            background: '#fafafa',
                            padding: 16,
                            marginBottom: 16,
                        }}
                    >
                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="username"
                                    label={t('organization.profile.fields.username')}
                                    rules={[{ required: true, message: t('organization.profile.validation.usernameRequired') }]}
                                >
                                    <Input />
                                </Form.Item>
                            </Col>

                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="clubName"
                                    label={t('organization.profile.fields.clubName')}
                                    rules={[{ required: true, message: t('organization.profile.validation.clubNameRequired') }]}
                                >
                                    <Input />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="city"
                                    label={t('organization.profile.fields.city')}
                                    rules={[{ required: true, message: t('organization.profile.validation.cityRequired') }]}
                                    style={{ marginBottom: 0 }}
                                >
                                    <Input />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    <div
                        style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: 12,
                            background: '#ffffff',
                            padding: 16,
                            marginBottom: 16,
                        }}
                    >
                        <Form.Item
                            name="clubDescription"
                            label={t('organization.profile.fields.clubDescription')}
                            style={{ marginBottom: 0 }}
                        >
                            <Input.TextArea rows={4} />
                        </Form.Item>
                    </div>

                    <div
                        style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: 12,
                            background: '#ffffff',
                            padding: 16,
                            marginBottom: 16,
                        }}
                    >
                        <Form.Item name="hobbies" label={t('organization.profile.fields.hobbies')} style={{ marginBottom: 0 }}>
                            <Checkbox.Group options={hobbyOptions} />
                        </Form.Item>
                    </div>

                    <div
                        style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: 12,
                            background: '#ffffff',
                            padding: 16,
                            marginBottom: 18,
                        }}
                    >
                        <Form.Item label={t('organization.profile.fields.socialLinks')} style={{ marginBottom: 0 }}>
                            <Form.List name="socialLinks">
                                {(fields, { add, remove }) => (
                                    <Space direction="vertical" size={10} style={{ width: '100%' }}>
                                        {fields.map((field) => (
                                            <div
                                                key={field.key}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                }}
                                            >
                                                <Form.Item
                                                    {...field}
                                                    name={[field.name, 'value']}
                                                    style={{ marginBottom: 0, flex: 1 }}
                                                >
                                                    <Input placeholder={t('organization.profile.fields.socialLinksPlaceholder')} />
                                                </Form.Item>
                                                <Button
                                                    type="text"
                                                    danger
                                                    icon={<MinusCircleOutlined />}
                                                    onClick={() => remove(field.name)}
                                                />
                                            </div>
                                        ))}
                                        <Button type="dashed" onClick={() => add({ value: '' })} icon={<PlusOutlined />} block>
                                            {t('organization.profile.addSocialLink')}
                                        </Button>
                                    </Space>
                                )}
                            </Form.List>
                        </Form.Item>
                    </div>

                    <Form.Item style={{ marginBottom: 0, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="primary" htmlType="submit" loading={isSubmitting}>
                            {t('organization.profile.saveButton')}
                        </Button>
                    </Form.Item>
                </Form>

                {errorText ? (
                    <Typography.Text style={{ color: '#dc2626' }}>{errorText}</Typography.Text>
                ) : null}
            </Space>

            <Modal
                open={isPhotoUploadModalOpen}
                title={t('organization.profile.changePhoto', { defaultValue: 'Profil fotoğrafını değiştir' })}
                footer={null}
                onCancel={() => setIsPhotoUploadModalOpen(false)}
            >
                <Upload
                    listType="picture-card"
                    fileList={photoFileList.length > 0 ? photoFileList : undefined}
                    maxCount={1}
                    accept="image/*"
                    beforeUpload={beforePhotoUpload}
                    customRequest={handlePhotoUpload}
                    onPreview={handlePhotoPreview}
                    onChange={handlePhotoChange}
                    showUploadList={{ showPreviewIcon: true }}
                >
                    {photoFileList?.length >= 1 ? null : (
                        <button
                            type="button"
                            style={{
                                border: 0,
                                background: 'none',
                                cursor: 'pointer',
                                color: '#1d4ed8',
                                fontWeight: 500,
                                padding: 0,
                            }}
                        >
                            {t('organization.profile.changePhoto', { defaultValue: 'Profil fotoğrafını değiştir' })}
                        </button>
                    )}
                </Upload>
            </Modal>

            <Modal
                open={previewOpen}
                title={t('organization.profile.photoPreviewTitle', { defaultValue: 'Profil Fotoğrafı Önizleme' })}
                footer={null}
                onCancel={() => setPreviewOpen(false)}
            >
                <img alt={t('organization.profile.photoPreviewAlt')} style={{ width: '100%' }} src={previewImage} />
            </Modal>
        </Card>
    )
}

export default OrganizationProfileSection
