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