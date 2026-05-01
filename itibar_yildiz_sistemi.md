# İtibar/Yıldız Sistemi

## Yıldız Sistemi

- Tüzel kişilikler, bireysel kullanıcılar tarafından uygulama üzerinden **5 yıldız** üzerinden puanlanır. Puan, yapılan tüm değerlendirmelerin **ortalaması** ile hesaplanır.

- Veritabanında iki alan tutulur:
  - `rating`: mevcut ortalama puan
  - `rated_count`: toplam puanlama sayısı

- Yeni bir puan (`new_rating`) geldiğinde güncelleme:

$$rating = \frac{\text{rated\_count} \cdot rating + \text{new\_rating}}{\text{rated\_count} + 1}$$

## İtibar Sistemi

- Bireysel kullanıcılar, katıldıkları her etkinlikte diğer katılımcılar tarafından $-2$ ile $+2$ arasında oylanır. Kullanıcının bu etkinlikten alabileceği maksimum/minimum etki, oy veren kişi sayısına ($n = \text{voter\_count}$) bağlı olarak değişir ($n \geq 1$):

$$n \geq 1$$
$$\text{Point}_{\max} = \log_{3/2}(n+1)$$
$$\text{Point}_{\min} = -\log_{3/2}(n+1)$$

- Her kullanıcının:
  - `reputation_point`: itibar puanı (toplam etki), $[-100, +100]$ aralığında
  - `vote_point`: oy etkisi katsayısı, $[0, 1]$ aralığında ($-100 \to 0$, $+100 \to 1$)
  - `reputation_level`: itibar puanına göre belirlenen seviye

- `vote_point` için doğrusal dönüşüm:

$$\text{vote\_point} = \frac{\text{reputation\_point} + 100}{200}$$

- Bir kullanıcının verdiği ham oy $X$ ($-2 \ldots +2$), o kullanıcının `vote_point` değeri ile çarpılarak ağırlıklı skora dönüştürülür:

$$\text{Score}_i = x_i \cdot \text{vote\_point}_i$$

- Etkinlik için skor listesi:

$$\text{Scores}[n] = [\text{score}_1,\ \text{score}_2,\ \ldots,\ \text{score}_n]$$

- Ağırlıklı skorlar toplanır ve etkinliğin oy sayısına göre ölçeklenerek kullanıcının itibar puanına eklenir:

$$\text{reputation\_point} \mathrel{+}= \frac{\text{Point}_{\max}}{2 \cdot \text{vote\_count}^2} \sum_{i=1}^{\text{voter\_count}} \text{scores}[\text{score}_i]$$

- Sonuçta `reputation_point` değeri $[-100, +100]$ aralığında tutulur.
