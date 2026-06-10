import { Route, Routes } from 'react-router-dom'
import AdminHomePage from '../pages/AdminHomePage'
import AdminLoginPage from '../pages/AdminLoginPage'
import HomePage from '../pages/HomePage'
import LoginPage from '../pages/LoginPage'
import NotFoundPage from '../pages/NotFoundPage'
import OrganizationHomePage from '../pages/OrganizationHomePage'
import OrganizationLoginPage from '../pages/OrganizationLoginPage'

export function MainRoutes() {
    return (
        <Routes>
            <Route key="homePageRoute" path="/" element={<HomePage />} />
            <Route key="adminLoginAliasPageRoute" path="/admin/login" element={<AdminLoginPage />} />
            <Route key="adminHomePageRoute" path="/admin/*" element={<AdminHomePage />} />
            <Route key="organizationHomePageRoute" path="/organization" element={<OrganizationHomePage />} />
            <Route key="loginPageRoute" path="/login" element={<LoginPage />} />
            <Route key="adminLoginPageRoute" path="/login/admin" element={<AdminLoginPage />} />
            <Route key="organizationLoginPageRoute" path="/login/organization" element={<OrganizationLoginPage />} />
            <Route key="notFoundPageRoute" path="*" element={<NotFoundPage />} />
        </Routes>
    )
}
