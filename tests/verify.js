"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const manifest = JSON.parse(read("manifest.json"));
const packageJson = JSON.parse(read("package.json"));

assert.equal(manifest.version, "2.12.1");
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

assert.match(read("providers/hdfilmcehennemi-1.0.6.js"), /SEARCH_TIMEOUT_MS = 5e3/);
assert.match(read("providers/hdfilmcehennemi-1.0.6.js"), /firstSuccessful\(tasks\)/);
assert.match(read("providers/fullhdfilmizlesenow-1.0.1.js"), /AD_MEDIA_URL_RE/);
assert.match(read("providers/fullhdfilmizlesenow-1.0.1.js"), /fullHdProbeMediaUrl/);
assert.match(read("providers/fullhdfilmizlesenow-1.0.1.js"), /TMDB API Anahtarı \(gerekli\)/);
assert.match(read("providers/fullhdfilmizlesenow-1.0.1.js"), /decisions\[index\] !== true/);
assert.match(read("providers/dizibox-1.0.5.js"), /PROVIDER_VERSION = "1.0.5"/);
assert.match(read("providers/dizibox-1.0.5.js"), /reklam\|reklamlar/);
assert.match(read("providers/dizibox-1.0.5.js"), /keep: decision === true/);
assert.match(read("providers/animelercc-1.0.6.js"), /playerTypeForUrl/);
assert.ok(read("providers/animelercc-1.0.6.js").includes("application/vnd.apple.mpegurl"));
assert.ok(manifest.scrapers.find((scraper) => scraper.id === "animelercc").formats.includes("m3u8"));
assert.match(read("providers/filmmakinesi-1.0.0.js"), /SITE_ID = "filmmakinesi"/);
assert.match(read("providers/filmmakinesi-1.0.0.js"), /decisions\[i\] !== true/);
assert.match(read("providers/720izle-1.0.0.js"), /hotAesDecrypt/);
assert.match(read("providers/720izle-1.0.0.js"), /hlsLooksLikeLongMedia/);
assert.match(read("providers/720izle-1.0.0.js"), /decisions\[i\] !== true/);



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
    SCRAPER_SETTINGS: { tmdbApiKey: "fixture-key" },
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
  vm.runInNewContext(read("providers/hdfilmcehennemi-1.0.6.js"), sandbox, {
    filename: "providers/hdfilmcehennemi-1.0.6.js"
  });
  const streams = await sandbox.module.exports.getStreams("fixture-mortal-kombat-2", "movie");
  assert.equal(streams.length, 1, "HDFilm Roman numeral title fixture should resolve");
  assert.equal(streams[0].url, mediaUrl);
}

runHdfilmMortalKombatFixture().then(() => {
  console.log("provider verification passed: " + manifest.scrapers.length + " scrapers");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
