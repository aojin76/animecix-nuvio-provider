# Animecix Nuvio Provider

Animecix, Animexe, Animeler.cc, DiziBox, HDFilmCehennemi, FullHDFilmizlesene, FilmMakinesi ve 720izle için Nuvio provider manifesti.

## Kontrol

`npm test` komutu:

- manifestteki tüm aktif provider dosyalarını doğrular,
- provider JavaScript dosyalarını sözdizimi açısından derler,
- manifest dışında kalan provider bundle'larını yakalar,
- timeout, medya tipi ve reklam filtresi hardening kontrollerini çalıştırır.

## Kaynak erişimi

Provider'lar üçüncü taraf sitelerin güncel HTML ve oynatıcı yapılarına bağlıdır. Cloudflare, 403 veya IP kısıtlaması olan kaynaklar otomatik olarak aşılmaz; bu durumda provider güvenli biçimde boş sonuç döndürür. Film provider'ları alternatif arama yollarını, uzantısız HLS/manifest/stream URL'lerini, data-video_url/contentUrl alanlarını ve CloseLoad benzeri iç içe oynatıcıları tarar; kısa reklam akışlarını geçerli bölüm olarak döndürmez. Kısa reklam ve fragman akışları medya boyutu/süre kontrolleriyle elenir. 720izle’nin Hotstream HLS kaynağı AES yapılandırma çözümlemesiyle doğrulanır.

## Güncel sürüm

Manifest: 2.12.4

Provider bundle'ları manifest tarafından doğrudan yüklenir. Yeni değişikliklerde ilgili provider sürümü ve manifest filename alanı birlikte güncellenmelidir. Bleach: Thousand-Year Blood War, normal Bleach'in 16 sezonuna eklenmez; ayrı TMDB içeriği olarak eşleştirilir. Animexe sezon yolları, Animeler.cc ise tekil bölüm numarası kullanır.

## Çalışma koşulları

- TMDB v3 API Key veya v4 Read Access Token isteğe bağlıdır; anahtar yoksa provider herkese açık TMDB sayfasından başlık/yıl bilgisi okumayı dener.
- GitHub Actions ve yerel doğrulama Node.js 24 hedefler.
- CI; manifest, dosya, sözdizimi ve güvenlik sözleşmelerini kontrol eder. Üçüncü taraf siteler Cloudflare/IP kısıtları nedeniyle CI'da canlı oynatma testi olarak kullanılmaz.
- `domains.json` otomatik yenilemesi doğrulanmış değişiklikler için PR açar; ana dala doğrudan yazmaz.
- Provider'lar `domains.json` dosyasını raw GitHub üzerinden okuduğu için bu repo public kalmalıdır.