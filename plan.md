# VIP İlan — Coolify Taşıma Planı

## Uygulama yaklaşımı

Var olan React/Wouter arayüzü, ilan paneli ve MySQL/Drizzle veri modelini koru. Uygulama iki çalışma biçimini desteklesin: `AUTH_PROVIDER` varsayılanı `manus` ile mevcut Manus önizlemesi Manus OAuth ve yönetilen depolamayla çalışmaya devam etsin; Coolify'de `AUTH_PROVIDER=local` ve `STORAGE_PROVIDER=local` seçildiğinde Manus kimlik/depolama API'lerine ihtiyaç duymadan çalışsın.

Coolify admin girişi tek yönetici hesabı olsun: `ADMIN_EMAIL` ve `ADMIN_PASSWORD` yalnızca sunucu ortamından okunsun, herkese açık kayıtta hesap oluşturulmasın, giriş denemeleri sınırlandırılsın ve imzalı HttpOnly oturum `SameSite=Lax` ile doğrulansın. `SESSION_SECRET` verilmemişse güvenli anahtar `/data/.session-secret` içine üretilecek; bu yüzden `/data` kalıcı volume olmalı. Coolify TLS kullanırken `COOKIE_SECURE=true` kalmalı. Yetki her istekte veritabanındaki rol üzerinden sunucuda kontrol edilsin.

Coolify veritabanı MySQL'dir ve `DATABASE_URL` ile bağlanır. Docker container başlamadan önce DB hazır olana kadar sınırlı süre beklesin, mevcut Drizzle migration zincirini (`users` ve `listings`) uygulasın, sonra Node server'ı başlatsın. Derleme aşamasında hiçbir production secret veya DB bağlantısı bulunmasın. `/api/health` DB hazır değilse başarılı yanıt vermesin.

Coolify ilan fotoğraflarını yerel diskte `UPLOAD_DIR` altında saklasın ve `/uploads/*` üzerinden sunmaya izin versin. Kullanıcı Coolify'de bu dizinin üstünü `/data` yoluna bağlı kalıcı volume'a bağlamalı; container yeniden yaratıldığında fotoğraflar silinmesin. Mevcut JPG/PNG/WebP, 5 MB ve 12 görsel sınırları korunacak; ziyaretçi yalnızca yayınlanmış ilanları görecek.

Mevcut özel premium görsel dili korunacak. Manus depolama yoluna bağlı hero arka planı self-hosted dağıtımda kırılmaması için yerel CSS/asset davranışına geçirilecek. `COOLIFY-KURULUM.md`, kaynak kodu GitHub'a alma, Coolify'de MySQL ve Dockerfile tabanlı web uygulaması oluşturma, environment değerlerini ekleme, kalıcı fotoğraf volume'u bağlama, port/health kontrolü ve domain'i daha sonra bağlama adımlarını acemi kullanıcıya Türkçe anlatacak.

## Dosya ve modül sorumlulukları

- `server/_core/env.ts`, `context.ts`, `local-auth.ts`, `oauth.ts`, `cookies.ts`: ortam modu, yerel tek yönetici oturumu ve mevcut Manus OAuth ayrımı.
- `server/storage.ts`, `server/_core/index.ts`, `server/db.ts`, `server/routers.ts`: yerel kalıcı fotoğraf deposu, dosya sunumu, DB bağlantı kontrolü, admin/yayın API'leri.
- `drizzle/schema.ts`, `drizzle/*.sql`, `scripts/wait-for-db.mjs`: aynı MySQL migration zinciri ve üretim başlatma hazırlığı.
- `client/src/pages/AdminPage.tsx`, `client/src/components/admin/LocalAdminLogin.tsx`, `client/src/pages/AdminPage.css`, `client/src/data/profiles.ts`: çalışma moduna göre admin girişi ve depoya uygun fotoğraf URL'leri.
- `client/src/index.css`, `client/index.html`, `client/public/manus-routes.json`: dış platforma bağlı görsel ve sayfa metadatasını güvenli hale getirme.
- `Dockerfile`, `.dockerignore`, `.env.example`, `README.md`, `COOLIFY-KURULUM.md`: gizli değerler hariç taşınabilir build, yerel geliştirme ve Coolify kurulum adımları.

## Tasarım kararı

VIP İlan'ın mevcut mürdüm, şampanya-altını ve açık zeminli premium editoryal kimliği korunur. Public profil/ilan akışı ve admin sayfası görsel olarak aynı kalır; yalnızca admin giriş yöntemi, fotoğraf URL'leri ve harici asset bağımlılıkları çalışma moduna göre değişir.