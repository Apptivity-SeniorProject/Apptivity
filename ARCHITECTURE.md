# 📁 Apptivity Backend — Proje Yapısı

**Stack:** Spring Boot 3 · PostgreSQL 17 · Spring Data JPA · JWT · SpringDoc (Swagger) · Lombok

Swagger UI → `http://localhost:8080/swagger-ui.html`

---

## Klasör Yapısı

```
src/main/java/com/example/apptivitybackend/
│
├── constants/          ← Sabit değerler
├── controller/         ← REST endpoint'leri
├── customQueries/      ← MongoTemplate ile özel sorgular
├── exception/          ← Hata sınıfları & GlobalExceptionHandler
├── model/              ← MongoDB @Document sınıfları
├── payload/
│   ├── request/        ← İstek gövdeleri (Login, Register…)
│   └── response/       ← Yanıt modelleri (JWT, ApiResponse…)
├── repository/         ← MongoRepository interface'leri
├── security/           ← JWT filter, SecurityConfig, UserDetails
├── services/           ← İş mantığı servisleri
└── util/               ← Yardımcı sınıflar
```

---

## 📦 Paket Detayları

### `constants/`
Uygulama genelinde değişmeyen değerler. String literal'ları buraya taşı.
```java
// AppConstants.java
public static final String API_PREFIX = "/api/v1";
public static final String ROLE_USER  = "ROLE_USER";
```

---

### `controller/`
HTTP isteklerini karşılar. İş mantığı **kesinlikle** burada olmaz; direkt `service`'i çağırır.
```java
@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "Users", description = "Kullanıcı işlemleri")   // Swagger tag
public class UserController {
    private final UserService userService;
    // GET / POST / PUT / DELETE endpoint'leri
}
```

---

### `customQueries/`
`MongoRepository` arayüzünün yetmediği durumlarda `MongoTemplate` ile yazılan karmaşık sorgular.
```java
@Component
public class ActivityCustomRepository {
    private final MongoTemplate mongoTemplate;

    public List<Activity> findByFilters(String userId, LocalDate from, LocalDate to) {
        Query query = new Query();
        query.addCriteria(Criteria.where("userId").is(userId)
              .and("date").gte(from).lte(to));
        return mongoTemplate.find(query, Activity.class);
    }
}
```

---

### `exception/`
| Dosya | Açıklama |
|-------|----------|
| `GlobalExceptionHandler.java` | `@RestControllerAdvice` ile tüm hataları yakalar |
| `ResourceNotFoundException.java` | 404 – kaynak bulunamadı |
| `BadRequestException.java` | 400 – geçersiz istek |
| `UnauthorizedException.java` | 401 – yetkisiz erişim (ekle) |

---

### `model/`
MongoDB collection'larını temsil eden `@Document` sınıfları. Lombok `@Data` / `@Builder` kullan.
```java
@Document(collection = "users")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class User {
    @Id
    private String id;
    private String email;
    private String password;    // hash'lenmiş
    private String displayName;
    private LocalDateTime createdAt;
}
```

---

### `payload/request/`
Controller'a gelen JSON body'si. `@Valid` ile validate edilir.
```java
public record LoginRequest(
    @NotBlank @Email String email,
    @NotBlank String password
) {}

public record RegisterRequest(
    @NotBlank @Email String email,
    @NotBlank @Size(min = 6) String password,
    @NotBlank String displayName
) {}
```

---

### `payload/response/`
Dışarıya dönen yanıt modelleri. Entity'yi doğrudan dönme!
```java
// Genel sarmalayıcı:
public record ApiResponse<T>(boolean success, T data, String message) {
    public static <T> ApiResponse<T> ok(T data) { return new ApiResponse<>(true, data, null); }
    public static ApiResponse<Void> fail(String msg) { return new ApiResponse<>(false, null, msg); }
}

// JWT yanıtı:
public record JwtResponse(String token, String type, String userId, String email) {}
```

---

### `repository/`
Spring Data MongoDB repository'leri. Standart CRUD otomatik gelir.
```java
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
}
```

---

### `security/`
| Dosya | Açıklama |
|-------|----------|
| `SecurityConfig.java` | `SecurityFilterChain` tanımı, public/private path'ler |
| `JwtTokenProvider.java` | Token üret, doğrula, claim'leri oku |
| `JwtAuthenticationFilter.java` | Her request'te `Authorization` header'ını kontrol eder |
| `UserDetailsServiceImpl.java` | Spring Security için kullanıcı yükleme |

```java
// SecurityConfig.java — Public endpoint'ler örneği
http.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/v1/auth/**", "/swagger-ui/**", "/api-docs/**").permitAll()
    .anyRequest().authenticated()
);
```

---

### `services/`
İş mantığı burada yaşar. Controller sadece buraya çağrı yapar.
```java
@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public User register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email()))
            throw new BadRequestException("Bu e-posta zaten kayıtlı.");
        User user = User.builder()
            .email(req.email())
            .password(passwordEncoder.encode(req.password()))
            .displayName(req.displayName())
            .createdAt(LocalDateTime.now())
            .build();
        return userRepository.save(user);
    }
}
```

---

### `util/`
Tekrar eden küçük yardımcı metotlar. Bağımsız static utility sınıfları gelir.
```java
public final class DateUtils {
    public static String formatDate(LocalDateTime dt) { ... }
}

public final class ResponseUtils {
    public static <T> ResponseEntity<ApiResponse<T>> ok(T data) {
        return ResponseEntity.ok(ApiResponse.ok(data));
    }
}
```

---

## 🌐 Swagger Kullanımı

Uygulama çalışırken → [`http://localhost:8080/swagger-ui.html`](http://localhost:8080/swagger-ui.html)

Controller'lara Swagger metadata eklemek için:
```java
@Tag(name = "Auth", description = "Kimlik doğrulama işlemleri")
@Operation(summary = "Kullanıcı girişi", description = "Email ve parola ile JWT token alır")
@ApiResponse(responseCode = "200", description = "Başarılı")
@ApiResponse(responseCode = "401", description = "Hatalı kimlik bilgileri")
```

---

## 🔐 Güvenli Endpoint Yapısı

```
POST  /api/v1/auth/register    → herkese açık
POST  /api/v1/auth/login       → herkese açık
GET   /api/v1/users/me         → JWT gerekli
GET   /swagger-ui.html         → herkese açık (dev)
```
