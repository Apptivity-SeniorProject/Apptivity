# Apptivity Monorepo

This repository follows a services + apps architecture.

## Layout

```text
.
|- apps/
|  |- web/                React + Vite
|  `- mobile/             Expo + React Native
|- services/
|  `- backend/            ASP.NET Core Web API (.NET 10)
`- .github/workflows/     CI pipelines
```

## Command Matrix

### Backend

```bash
dotnet restore services/backend/Apptivity.Backend.sln
dotnet build services/backend/Apptivity.Backend.sln --configuration Release
dotnet test services/backend/Apptivity.Backend.sln --configuration Release

dotnet run --project services/backend/src/Apptivity.Api/Apptivity.Api.csproj
```

### Web

```bash
cd apps/web
npm ci
npm run lint
npm run build
npm run dev
```

### Mobile

```bash
cd apps/mobile
npm ci
npm run lint
npx tsc --noEmit
npm run start
```

!! 
gemini db de bunların eksik olduğunu belirtti: 
Bu notları alırsan, EF Core sınıflarını (Entity) yazarken mimarimiz kusursuz olur:
1. Kimlik Doğrulama ve Güvenlik (Auth & Security) Eksikleri

    REFRESH_TOKEN Tablosu Eksik: JWT kullanacağımız için, token yenileme işlemlerini ve hangi cihazın oturum açtığını takip etmemiz lazım.

        Eklenecek Tablo: RefreshToken (Alanlar: Id, AccountId, Token, ExpiresAt, CreatedAt, RevokedAt)

    OTP_LOG (Doğrulama Kodu) Tablosu Eksik: Mobil kullanıcılar telefon + SMS (OTP) ile girecek dedik. Bu geçici kodları ve geçerlilik sürelerini bir yerde tutmalıyız.

        Eklenecek Tablo: OtpVerification (Alanlar: Id, PhoneNumber, Code, ExpiresAt, IsUsed, CreatedAt)

    Password Alanı Esnekliği: Mobil kullanıcılar (Individual) sadece OTP ile gireceği için şifreleri olmayacak. Web kullanıcılarının (Admin/Club) ise şifresi olacak. Bu nedenle ACCOUNT tablosundaki password alanı nullable (boş bırakılabilir) olmalı.

2. Değerlendirme ve İtibar (Reputation) Mantığındaki Eksik

    REVIEW (Değerlendirme) Tablosu Eksik: Şu anki şemada puanlar PARTICIPATION tablosunda scores (ortalama skor) ve voter_count olarak tutuluyor. Bu çok riskli. Kim, kime, hangi etkinlikte, kaç puan verdi ve ne yorum yaptı? Geçmişe dönük bunu bilemeyiz.

        Çözüm: PARTICIPATION tablosundaki skor alanlarını kaldırıp yeni bir tablo açmalıyız.

        Eklenecek Tablo: Review (Alanlar: Id, EventId, ReviewerAccountId, ReviewedAccountId, Rating, Comment, CreatedAt)

3. Bildirim (Notification) Sistemi Eksikleri

    FCM_TOKEN (Cihaz Token) Tablosu Eksik: Mobilde kullanıcılara "Etkinlik başvurunuz onaylandı" gibi Push Notification (Firebase) atmak için cihazlarının token'larını DB'de saklamalıyız. (Bir kullanıcının hem tableti hem telefonu olabilir, bu yüzden ayrı tablo olmalı).

        Eklenecek Tablo: DeviceToken (Alanlar: Id, AccountId, FcmToken, DeviceType (iOS/Android/Web), LastUsedAt)

4. İzlenebilirlik ve Standart Kolon Eksikleri (Audit Logs)

    UpdatedAt (Güncellenme Zamanı): Çoğu tabloda created_at (oluşturulma) veya deleted_at (silinme) var ama verinin ne zaman güncellendiğini tutan alan eksik.

        Düzeltme: USER, CLUB, EVENT, ACCOUNT gibi tüm ana tablolara updated_at (datetime) alanı eklenmeli.

    Ret Nedeni (Rejection Reason): PARTICIPATION tablosundaki status "Rejected" olduğunda, organizasyonun kullanıcıyı neden reddettiğini göstermek UX (Kullanıcı Deneyimi) açısından çok iyidir.

        Düzeltme: PARTICIPATION tablosuna rejection_reason (string, nullable) eklenmeli.

Özet Notun:

    Yeni Tablolar: RefreshToken, OtpVerification, Review, DeviceToken.

    Değişiklikler: Account.password boş bırakılabilir olacak. Tüm ana tablolara updated_at eklenecek. Participation'a rejection_reason eklenecek, skor alanları Review tablosuna taşınacak.

    db ye bunları ekleyeceğim hata görürseniz belirtin.
## Frontend Guncellemeleri (Web)

Bu bolumde landing/login tarafinda yapilan son duzenlemeler listelenir.

### Teknoloji ve Yapi

- `apps/web` React + Vite + Ant Design + i18next kullaniyor.
- Landing yapisi component bazli olacak sekilde ayrildi:
  - `src/components/landing/LandingNavbar.jsx`
  - `src/components/landing/LandingContent.jsx`
- Login yapisi ortak auth sayfasina tasindi:
  - `src/components/auth/AuthPage.jsx`
  - `src/components/auth/Login.jsx`

### Landing Sayfasi

- Navbar icinde bolum anchor linkleri var:
  - `#about` (Hakkimizda)
  - `#features` (Neden Apptivity?)
  - `#how` (Nasil Calisir)
- Sticky navbar kaynakli anchor kesilmesini engellemek icin bolum kartlarinda `scrollMarginTop` kullanildi.
- Hero bolumunde sag tarafa gorsel eklendi ve eski istatistik karti kaldirildi.
- Hakkimizda bolumunde gorsel + metin iki kolonlu yapiya alindi (gorsel solda, metin sagda).
- Ozellikler bolumu 6 kartli yapiya cevrildi (ikon + baslik + aciklama).
- Nasil Calisir bolumu 4 adima cikarildi.
- CTA bolumunde bireysel kullanici odagi ve `App Store` / `Google Play` butonlari eklendi.

### Gorsel Dosya Organizasyonu

- Gorseller duzenli klasore alindi:
  - `apps/web/src/assets/images/community-event.jpg`
  - `apps/web/src/assets/images/hero-social.jpg`

### Coklu Dil (TR / EN)

- Dil yonetimi `i18next` ile yapiliyor (`src/i18n/index.js`).
- Tum aktif landing/login metinleri i18n anahtarlarina tasindi.
- Dil secici componenti eklendi:
  - `src/components/common/LanguageSwitcher.jsx`
- Dil secici landing ve auth navbarlarinin en saginda konumlandirildi.

### Dogrulama

- Web tarafinda lint dogrulamasi:

```bash
cd apps/web
npm run lint
```
