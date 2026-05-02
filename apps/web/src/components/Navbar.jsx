import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function Navbar() {
  const { t } = useTranslation()

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar__inner">
          <NavLink to="/" className="navbar__logo">
            Apptivity
          </NavLink>
          <div className="navbar__links">
            <NavLink to="/" className={({ isActive }) => `navbar__link${isActive ? ' active' : ''}`}>
              {t('legacyNavbar.home')}
            </NavLink>
            <NavLink to="/events" className={({ isActive }) => `navbar__link${isActive ? ' active' : ''}`}>
              {t('legacyNavbar.events')}
            </NavLink>
            <NavLink to="/login" className="btn btn-primary">
              {t('legacyNavbar.login')}
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
