# VIP İlan — İçerik Yönetimi ve SEO Geliştirme Planı

## Amaç ve temel karar

VIP İlan özel Node.js/Express, React ve MySQL/Drizzle uygulaması olarak kalacak; WordPress'e dönüştürülmeyecek. Amaç, site sahibinin menü, bölgeler, kategoriler, SEO metinleri ve içerikleri admin panelinden düzenleyebilmesi; yayınlanan public sayfaların gerçek içeriğini, başlıklarını ve SEO metadata'sını tarayıcı JavaScript'i çalıştırılmadan HTML yanıtında sunabilmesidir. Google sıralaması veya trafik garanti edilmez; teknik erişilebilirlik, indekslenebilirlik ve içerik yönetimi geliştirilecektir.

Kullanıcının raporladığı canlı domain davranışında ana sayfa ile `/api/health` farklı uygulama yanıtları vermişti. Mevcut `https://cesmebutik.vip` domain'inin Coolify uygulamasına yönlendirilmesi doğrulanmalı; başka bir siteyi etkileyebilecek DNS/proxy değişiklikleri kullanıcı teyidi olmadan yapılmamalıdır.

## Uygulama yaklaşımı

### 1. Admin panelinden içerik ve yapı yönetimi

Mevcut güvenli, tek yöneticili yerel admin oturumu korunur. `/admin` altında yeni, ayrı yönetim bölümleri eklenir:

- **Site ayarları:** site adı, ana sayfa başlığı/açıklaması, hero başlık ve metni, varsayılan SEO title/description, sosyal paylaşım için varsayılan görsel.
- **Menü yönetimi:** üst ve alt menü öğesi ekleme, düzenleme, sıralama, etkin/pasif yapma ve hedef URL belirleme.
- **Kategori yönetimi:** kategori ekleme, düzenleme, slug, açıklama/SEO metni, sıra ve etkinlik durumunu yönetme; ilanlara kategori bağlama.
- **Bölge yönetimi:** şehir ve semt/bölge kayıtları ekleme/düzenleme, hiyerarşi, slug, açıklama/SEO metni ve aktiflik; ilanları mevcut bölge kayıtlarına bağlama.
- **İçerik sayfaları:** taslak/yayın durumu olan, başlık, slug ve biçimlendirilebilir gövde içeriği bulunan bilgilendirici sayfalar ekleme/düzenleme. Admin arayüzü basit ve Türkçe olacaktır.
- **İlan SEO alanları:** ilan için SEO başlığı, meta açıklaması ve index/noindex tercihi. Yayımlanan ilanda boş bırakılırsa sistem mevcut metinlerden makul, uzunluğu sınırlı varsayılan üretir. OG paylaşım görseli varsayılan olarak ilanın kapak fotoğrafını kullanır.

Mevcut `listings` verileri, slug'ları, fotoğraf anahtarları, admin iş akışı, 18+ ve görsel hakları beyanları korunur. Yeni kategori/bölge ilişkileri mevcut kayıtlara geriye uyumlu migration ile eklenir; mevcut ilanlar migration sırasında silinmez veya yeniden yazılmaz. Gizli iletişim bilgisi, taslak veya arşiv içeriği public HTML'e ya da sitemap'e eklenmez.

### 2. Arama motorlarının okuyabildiği public sayfalar

Node/Express sunucusu mevcut framework içinde public sayfalar için istek anında veritabanından güvenli, yayınlanmış içeriği okur ve HTML başlığını/body içeriğini yanıt içinde üretir. React istemcisi arama, filtre ve galeri etkileşimlerini sürdürür. İlk HTML ve istemcide gösterilen sayfa aynı title/description/canonical bilgisiyle tutarlı olur.

Indexlenebilir public URL aileleri:

- Ana sayfa: `/`
- İlan: mevcut `/profil/:slug` URL biçimi korunur.
- Kategori: `/kategori/:slug`
- Bölge/şehir-semt: `/bolge/:citySlug/:districtSlug` (uygun şehir düzeyindeki sayfalar için tek slug desteği).
- Yönetim paneli, taslaklar, arşivler ve mevcut olmayan içerik indexlenmez.

Her public sayfa için, içerik hazırlandıktan sonra ilk HTTP HTML yanıtına güvenli biçimde kaçışlanmış başlık, meta description, canonical URL, Open Graph/Twitter metadata, başlık/gövde ve uygun görsel eklenir. `PUBLIC_SITE_URL` Coolify'de gerçek HTTPS origin olarak açıkça tanımlanır; canonical ve sitemap adresleri istek Host header'ından tahmin edilmez. Bulunmayan profil/içerik gerçek HTTP 404 ve `noindex` döndürür.

`/sitemap.xml` sadece yayınlanmış/indexlenebilir ana sayfa, kategori, bölge, içerik sayfası ve ilan URL'lerini DB'den üretir; taslak ve arşivleri içermez. `/robots.txt` geçerli robots metni verir ve sitemap adresini gösterir. `/admin` ve API yolları sitemap'e girmez. WebDev `manus-routes.json` ise uygulama sayfa desenleriyle senkron tutulur; SEO sitemap'inden farklı bir görevde kalır.

### 3. Veritabanı, güvenlik ve Coolify dağıtımı

`drizzle/schema.ts` ve `drizzle/` içine geriye uyumlu migration ile `site_settings`, `navigation_items`, `categories`, `locations`, `content_pages` ve gerekiyorsa ilan ilişki/redirect alanları eklenir. Yönetici değişiklikleri admin-protected tRPC API üzerinden yapılır; public API ve HTML yalnızca aktif, yayımlanmış içerik sunar. Gövde içeriği güvenli biçimlendirilmiş olarak saklanır ve HTML/XSS girdisi filtrelenir.

Coolify'deki Dockerfile, Node port `3000`, MySQL, `AUTH_PROVIDER=local`, `STORAGE_PROVIDER=local` ve kalıcı `/data` volume düzeni korunur. `PUBLIC_SITE_URL` yeni Coolify environment değişkeni olarak eklenecektir. Migration'lar yalnızca kullanıcının Coolify uygulama veritabanına çalışır; mevcut paylaşılan veya başka sitelerin veritabanı kullanılmaz. `/api/health` mevcut DB readiness görevini sürdürür.

## Dosya ve modül sorumlulukları

- `drizzle/schema.ts`, `drizzle/*.sql`: yeni settings, menu, taxonomy ve content tablolarının additive migration'ları.
- `server/db.ts`, yeni repository/service modülleri: settings, navigation, categories, locations, pages, listing SEO ve public route data sorguları.
- `server/routers.ts`: public read işlemleri ve admin-protected create/update/archive/sort işlemleri; mevcut listing/auth/upload guard'ları korunur.
- `server/_core/index.ts`, yeni `server/seo/` modülleri: HTML render/escape, per-route metadata/body, canonical, sitemap, robots ve doğru status code işleme.
- `client/src/pages/AdminPage.tsx`, yeni admin section/component dosyaları ve `AdminPage.css`: menü/kategori/bölge/içerik/site ayarı/SEO yönetim ekranları.
- `client/src/pages/Home.tsx`, `ProfilePage.tsx`, yeni kategori/bölge/content sayfaları: veritabanı kaynaklı public gezinme ve yayınlanmış içerik gösterimi.
- `client/index.html`, `client/public/manus-routes.json`, `server` route declarations: fallback metadata, gerçek sayfa route desenleri ve manifest senkronizasyonu.
- `COOLIFY-KURULUM.md`, `.env.example`, `README.md`: `PUBLIC_SITE_URL`, güncelleme/deploy ve içerik/SEO kullanımı rehberi.

## Tasarım kararı

Mevcut VIP İlan premium editoryal tasarımı korunur; admin'e ağır WordPress benzeri karmaşa eklenmeden açık sekmeler, etiketli formlar ve Türkçe açıklamalar kullanılır.

- **Design Movement:** Premium dijital yayıncılık ve Akdeniz editoryal estetiği.
- **Core Principles:** içerik önce gelir; yönetim adımları açık ve güvenlidir; public/admin yetki sınırları nettir; mevcut mürdüm-altın görünüm korunur.
- **Color Philosophy:** mürdüm güven ve ayırt ediciliği, şampanya altını öne çıkarmayı, açık zemin uzun metinlerin rahat okunmasını destekler.
- **Layout Paradigm:** kullanıcıya göre gruplanmış admin çalışma alanı; public sayfada içerik ve profil görselleri hiyerarşik akışta.
- **Signature Elements:** ince altın ayraçlar, editoryal serif başlıklar, güven/18+ etiketleri.
- **Interaction Philosophy:** taslak, yayın ve arşiv durumları açık; silme/yayın gibi önemli değişiklikler anlaşılır onay/geri bildirim verir.
- **Animation:** mevcut küçük geçişler korunur; admin form ve tablo hareketleri kısa ve ölçülü; `prefers-reduced-motion` saygı görür.
- **Typography System:** Cormorant Garamond başlıklar; DM Sans arayüz, form ve gövde metinleri.
- **Brand Essence:** Antalya odaklı, içeriği yönetici kontrolünde tutan seçkin ilan ve içerik platformu; kişilik: özenli, güvenilir, sade.
- **Brand Voice:** net, yerel ve iddiasını abartmayan. Örnek: “Bölgeyi ve kategoriyi seç; sayfayı kendi içeriğinle tamamla.” “Yayımlanmadan önce sayfa başlığını ve açıklamasını gözden geçir.”
- **Wordmark & Logo:** mevcut çizgisel amblem ve VIP İlan wordmark'ı korunur.
- **Signature Brand Color:** koyu mürdüm.
