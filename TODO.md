# VIP İlan — Yapılacaklar

## Mevcut ön yüz ve ilan yönetimi
- [x] **Responsive VIP İlan ön yüzü:** Türkçe kategori navigasyonu, ilan kartları, filtre ve mobil/tablet/masaüstü düzeni hazır; public veriler DB'den okunur.
- [x] **Profil detayları:** `/profil/:slug` galeri, temel bilgiler, açıklama, etiketler ve benzer ilanları gösterir; public API yalnızca yayınlanmış kayıtları sunar.
- [x] **Admin paneli:** Yetkili panelde ilan ekleme/düzenleme, taslak kaydetme, yayımlama, yayından çekme ve arşivleme işlemleri vardır; yayın için 18+ ve görsel kullanım hakkı onayı gerekir.
- [x] **Güvenli ilan fotoğrafı işleme:** JPG/PNG/WebP, her biri en fazla 5 MB, ilan başına en çok 12 görsel; içerik imzası server'da doğrulanır. Fotoğraflar kaydetmeden önce tarayıcıdaki yerel taslakta tutulur.
- [x] **Coolify/Manus çalışma modları:** Coolify local auth/MySQL/disk storage ve Manus OAuth/managed storage ayrımı, kalıcı `/data` volume'u, DB readiness ve Dockerfile mevcut.

## Yönetim panelinden içerik
- [x] **Site ayarları:** Yönetici site adı, ana sayfa title/description, hero başlık/metni, varsayılan SEO title/description ve varsayılan sosyal paylaşım görselini admin panelinden değiştirebilir; bu ayarlar public sayfalarda kullanılır.
- [x] **Üst/alt menü yönetimi:** Yönetici header ve footer menü öğesi ekleyebilir, düzenleyebilir, sıralayabilir, etkin/pasif yapabilir ve hedef URL belirleyebilir; public navigasyon etkin öğeleri seçilen sırada gösterir.
- [x] **Kategori yönetimi ve kategori ilanları:** Yönetici kategori ekleyebilir/düzenleyebilir ve pasifleştirebilir; isim, slug, açıklama, SEO title/description, sıralama ve aktiflik alanları vardır. İlan bir kategoriye bağlanabilir. `/kategori/:slug` yalnızca aktif kategoriye bağlı yayımlanmış ilanları gösterir; boş sayfa noindex kalır.
- [x] **Şehir/semt yönetimi ve bölge ilanları:** Yönetici şehir ve semt/bölge kayıtları ekleyebilir/düzenleyebilir ve pasifleştirebilir; hiyerarşi, slug, açıklama, SEO title/description, sıralama ve aktiflik alanları vardır. İlan mevcut bir bölgeye bağlanabilir. `/bolge/:citySlug/:districtSlug` yalnızca aktif bölgeye bağlı yayımlanmış ilanları gösterir; belirsiz legacy ilişkiler otomatik yanlış şehre bağlanmaz.
- [x] **İçerik sayfaları:** Yönetici başlık, slug, kısa açıklama, düz metin gövdesi ve draft/published durumuna sahip sayfa oluşturup düzenleyebilir; yayın durumu ve index/noindex tercihi ayarlanabilir. Gövde HTML çalıştırmayan güvenli metin olarak gösterilir; yayımlanmamış sayfalar public'te bulunmaz.
- [x] **İlan başına SEO alanları:** Admin ilanı SEO title, meta description ve index/noindex tercihiyle yayımlayabilir; alan boşsa sistem ilan içeriğinden sınırlı varsayılan üretir. OG/Twitter paylaşım görseli ilan kapak fotoğrafını kullanır.

## Arama motoru için public çıktı
- [x] **İçerik taşıyan ilk HTML ve metadata:** `/`, `/profil/:slug`, `/kategori/:slug`, `/bolge/:citySlug/:districtSlug` ve yayımlanmış içerik sayfalarının ilk HTTP yanıtı gerçek public başlık/gövde içeriğiyle sunulur; JavaScript çalıştırmadan route'a özgü title, description, canonical (yalnızca açıkça tanımlanmış `PUBLIC_SITE_URL` ile), Open Graph ve Twitter metadata bulunur. Client'ta gösterilen metadata ilk yanıta tutarlıdır.
- [x] **404, noindex ve private-data sınırı:** Bulunmayan/indeks dışı sayfalar gerçek 404 ve uygun noindex döndürür. Taslak, arşiv, gizli iletişim ve admin içeriği public HTML, metadata/hydration verisi ya da sitemap'e eklenmez. Boş kategori/bölge/içerik sayfaları noindex'tir.
- [x] **Sitemap, robots ve route manifesti:** `/sitemap.xml` yalnızca yayınlanmış/indexlenebilir ve gerçek içeriği olan ana sayfa, ilan, kategori, bölge ve içerik URL'lerini DB'den üretir; `/robots.txt` geçerli yönergeler ve sitemap URL'si sunar. `/admin` ve API'ler sitemap'e girmez. `client/public/manus-routes.json` yedi gerçek route deseniyle kaynak kodla eşleşir.

## Coolify ve teslim
- [x] **Coolify origin ve additive migration kodu:** Uygulama `PUBLIC_SITE_URL=https://cesmebutik.vip` ayarını kullanır; Drizzle migration mevcut `users`/`listings` kayıtlarını silmeden yeni yönetim tabloları ve SEO alanları ekler. Eski location backfill'i yalnızca tekil, doğrulanmış şehir/semt eşleşmesini bağlar; yazma sırasında `district`/`location` server'da seçilen aktif lokasyondan türetilir. Migration yanlış DB'ye uygulanmamalıdır.
- [ ] **Mevcut canlı Coolify rollout:** Kullanıcı `evinta/ilan` kaynağını güncel ZIP ile değiştirip GitHub'a push etmeli; Coolify'de aynı app/database/`/data` volume'u koruyup `PUBLIC_SITE_URL=https://cesmebutik.vip` ayarını eklemeli ve Deploy etmelidir. Yeni tablo/kolon migration'ları bu Coolify DB'de çalışır; deployment öncesi DB yedeği önerilir.
- [x] **Güncellenmiş kaynak ZIP'i:** Tam proje kaynakları ve Türkçe kurulum/yönetim rehberleri ZIP'e alındı; `.env`, `node_modules`, `dist` ve Git metadata pakete eklenmedi. `unzip -t` ile arşiv doğrulandı. GitHub parolası/token'ı sohbet veya repoya eklenmedi.

## Notlar
- Bu liste kod teslimini ve kullanıcının kendi canlı servisinde yapacağı adımları ayırır.
- Bu çalışma sırasında kullanıcının Coolify canlı ortamına veya `evinta/ilan` GitHub deposuna erişilmemiştir.
