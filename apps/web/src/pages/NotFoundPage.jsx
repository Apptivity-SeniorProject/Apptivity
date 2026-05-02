import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <div className="page flex-col items-center justify-center" style={{ gap: 'var(--spacing-lg)' }}>
      <h1 style={{ fontSize: '5rem', fontWeight: 800, color: 'var(--color-primary)' }}>404</h1>
      <p className="text-muted">{t('notFound.message')}</p>
      <Link to="/" className="btn btn-primary">{t('notFound.backHome')}</Link>
    </div>
  )
}

export default NotFoundPage
