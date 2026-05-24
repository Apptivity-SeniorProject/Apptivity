# Mobil Event Oneri Sistemi v6 - Son Plan (Onay Oncesi Final)

## Ozet
- `POST /api/events/recommended` v6 kisisellestirilmis oneri endpointi olacak (AI profiler + inverse hot zones + 4-stage fail-safe).
- `GET /api/events` genel feed/discovery endpointi olarak kalacak; yeni feed endpoint acilmayacak.
- Feed icin konuma duyarlilik, mevcut `GET /api/events` icine opsiyonel lat/lng tabanli siralama/boost olarak eklenecek.
- Server-side kullanici konum gecmisi tutulmayacak (KVKK uyumlu); konum gecmisi yalnizca cihazda saklanacak ve ozet olarak istek aninda gonderilecek.

## Uygulama Degisiklikleri
- Backend veri modeli:
  - `events` tablosuna `location_lat`, `location_lng` kolonlari eklenir.
  - Mevcut `LocationData` icinden migration/backfill ile lat/lng doldurulur.
  - Mesafe sorgulari yeni kolonlardan hesaplanir, uygun indeksler eklenir.
- Backend AI profiler:
  - `ITagPredictorService` (provider-agnostic) arayuzu olusturulur.
  - Ilk implementasyon: `GroqLlama3Predictor` (`llama3-8b-8192`, JSON mode).
  - Cikti: `{ primary_tag, fallback_tag }`.
  - Cache: kullanici bazli 24 saat (Redis oncelikli, memory fallback).
- Recommended v6 pipeline (`POST /api/events/recommended`):
  - Girdi: `ordered_hot_zones: [{priority, lat, lng}] | null`.
  - Stage 1: `primary_tag` + `priority 1/2` noktalarina `<=20km`.
  - Stage 2: Stage1 bossa `fallback_tag` + `priority 1/2` + `<=20km`.
  - Stage 3: Stage2 bossa tagsiz + `priority 1/2/3` herhangi birine `<=25km`.
  - Stage 4: Stage3 bossa tag/mesafe filtresiz populer/en yeni aktif etkinlikler.
  - Her stage icin sabit `recommendationReason`; item bazinda opsiyonel `recommendationScore`.
- Genel feed (`GET /api/events`) iyilestirmesi:
  - Yeni opsiyonel query: `userLat`, `userLng`, `nearbyRadiusKm`, `sort=nearby|recent`.
  - Konum verilirse yakinlik boost/siralama uygulanir.
  - Konum yoksa mevcut davranis korunur (regresyonsuz fallback).
- Mobil taraf:
  - Lokal konum gunlugu: SQLite.
  - Background sampling: app kapaliyken best-effort saatlik; app acikken de devam.
  - Her insert sonrasi 30 gunden eski kayitlar silinir.
  - "Senin Icin" acilisinda: 2 ondalik grid cluster, top3 yogun nokta, ters oncelik (sosyal->is->ev) hesaplanir.
  - `POST /recommended` cagrisinda `ordered_hot_zones` gonderilir.
  - Permission/API hata durumunda silent degradation (`ordered_hot_zones=null`).

## API / Kontrat
- `POST /api/events/recommended`:
  - Body: `ordered_hot_zones` (opsiyonel/null), paging alanlari.
  - Yanit itemina ek alanlar: `recommendationScore?`, `recommendationReason?`.
- Gecis:
  - Eski `GET /api/events/recommended` 1-2 surum gecis suresince korunur, sonra kaldirilir.
  - Bu sirada GET cagrilari zonesuz fallback davranisa duser.
- `GET /api/events`:
  - Yeni opsiyonel konum query parametreleri desteklenir; mevcut filtre kontrati kirilmaz.

## Test Plani
- Backend unit:
  - LLM parse/validasyon, cache hit-miss/TTL.
  - 4-stage gecis mantigi ve reason dogrulamasi.
  - Feed ranking (nearby vs recent) senaryolari.
- Backend integration:
  - `POST /recommended` zone dolu/bos/null akislar.
  - `GET /events` konumlu/konumsuz query karsilastirmasi.
  - Migration/backfill ve indeks dogrulamasi.
- Mobil:
  - SQLite insert/prune/cluster/inverse priority.
  - Background best-effort worker calismasi.
  - Permission denied ve API hata silent degradation.
- Performans:
  - `POST /recommended` p95 <300ms hedefi (cache sicak senaryo).
  - `GET /events` nearby siralamada sorgu maliyeti olcumu.

## Varsayimlar
- Platform kisitlari nedeniyle "app kapaliyken saatlik" takip best-effort olarak kabul edilir.
- LLM'e konum verisi gonderilmez; yalnizca interests + approved history tagleri gonderilir.
- Gelistirme sirasinda mimari/indeks/provider celiskisi cikarsa implementasyonda durulup karar sorulur.
