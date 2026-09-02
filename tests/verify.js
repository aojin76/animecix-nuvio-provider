"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
assert.equal(manifest.version, "2.10.0");
assert.ok(Array.isArray(manifest.scrapers) && manifest.scrapers.length > 0);

const manifestFiles = new Set();
const ids = new Set();

for (const scraper of manifest.scrapers) {
  assert.ok(scraper.id && !ids.has(scraper.id), "duplicate scraper id: " + scraper.id);
  ids.add(scraper.id);
  assert.match(scraper.filename, /^providers\/[A-Za-z0-9._-]+\.js$/);
  const resolvedPath = path.resolve(root, scraper.filename);
  assert.ok(!path.relative(root, resolvedPath).startsWith(".."), "path escapes repository");
  manifestFiles.add(path.basename(scraper.filename));

  assert.ok(fs.existsSync(resolvedPath), "missing provider file: " + scraper.filename);
  const source = fs.readFileSync(resolvedPath, "utf8");
  new vm.Script(source, { filename: scraper.filename });
  assert.match(source, /module\.exports/);
  assert.match(source, /getStreams/);
}

const providerDir = path.join(root, "providers");
for (const file of fs.readdirSync(providerDir).filter((value) => value.endsWith(".js"))) {
  assert.ok(manifestFiles.has(file), "orphan provider bundle: " + file);
}

const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
assert.match(read("providers/hdfilmcehennemi-1.0.5.js"), /SEARCH_TIMEOUT_MS = 5e3/);
assert.match(read("providers/hdfilmcehennemi-1.0.5.js"), /firstSuccessful\(tasks\)/);
assert.match(read("providers/fullhdfilmizlesenow-1.0.1.js"), /AD_MEDIA_URL_RE/);
assert.match(read("providers/fullhdfilmizlesenow-1.0.1.js"), /fullHdProbeMediaUrl/);
assert.match(read("providers/dizibox-1.0.5.js"), /reklam\|reklamlar/);
assert.match(read("providers/animelercc-1.0.6.js"), /playerTypeForUrl/);
assert.ok(read("providers/animelercc-1.0.6.js").includes("application/vnd.apple.mpegurl"));

console.log("provider verification passed: " + manifest.scrapers.length + " scrapers");
