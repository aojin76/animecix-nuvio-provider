"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const manifest = JSON.parse(read("manifest.json"));
const packageJson = JSON.parse(read("package.json"));

assert.equal(manifest.version, "2.12.4");
assert.equal(packageJson.version, manifest.version);
assert.equal(packageJson.engines && packageJson.engines.node, ">=24");
assert.ok(Array.isArray(manifest.scrapers) && manifest.scrapers.length > 0);

const providerWorkflow = read(".github/workflows/provider-check.yml");
const domainWorkflow = read(".github/workflows/domain-refresh.yml");
for (const [name, workflow] of [["provider-check.yml", providerWorkflow], ["domain-refresh.yml", domainWorkflow]]) {
  assert.match(workflow, /actions\/checkout@v5/, name + " must use checkout v5");
  assert.match(workflow, /actions\/setup-node@v5/, name + " must use setup-node v5");
  assert.match(workflow, /node-version:\s*["']24["']/, name + " must use Node 24");
  assert.doesNotMatch(workflow, /node-version:\s*["']20["']/, name + " still targets Node 20");
}
assert.match(domainWorkflow, /run: node scripts\/refresh-domains\.js/);
assert.match(domainWorkflow, /run: npm test/, "domain refresh must test before publishing");
assert.match(domainWorkflow, /gh pr create/, "domain refresh must publish through a PR");
assert.doesNotMatch(domainWorkflow, /git push origin HEAD:main/, "domain refresh must not push directly to main");

const manifestFiles = new Set();
const ids = new Set();

for (const scraper of manifest.scrapers) {
  assert.ok(scraper.id && !ids.has(scraper.id), "duplicate scraper id: " + scraper.id);
  ids.add(scraper.id);
  assert.match(scraper.filename, /^providers\/[A-Za-z0-9._-]+\.js$/);
  const filenameVersion = scraper.filename.match(/-(\d+\.\d+\.\d+)\.js$/);
  assert.ok(filenameVersion, "provider filename has no semantic version: " + scraper.filename);
  assert.equal(filenameVersion[1], scraper.version, "manifest/file version mismatch: " + scraper.id);

  const resolvedPath = path.resolve(root, scraper.filename);
  assert.ok(!path.relative(root, resolvedPath).startsWith(".."), "path escapes repository");
  manifestFiles.add(path.basename(scraper.filename));

  assert.ok(fs.existsSync(resolvedPath), "missing provider file: " + scraper.filename);
  const source = fs.readFileSync(resolvedPath, "utf8");
  new vm.Script(source, { filename: scraper.filename });
  assert.match(source, /module\.exports/);
  assert.match(source, /getStreams/);
  if (scraper.hasSettings)
    assert.match(source, /onSettings/);
  if (/application\/vnd\.apple\.mpegurl|\.m3u8/.test(source))
    assert.ok(scraper.formats.includes("m3u8"), "provider emits HLS but manifest omits m3u8: " + scraper.id);
}

const providerDir = path.join(root, "providers");
for (const file of fs.readdirSync(providerDir).filter((value) => value.endsWith(".js")))
  assert.ok(manifestFiles.has(file), "orphan provider bundle: " + file);

for (const file of fs.readdirSync(root))
  assert.doesNotMatch(file, /^manifest-\d+\.\d+\.\d+\.json$/, "obsolete snapshot manifest remains: " + file);

const domainRegistry = JSON.parse(read("domains.json"));
const registryIds = Object.keys(domainRegistry.providers || {}).sort();
const manifestIds = manifest.scrapers.map((scraper) => scraper.id).sort();
assert.deepEqual(registryIds, manifestIds, "domain registry and manifest provider IDs differ");
for (const entry of Object.values(domainRegistry.providers || {})) {
  assert.ok(Array.isArray(entry.domains) && entry.domains.length > 0);
  assert.ok(entry.allowedHost);
}

assert.match(read("providers/hdfilmcehennemi-1.0.7.js"), /SEARCH_TIMEOUT_MS = 5e3/);
assert.match(read("providers/hdfilmcehennemi-1.0.7.js"), /firstSuccessful\(tasks\)/);
assert.match(read("providers/fullhdfilmizlesenow-1.0.2.js"), /AD_MEDIA_URL_RE/);
assert.match(read("providers/fullhdfilmizlesenow-1.0.2.js"), /fullHdProbeMediaUrl/);
assert.match(read("providers/fullhdfilmizlesenow-1.0.2.js"), /TMDB API Anahtarı \(opsiyonel\)/);
assert.match(read("providers/fullhdfilmizlesenow-1.0.2.js"), /decisions\[index\] !== true/);
assert.match(read("providers/dizibox-1.0.5.js"), /PROVIDER_VERSION = "1.0.5"/);
assert.match(read("providers/dizibox-1.0.5.js"), /reklam\|reklamlar/);
assert.match(read("providers/dizibox-1.0.5.js"), /keep: decision === true/);
assert.match(read("providers/animelercc-1.0.8.js"), /playerTypeForUrl/);
assert.ok(read("providers/animelercc-1.0.8.js").includes("application/vnd.apple.mpegurl"));
assert.ok(manifest.scrapers.find((scraper) => scraper.id === "animelercc").formats.includes("m3u8"));
assert.match(read("providers/filmmakinesi-1.0.1.js"), /SITE_ID = "filmmakinesi"/);
assert.match(read("providers/filmmakinesi-1.0.1.js"), /decisions\[i\] !== true/);
assert.match(read("providers/720izle-1.0.1.js"), /hotAesDecrypt/);
assert.match(read("providers/720izle-1.0.1.js"), /hlsLooksLikeLongMedia/);
assert.match(read("providers/720izle-1.0.1.js"), /decisions\[i\] !== true/);


const animecixSource = read("providers/animecix-2.5.2.js");
const animexeSource = read("providers/animexe-1.0.5.js");
const animelerccSource = read("providers/animelercc-1.0.8.js");
assert.match(animecixSource, /return isBleachTybw\(tmdbId, info\);/);
assert.doesNotMatch(animecixSource, /return isBleach\(tmdbId, info\) && s > 1/);
assert.doesNotMatch(animecixSource, /if \(s === 17\)/);
assert.doesNotMatch(animecixSource, /e > BLEACH_SEASON_COUNTS\[1\]/);
assert.match(animexeSource, /return isBleachTybw\(info\);/);
assert.doesNotMatch(animexeSource, /return isBleachMain\(info\) && s > 1/);
assert.match(animelerccSource, /return isBleachTybw\(info\);/);
assert.doesNotMatch(animelerccSource, /return isBleachMain\(info\) && s > 1/);
assert.match(animecixSource, /BLEACH_TYBW_TMDB_IDS[\s\S]{0,100}14986406/);
assert.match(animexeSource, /BLEACH_TYBW_TMDB_IDS[\s\S]{0,100}14986406/);
assert.match(animelerccSource, /LEGACY_TYBW_TMDB_IDS[\s\S]{0,100}14986406/);
assert.doesNotMatch(animecixSource, /439c478a771f35c05022f9feabcca01c/);
assert.doesNotMatch(animexeSource, /439c478a771f35c05022f9feabcca01c/);
assert.doesNotMatch(animelerccSource, /439c478a771f35c05022f9feabcca01c/);
assert.match(animexeSource, /else if \(tybwRequest\)[\s\S]{0,500}add\(s, e\);/, "Animexe TYBW must use source season");
assert.doesNotMatch(animexeSource, /else if \(tybwRequest\)[\s\S]{0,160}add\(1, e\);/, "Animexe TYBW must not flatten every season to S1");
assert.match(animelerccSource, /canonicalTybwEpisodes/);
assert.match(animelerccSource, /if \(forceDirect\) \{[\s\S]{0,180}if \(absolute\)/, "Animeler.cc TYBW must prefer absolute episode mapping");



const fixtureResponse = (body, options = {}) => {
  const status = options.status || 200;
  const isText = typeof body === "string";
  return {
    ok: status >= 200 && status < 400,
    status,
    text: async () => isText ? body : JSON.stringify(body),
    json: async () => isText ? JSON.parse(body) : body
  };
};

async function runProviderFixture(filename, fixtureFetch, args, globals = {}) {
  const sandbox = {
    module: { exports: {} },
    exports: {},
    console: { log() {}, error() {} },
    fetch: fixtureFetch,
    SCRAPER_SETTINGS: globals.SCRAPER_SETTINGS || {},
    SCRAPER_DOMAIN_REGISTRY_URL: globals.SCRAPER_DOMAIN_REGISTRY_URL,
    setTimeout,
    clearTimeout,
    AbortSignal,
    URL,
    URLSearchParams,
    Promise,
    Date,
    Math,
    String,
    Number,
    Object,
    Array,
    Set,
    Map,
    RegExp,
    encodeURIComponent,
    decodeURIComponent
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read(filename), sandbox, { filename });
  return sandbox.module.exports.getStreams(...args);
}

async function runAnimeTybwFixture() {
  const tmdbUrlPrefix = "https://api.themoviedb.org/3/tv/";
  const tmdbBody = {
    name: "Bleach: Thousand-Year Blood War",
    original_name: "Bleach: Sennen Kessen-hen",
    first_air_date: "2022-10-11",
    seasons: [
      { season_number: 1, episode_count: 13 },
      { season_number: 2, episode_count: 13 },
      { season_number: 3, episode_count: 14 },
      { season_number: 4, episode_count: 6 }
    ]
  };

  const animecixFetch = async (request) => {
    const url = String(request);
    if (url.startsWith(tmdbUrlPrefix))
      return fixtureResponse("", { status: 404 });
    if (url.startsWith("https://animecix.tv/secure/search/"))
      return fixtureResponse({ results: [{ id: 82, name: "Bleach", tmdb_id: "30984" }] });
    if (url === "https://animecix.tv/secure/episode-videos?titleId=82&episode=1&season=2")
      return fixtureResponse([{ url: "https://tau-video.xyz/embed/abc" }]);
    if (url === "https://tau-video.xyz/api/video/abc")
      return fixtureResponse({ urls: [{ url: "https://media.fixture.test/bleach.m3u8", label: "1080p", size: 1000000 }] });
    return fixtureResponse("", { status: 404 });
  };

  const animexeUrl = "https://animexe.com/stream/proxy?u=fixture";
  const animexeFetch = async (request) => {
    const url = String(request);
    if (url.startsWith(tmdbUrlPrefix))
      return fixtureResponse("", { status: 404 });
    if (url.includes("raw.githubusercontent.com/aojin76/animecix-nuvio-provider/main/domains.json"))
      return fixtureResponse({ providers: { animexe: { domains: ["https://animexe.com"] } } });
    if (url.startsWith("https://animexe.com/search/suggest"))
      return fixtureResponse({ results: [] });
    if (url === "https://animexe.com/watch/bleach-thousand-year-blood-war-7443/2/1") {
      const html = "const VIDEO_SOURCES = [{\"url\":\"" + animexeUrl + "\",\"type\":\"hls\",\"quality\":\"1080p\"}]; const M3U8 = \"" + animexeUrl + "\"; const MP4 = null;";
      return fixtureResponse(html);
    }
    return fixtureResponse("", { status: 404 });
  };

  const animelerUrl = "https://animeler.cc/vstream/oynatici?u=fixture";
  const animelerFetch = async (request) => {
    const url = String(request);
    if (url.startsWith(tmdbUrlPrefix))
      return fixtureResponse("", { status: 404 });
    if (url.startsWith("https://animeler.cc/animeler?q="))
      return fixtureResponse("");
    if (url === "https://animeler.cc/anime/bleach-thousand-year-blood-war")
      return fixtureResponse("<html></html>");
    if (url === "https://animeler.cc/izle/bleach-thousand-year-blood-war/14-bolum") {
      const html = "<script>fetch(\"https://animeler.cc/api-oynatici-coz?embed=\" + encodeURIComponent(\"https://tau-video.xyz/embed/fixture\") + \"&ozel=0\")</script>";
      return fixtureResponse(html);
    }
    if (url.startsWith("https://animeler.cc/api-oynatici-coz?"))
      return fixtureResponse({ url: animelerUrl });
    return fixtureResponse("", { status: 404 });
  };

  const [animecixStreams, animexeStreams, animelerStreams] = await Promise.all([
    runProviderFixture("providers/animecix-2.5.2.js", animecixFetch, ["214779", "tv", 1, 1]),
    runProviderFixture("providers/animexe-1.0.5.js", animexeFetch, ["214779", "tv", 2, 1]),
    runProviderFixture("providers/animelercc-1.0.8.js", animelerFetch, ["214779", "tv", 2, 1])
  ]);
  assert.equal(animecixStreams.length, 1, "Animecix TYBW fallback fixture should resolve");
  assert.equal(animexeStreams.length, 1, "Animexe TYBW season fixture should resolve");
  assert.equal(animelerStreams.length, 1, "Animeler.cc TYBW absolute fixture should resolve");
  assert.equal(animexeStreams[0].url, animexeUrl);
  assert.equal(animelerStreams[0].url, animelerUrl);
}

async function runHdfilmMortalKombatFixture() {
  const mediaUrl = "https://media.fixture.test/mortal-kombat-ii.mp4";
  const response = (body, options = {}) => {
    const status = options.status || 200;
    const headers = new Map(Object.entries({
      "content-type": options.contentType || "application/json",
      "content-length": options.contentLength || String(String(body || "").length)
    }));
    return {
      ok: status >= 200 && status < 400,
      status,
      headers: { get: (name) => headers.get(String(name).toLowerCase()) || "" },
      json: async () => JSON.parse(String(body)),
      text: async () => String(body)
    };
  };
  const fixtureFetch = async (request) => {
    const url = String(request);
    if (url === "https://www.themoviedb.org/movie/fixture-mortal-kombat-2") {
      return response('<meta property="og:title" content="Mortal Kombat II (2026)">', { contentType: "text/html" });
    }
    if (url.startsWith("https://api.themoviedb.org/3/movie/")) {
      return response(JSON.stringify({
        title: "Mortal Kombat 2",
        original_title: "Mortal Kombat 2",
        release_date: "2026-10-01",
        translations: { translations: [] }
      }));
    }
    if (url === "https://fixture.test/domains.json") {
      return response(JSON.stringify({
        providers: {
          hdfilmcehennemi: {
            domains: ["https://fixture.test"],
            allowedHost: "fixture.test"
          }
        }
      }));
    }
    if (url.startsWith("https://fixture.test/search/?q=")) {
      return response(JSON.stringify({
        results: [
          "<h4 class=\"title\">Mortal Kombat II izle</h4><a href=\"/mortal-kombat-ii-2026-6/\">Mortal Kombat II izle</a>"
        ]
      }));
    }
    if (url === "https://fixture.test/mortal-kombat-ii-2026-6/") {
      return response(`<video src="${mediaUrl}"></video>`, { contentType: "text/html" });
    }
    if (url === mediaUrl) {
      return response("", { contentType: "video/mp4", contentLength: String(16 * 1024 * 1024) });
    }
    return response("", { status: 404, contentType: "text/plain" });
  };
  const sandbox = {
    module: { exports: {} },
    exports: {},
    console: { log() {}, error() {} },
    fetch: fixtureFetch,
    SCRAPER_SETTINGS: {},
    SCRAPER_DOMAIN_REGISTRY_URL: "https://fixture.test/domains.json",
    setTimeout,
    clearTimeout,
    AbortSignal,
    URL,
    URLSearchParams,
    Promise,
    Date,
    Math,
    String,
    Number,
    Object,
    Array,
    Set,
    Map,
    RegExp,
    encodeURIComponent,
    decodeURIComponent
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read("providers/hdfilmcehennemi-1.0.7.js"), sandbox, {
    filename: "providers/hdfilmcehennemi-1.0.7.js"
  });
  const streams = await sandbox.module.exports.getStreams("fixture-mortal-kombat-2", "movie");
  assert.equal(streams.length, 1, "HDFilm Roman numeral title fixture should resolve");
  assert.equal(streams[0].url, mediaUrl);
}



async function runFilmProviderFixtures() {
  const tmdbPage = "https://www.themoviedb.org/movie/fixture-film-provider";
  const media = {
    fm: "https://media.fixture.test/hls/filmmakinesi?token=1",
    iz: "https://media.fixture.test/hls/720izle?token=1",
    full: "https://media.fixture.test/hls/fullhdfilmizlesene?token=1"
  };
  const registryUrl = "https://fixture.test/domains.json";
  const registry = {
    providers: {
      filmmakinesi: { domains: ["https://filmmakinesi.to"] },
      "720izle": { domains: ["https://720izle.com"] },
      fullhdfilmizlesenow: { domains: ["https://www.fullhdfilmizlesene.now"] }
    }
  };
  const response = (body, status = 200) => fixtureResponse(body, { status });
  const fixtureFetch = async (request) => {
    const url = String(request);
    if (url === tmdbPage)
      return response('<meta property="og:title" content="Mortal Kombat II (2026)">');
    if (url === registryUrl)
      return response(registry);
    if (url === "https://filmmakinesi.to/film/mortal-kombat-ii-2026/")
      return response('<div data-video_url="' + media.fm + '"></div>');
    if (url === "https://720izle.com/filmler11/mortal-kombat-ii-2026/")
      return response('<div data-video_url="' + media.iz + '"></div>');
    if (url.startsWith("https://www.fullhdfilmizlesene.now/autocomplete/q.php?q="))
      return response([{ dizilink: "mortal-kombat-ii-2026", baslik: "Mortal Kombat II", prefix: "film", yil: "2026" }]);
    if (url === "https://www.fullhdfilmizlesene.now/film/mortal-kombat-ii-2026")
      return response('<div data-video_url="' + media.full + '"></div>');
    if (url === media.fm || url === media.iz || url === media.full)
      return response("#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXTINF:60,\nsegment.ts\n#EXT-X-ENDLIST");
    return response("", 404);
  };
  const globals = { SCRAPER_DOMAIN_REGISTRY_URL: registryUrl };
  const [fm, iz, full] = await Promise.all([
    runProviderFixture("providers/filmmakinesi-1.0.1.js", fixtureFetch, ["fixture-film-provider", "movie"], globals),
    runProviderFixture("providers/720izle-1.0.1.js", fixtureFetch, ["fixture-film-provider", "movie"], globals),
    runProviderFixture("providers/fullhdfilmizlesenow-1.0.2.js", fixtureFetch, ["fixture-film-provider", "movie"], globals)
  ]);
  assert.equal(fm.length, 1, "FilmMakinesi direct HLS fixture should resolve");
  assert.equal(iz.length, 1, "720izle direct HLS fixture should resolve");
  assert.equal(full.length, 1, "FullHDFilmizlesene direct HLS fixture should resolve");
  assert.equal(fm[0].url, media.fm + "&ext=video.m3u8");
  assert.equal(iz[0].url, media.iz + "&ext=video.m3u8");
  assert.equal(full[0].url, media.full + "&ext=video.m3u8");
}

Promise.all([runHdfilmMortalKombatFixture(), runAnimeTybwFixture(), runFilmProviderFixtures()]).then(() => {
  console.log("provider verification passed: " + manifest.scrapers.length + " scrapers");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});