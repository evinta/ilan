# VIP İlan'ı GitHub ve Coolify ile kurma

Bu rehber, kodu ilk kez GitHub'a koyup Coolify'de çalıştırmak içindir. Domain'i hemen almak zorunda değilsiniz; önce geçici Coolify adresinde siteyi açıp kontrol edebiliriz.

## 1. Kodu GitHub deposuna koyun

GitHub deposu oluşturduysanız ona devam edin; henüz oluşturmadıysanız GitHub'da boş ve **Private** bir depo açın. Parola, `DATABASE_URL`, `.env` veya admin girişini GitHub'a yüklemeyin.

Bilgisayarınızda GitHub Desktop varsa:

1. Size bu konuşmada verdiğim güncel VIP İlan kaynak ZIP dosyasını indirip normal bir klasöre çıkarın.
2. GitHub Desktop'ta **File → Clone repository** ile kendi boş deponuzu bilgisayarınıza alın.
3. ZIP içindeki dosya ve klasörleri, depoyu klonladığınız klasörün içine kopyalayın. Kaynak ZIP `.git` içermez; GitHub Desktop'ın oluşturduğu `.git` klasörünü silmeyin.
4. GitHub Desktop'ta değişiklikleri gözden geçirin. Özet satırına `VIP İlan Coolify sürümü` yazın, **Commit to main** deyin, ardından **Push origin** düğmesine basın.
5. GitHub web sayfasını yenileyin; `Dockerfile`, `package.json`, `drizzle/`, `client/` ve `server/` dosyalarını görmeniz gerekir.

GitHub hesabınızı veya parolanızı sohbette paylaşmayın. GitHub Desktop giriş ekranı hesabınızı kendi bilgisayarınızda doğrular.

## 2. Coolify'de MySQL veritabanı oluşturun

Coolify'de yeni bir **MySQL** database kaynağı oluşturun ve başlatın. Web uygulamasıyla aynı Coolify sunucusuna/özel ağına bağlı olmasını sağlayın. Coolify'nin gösterdiği internal host, veritabanı adı, kullanıcı ve parolayı not edin; 3306 portunu internete açmayın. Uygulamanın `DATABASE_URL` adresindeki host `localhost` olmamalı; web container'ından erişilen internal database host/URL kullanılmalıdır.

Bağlantı genel olarak şu biçimdedir; gerçek değerleri Coolify'den alın:

```text
mysql://KULLANICI:PAROLA@MYSQL_INTERNAL_HOST:3306/VERITABANI
```

Parolanın içinde `@`, `:` veya `/` gibi URL karakterleri varsa Coolify'nin verdiği hazır bağlantı adresini kullanın veya parolayı URL biçiminde kodlayın. Bu bilgileri GitHub'a veya buraya yazmayın.

> **Önemli:** `DATABASE_URL` yalnızca yeni Coolify MySQL veritabanını göstermeli; Manus projesinin veya başka bir sitenin paylaşılan veritabanını kullanmayın. Container ilk açılışta şema migration'larını otomatik çalıştırır. İlk Deploy'dan önce host/veritabanı adını iki kez kontrol edin ve hedefte veri varsa yedeği alın.

## 3. GitHub deposundan web uygulaması ekleyin

Coolify'de yeni bir web application/resource oluşturup GitHub sağlayıcısını bağlayın. VIP İlan deposunu, `main` dalını ve proje kökündeki `Dockerfile` dosyasını seçin. Build context proje kökü olmalı; web uygulamasının container portu `3000`, health check yolu `/api/health` olmalıdır. Bu kaynak Node/React uygulamasıdır; statik dosya sitesi olarak değil, Dockerfile ile build edilen uygulama olarak çalıştırın.

GitHub deposunu Coolify'e bağlamak için Coolify'nin kendi GitHub bağlantı akışını kullanın. Bu yetkiyi yalnızca ihtiyaç duyulan depoyla sınırlı tutun.

## 4. Ortam değişkenlerini ekleyin

Web application'ın environment ayarlarına şu değerleri ekleyin:

```text
NODE_ENV=production
PORT=3000
AUTH_PROVIDER=local
STORAGE_PROVIDER=local
DATABASE_URL=<Coolify MySQL internal URL'si>
ADMIN_EMAIL=<kullanacağınız yönetici e-posta adresi>
ADMIN_PASSWORD=<en az 12, tercihen 16+ karakterli güçlü ve benzersiz parola>
COOKIE_SECURE=true
DATA_DIR=/data
UPLOAD_DIR=/data/uploads
```

`SESSION_SECRET` vermek zorunlu değildir: uygulama ilk açılışta güvenli rastgele bir oturum anahtarı üretip `/data/.session-secret` olarak saklar. Bu yüzden bir sonraki adım olan kalıcı volume gereklidir. `ADMIN_PASSWORD` yalnızca Coolify secret/environment ekranında bulunsun; kod dosyasına, kaynak ZIP'e veya GitHub'a koymayın.

`AUTH_PROVIDER=local` modunda giriş yalnızca burada tanımlanan yönetici hesabıyla mümkündür. Site ziyaretçilerine kayıt ekranı açılmaz. Giriş `/admin` adresindedir.

Giriş denemesi sınırı tek çalışan Node process'inin belleğindedir; şu an tek web instance kullanın. Daha sonra birden fazla instance çalıştıracaksanız Coolify/edge katmanında ortak rate limit ekleyin.

## 5. Fotoğraf ve oturum için kalıcı alan bağlayın

Coolify storage/volume ayarında uygulama container'ında `/data` yoluna bağlanan **kalıcı** bir volume oluşturun. Uygulama fotoğrafları `/data/uploads` altında, otomatik oturum anahtarı ise `/data/.session-secret` yolunda saklar. Volume olmadan container yeniden oluşturulursa fotoğraflar ve oturum anahtarı kaybolabilir.

## 6. Deploy ve kontrol

Environment ve volume ayarlarını kaydedip Deploy edin. Başlangıç komutu DB'nin açılmasını bekler, mevcut Drizzle migration'larını çalıştırır (`users` ve `listings` tablolarını oluşturur) ve sonra uygulamayı başlatır; demo ilan yüklemez. `/api/health` yanıtında `status: ok` ve `database: ready` görmelisiniz.

Site açılınca `/admin` adresine gidip yukarıda tanımladığınız e-posta ve parolayla giriş yapın. Önce bir taslak oluşturabilir, fotoğraf yükleyip kontrol edebilir, sonra 18+ ve görsel kullanım izni beyanlarını tamamlayarak ilanı yayımlayabilirsiniz. Taslaklar public listede görünmez.

Domain'i daha sonra Coolify domain ayarına ekleyip DNS'i Coolify sunucusuna yönlendirebilirsiniz. HTTPS etkinleşince `COOKIE_SECURE=true` bırakın.

## Bir sorun çıkarsa

- **Health 503:** MySQL kaynağının çalıştığını, `DATABASE_URL` host'unun internal olduğunu ve kullanıcı/parola/veritabanı adını kontrol edin.
- **Admin girişi kabul edilmiyor:** Coolify environment'daki e-posta/parola değerlerini kontrol edin; proje yeniden deploy edildikten sonra tekrar deneyin.
- **Fotoğraf yükleme hatası veya yeniden deploy sonrası görsel yok:** Kalıcı volume'un web container'ında tam `/data` yoluna bağlı olduğundan emin olun.
- **GitHub hesabı veya deployment yetkisi isteniyor:** Parola/token'ı sohbete yazmayın; ilgili GitHub/Coolify giriş ekranında kendiniz onaylayın.
