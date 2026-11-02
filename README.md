# VIP İlan

Türkçe ilan sitesi ve içerik yönetim sistemi. Teknoloji: React, Express, tRPC, Drizzle ORM ve MySQL. Tek kaynak kodu Manus Preview'da veya Coolify üzerinde çalışır.

## İçerik yönetimi

`/admin` altında ilanlar ve **Site içeriği ve SEO** yönetimi vardır. Admin panelinden site adı ve ana sayfa metinleri, header/footer menüleri, kategoriler, şehir/semt kayıtları, düz metin sayfaları ve ilanların SEO title/description/index tercihi yönetilir. Yayımlanmış içeriklerin `/`, `/profil/:slug`, `/kategori/:slug`, `/bolge/:citySlug/:districtSlug`, `/bolge/:citySlug` ve `/icerik/:slug` sayfaları ilk HTTP yanıtında içerikli HTML ve route'a özel metadata sunar. `/sitemap.xml` yayımlanmış ve index'e açık kayıtları DB'den üretir; `/robots.txt` admin/API yollarını dışlar. Arama sıralaması garanti edilmez; içerik kalitesi, teknik SEO ve Google'ın kendi tarama/index kararı da önemlidir.

## Coolify / kendi sunucun

- Giriş modu `AUTH_PROVIDER=local`: tek yönetici `ADMIN_EMAIL` ve `ADMIN_PASSWORD` environment değerlerinden belirlenir. Gizli bilgileri GitHub'a veya sohbete yazmayın.
- Fotoğraf modu `STORAGE_PROVIDER=local`: JPG/PNG/WebP dosyaları `UPLOAD_DIR` içinde saklanır. Coolify'de `/data` için kalıcı volume bağlayın; fotoğraflar ve otomatik üretilen `/data/.session-secret` burada kalır.
- MySQL `DATABASE_URL` gerektirir. Container DB'yi bekler, migration'ları uygular, sonra Node server'ını başlatır. `/api/health` DB hazır değilse HTTP 503 döndürür.
- `PUBLIC_SITE_URL` canonical, Open Graph, sitemap ve robots adresleri için gerçek site origin'i olmalıdır (örnek: `https://cesmebutik.vip`). Siteniz başka domaindeyse kendi HTTPS origin'inizi girin.
- İlk çalıştırma yalnızca boş site ayarları, örnek Antalya bölgeleri ve menü bağlantıları ekler; demo ilan eklemez. Migration başka bir sitenin veya Manus veritabanının yerine kullanılmamalıdır.
- Kurulum: [`COOLIFY-KURULUM.md`](./COOLIFY-KURULUM.md).

## Manus Preview

`AUTH_PROVIDER` verilmezse uygulama `manus` modunda kalır; Manus OAuth ve managed storage yardımcılarını kullanır. Coolify environment değerleri Manus moduna otomatik uygulanmaz.

## Yerelde geliştirme

1. Node.js 22 ve pnpm 10.18 kurun.
2. `pnpm install --frozen-lockfile` çalıştırın.
3. `.env.example` dosyasını `.env` adıyla kopyalayın, yerel MySQL'i başlatın ve `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PUBLIC_SITE_URL` değerlerini düzenleyin. `.env` Git'e eklenmemelidir.
4. Şemayı kurun: `pnpm db:migrate`.
5. `pnpm dev` ile port 3000'de çalıştırın. Admin: `/admin`.

## Komutlar

- `pnpm dev`: development server, `PORT` değişkenine uyar.
- `pnpm build`: production client/server bundle'ı üretir.
- `pnpm start`: hazır veritabanında bundle'ı başlatır.
- `pnpm db:migrate`: mevcut additive Drizzle migration'larını uygular.
- `pnpm check` / `pnpm test`: TypeScript kontrolü ve testler.

Yayımlanan ilanlar için 18+ ve görsel kullanım hakkı beyanı gerekir. Taslaklar public listede görünmez. Arşivleme kaydı public görünümden kaldırır; Coolify volume'undaki fotoğraf dosyalarını fiziksel olarak silmez.
