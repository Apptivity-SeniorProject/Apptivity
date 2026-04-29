# 🚀 Apptivity Monorepo

Bu proje; Backend (Spring Boot), Web (React/Vite) ve Mobil (Expo/React Native) uygulamalarının tek bir repoda (Monorepo) birleştiği, enterprise seviyesinde yapılandırılmış bir sistemdir.

NPM Workspaces ve Docker Compose kullanılarak, hem takım arkadaşlarının (insanların) hem de Yapay Zeka (AI) asistanlarının kolayca anlayıp geliştirebileceği standartlarda tasarlanmıştır.

---

## 🏗️ Mimari ve Dizin Yapısı

Proje 3 temel ayağa ayrılmıştır:

```text
Apptivity-Monorepo/
├── apps/
│   ├── web/            # React + Vite (Web Frontend)
│   └── mobile/         # React Native + Expo (Mobil Uygulama)
├── services/
│   └── backend/        # Spring Boot + Java 17 (REST API & Auth)
├── .github/workflows/  # CI/CD Pipeline (GitHub Actions)
├── docker-compose.yml  # Tüm servisleri ayağa kaldıran Docker konfigürasyonu
└── package.json        # NPM Workspaces (Monorepo yönetim dosyası)
```

## 🔌 Servisler ve Portlar

Docker veya lokal geliştirme ortamında ayağa kalkan servislerin varsayılan erişim noktaları:

| Servis | Teknoloji | Adres | Açıklama |
|--------|-----------|-------|----------|
| **Web Frontend** | React / Nginx | `http://localhost:3000` | Web Arayüzü (Nginx üzerinden yayınlanır) |
| **Backend API** | Spring Boot | `http://localhost:8080/api/` | REST Endpointleri |
| **Swagger UI** | SpringDoc | `http://localhost:8080/swagger-ui.html` | API Dokümantasyonu |
| **Veritabanı** | PostgreSQL 16 | `localhost:5433` | Veritabanı bağlantı portu |
| **Mobil App** | Expo | `localhost:8081` | (Geliştirme aşamasında Expo ile çalışır) |

---

## 🚀 Başlangıç (Nasıl Çalıştırılır?)

Aşağıdaki adımlarla projeyi kendi bilgisayarınızda anında çalıştırabilirsiniz.

### 1. Ortam Değişkenlerini (Env) Hazırlayın
Kök dizinde yer alan `.env.example` dosyasını kopyalayarak gizli bir `.env` dosyası oluşturun:
```bash
cp .env.example .env
```
*(Dosya içindeki veritabanı şifresi veya JWT Secret gibi değerleri kendi local ortamınıza göre değiştirebilirsiniz).*

### 2. Bağımlılıkları Yükleyin (Monorepo Setup)
Proje kök dizininde aşağıdaki komutu çalıştırarak `apps/web` ve `apps/mobile` içindeki tüm Node.js paketlerini tek seferde optimize olarak kurun:
```bash
npm install
```

### 3. Tüm Sistemi Ayağa Kaldırın (Docker)
Docker kullanarak Veritabanı, Backend ve Web projelerini birbiriyle uyumlu şekilde başlatın:
```bash
docker compose up -d --build
```

---

## 💻 Geliştirme (Development) Notları

Eğer kodu değiştirirken anlık yenilenme (Hot-Reload) istiyorsanız Docker yerine projeleri lokalde ayrı ayrı başlatabilirsiniz:

### 🌐 Web (React) Geliştirme
```bash
cd apps/web
npm run dev
# Vite http://localhost:5173 adresinden başlar. 
# Not: İstekler Spring Boot'a giderken CORS sorununu aşmak için SecurityConfig.java izinleri zaten ayarlıdır.
```

### 📱 Mobil (Expo) Geliştirme
```bash
cd apps/mobile
npm run start
# Akıllı telefonunuzdaki Expo Go uygulaması ile QR kodu okutabilirsiniz.
```

### ☕ Backend (Spring Boot) Geliştirme
```bash
cd services/backend
mvn spring-boot:run
# Backend 8080 portundan çalışır.
# Not: Bu komutu kullanmadan önce veritabanının çalıştığından emin olun (Sadece DB için `docker compose up -d postgres` kullanabilirsiniz).
```

---

## 🤖 Yapay Zeka (AI) ve Geliştiriciler İçin Teknik Detaylar

- **Nginx Reverse Proxy:** `apps/web/nginx.conf` dosyası üzerinden `/api/` ile başlayan tüm istekler doğrudan Docker içindeki `backend` servisine yönlendirilir. Web kodunda API çağrısı yaparken `http://localhost:8080/api/...` demek yerine sadece `/api/...` demeniz yeterlidir.
- **CORS:** Geliştirme ortamında (Vite, Expo vb. çalışırken) Backend'in istekleri reddetmemesi için `services/backend/src/.../SecurityConfig.java` içerisinde `CorsConfigurationSource` aktiftir.
- **CI/CD:** Projede 3 adet GitHub Actions (`backend.yml`, `web.yml`, `mobile.yml`) bulunur. Yapılan commitlerin **sadece değişen projedeki** (örn: sadece web değiştiyse web) build ve test test adımlarını çalıştırır.

---

> **Not:** Üretime (Production) çıkarken `.env` dosyasındaki JWT Secret anahtarını güçlü bir key ile değiştirmeyi unutmayın!
