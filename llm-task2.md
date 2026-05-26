## Gunluk 5-Tag Oneri Akisi (Stateful, LLM 1x/Gun)

### Ozet
- Mevcut liste bazli oneriden ayri, **stateful gunluk akis** kurulacak: kullanici butona her bastiginda tek etkinlik doner.
- Kullanici basina **gunde 1 LLM cagrisi** ile 5 tag uretilir ve backend DB’de saklanir.
- Oneri sirasi `tag1 -> tag2 -> tag3 -> tag4 -> tag5`; tag tukenirse sonraki taga gecilir.
- `tag5` de tukenince: `"Bugunluk oneriler bu kadardi."`
- Konum yoksa: **profil sehri**, o da yoksa **global** arama.

### Ana Degisiklikler
- **Endpoint stratejisi (profesyonel gecis):**
  - Yeni endpoint ekle: `POST /api/events/recommended/daily/next` (tek etkinlik odakli stateful akis).
  - Mevcut `POST /api/events/recommended` simdilik korunur (geriye donuk uyum + dusuk risk rollout).
- **Yeni response kontrati (daily/next):**
  - `isSuccess=true` + `data`:
    - `event` (`null` olabilir)
    - `status` (`served | depleted | unavailable`)
    - `currentTagOrder` (1..5 veya `null`)
    - `remainingTagCount`
    - `message` (depleted durumunda kullanici mesaji)
- **DB state modeli (backend):**
  - `user_daily_recommendation_plan`
    - `user_id`, `day_key` (Europe/Istanbul), `generated_at_utc`, `llm_generated` bool
  - `user_daily_recommendation_plan_tags`
    - `plan_id`, `tag_order` (1..5), `tag_id`, `source` (`llm|profile|deterministic`)
  - `user_daily_recommendation_served_events`
    - `plan_id`, `event_id`, `tag_order`, `served_at_utc`
    - unique: `(plan_id, event_id)` (ayni event’i ayni gun tekrar vermeme)
  - `user_daily_recommendation_cursor`
    - `plan_id`, `current_tag_order`, `is_depleted`
- **LLM/Tag uretim kurali:**
  - Gunluk plan yoksa bir kez uret.
  - Hedef: 5 distinct aktif tag.
  - LLM eksik donerse:
    1. profildeki interest tag’lerden eksigi tamamla (LLM’de olmayanlar once),
    2. hala eksikse deterministic aktif/populer tag havuzundan tamamla.
- **Event secim kurali (her buton basisi):**
  - `current_tag_order` tag’iyle aktif event ara.
  - Filtre: aktiflik kurali + owner aktif + `served_events` dislama.
  - Konum varsa yakinlik onceligi; konum yoksa profil sehri, sehri yoksa global.
  - Tag’de uygun event yoksa bir sonraki taga gec.
  - 5 tag sonunda yoksa `depleted`.
- **Mobil UX:**
  - “Bana Etkinlik Oner” butonu yeni `daily/next` endpointini cagirir.
  - Cikti tipi: **tek etkinlik** (tek kartli modal/bottom sheet) + “Detaya git”.
  - `depleted` mesaji toast/modal metniyle gosterilir.
  - Mevcut coklu liste modalini bu buton akisi icin kaldir.

### Test Plani
- **Backend unit/integration**
  - Gunluk ilk cagrida plan olusur, ikinci cagrida LLM tekrar cagrilmaz.
  - 5 tag sirali ilerleme, tag bosalinca sonraki taga gecis.
  - Ayni event’in ayni gunde tekrar donmemesi.
  - `tag5` sonrasinda `depleted` donusu.
  - Konum yok -> sehir -> global fallback dogrulamasi.
  - LLM eksik tag donusu + profile fallback + deterministic tamamlama.
  - Europe/Istanbul day boundary reset testi.
- **Mobile**
  - Buton basisi tek etkinlik gosterimi.
  - `depleted` ve hata durumunda dogru mesaj.
  - Tekrar basista sonraki tagden devam ettigi davranis.

### Varsayimlar ve Secilen Defaultlar
- Gunluk reset timezone: **Europe/Istanbul**.
- Durum saklama: **Backend DB** (cihazdan bagimsiz tutarlilik).
- Buton ciktisi: **Tek etkinlik**.
- Gun sonu davranisi: **5 tag bitince gun kapanir** (1’e donmez).
- Mevcut `/api/events/recommended` simdilik korunur; yeni akisa mobil buton gecirilir.
