import { Segmented } from 'antd'
import { useTranslation } from 'react-i18next'

function LanguageSwitcher() {
    const { i18n, t } = useTranslation()
    const currentLanguage = i18n.resolvedLanguage?.toLowerCase().startsWith('en') ? 'en' : 'tr'

    return (
        <Segmented
            className="lang-switcher"
            size="small"
            value={currentLanguage}
            options={[
                { label: t('common.language.tr'), value: 'tr' },
                { label: t('common.language.en'), value: 'en' },
            ]}
            onChange={(value) => {
                i18n.changeLanguage(value)
            }}
        />
    )
}

export default LanguageSwitcher
