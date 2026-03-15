# 🏃 Apptivity Backend

**Stack:** Spring Boot 3.4.3 · PostgreSQL 16 · Spring Security · JWT (jjwt 0.12.6) · SpringDoc Swagger · Lombok · Java 17

---

## 📋 İçindekiler

- [Gereksinimler](#-gereksinimler)
- [Hızlı Başlangıç — Docker ile](#-hızlı-başlangıç--docker-ile)
- [Yerel Geliştirme — Docker Olmadan](#-yerel-geliştirme--docker-olmadan)
- [Ortam Değişkenleri](#-ortam-değişkenleri)
- [API Dokümantasyonu](#-api-dokümantasyonu)
- [Proje Yapısı](#-proje-yapısı)

---

## 📦 Gereksinimler

| Araç | Minimum Sürüm |
|------|--------------|
| Docker Desktop | 24+ |
| Docker Compose | v2 (Compose V2) |
| *(Yerel dev için)* JDK | 17+ |
| *(Yerel dev için)* Maven | 3.9+ |
| *(Yerel dev için)* PostgreSQL | 16 |

---

## 🚀 Hızlı Başlangıç — Docker ile

### 1. Repoyu klonlayın

```bash
git clone <repo-url>
cd apptivity-backend
```

### 2. Ortam değişkenlerini ayarlayın

```bash
# .env.example dosyasını .env olarak kopyalayın
copy .env.example .env   # Windows (PowerShell)
# ya da:
cp .env.example .env     # macOS/Linux
```

`.env` dosyasını açıp şifreleri güncelleyin:

```env
DB_PASSWORD=guclu_bir_sifre
JWT_SECRET=en_az_256_bit_guclu_secret_key
```

### 3. Konteynerleri başlatın

```bash
docker compose up --build
```

> İlk çalıştırmada Maven bağımlılıkları indirilir (~1-2 dk). Sonraki başlatmalar build cache sayesinde çok daha hızlıdır.

### 4. Uygulamayı doğrulayın

| Servis | URL |
|--------|-----|
| Backend API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| API JSON Docs | http://localhost:8080/api-docs |

### Konteyner Komutları

```bash
# Arka planda çalıştır
docker compose up -d --build

# Logları izle
docker compose logs -f backend

# Durdur
docker compose down

# Veritabanı dahil her şeyi temizle (data silinir!)
docker compose down -v
```

---

## 💻 Yerel Geliştirme — Docker Olmadan

### 1. PostgreSQL başlatın

```bash
# Docker ile sadece DB
docker compose up postgres -d

# ya da yerel PostgreSQL kullanıyorsanız:
# psql -U postgres -c "CREATE DATABASE apptivity;"
```

### 2. Uygulamayı çalıştırın

```bash
mvn spring-boot:run
```

ya da IDE'den `ApptivityBackendApplication.java` → **Run**

### 3. JAR olarak build & çalıştır

```bash
mvn package -DskipTests
java -jar target/apptivity-backend-0.0.1-SNAPSHOT.jar
```

---

## 🔧 Ortam Değişkenleri

| Değişken | Varsayılan | Açıklama |
|----------|-----------|----------|
| `DB_PASSWORD` | `1234` | PostgreSQL şifresi |
| `JWT_SECRET` | `CHANGE_ME_...` | JWT imzalama anahtarı — **üretimde mutlaka değiştirin!** |

> **Not:** `application.properties` içindeki değerler Docker ortam değişkenleri tarafından otomatik ezilebilir.

---

## 📖 API Dokümantasyonu

Uygulama çalışırken Swagger UI'ya gidin:

```
http://localhost:8080/swagger-ui.html
```

### Temel Endpoint'ler

| Method | URL | Açıklama | Auth |
|--------|-----|----------|------|
| `POST` | `/api/v1/auth/register` | Kayıt | ✗ |
| `POST` | `/api/v1/auth/login` | Giriş → JWT | ✗ |
| `GET` | `/api/v1/users/me` | Profil bilgisi | ✓ Bearer |

---

## 🗂 Proje Yapısı

```
src/main/java/com/example/apptivitybackend/
│
├── constants/          → Sabit değerler (AppConstants)
├── controller/         → REST endpoint'leri (HTTP katmanı)
├── exception/          → GlobalExceptionHandler + özel hata sınıfları
├── model/              → JPA @Entity sınıfları (PostgreSQL tabloları)
├── repository/         → Spring Data JPA repository'leri
├── security/           → SecurityConfig, JWT filter/provider
├── services/           → İş mantığı servisleri
└── util/               → Yardımcı static sınıflar
```

---

## ⚠️ Bilinen Notlar

- `ARCHITECTURE.md` dosyasındaki **MongoDB** referansları **eskimiş** — gerçek kod PostgreSQL/JPA kullanıyor.
- `SecurityConfig.java` şu an tüm endpoint'lere açık (`permitAll`) — JWT filter henüz tam entegre edilmemiş.
- `compose.yaml` (eski, MongoDB'li) yerine **`docker-compose.yml`** kullanın.
