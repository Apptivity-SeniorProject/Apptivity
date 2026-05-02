import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
    tr: {
        translation: {
            common: {
                language: {
                    tr: 'TR',
                    en: 'EN',
                },
            },
            legacyNavbar: {
                home: 'Ana Sayfa',
                events: 'Etkinlikler',
                login: 'Giriş Yap',
            },
            notFound: {
                message: 'Aradığınız sayfa bulunamadı.',
                backHome: 'Ana Sayfaya Dön',
            },
            landing: {
                brand: 'Apptivity',
                title: 'Güvenle Buluş Keyifle Sosyalleş',
                subtitle: 'Apptivity ile yeni insanlarla tanış, etkinliklere katıl ve güvenli bir ortamda sosyalleş. Ortak ilgi alanlarına sahip kişilerle bir araya gel!',
                adminLogin: 'Admin Giriş',
                organizationLogin: 'Organizasyonlar Giriş',
                nav: {
                    about: 'Hakkımızda',
                    features: 'Neden Apptivity?',
                    how: 'Nasıl Çalışır',
                },
                images: {
                    heroAlt: 'Apptivity ile sosyalleşen kullanıcılar',
                    aboutAlt: 'Apptivity topluluk etkinliği',
                },
                about: {
                    title: 'Hakkımızda',
                    headline: 'Apptivity ile Dünyayı Keşfet',
                    body: 'Apptivity, insanların güvenli bir şekilde bir araya gelmesini, yeni arkadaşlıklar kurmasını ve unutulmaz deneyimler yaşamasını sağlayan bir sosyal platformdur.',
                    mission: 'Misyonumuz, insanları ortak ilgi alanları etrafında bir araya getirerek daha bağlı ve sosyal bir toplum oluşturmaktır.',
                },
                features: {
                    title: 'Neden Apptivity?',
                    subtitle: 'Sosyalleşmeyi güvenli, kolay ve keyifli hale getiren özelliklere sahip bir platform',
                    safeTitle: 'Güvenli Ortam',
                    safeBody: 'Kimlik doğrulama ve kullanıcı puanlama sistemi ile güvenli bir sosyalleşme ortamı',
                    eventTitle: 'Etkinlik Oluştur',
                    eventBody: 'Kendi etkinliklerini oluştur veya mevcut etkinliklere katıl, yeni insanlarla tanış',
                    interestTitle: 'Ortak İlgi Alanları',
                    interestBody: 'İlgi alanlarına göre eşleşme sistemi ile benzer hobisi olan kişileri bul',
                    locationTitle: 'Konum Bazlı',
                    locationBody: 'Yakınındaki etkinlikleri ve kullanıcıları keşfet, kolayca buluş',
                    communityTitle: 'Topluluk Odaklı',
                    communityBody: 'Samimi ve pozitif bir topluluk ortamında yeni arkadaşlıklar kur',
                    instantTitle: 'Anında Bildirim',
                    instantBody: 'Yeni etkinlikler ve mesajlar için anlık bildirim al, hiçbir şeyi kaçırma',
                },
                how: {
                    title: 'Nasıl Çalışır',
                    subtitle: 'Uygulamayı kullanmaya başlamak için dört adım yeterli.',
                    step1Title: 'Hesabınla giriş yap',
                    step1Body: 'Telefon numaranla giriş yap',
                    step2Title: 'Etkinlik oluştur veya katıl',
                    step2Body: 'Takvim, kapasite ve başvuru adımlarını birkaç dakikada tanımla.',
                    step3Title: 'Süreci canlı izle',
                    step3Body: 'Başvuruları ve durum değişikliklerini panelden anlık takip et.',
                    step4Title: 'Buluş ve Sosyalleş',
                    step4Body: 'Yeni insanlarla tanış ve harika zaman geçir',
                },
                cta: {
                    title: 'Bireysel kullanıcı mısınız?',
                    subtitle: 'Mobil uygulamamızı indirerek hemen sosyalleşmeye başlayın!',
                    appStore: 'App Store',
                    googlePlay: 'Google Play',
                },
                footer: {
                    brand: 'Apptivity',
                    text: 'Etkinlik yönetiminde hızlı, sade ve güvenilir deneyim.',
                },
            },
            login: {
                loginTitle: 'Giriş Yap',
                loginSubtitle: 'Hesabınıza giriş yapın',
                adminLoginTitle: 'Admin Giriş',
                adminLoginSubtitle: 'Admin paneline devam etmek için giriş yapın',
                organizationLoginTitle: 'Organizasyon Giriş',
                organizationLoginSubtitle: 'Organizasyon hesabınızla giriş yapın',
                pageTitle: 'Hesap Girişi',
                pageSubtitle: 'Rolünü seçip hesabınla giriş yapabilirsin.',
                backHome: 'Ana Sayfa',
                identifier: 'Kullanıcı adı / e-posta / telefon',
                identifierRequired: 'Lütfen kullanıcı adı, e-posta veya telefon girin',
                invalidUserName: 'Geçersiz kullanıcı adı',
                password: 'Şifre',
                passwordRequired: 'Lütfen şifrenizi girin',
                loginSuccess: 'Giriş başarılı.',
                networkError: 'Sunucuya ulaşılamadı. Lütfen tekrar deneyin.',
                unexpectedError: 'Beklenmeyen bir hata oluştu.',
                adminRoleRequired: 'Bu sayfadan yalnızca admin hesabı ile giriş yapabilirsiniz.',
                organizationRoleRequired: 'Bu sayfadan yalnızca organizasyon hesabı ile giriş yapabilirsiniz.',
            },
        },
    },
    en: {
        translation: {
            common: {
                language: {
                    tr: 'TR',
                    en: 'EN',
                },
            },
            legacyNavbar: {
                home: 'Home',
                events: 'Events',
                login: 'Login',
            },
            notFound: {
                message: 'The page you are looking for could not be found.',
                backHome: 'Back to Home',
            },
            landing: {
                brand: 'Apptivity',
                title: 'Meet Safely, Socialize Joyfully',
                subtitle: 'With Apptivity, meet new people, join events, and socialize in a safe environment. Connect with people who share your interests!',
                adminLogin: 'Admin Login',
                organizationLogin: 'Organization Login',
                nav: {
                    about: 'About',
                    features: 'Why Apptivity?',
                    how: 'How It Works',
                },
                images: {
                    heroAlt: 'Users socializing with Apptivity',
                    aboutAlt: 'Apptivity community event',
                },
                about: {
                    title: 'About Us',
                    headline: 'Discover the World with Apptivity',
                    body: 'Apptivity is a social platform that helps people come together safely, build new friendships, and create unforgettable experiences.',
                    mission: 'Our mission is to build a more connected and social community by bringing people together around shared interests.',
                },
                features: {
                    title: 'Why Apptivity?',
                    subtitle: 'A platform with features that make socializing safe, easy, and enjoyable',
                    safeTitle: 'Safe Environment',
                    safeBody: 'A secure social experience with identity verification and user rating systems',
                    eventTitle: 'Create Events',
                    eventBody: 'Create your own events or join existing ones and meet new people',
                    interestTitle: 'Shared Interests',
                    interestBody: 'Find people with similar hobbies through interest-based matching',
                    locationTitle: 'Location Based',
                    locationBody: 'Discover nearby events and users, and meet up easily',
                    communityTitle: 'Community Focused',
                    communityBody: 'Build new friendships in a friendly and positive community',
                    instantTitle: 'Instant Notifications',
                    instantBody: 'Get instant alerts for new events and messages, never miss anything',
                },
                how: {
                    title: 'How It Works',
                    subtitle: 'You can start using the platform in four steps.',
                    step1Title: 'Sign in with your account',
                    step1Body: 'Sign in with your phone number',
                    step2Title: 'Create or join an event',
                    step2Body: 'Define calendar, capacity and application flow in minutes.',
                    step3Title: 'Track everything live',
                    step3Body: 'Monitor applications and status updates directly from your panel.',
                    step4Title: 'Meet and Socialize',
                    step4Body: 'Meet new people and have a great time',
                },
                cta: {
                    title: 'Are you an individual user?',
                    subtitle: 'Download our mobile app and start socializing right away!',
                    appStore: 'App Store',
                    googlePlay: 'Google Play',
                },
                footer: {
                    brand: 'Apptivity',
                    text: 'A fast, simple and reliable event management experience.',
                },
            },
            login: {
                loginTitle: 'Login',
                loginSubtitle: 'Sign in to your account',
                adminLoginTitle: 'Admin Login',
                adminLoginSubtitle: 'Sign in to continue to the admin panel',
                organizationLoginTitle: 'Organization Login',
                organizationLoginSubtitle: 'Sign in with your organization account',
                pageTitle: 'Account Login',
                pageSubtitle: 'Select your role and sign in with your account.',
                backHome: 'Home',
                identifier: 'Username / email / phone',
                identifierRequired: 'Please enter username, email or phone',
                invalidUserName: 'Invalid username',
                password: 'Password',
                passwordRequired: 'Please enter your password',
                loginSuccess: 'Login successful.',
                networkError: 'Could not reach the server. Please try again.',
                unexpectedError: 'An unexpected error occurred.',
                adminRoleRequired: 'Only admin accounts can sign in from this page.',
                organizationRoleRequired: 'Only organization accounts can sign in from this page.',
            },
        },
    },
}

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'tr',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    })

export default i18n
