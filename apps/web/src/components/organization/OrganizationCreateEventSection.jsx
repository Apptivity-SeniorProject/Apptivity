import { EnvironmentOutlined, InfoCircleOutlined, UploadOutlined } from '@ant-design/icons'
import { Button, Card, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Spin, Typography, Upload, message } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createEvent, uploadEventBanner } from '../../services/eventService'
import { getActiveTags } from '../../services/tagService'

const MAX_EVENT_IMAGE_MB = 10
const MAX_EVENT_IMAGES = 3
const DEFAULT_MAP_CENTER = { latitude: 41.015137, longitude: 28.97953 }
const LEAFLET_SCRIPT_ID = 'apptivity-leaflet-script'
const LEAFLET_STYLE_ID = 'apptivity-leaflet-style'

let leafletLoadPromise = null

function pad2(value) {
    return String(value).padStart(2, '0')
}

function getInitialDateTime() {
    const now = new Date()
    now.setHours(now.getHours() + 2, 0, 0, 0)

    return {
        date: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`,
        time: `${pad2(now.getHours())}:${pad2(now.getMinutes())}`,
    }
}

function normalizeCreatedEventId(data) {
    return String(data?.id || data?.Id || '').trim()
}

function loadLeaflet() {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Leaflet can only load in browser environment.'))
    }

    if (window.L) {
        return Promise.resolve(window.L)
    }

    if (leafletLoadPromise) {
        return leafletLoadPromise
    }

    leafletLoadPromise = new Promise((resolve, reject) => {
        if (!document.getElementById(LEAFLET_STYLE_ID)) {
            const style = document.createElement('link')
            style.id = LEAFLET_STYLE_ID
            style.rel = 'stylesheet'
            style.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
            style.crossOrigin = ''
            document.head.appendChild(style)
        }

        const existingScript = document.getElementById(LEAFLET_SCRIPT_ID)
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(window.L))
            existingScript.addEventListener('error', () => reject(new Error('Leaflet script could not be loaded.')))
            return
        }

        const script = document.createElement('script')
        script.id = LEAFLET_SCRIPT_ID
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.async = true
        script.crossOrigin = ''
        script.onload = () => resolve(window.L)
        script.onerror = () => reject(new Error('Leaflet script could not be loaded.'))
        document.body.appendChild(script)
    })

    return leafletLoadPromise
}

async function reverseGeocode(latitude, longitude) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&addressdetails=1`
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
        },
    })

    if (!response.ok) {
        throw new Error('Reverse geocode request failed.')
    }

    return response.json()
}

function OrganizationCreateEventSection() {
    const { t } = useTranslation()
    const [form] = Form.useForm()
    const [messageApi, contextHolder] = message.useMessage()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isTagsLoading, setIsTagsLoading] = useState(false)
    const [tagOptions, setTagOptions] = useState([])
    const [errorText, setErrorText] = useState('')
    const [bannerFiles, setBannerFiles] = useState([])
    const [selectedCoordinate, setSelectedCoordinate] = useState(null)
    const [mapDraftCoordinate, setMapDraftCoordinate] = useState(null)
    const [isMapModalOpen, setIsMapModalOpen] = useState(false)
    const [isMapLoading, setIsMapLoading] = useState(false)
    const [isResolvingLocation, setIsResolvingLocation] = useState(false)
    const [mapErrorText, setMapErrorText] = useState('')
    const mapContainerRef = useRef(null)
    const mapInstanceRef = useRef(null)
    const markerRef = useRef(null)

    useEffect(() => {
        const initialDateTime = getInitialDateTime()
        form.setFieldsValue({
            name: '',
            description: '',
            date: initialDateTime.date,
            time: initialDateTime.time,
            durationMinutes: 120,
            capacity: 20,
            price: 0,
            city: '',
            fullAddress: '',
            locationLabel: '',
            primaryTagId: undefined,
            tagIds: [],
        })
    }, [form])

    useEffect(() => {
        let isCancelled = false

        async function loadTags() {
            setIsTagsLoading(true)
            const result = await getActiveTags()

            if (isCancelled) {
                return
            }

            if (!result.isSuccess) {
                setTagOptions([])
                setIsTagsLoading(false)
                return
            }

            const normalizedTags = (result.data || [])
                .map((tag) => ({
                    value: String(tag.id || tag.Id || '').trim(),
                    label: String(tag.name || tag.Name || '').trim(),
                }))
                .filter((tag) => tag.value && tag.label)

            setTagOptions(normalizedTags)
            setIsTagsLoading(false)
        }

        loadTags().catch(() => {
            if (isCancelled) {
                return
            }

            setTagOptions([])
            setIsTagsLoading(false)
        })

        return () => {
            isCancelled = true
        }
    }, [])

    useEffect(() => {
        if (!isMapModalOpen) {
            return
        }

        let isCancelled = false

        async function setupMap() {
            setIsMapLoading(true)
            setMapErrorText('')

            try {
                const L = await loadLeaflet()
                if (isCancelled || !mapContainerRef.current) {
                    return
                }

                if (!mapInstanceRef.current) {
                    const map = L.map(mapContainerRef.current, {
                        zoomControl: true,
                    })

                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; OpenStreetMap contributors',
                    }).addTo(map)

                    map.on('click', (event) => {
                        setMapDraftCoordinate({
                            latitude: event.latlng.lat,
                            longitude: event.latlng.lng,
                        })
                    })

                    mapInstanceRef.current = map
                }

                const map = mapInstanceRef.current
                const focusCoordinate = mapDraftCoordinate || selectedCoordinate || DEFAULT_MAP_CENTER
                map.setView([focusCoordinate.latitude, focusCoordinate.longitude], mapDraftCoordinate || selectedCoordinate ? 15 : 12)

                window.setTimeout(() => {
                    if (!isCancelled) {
                        map.invalidateSize()
                    }
                }, 80)

                if (!mapDraftCoordinate && !selectedCoordinate && navigator.geolocation) {
                    setIsResolvingLocation(true)
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            if (isCancelled || !mapInstanceRef.current) {
                                return
                            }

                            const current = {
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude,
                            }
                            setMapDraftCoordinate(current)
                            mapInstanceRef.current.setView([current.latitude, current.longitude], 15)
                            setIsResolvingLocation(false)
                        },
                        () => {
                            if (!isCancelled) {
                                setIsResolvingLocation(false)
                            }
                        },
                        { enableHighAccuracy: true, timeout: 7000, maximumAge: 60000 },
                    )
                }
            } catch {
                if (!isCancelled) {
                    setMapErrorText(t('organization.createEvent.map.loadError'))
                }
            } finally {
                if (!isCancelled) {
                    setIsMapLoading(false)
                }
            }
        }

        setupMap()

        return () => {
            isCancelled = true
        }
    }, [isMapModalOpen, mapDraftCoordinate, selectedCoordinate, t])

    useEffect(() => {
        if (!isMapModalOpen || !mapInstanceRef.current || !window.L) {
            return
        }

        const L = window.L

        if (!mapDraftCoordinate) {
            if (markerRef.current) {
                markerRef.current.remove()
                markerRef.current = null
            }
            return
        }

        const nextLatLng = [mapDraftCoordinate.latitude, mapDraftCoordinate.longitude]
        if (!markerRef.current) {
            markerRef.current = L.marker(nextLatLng).addTo(mapInstanceRef.current)
        } else {
            markerRef.current.setLatLng(nextLatLng)
        }
    }, [isMapModalOpen, mapDraftCoordinate])

    const selectedImageCountText = useMemo(
        () => `${bannerFiles.length}/${MAX_EVENT_IMAGES}`,
        [bannerFiles.length],
    )

    const coordinateText = selectedCoordinate
        ? `${selectedCoordinate.latitude.toFixed(6)}, ${selectedCoordinate.longitude.toFixed(6)}`
        : t('organization.createEvent.map.notSelected')

    const beforeUpload = (file) => {
        const isImage = file.type?.startsWith('image/')
        if (!isImage) {
            messageApi.error(t('organization.createEvent.validation.imageType'))
            return Upload.LIST_IGNORE
        }

        const isUnderSizeLimit = (file.size || 0) / 1024 / 1024 <= MAX_EVENT_IMAGE_MB
        if (!isUnderSizeLimit) {
            messageApi.error(t('organization.createEvent.validation.imageSize'))
            return Upload.LIST_IGNORE
        }

        return false
    }

    const openMapPicker = () => {
        setMapDraftCoordinate(selectedCoordinate)
        setIsMapModalOpen(true)
    }

    const closeMapPicker = () => {
        setIsMapModalOpen(false)
        setMapDraftCoordinate(selectedCoordinate)
        setMapErrorText('')
    }

    const confirmMapSelection = async () => {
        if (!mapDraftCoordinate) {
            messageApi.error(t('organization.createEvent.map.selectPointError'))
            return
        }

        setSelectedCoordinate(mapDraftCoordinate)
        setIsMapModalOpen(false)
        setMapErrorText('')

        const currentValues = form.getFieldsValue(['city', 'fullAddress', 'locationLabel'])

        try {
            const reverse = await reverseGeocode(mapDraftCoordinate.latitude, mapDraftCoordinate.longitude)
            const address = reverse?.address || {}
            const nextCity = address.city || address.town || address.village || address.municipality || address.county || ''
            const nextFullAddress = reverse?.display_name || ''
            const nextLocationLabel = address.road || address.neighbourhood || address.suburb || nextCity || ''

            form.setFieldsValue({
                city: currentValues.city || nextCity,
                fullAddress: currentValues.fullAddress || nextFullAddress,
                locationLabel: currentValues.locationLabel || nextLocationLabel,
            })
        } catch {
            // Coordinate selection remains valid even if reverse geocode fails.
        }
    }

    const onFinish = async (values) => {
        setErrorText('')

        if (!selectedCoordinate) {
            setErrorText(t('organization.createEvent.validation.mapSelectionRequired'))
            return
        }

        if (bannerFiles.length < 1 || bannerFiles.length > MAX_EVENT_IMAGES) {
            setErrorText(t('organization.createEvent.validation.imageCount'))
            return
        }

        const eventDateTime = new Date(`${values.date}T${values.time}`)
        if (Number.isNaN(eventDateTime.getTime()) || eventDateTime.getTime() <= Date.now()) {
            setErrorText(t('organization.createEvent.validation.futureDateTime'))
            return
        }

        const primaryTagId = values.primaryTagId || undefined
        const extraTagIds = Array.isArray(values.tagIds) ? values.tagIds : []
        const tagIds = Array.from(new Set([primaryTagId, ...extraTagIds].filter(Boolean)))

        const locationData = JSON.stringify({
            city: String(values.city || '').trim(),
            fullAddress: String(values.fullAddress || '').trim(),
            locationLabel: String(values.locationLabel || '').trim() || String(values.fullAddress || '').trim(),
            lat: selectedCoordinate.latitude,
            lng: selectedCoordinate.longitude,
        })

        const payload = {
            name: String(values.name || '').trim(),
            description: String(values.description || '').trim(),
            date: values.date,
            time: values.time,
            durationMinutes: Number(values.durationMinutes),
            capacity: Number(values.capacity),
            price: Number(values.price),
            locationData,
            primaryTagId,
            tagIds: tagIds.length > 0 ? tagIds : undefined,
        }

        setIsSubmitting(true)

        try {
            const createResult = await createEvent(payload)
            if (!createResult.isSuccess) {
                setErrorText(createResult.errors?.[0]?.message || t('organization.createEvent.messages.createError'))
                setIsSubmitting(false)
                return
            }

            const createdEventId = normalizeCreatedEventId(createResult.data)
            const firstImage = bannerFiles[0]?.originFileObj

            if (createdEventId && firstImage) {
                const uploadResult = await uploadEventBanner(createdEventId, firstImage)
                if (!uploadResult.isSuccess) {
                    messageApi.warning(uploadResult.errors?.[0]?.message || t('organization.createEvent.messages.bannerUploadError'))
                }
            }

            messageApi.success(t('organization.createEvent.messages.createSuccess'))
            const initialDateTime = getInitialDateTime()
            form.setFieldsValue({
                name: '',
                description: '',
                date: initialDateTime.date,
                time: initialDateTime.time,
                durationMinutes: 120,
                capacity: 20,
                price: 0,
                city: '',
                fullAddress: '',
                locationLabel: '',
                primaryTagId: undefined,
                tagIds: [],
            })
            setSelectedCoordinate(null)
            setMapDraftCoordinate(null)
            setBannerFiles([])
            setErrorText('')
        } catch {
            setErrorText(t('organization.createEvent.messages.createError'))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Card style={{ borderRadius: 12, borderColor: '#e5e7eb' }}>
            {contextHolder}

            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Typography.Text style={{ color: '#6b7280' }}>
                    {t('organization.createEvent.description')}
                </Typography.Text>

                <Form
                    form={form}
                    layout="vertical"
                    requiredMark={false}
                    onFinish={onFinish}
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
                            <Col xs={24}>
                                <Form.Item
                                    name="name"
                                    label={t('organization.createEvent.fields.name')}
                                    rules={[{ required: true, message: t('organization.createEvent.validation.nameRequired') }]}
                                >
                                    <Input placeholder={t('organization.createEvent.placeholders.name')} />
                                </Form.Item>
                            </Col>

                            <Col xs={24}>
                                <Form.Item
                                    name="description"
                                    label={t('organization.createEvent.fields.description')}
                                    rules={[{ required: true, message: t('organization.createEvent.validation.descriptionRequired') }]}
                                    style={{ marginBottom: 0 }}
                                >
                                    <Input.TextArea rows={4} placeholder={t('organization.createEvent.placeholders.description')} />
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
                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="date"
                                    label={t('organization.createEvent.fields.date')}
                                    rules={[{ required: true, message: t('organization.createEvent.validation.dateRequired') }]}
                                >
                                    <Input type="date" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="time"
                                    label={t('organization.createEvent.fields.time')}
                                    rules={[{ required: true, message: t('organization.createEvent.validation.timeRequired') }]}
                                >
                                    <Input type="time" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="durationMinutes"
                                    label={t('organization.createEvent.fields.durationMinutes')}
                                    rules={[{ required: true, message: t('organization.createEvent.validation.durationRequired') }]}
                                >
                                    <InputNumber min={1} style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="capacity"
                                    label={t('organization.createEvent.fields.capacity')}
                                    rules={[{ required: true, message: t('organization.createEvent.validation.capacityRequired') }]}
                                >
                                    <InputNumber min={1} style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="price"
                                    label={t('organization.createEvent.fields.price')}
                                    rules={[{ required: true, message: t('organization.createEvent.validation.priceRequired') }]}
                                    style={{ marginBottom: 0 }}
                                >
                                    <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
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
                        <Space size={8} style={{ marginBottom: 12 }}>
                            <EnvironmentOutlined style={{ color: '#1677ff' }} />
                            <Typography.Text strong>{t('organization.createEvent.locationTitle')}</Typography.Text>
                        </Space>

                        <div
                            style={{
                                border: '1px solid #dbe1ea',
                                borderRadius: 10,
                                padding: 12,
                                marginBottom: 14,
                                background: '#f8fafc',
                            }}
                        >
                            <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
                                <div>
                                    <Typography.Text strong>{t('organization.createEvent.map.coordinateLabel')}</Typography.Text>
                                    <div style={{ color: '#64748b', marginTop: 4 }}>
                                        {coordinateText}
                                    </div>
                                </div>
                                <Button onClick={openMapPicker}>
                                    {selectedCoordinate
                                        ? t('organization.createEvent.map.updateButton')
                                        : t('organization.createEvent.map.selectButton')}
                                </Button>
                            </Space>
                        </div>

                        <Row gutter={16}>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="city"
                                    label={t('organization.createEvent.fields.city')}
                                    rules={[{ required: true, message: t('organization.createEvent.validation.cityRequired') }]}
                                >
                                    <Input placeholder={t('organization.createEvent.placeholders.city')} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={16}>
                                <Form.Item
                                    name="fullAddress"
                                    label={t('organization.createEvent.fields.fullAddress')}
                                    rules={[{ required: true, message: t('organization.createEvent.validation.fullAddressRequired') }]}
                                >
                                    <Input placeholder={t('organization.createEvent.placeholders.fullAddress')} />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24}>
                                <Form.Item
                                    name="locationLabel"
                                    label={t('organization.createEvent.fields.locationLabel')}
                                    style={{ marginBottom: 0 }}
                                >
                                    <Input placeholder={t('organization.createEvent.placeholders.locationLabel')} />
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
                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="primaryTagId"
                                    label={t('organization.createEvent.fields.primaryTag')}
                                    style={{ marginBottom: 0 }}
                                >
                                    <Select
                                        allowClear
                                        loading={isTagsLoading}
                                        options={tagOptions}
                                        placeholder={t('organization.createEvent.placeholders.primaryTag')}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="tagIds"
                                    label={t('organization.createEvent.fields.tags')}
                                    style={{ marginBottom: 0 }}
                                >
                                    <Select
                                        mode="multiple"
                                        allowClear
                                        loading={isTagsLoading}
                                        options={tagOptions}
                                        placeholder={t('organization.createEvent.placeholders.tags')}
                                    />
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
                            marginBottom: 20,
                        }}
                    >
                        <Space align="center" style={{ justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
                            <Typography.Text strong>{t('organization.createEvent.fields.images')}</Typography.Text>
                            <Typography.Text type="secondary">{selectedImageCountText}</Typography.Text>
                        </Space>

                        <Upload
                            multiple
                            accept="image/*"
                            fileList={bannerFiles}
                            beforeUpload={beforeUpload}
                            onChange={({ fileList }) => setBannerFiles(fileList.slice(0, MAX_EVENT_IMAGES))}
                            onRemove={(file) => {
                                setBannerFiles((current) => current.filter((item) => item.uid !== file.uid))
                            }}
                            listType="picture"
                        >
                            <Button icon={<UploadOutlined />}>{t('organization.createEvent.buttons.selectImages')}</Button>
                        </Upload>

                        <Space size={6} style={{ marginTop: 10 }}>
                            <InfoCircleOutlined style={{ color: '#6b7280' }} />
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                {t('organization.createEvent.imageHint')}
                            </Typography.Text>
                        </Space>
                    </div>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button type="primary" htmlType="submit" loading={isSubmitting}>
                            {t('organization.createEvent.buttons.submit')}
                        </Button>
                    </Form.Item>
                </Form>

                {errorText ? (
                    <Typography.Text style={{ color: '#dc2626' }}>
                        {errorText}
                    </Typography.Text>
                ) : null}
            </Space>

            <Modal
                open={isMapModalOpen}
                onCancel={closeMapPicker}
                onOk={confirmMapSelection}
                okText={t('organization.createEvent.map.saveButton')}
                cancelText={t('organization.createEvent.map.cancelButton')}
                title={t('organization.createEvent.map.modalTitle')}
                width={860}
            >
                <Typography.Text style={{ color: '#6b7280' }}>
                    {t('organization.createEvent.map.modalDescription')}
                </Typography.Text>

                <div
                    style={{
                        marginTop: 12,
                        border: '1px solid #e5e7eb',
                        borderRadius: 12,
                        height: 360,
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

                    {(isMapLoading || isResolvingLocation) ? (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(255,255,255,0.75)',
                            }}
                        >
                            <Space direction="vertical" align="center">
                                <Spin />
                                <Typography.Text type="secondary">
                                    {t('organization.createEvent.map.loadingText')}
                                </Typography.Text>
                            </Space>
                        </div>
                    ) : null}
                </div>

                {mapErrorText ? (
                    <Typography.Text style={{ color: '#dc2626', display: 'block', marginTop: 10 }}>
                        {mapErrorText}
                    </Typography.Text>
                ) : null}
            </Modal>
        </Card>
    )
}

export default OrganizationCreateEventSection
