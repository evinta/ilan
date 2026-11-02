# VIP İlan

Türkçe ilan sitesi arayüzü ve admin paneli. Teknoloji: React, Express, tRPC, Drizzle ORM ve MySQL. Aynı kaynak kodu mevcut Manus önizlemesinde veya Coolify üzerinde çalıştırılabilir.

## Coolify / kendi sunucun

- Giriş modu: `AUTH_PROVIDER=local`. Tek admin hesabı `ADMIN_EMAIL` ve `ADMIN_PASSWORD` ortam değişkenleriyle belirlenir; bu değerleri GitHub'a yazmayın.
- Fotoğraf modu: `STORAGE_PROVIDER=local`. JPG/PNG/WebP dosyaları `UPLOAD_DIR` içinde saklanır. Coolify'de bu dizinin üstü olan `/data` için kalıcı volume bağlayın; hem ilan fotoğrafları hem de otomatik üretilen `/data/.session-secret` burada kalır.
- MySQL: `DATABASE_URL` gerekir. Container başlangıçta veritabanını bekler, `pnpm db:migrate` ile repodaki migration'ları uygular ve Node server'ı açar. `/api/health` DB hazır değilse HTTP 503 döndürür.
- Coolify kaynak kurulumu ve adım adım GitHub aktarımı için [`COOLIFY-KURULUM.md`](./COOLIFY-KURULUM.md) dosyasına bakın.

## Mevcut Manus önizlemesi

`AUTH_PROVIDER` verilmezse uygulama `manus` modunda kalır; Manus OAuth ve yönetilen depolama yardımcılarını kullanır. Coolify environment değerleri Manus moduna otomatik uygulanmaz.

## Yerelde geliştirme

1. Node.js 22 ve pnpm 10.18 kullanın.
2. Bağımlılıklar: `pnpm install --frozen-lockfile`.
3. `.env.example` dosyasını `.env` adıyla kopyalayın, yerel MySQL'i başlatın ve `DATABASE_URL` ile yönetici bilgilerini güncelleyin. `.env` dosyası Git'e eklenmemelidir.
4. Şemayı kurun: `pnpm db:migrate`.
5. Uygulama: `pnpm dev` (varsayılan port 3000). Admin: `/admin`.

## Komutlar

- `pnpm dev`: development server, `PORT` değişkenine uyar.
- `pnpm build`: üretim bundle'ı.
- `pnpm start`: hazır DB'de üretilmiş Node bundle'ını başlatır.
- `pnpm db:migrate`: mevcut migration'ları uygular.
- `pnpm check` / `pnpm test`: TypeScript kontrolü ve testler.

Yayın öncesi ilanlarda 18+ ve görsel kullanım hakkı onayı gerekir. Taslaklar public listede görünmez. Arşivleme kaydı public görünümden kaldırır; Coolify volume'undaki fotoğraf dosyalarını fiziksel olarak silmez.
