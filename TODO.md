# VIP İlan — Yapılacaklar

## Mevcut ön yüz ve ilan yönetimi
- [x] **Responsive VIP İlan ön yüzü:** Türkçe kategori navigasyonu, ilan kartları, filtre ve mobil/tablet/masaüstü düzeni hazır; public veriler DB'den okunur.
- [x] **Profil detayları:** `/profil/:slug` galeri, temel bilgiler, açıklama, etiketler ve benzer ilanları gösterir; public API yalnızca yayınlanmış kayıtları sunar.
- [x] **Admin paneli:** Yetkili panelde ilan ekleme/düzenleme, taslak kaydetme, yayımlama, yayından çekme ve arşivleme işlemleri vardır; yayın için 18+ ve görsel kullanım hakkı onayı gerekir.
- [x] **Güvenli ilan fotoğrafı işleme:** JPG/PNG/WebP, her biri en fazla 5 MB, ilan başına en çok 12 görsel; içerik imzası server'da doğrulanır. Fotoğraflar kaydetmeden önce tarayıcıdaki yerel taslakta tutulur.
- [x] **Manus sürümü:** Manus OAuth, managed MySQL ve managed storage için çalışan mevcut yapı korunur; admin yazma API'leri anonim isteklere 403 döndürür.

## Coolify'e hazırlık
- [x] **Coolify admin girişi:** Yalnızca `AUTH_PROVIDER=local` modunda `ADMIN_EMAIL` ve `ADMIN_PASSWORD` sunucu ortam değişkenleriyle tek admin girişi açılır; public kayıt olmaz, login 12 saatlik imzalı HttpOnly cookie kullanır, 5 hatalı deneme 15 dakika sınırlandırılır ve server-side admin izin kontrolü sürer. Login throttle tek process belleğindedir. `SESSION_SECRET` eksikse `/data/.session-secret` güvenli şekilde otomatik üretilir. Varsayılan Manus modu mevcut WebDev girişini korur.
- [x] **Kalıcı MySQL ve fotoğraflar:** Coolify'de `DATABASE_URL` üzerinden ayrı/yeni MySQL bağlanır, `users` ve `listings` migration'ları container başlangıcında uygulanır; JPG/PNG/WebP fotoğrafları `UPLOAD_DIR` altında saklanıp `/uploads/*` üzerinden sunulur. `/data` volume'u kalıcı olmalıdır; mevcut Manus/shared database kullanılmamalıdır.
- [x] **Taşınabilir build ve hazır olma kontrolü:** Dockerfile Coolify'in 3000 portunda açılır; başlangıçta DB beklenir, migration çalıştırılır ve `/api/health` DB hazır değilken 503 verir. Production sırları build'e veya GitHub'a eklenmez.
- [x] **Manus dışı statik varlıklar:** Public hero arka planı Manus Managed Storage bağlantısı olmadan CSS gradyanıyla sunulur; ilan fotoğrafları yerel `UPLOAD_DIR` yolunu kullanabilir.
- [x] **GitHub ve Coolify başlangıç kılavuzu:** Özel GitHub deposuna GitHub Desktop üzerinden kaynak alma; Coolify'de MySQL ve Dockerfile web uygulaması oluşturma; environment değerleri, kalıcı volume, port/health check ve domain'i sonra bağlama adımları Türkçe açıklanır. Kullanıcı GitHub parolasını veya token'ını sohbette paylaşmaz.
- [ ] **Kullanıcının kendi GitHub deposuna yükleme:** Güncel kaynak ZIP hazırlandıktan sonra, GitHub bağlantısı etkin değilse kullanıcı GitHub Desktop ile `main` dalına push eder; otomatik push için GitHub connector gerekir ve depo bağlantısı onaylanmalıdır.
