# Animecix Nuvio Provider

Animecix, Animexe, Animeler.cc, DiziBox, HDFilmCehennemi ve FullHDFilmizlesene için Nuvio provider manifesti.

## Kontrol

`npm test` komutu:

- manifestteki tüm aktif provider dosyalarını doğrular,
- provider JavaScript dosyalarını sözdizimi açısından derler,
- manifest dışında kalan provider bundle'larını yakalar,
- timeout, medya tipi ve reklam filtresi hardening kontrollerini çalıştırır.

## Kaynak erişimi

Provider'lar üçüncü taraf sitelerin güncel HTML ve oynatıcı yapılarına bağlıdır. Cloudflare, 403 veya IP kısıtlaması olan kaynaklar otomatik olarak aşılmaz; bu durumda provider güvenli biçimde boş sonuç döndürür. Kısa reklam akışları medya boyutu/süre kontrolleriyle elenir.

## Güncel sürüm

Manifest: 2.10.0

Provider bundle'ları manifest tarafından doğrudan yüklenir. Yeni değişikliklerde ilgili provider sürümü ve manifest filename alanı birlikte güncellenmelidir.
