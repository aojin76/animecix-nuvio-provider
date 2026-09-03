/**
 * fullhdfilmizlesenow-1.0.1 - Built from src/fullhdfilmizlesenow/
 * Generated: 2026-09-02T13:31:38.175Z
 */
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/shared/http.js
var DEFAULT_TIMEOUT_MS = 15e3;
function timeoutSignal(ms = DEFAULT_TIMEOUT_MS) {
  try {
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
      return AbortSignal.timeout(ms);
    }
  } catch (e) {
  }
  try {
    if (typeof AbortController === "function" && typeof setTimeout === "function") {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        try {
          controller.abort();
        } catch (e) {
        }
      }, ms);
      if (timer && typeof timer.unref === "function")
        timer.unref();
      return controller.signal;
    }
  } catch (e) {
  }
  return void 0;
}
function withTimeout(promise, ms = DEFAULT_TIMEOUT_MS, label = "") {
  if (typeof setTimeout !== "function") {
    return Promise.resolve(promise);
  }
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timeout after ${ms}ms${label ? ` (${label})` : ""}`));
    }, ms);
  });
  return Promise.race([promise, timeout]).then(
    (value) => {
      if (timer)
        clearTimeout(timer);
      return value;
    },
    (error) => {
      if (timer)
        clearTimeout(timer);
      throw error;
    }
  );
}

// src/shared/cache.js
function createTtlCache(defaultTtlMs = 30 * 60 * 1e3, maxEntries = 200) {
  const store = /* @__PURE__ */ new Map();
  function get(key) {
    const entry = store.get(key);
    if (!entry)
      return void 0;
    if (entry.expires <= Date.now()) {
      store.delete(key);
      return void 0;
    }
    return entry.value;
  }
  function set(key, value, ttlMs = defaultTtlMs) {
    if (store.size >= maxEntries) {
      const oldest = store.keys().next().value;
      if (oldest !== void 0)
        store.delete(oldest);
    }
    store.set(key, { value, expires: Date.now() + ttlMs });
  }
  function remember(_0, _1) {
    return __async(this, arguments, function* (key, fn, ttlMs = defaultTtlMs, isValid = (v) => v != null) {
      const cached = get(key);
      if (cached !== void 0)
        return cached;
      const value = yield fn();
      if (isValid(value))
        set(key, value, ttlMs);
      return value;
    });
  }
  return { get, set, remember };
}

// src/shared/tmdb.js
var tmdbInfoCache = createTtlCache(30 * 60 * 1e3, 300);
var DEFAULT_TMDB_API_KEY = "";
function getTmdbApiKey() {
  try {
    const settings = typeof globalThis !== "undefined" ? globalThis.SCRAPER_SETTINGS : null;
    const userKey = (settings == null ? void 0 : settings.tmdbApiKey) ? String(settings.tmdbApiKey).trim() : "";
    if (userKey)
      return userKey;
  } catch (e) {
  }
  try {
    const injected = typeof globalThis !== "undefined" ? globalThis.TMDB_API_KEY : "";
    if (injected)
      return String(injected).trim();
  } catch (e) {
  }
  return DEFAULT_TMDB_API_KEY;
}
function tmdbApiKeySettingsLayout() {
  return [
    { type: "header", label: "TMDB API Anahtarı (gerekli)" },
    {
      type: "text",
      key: "tmdbApiKey",
      label: "Kendi TMDB API anahtarın",
      description: "Başlık eşleştirmesi için kendi TMDB v3 API anahtarını veya v4 Read Access Token'ını gir. Nuvio ortamında global TMDB_API_KEY sağlanıyorsa bu da kullanılabilir.",
      defaultValue: ""
    }
  ];
}
function fetchJson(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const _a = options, { timeout = DEFAULT_TIMEOUT_MS } = _a, rest = __objRest(_a, ["timeout"]);
    return yield withTimeout((() => __async(this, null, function* () {
      const response = yield fetch(url, __spreadValues({ signal: timeoutSignal(timeout) }, rest));
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} on ${url}`);
      }
      return yield response.json();
    }))(), timeout, url);
  });
}
function getTmdbInfo(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const empty = { title: "", originalTitle: "", turkishTitle: "", year: "", imdbId: null };
    const apiKey = getTmdbApiKey();
    if (!apiKey)
      return empty;
    const type = mediaType === "tv" ? "tv" : "movie";
    return yield tmdbInfoCache.remember(
      `${type}:${tmdbId}`,
      () => __async(this, null, function* () {
        var _a, _b, _c, _d, _e, _f;
        try {
          const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${apiKey}&append_to_response=external_ids,translations`;
          const data = yield fetchJson(url);
          let turkishTitle = "";
          const translations = ((_a = data.translations) == null ? void 0 : _a.translations) || [];
          const tr = translations.find((t) => t.iso_3166_1 === "TR" || t.iso_639_1 === "tr");
          if (tr) {
            turkishTitle = ((_b = tr.data) == null ? void 0 : _b.title) || ((_c = tr.data) == null ? void 0 : _c.name) || "";
          }
          return {
            title: data.name || data.title || data.original_title || "",
            originalTitle: data.original_title || data.original_name || "",
            turkishTitle,
            year: ((_d = data.release_date) == null ? void 0 : _d.slice(0, 4)) || ((_e = data.first_air_date) == null ? void 0 : _e.slice(0, 4)) || "",
            imdbId: ((_f = data.external_ids) == null ? void 0 : _f.imdb_id) || data.imdb_id || null
          };
        } catch (e) {
          return empty;
        }
      }),
      30 * 60 * 1e3,
      // Boş/hatalı sonucu cache'leme ki geçici bir hata kalıcı boş sonuca dönüşmesin.
      (v) => !!(v && (v.title || v.originalTitle || v.imdbId))
    );
  });
}

// src/shared/domains.js
var DEFAULT_REGISTRY_URL = "https://raw.githubusercontent.com/aojin76/animecix-nuvio-provider/main/domains.json";
var REGISTRY_TTL_MS = 15 * 60 * 1e3;
var registryCache = null;
var registryExpiresAt = 0;
var registryRequest = null;
function registryUrl() {
  try {
    const value = typeof globalThis !== "undefined" && globalThis.SCRAPER_DOMAIN_REGISTRY_URL;
    return value ? String(value).trim() : DEFAULT_REGISTRY_URL;
  } catch (e) {
    return DEFAULT_REGISTRY_URL;
  }
}
function cleanDomain(value) {
  const domain = String(value || "").trim().replace(/\/+$/, "");
  return /^https?:\/\/[^/\s]+$/i.test(domain) ? domain : "";
}
function uniqueDomains(values) {
  const result = [];
  const seen = /* @__PURE__ */ new Set();
  for (const value of values || []) {
    const domain = cleanDomain(value);
    const key = domain.toLowerCase();
    if (!domain || seen.has(key))
      continue;
    seen.add(key);
    result.push(domain);
  }
  return result;
}
function loadRegistry() {
  return __async(this, null, function* () {
    if (registryCache && registryExpiresAt > Date.now())
      return registryCache;
    if (registryRequest)
      return yield registryRequest;
    const request = withTimeout((() => __async(this, null, function* () {
      const response = yield fetch(registryUrl(), {
        headers: { Accept: "application/json" },
        signal: timeoutSignal(6e3)
      });
      if (!response.ok)
        throw new Error(`HTTP ${response.status}`);
      const data = yield response.json();
      if (!data || typeof data !== "object" || !data.providers) {
        throw new Error("ge\xE7ersiz domain registry");
      }
      registryCache = data;
      registryExpiresAt = Date.now() + REGISTRY_TTL_MS;
      return data;
    }))(), 7e3, registryUrl());
    registryRequest = request;
    try {
      return yield request;
    } finally {
      if (registryRequest === request)
        registryRequest = null;
    }
  });
}
function getDomainCandidates(_0) {
  return __async(this, arguments, function* (providerId, fallback = []) {
    var _a;
    const local = uniqueDomains(fallback);
    try {
      const registry = yield loadRegistry();
      const entry = (_a = registry.providers) == null ? void 0 : _a[providerId];
      const remote = entry && Array.isArray(entry.domains) ? entry.domains : [];
      return uniqueDomains([...remote, ...local]);
    } catch (e) {
      return local;
    }
  });
}

// src/shared/hls.js
function utf8ByteLength(str) {
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 128)
      bytes += 1;
    else if (c < 2048)
      bytes += 2;
    else if (c >= 55296 && c <= 56319) {
      bytes += 4;
      i++;
    } else
      bytes += 3;
  }
  return bytes;
}
function edlQuote(str) {
  const s = String(str || "");
  return `%${utf8ByteLength(s)}%${s}`;
}
function metaSafe(str) {
  return String(str || "").replace(/[;,]/g, " ").trim();
}
function subCodec(sub) {
  const fmt = String(sub.format || "").toLowerCase();
  if (fmt === "srt" || /\.srt(\?|$)/i.test(sub.url || ""))
    return "subrip";
  return "webvtt";
}
function buildMpvEdlUrl(videoUrl, subtitles) {
  const subs = (subtitles || []).filter((s) => s && s.url && /^https?:\/\//i.test(s.url));
  if (!videoUrl || !subs.length)
    return null;
  subs.sort((a, b) => {
    const at = /^tr/i.test(a.lang || a.language || "") ? 0 : 1;
    const bt = /^tr/i.test(b.lang || b.language || "") ? 0 : 1;
    return at - bt;
  });
  let edl = "edl://!no_clip;" + edlQuote(videoUrl);
  for (const sub of subs) {
    const lang = metaSafe(sub.lang || sub.language || "und");
    const title = metaSafe(sub.label || sub.name || lang) || lang;
    edl += ";!new_stream;!no_clip;!delay_open,media_type=sub,codec=" + subCodec(sub) + ";!track_meta,title=" + title + ",lang=" + lang + ";" + edlQuote(sub.url);
  }
  return edl;
}
function ensureHlsExtHint(url) {
  const u = String(url || "");
  if (!u || !/^https?:\/\//i.test(u))
    return u;
  if (/\.m3u8(\?|#|$)/i.test(u) || /\.mp4(\?|#|$)/i.test(u) || /\.mkv(\?|#|$)/i.test(u))
    return u;
  return u + (u.indexOf("?") >= 0 ? "&" : "?") + "ext=video.m3u8";
}
function addM3u8Ext(u) {
  const s = String(u || "").trim();
  if (!s || /\.m3u8(\?|#|$)/i.test(s))
    return s;
  const q = s.search(/[?#]/);
  return q >= 0 ? s.slice(0, q) + ".m3u8" + s.slice(q) : s + ".m3u8";
}
function buildSplitStreamEdl(masterText, subtitles) {
  const lines = String(masterText || "").split(/\r?\n/);
  let bestVideo = null, bestBw = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^#EXT-X-STREAM-INF.*BANDWIDTH=(\d+)/i);
    if (m) {
      const url = (lines[i + 1] || "").trim();
      if (url && !url.startsWith("#") && Number(m[1]) > bestBw) {
        bestBw = Number(m[1]);
        bestVideo = url;
      }
    }
  }
  if (!bestVideo)
    return null;
  const audios = [];
  for (const l of lines) {
    if (!/^#EXT-X-MEDIA:TYPE=AUDIO/i.test(l))
      continue;
    const uri = (l.match(/URI="([^"]+)"/i) || [])[1];
    if (!uri)
      continue;
    const lang = (l.match(/LANGUAGE="([^"]*)"/i) || [])[1] || "und";
    audios.push({ lang, uri });
  }
  if (!audios.length)
    return null;
  audios.sort((a, b) => (/tr|tur/i.test(a.lang) ? 0 : 1) - (/tr|tur/i.test(b.lang) ? 0 : 1));
  let edl = "edl://!no_clip;" + edlQuote(addM3u8Ext(bestVideo));
  for (const a of audios) {
    const lang = /tr|tur/i.test(a.lang) ? "tr" : /en|eng/i.test(a.lang) ? "en" : metaSafe(a.lang);
    const title = lang === "tr" ? "T\xFCrk\xE7e" : lang === "en" ? "English" : metaSafe(a.lang);
    edl += ";!new_stream;!no_clip;!track_meta,title=" + title + ",lang=" + lang + ";" + edlQuote(addM3u8Ext(a.uri));
  }
  const subs = (subtitles || []).filter((t) => t && t.url && /^https?:\/\//i.test(t.url));
  subs.sort((a, b) => (/^tr/i.test(a.lang || "") ? 0 : 1) - (/^tr/i.test(b.lang || "") ? 0 : 1));
  for (const sub of subs) {
    const lang = metaSafe(sub.lang || sub.language || "und");
    const title = metaSafe(sub.label || sub.name || lang) || lang;
    edl += ";!new_stream;!no_clip;!delay_open,media_type=sub,codec=" + subCodec(sub) + ";!track_meta,title=" + title + ",lang=" + lang + ";" + edlQuote(sub.url);
  }
  return edl;
}
function rewriteMasterChildExt(masterText) {
  return String(masterText || "").split(/\r?\n/).map((line) => {
    if (/^#EXT-X-MEDIA/i.test(line)) {
      return line.replace(/URI="([^"]+)"/i, (_, u) => `URI="${addM3u8Ext(u)}"`);
    }
    if (!line.startsWith("#") && /^https?:\/\//i.test(line.trim())) {
      return addM3u8Ext(line);
    }
    return line;
  }).join("\n");
}
function maybeEmbedSubsUrl(url, subtitles, masterText) {
  let on = false;
  try {
    const s = typeof globalThis !== "undefined" ? globalThis.SCRAPER_SETTINGS : null;
    on = !!(s && s.embedSubs);
  } catch (e) {
    on = false;
  }
  if (!on)
    return ensureHlsExtHint(url);
  const hasExt = /\.m3u8(\?|#|$)/i.test(url);
  const subs = (subtitles || []).filter((t) => t && t.url && /^https?:\/\//i.test(t.url));
  if (hasExt) {
    return subs.length ? buildMpvEdlUrl(url, subs) || url : url;
  }
  if (masterText) {
    const splitEdl = buildSplitStreamEdl(masterText, subtitles);
    if (splitEdl)
      return splitEdl;
    return "memory://" + rewriteMasterChildExt(masterText);
  }
  return ensureHlsExtHint(url);
}
function embedSubsSettingsLayout() {
  return [
    { type: "header", label: "Desktop Altyaz\u0131" },
    {
      type: "toggle",
      key: "embedSubs",
      label: "Masa\xFCst\xFC modu (oynatma + altyaz\u0131 d\xFCzeltmesi)",
      description: "Nuvio Desktop (MPV) i\xE7in: baz\u0131 kaynaklar masa\xFCst\xFCnde oynamaz veya altyaz\u0131 y\xFCklemez. Bunu A\xC7ARSAN stream masa\xFCst\xFC mpv i\xE7in uyarlan\u0131r (oynatma d\xFCzeltmesi + m\xFCmk\xFCn olan yerde g\xF6m\xFCl\xFC altyaz\u0131). SADECE masa\xFCst\xFCnde a\xE7; TV/Android'de kapal\u0131 b\u0131rak.",
      defaultValue: false
    }
  ];
}

// src/shared/base64.js
var CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
function atobPolyfill(input) {
  let str = String(input).replace(/[=]+$/, "");
  if (str.length % 4 === 1)
    return "";
  let output = "";
  for (let bc = 0, bs = 0, buffer, i = 0; buffer = str.charAt(i++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
    buffer = CHARS.indexOf(buffer);
  }
  return output;
}
function decodeBase64(input) {
  if (typeof atob === "function") {
    try {
      return atob(input);
    } catch (e) {
      return atobPolyfill(input);
    }
  }
  return atobPolyfill(input);
}

// src/fullhdfilm/constants.js
var SITE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8"
};

// src/fullhdfilm/utils.js
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const { timeout = DEFAULT_TIMEOUT_MS } = options;
    return yield withTimeout((() => __async(this, null, function* () {
      const response = yield fetch(url, {
        headers: __spreadValues(__spreadValues({}, SITE_HEADERS), options.headers || {}),
        signal: timeoutSignal(timeout)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} on ${url}`);
      }
      return yield response.text();
    }))(), timeout, url);
  });
}
function postText(url, referer) {
  return __async(this, null, function* () {
    return yield withTimeout((() => __async(this, null, function* () {
      const response = yield fetch(url, {
        method: "POST",
        headers: __spreadProps(__spreadValues({}, SITE_HEADERS), {
          Referer: referer || "",
          "X-Requested-With": "XMLHttpRequest"
        }),
        signal: timeoutSignal(DEFAULT_TIMEOUT_MS)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} on ${url}`);
      }
      return yield response.text();
    }))(), DEFAULT_TIMEOUT_MS, url);
  });
}
function rot13(input) {
  return String(input).replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
  });
}
function decodeScxLink(value) {
  try {
    return decodeBase64(rot13(value));
  } catch (e) {
    return "";
  }
}
var TR_ASCII_MAP = {
  "\xE7": "c",
  "\xC7": "c",
  "\u011F": "g",
  "\u011E": "g",
  "\u0131": "i",
  "\u0130": "i",
  "\xF6": "o",
  "\xD6": "o",
  "\u015F": "s",
  "\u015E": "s",
  "\xFC": "u",
  "\xDC": "u",
  "\xE2": "a",
  "\xC2": "a",
  "\xEE": "i",
  "\xCE": "i",
  "\xFB": "u",
  "\xDB": "u"
};
function asciiFold(value) {
  return String(value || "").replace(/[çÇğĞıİöÖşŞüÜâÂîÎûÛ]/g, (c) => TR_ASCII_MAP[c] || c);
}
function normalizeTitle(value) {
  return asciiFold(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}
function tokenizeTitle(value) {
  return asciiFold(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
}
function tokenSubsetMatch(candidateTokens, targetTokens) {
  if (targetTokens.length < 2)
    return false;
  const set = new Set(candidateTokens);
  return targetTokens.every((t) => set.has(t));
}
function titlesMatch(candidate, targets) {
  const c = normalizeTitle(candidate);
  if (!c)
    return false;
  const candidateTokens = tokenizeTitle(candidate);
  return targets.some((t) => {
    const n = normalizeTitle(t);
    if (n.length > 2 && (n === c || c.includes(n) || n.includes(c))) {
      return true;
    }
    return tokenSubsetMatch(candidateTokens, tokenizeTitle(t));
  });
}

// src/fullhdfilm/extractors.js
function originOf(url) {
  const m = /^(https?:\/\/[^/]+)/i.exec(String(url || ""));
  return m ? m[1] : "";
}
var PACKER_DIGITS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
function baseN(num, radix) {
  if (num === 0)
    return "0";
  let out = "";
  while (num > 0) {
    out = PACKER_DIGITS[num % radix] + out;
    num = Math.floor(num / radix);
  }
  return out;
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function unpack(packed) {
  const m = /\}\s*\(\s*'([\s\S]*)',\s*(\d+)\s*,\s*(\d+)\s*,\s*'([\s\S]*?)'\.split\('\|'\)/.exec(packed);
  if (!m)
    return null;
  let payload = m[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\");
  const radix = parseInt(m[2], 10);
  let count = parseInt(m[3], 10);
  const dict = m[4].split("|");
  while (count-- > 0) {
    if (dict[count]) {
      payload = payload.replace(
        new RegExp("\\b" + escapeRegExp(baseN(count, radix)) + "\\b", "g"),
        dict[count]
      );
    }
  }
  return payload;
}
function hexToString(value) {
  const cleaned = String(value).replace(/\\x/g, "").replace(/\\/g, "");
  let out = "";
  for (let i = 0; i + 1 < cleaned.length; i += 2) {
    const code = parseInt(cleaned.substr(i, 2), 16);
    if (Number.isNaN(code))
      return "";
    out += String.fromCharCode(code);
  }
  return out;
}
function rapidDecodeSecret(encoded) {
  const reversed = String(encoded).split("").reverse().join("");
  const t = decodeBase64(reversed);
  const key = "K9L";
  let out = "";
  for (let i = 0; i < t.length; i++) {
    const offset = key.charCodeAt(i % key.length) % 5 + 1;
    out += String.fromCharCode(t.charCodeAt(i) - offset);
  }
  return decodeBase64(out);
}
function parseJwTracks(html) {
  const m = /jwSetup\.tracks\s*=\s*(\[[\s\S]*?\])\s*;/.exec(html);
  if (!m)
    return [];
  let tracks;
  try {
    tracks = JSON.parse(m[1]);
  } catch (e) {
    return [];
  }
  const subs = [];
  for (const t of tracks || []) {
    if (!t || !t.file)
      continue;
    if (t.kind && t.kind !== "captions" && t.kind !== "subtitles")
      continue;
    const url = String(t.file).replace(/\\\//g, "/");
    if (!/^https?:\/\//.test(url))
      continue;
    const label = String(t.label || "Altyaz\u0131").trim();
    subs.push({ url, lang: label, language: label, name: label });
  }
  return subs;
}
function decodeUnicodeEscapes(value) {
  return String(value).replace(
    /\\u([0-9a-fA-F]{4})/g,
    (_, hex) => String.fromCharCode(parseInt(hex, 16))
  );
}
function parseInlineCaptions(html) {
  const subs = [];
  const re = /"kind":"captions","file":"([^"]+)","label":"([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = decodeUnicodeEscapes(m[1]).replace(/\\\//g, "/");
    if (!/^https?:\/\//.test(url))
      continue;
    const label = decodeUnicodeEscapes(m[2]).trim();
    subs.push({ url, lang: label, language: label, name: label });
  }
  return subs;
}
function collectSubtitles(html) {
  const all = [...parseJwTracks(html), ...parseInlineCaptions(html)];
  const seen = /* @__PURE__ */ new Set();
  return all.filter((s) => {
    if (seen.has(s.url))
      return false;
    seen.add(s.url);
    return true;
  });
}
function extractRapidVid(embedUrl, referer) {
  return __async(this, null, function* () {
    const html = yield fetchText(embedUrl, { headers: { Referer: referer } });
    const sources = html.split("jwSetup.sources")[1];
    if (!sources)
      return [];
    const match = /av\('([^']+)'\)/.exec(sources);
    if (!match)
      return [];
    const m3u8 = rapidDecodeSecret(match[1]);
    if (!m3u8 || !/^https?:\/\//.test(m3u8))
      return [];
    return [{
      url: m3u8,
      host: "RapidVid",
      type: "m3u8",
      headers: { Referer: originOf(embedUrl) + "/" },
      subtitles: collectSubtitles(html)
    }];
  });
}
function extractTurkeyPlayer(embedUrl, referer) {
  return __async(this, null, function* () {
    const html = yield fetchText(embedUrl, { headers: { Referer: referer } });
    const jsonMatch = /var\s+video\s*=\s*(\{[\s\S]*?\});/.exec(html);
    if (!jsonMatch)
      return [];
    const raw = jsonMatch[1];
    const uid = /"uid"\s*:\s*"?([^",}]+)"?/.exec(raw);
    const md5 = /"md5"\s*:\s*"([^"]+)"/.exec(raw);
    const id = /"id"\s*:\s*"?([^",}]+)"?/.exec(raw);
    if (!uid || !md5 || !id)
      return [];
    const origin = originOf(embedUrl);
    const master = `${origin}/m3u8/${uid[1]}/${md5[1]}/master.txt?s=1&id=${id[1]}&cache=1`;
    return [{
      url: master,
      host: "TRPlayer",
      type: "m3u8",
      headers: { Referer: origin + "/" }
    }];
  });
}
function extractVidMoxy(embedUrl, referer) {
  return __async(this, null, function* () {
    const html = yield fetchText(embedUrl, { headers: { Referer: referer } });
    const origin = originOf(embedUrl);
    let fileMatch = /"file":\s*"([^"]*\\x[^"]*)"/.exec(html);
    let m3u8 = fileMatch ? hexToString(fileMatch[1]) : "";
    if (!m3u8) {
      const evalMatch = /\};\s*(eval\(function[\s\S]*?)var played = \d+;/.exec(html);
      if (evalMatch) {
        let unpacked = unpack(evalMatch[1]);
        const twice = unpacked ? unpack(unpacked) : null;
        const final = (twice || unpacked || "").replace(/\\\\/g, "\\");
        const fm = /file"\s*:\s*"([^"]*)"/.exec(final);
        if (fm)
          m3u8 = hexToString(fm[1]);
      }
    }
    if (!m3u8 || !/^https?:\/\//.test(m3u8))
      return [];
    return [{
      url: m3u8,
      host: "VidMoxy",
      type: "m3u8",
      headers: { Referer: origin + "/" },
      subtitles: collectSubtitles(html)
    }];
  });
}
function extractSobreatsesuyp(embedUrl, referer) {
  return __async(this, null, function* () {
    const origin = originOf(embedUrl);
    const html = yield fetchText(embedUrl, { headers: { Referer: referer } });
    const m = /"file":"([^"]+)"/.exec(html);
    if (!m)
      return [];
    const file = m[1].replace(/\\\//g, "/");
    const listUrl = `${origin}/${file.replace(/^\/+/, "")}`;
    let list;
    try {
      list = JSON.parse(yield postText(listUrl, `${origin}/`));
    } catch (e) {
      return [];
    }
    if (!Array.isArray(list))
      return [];
    const results = [];
    for (let i = 1; i < list.length; i++) {
      const item = list[i];
      if (!item || !item.file)
        continue;
      const sub = String(item.file).slice(1);
      const playlistUrl = `${origin}/playlist/${sub}.txt`;
      let videoUrl;
      try {
        videoUrl = (yield postText(playlistUrl, `${origin}/`)).trim();
      } catch (e) {
        continue;
      }
      if (!/^https?:\/\//.test(videoUrl))
        continue;
      const label = String(item.title || "").trim();
      results.push({
        url: videoUrl,
        host: label ? `Sobreatsesuyp ${label}` : "Sobreatsesuyp",
        type: "m3u8",
        headers: { Referer: `${origin}/` },
        subtitles: []
      });
    }
    return results;
  });
}
function extractOkRu(embedUrl) {
  return __async(this, null, function* () {
    const idMatch = /(?:ok\.ru|odnoklassniki\.ru)\/(?:videoembed|video|live)\/(\d+)/i.exec(embedUrl) || /[?&]mid=(\d+)/i.exec(embedUrl);
    if (!idMatch)
      return [];
    const mid = idMatch[1];
    let raw;
    try {
      const response = yield fetch("https://www.ok.ru/dk", {
        method: "POST",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Content-Type": "application/x-www-form-urlencoded",
          "Referer": `https://ok.ru/videoembed/${mid}`,
          "Origin": "https://ok.ru",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: `cmd=videoPlayerMetadata&mid=${mid}`
      });
      if (!response.ok)
        return [];
      raw = yield response.text();
    } catch (e) {
      return [];
    }
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return [];
    }
    if (!data || data.error)
      return [];
    const results = [];
    const push = (url, label) => {
      if (!url || !/^https?:\/\//.test(url))
        return;
      results.push({
        url,
        host: label ? `OK.ru ${label}` : "OK.ru",
        type: /\.m3u8/i.test(url) ? "m3u8" : "mp4",
        headers: { Referer: "https://ok.ru/", "User-Agent": "Mozilla/5.0" },
        subtitles: []
      });
    };
    if (data.hlsManifestUrl)
      push(data.hlsManifestUrl, "HLS");
    if (data.hlsMasterPlaylistUrl)
      push(data.hlsMasterPlaylistUrl, "HLS");
    if (Array.isArray(data.videos)) {
      for (const v of data.videos) {
        if (v && v.url)
          push(v.url, v.name || v.type || "");
      }
    }
    return results;
  });
}
function extractGenericStream(embedUrl, referer, hostName) {
  return __async(this, null, function* () {
    let html;
    try {
      html = yield fetchText(embedUrl, { headers: { Referer: referer } });
    } catch (e) {
      return [];
    }
    const found = /* @__PURE__ */ new Set();
    const patterns = [
      /https?:\/\/[^"'\\\s<>]+?\.m3u8[^"'\\\s<>]*/gi,
      /https?:\/\/[^"'\\\s<>]+?\.mp4[^"'\\\s<>]*/gi,
      /["']file["']\s*[:=]\s*["'](https?:[^"']+)["']/gi,
      /["']src["']\s*[:=]\s*["'](https?:[^"']+\.(?:m3u8|mp4)[^"']*)["']/gi,
      /source\s+src=["'](https?:[^"']+)["']/gi
    ];
    for (const re of patterns) {
      let m;
      while ((m = re.exec(html)) !== null) {
        const url = (m[1] || m[0]).replace(/\\u0026/g, "&").replace(/\\\//g, "/");
        if (/^https?:\/\//.test(url) && !/google|facebook|analytics|parklogic/i.test(url)) {
          found.add(url);
        }
      }
    }
    const origin = originOf(embedUrl);
    return [...found].map((url) => ({
      url,
      host: hostName || "Embed",
      type: /\.m3u8/i.test(url) ? "m3u8" : "mp4",
      headers: { Referer: origin ? `${origin}/` : referer },
      subtitles: collectSubtitles(html)
    }));
  });
}
function extractGenericStream(embedUrl, referer, hostName) {
  return __async(this, null, function* () {
    let html;
    try {
      html = yield fetchText(embedUrl, { headers: { Referer: referer } });
    } catch (e) {
      return [];
    }
    const found = /* @__PURE__ */ new Set();
    const patterns = [
      /https?:\/\/[^"'\\\s<>]+?\.m3u8[^"'\\\s<>]*/gi,
      /https?:\/\/[^"'\\\s<>]+?\.mp4[^"'\\\s<>]*/gi,
      /["']file["']\s*[:=]\s*["'](https?:[^"']+)["']/gi,
      /["']src["']\s*[:=]\s*["'](https?:[^"']+\.(?:m3u8|mp4)[^"']*)["']/gi,
      /source\s+src=["'](https?:[^"']+)["']/gi
    ];
    for (const re of patterns) {
      let m;
      while ((m = re.exec(html)) !== null) {
        const url = (m[1] || m[0]).replace(/\\u0026/g, "&").replace(/\\\//g, "/");
        if (/^https?:\/\//.test(url) && !isAdMediaUrl(url) && !/google|facebook|analytics|parklogic/i.test(url)) {
          found.add(url);
        }
      }
    }
    const origin = originOf(embedUrl);
    return [...found].map((url) => ({
      url,
      host: hostName || "Embed",
      type: /\.m3u8/i.test(url) ? "m3u8" : "mp4",
      headers: { Referer: origin ? `${origin}/` : referer },
      subtitles: collectSubtitles(html)
    }));
  });
}

function fullHdHeaderValue(response, name) {
  try {
    return response && response.headers && typeof response.headers.get === "function" ? String(response.headers.get(name) || "") : "";
  } catch (e) {
    return "";
  }
}
function fullHdResponseTotalBytes(response) {
  const range = fullHdHeaderValue(response, "content-range").match(/\/([0-9]+)\s*$/);
  if (range)
    return Number(range[1]);
  const length = Number(fullHdHeaderValue(response, "content-length"));
  return isFinite(length) && length > 0 ? length : 0;
}
function fullHdResponseLooksLikeVideo(response) {
  const type = fullHdHeaderValue(response, "content-type");
  return !type || /(?:^|\/)video\//i.test(type) || /application\/(?:octet-stream|mp4|vnd\.apple\.mpegurl|x-mpegurl)/i.test(type);
}
function fullHdAssessMediaResponse(url, response) {
  if (!response || response.status && response.status >= 400)
    return null;
  if (!fullHdResponseLooksLikeVideo(response))
    return false;
  const total = fullHdResponseTotalBytes(response);
  if (/\.mp4(?:[?#]|$)/i.test(url) && total && total < MIN_EPISODE_BYTES)
    return false;
  return true;
}
function fullHdProbeMediaUrl(url, referer) {
  const value = String(url || "");
  if (!/^https?:\/\//i.test(value) || isAdMediaUrl(value))
    return Promise.resolve(false);
  const headers = __spreadProps(__spreadValues({}, SITE_HEADERS2), {
    Accept: "video/mp4,video/*;q=0.9,*/*;q=0.7",
    Referer: referer || "",
    Origin: originOf(referer || value)
  });
  if (/\.m3u8(?:[?#]|$)/i.test(value) || /[?&]ext=video\.m3u8/i.test(value)) {
    return fetch(value, {
      method: "GET",
      headers: __spreadProps(__spreadValues({}, headers), {
        Accept: "application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*;q=0.8"
      }),
      signal: timeoutSignal(5500)
    }).then((response) => {
      if (!response || response.status && response.status >= 400)
        throw new Error("HLS probe failed");
      return response.text();
    }).then((body) => {
      if (!/#EXTM3U/i.test(body))
        return false;
      let duration = 0;
      const durationRe = /#EXTINF\s*:\s*([0-9]+(?:\.[0-9]+)?)/gi;
      let match;
      while ((match = durationRe.exec(String(body || ""))) !== null)
        duration += Number(match[1]) || 0;
      return !(duration > 0 && duration < 30);
    }).catch(() => null);
  }
  const assess = (response) => {
    const decision = fullHdAssessMediaResponse(value, response);
    if (decision === null)
      throw new Error("MP4 probe unavailable");
    return decision;
  };
  return fetch(value, {
    method: "HEAD",
    headers,
    signal: timeoutSignal(4500)
  }).then(assess).catch(() => fetch(value, {
    method: "GET",
    headers: __spreadProps(__spreadValues({}, headers), { Range: "bytes=0-0" }),
    signal: timeoutSignal(4500)
  }).then(assess)).catch(() => null);
}
var HOST_REWRITES = [
  [/^(https?:\/\/)(?:www\.)?watch\.trplayer\.site(\/|$)/i, "$1watch.trplayer.com$2"],
  [/^(https?:\/\/)(?:www\.)?trplayer\.site(\/|$)/i, "$1watch.trplayer.com$2"],
  [/^(https?:\/\/)(?:www\.)?trplayer\.org(\/|$)/i, "$1watch.trplayer.com$2"]
];
function rewriteEmbedUrl(url) {
  let out = String(url || "").trim();
  for (const [re, rep] of HOST_REWRITES) {
    out = out.replace(re, rep);
  }
  return out;
}
function extractHost(embedUrl, referer) {
  return __async(this, null, function* () {
    try {
      if (!embedUrl || !/^https?:\/\//i.test(embedUrl))
        return [];
      const url = rewriteEmbedUrl(embedUrl);
      if (/rapidvid|rapid/i.test(url)) {
        return yield extractRapidVid(url, referer);
      }
      if (/trplayer|turkeyplayer|trstx/i.test(url)) {
        return yield extractTurkeyPlayer(url, referer);
      }
      if (/vidmoxy/i.test(url)) {
        return yield extractVidMoxy(url, referer);
      }
      if (/sobreatsesuyp|tovreatmemuyp|sobreat/i.test(url)) {
        return yield extractSobreatsesuyp(url, referer);
      }
      if (/(?:ok\.ru|odnoklassniki)/i.test(url)) {
        const ok = yield extractOkRu(url);
        if (ok.length)
          return ok;
      }
      if (/boosterx|pxplayer|fxplayer|vidmoly|filemoon|dood|streamtape|mixdrop/i.test(url)) {
        const host = (url.match(/^https?:\/\/([^/]+)/i) || [])[1] || "Embed";
        const generic = yield extractGenericStream(url, referer, host.split(".")[0]);
        if (generic.length)
          return generic;
      }
      return yield extractGenericStream(url, referer, "Embed");
    } catch (e) {
      return [];
    }
  });
}

// src/fullhdfilmizlesenow/constants.js
var DOMAIN_CANDIDATES = [
  "https://www.fullhdfilmizlesene.now",
  "https://fullhdfilmizlesene.now"
];
var SITE_HEADERS2 = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8"
};

// src/fullhdfilmizlesenow/index.js
var REQUEST_TIMEOUT_MS = 7e3;
var RESOLVE_TIMEOUT_MS = 25e3;
var AD_HOST_KEYS = /* @__PURE__ */ new Set(["advid", "advidprox"]);
var AD_MEDIA_URL_RE = /(?:^|[./?&#_=:\-])(?:ad|ads|advert|advertisement|reklam|reklamlar|banner|commercial|promo|preview|trailer|teaser|bumper|preroll|pre-roll|interstitial|sponsor|binomo|binomoreklam|advid|advidprox|adskeeper|popunder|clickunder|luxbet|peacock|casino|betting|countdown|splash|watermark|logo)(?:[./?&#_=:\-]|$)/i;
var MIN_EPISODE_BYTES = 8 * 1024 * 1024;
function isAdMediaUrl(url) {
  return AD_MEDIA_URL_RE.test(String(url || ""));
}
function requestText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    return yield withTimeout((() => __async(this, null, function* () {
      const response = yield fetch(url, {
        method: options.method || "GET",
        headers: __spreadValues(__spreadValues({}, SITE_HEADERS2), options.headers || {}),
        body: options.body,
        redirect: "follow",
        signal: timeoutSignal(options.timeout || REQUEST_TIMEOUT_MS)
      });
      if (!response.ok)
        throw new Error(`HTTP ${response.status} on ${url}`);
      return yield response.text();
    }))(), options.timeout || REQUEST_TIMEOUT_MS, url);
  });
}
function unescapeJson(value) {
  return String(value || "").replace(/\\\//g, "/").replace(/\\u0026/gi, "&").replace(/&amp;/gi, "&");
}
function parseAutocomplete(text) {
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data))
      return data;
    return Array.isArray(data == null ? void 0 : data.results) ? data.results : Array.isArray(data == null ? void 0 : data.data) ? data.data : [];
  } catch (e) {
    return [];
  }
}
function rowTitle(row) {
  return [row == null ? void 0 : row.baslik, row == null ? void 0 : row.altbaslik, row == null ? void 0 : row.title, row == null ? void 0 : row.original].filter(Boolean).join(" / ");
}
function rowYear(row) {
  var _a;
  return ((_a = String((row == null ? void 0 : row.yil) || (row == null ? void 0 : row.year) || "").match(/\d{4}/)) == null ? void 0 : _a[0]) || "";
}
function scoreRow(row, targets, year) {
  const title = rowTitle(row);
  const norms = targets.map(normalizeTitle).filter(Boolean);
  const normalized = normalizeTitle(title);
  const exact = norms.some((value) => value === normalized);
  const loose = titlesMatch(title, targets);
  const sameYear = year && rowYear(row) === String(year);
  return (exact ? 8 : loose ? 3 : 0) + (sameYear ? 2 : 0);
}
function searchDomain(domain, targets, year) {
  return __async(this, null, function* () {
    const rows = [], seen = /* @__PURE__ */ new Set();
    for (const query of targets.slice(0, 2)) {
      let text;
      try {
        text = yield requestText(`${domain}/autocomplete/q.php?q=${encodeURIComponent(query)}`, {
          headers: { Accept: "application/json,text/plain,*/*", Referer: `${domain}/` }
        });
      } catch (e) {
        continue;
      }
      for (const row of parseAutocomplete(text)) {
        if (!row || !row.dizilink)
          continue;
        const title = rowTitle(row);
        if (!titlesMatch(title, targets))
          continue;
        const link = String(row.dizilink).replace(/^\/+/, "");
        const prefix = String(row.prefix || "film").replace(/^\/+|\/+$/g, "");
        const key = `${prefix}/${link}`;
        if (seen.has(key))
          continue;
        seen.add(key);
        rows.push(__spreadProps(__spreadValues({}, row), { score: scoreRow(row, targets, year), title, prefix, dizilink: link }));
      }
    }
    rows.sort((a, b) => b.score - a.score);
    return rows;
  });
}
function buildPageUrl(domain, row) {
  const prefix = row.prefix || "film";
  const link = String(row.dizilink || "").replace(/^\/+/, "");
  if (!link)
    return "";
  if (/^https?:\/\//i.test(link))
    return link;
  if (link.startsWith(`${prefix}/`))
    return `${domain}/${link}`;
  return `${domain}/${prefix}/${link}`;
}
function extractScx(html) {
  const startAt = String(html || "").search(/\b(?:var\s+)?scx\s*=\s*\{/i);
  if (startAt < 0)
    return null;
  const start = String(html).indexOf("{", startAt);
  let depth = 0, quote = "", escaped = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (quote) {
      if (escaped)
        escaped = false;
      else if (ch === "\\")
        escaped = true;
      else if (ch === quote)
        quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "{")
      depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1));
        } catch (e) {
          return null;
        }
      }
    }
  }
  return null;
}
function sourceLabel(key, item) {
  try {
    const decoded = decodeBase64(String((item == null ? void 0 : item.tt) || ""));
    if (decoded)
      return decoded;
  } catch (e) {
  }
  return key;
}
function languageLabel(value) {
  const key = String(value || "").toLowerCase();
  if (key === "tr" || /dublaj/.test(key))
    return "T\xFCrk\xE7e Dublaj";
  if (key === "en" || /altyaz/.test(key))
    return "Altyaz\u0131l\u0131";
  return "T\xFCrk\xE7e";
}
function flattenScx(scx) {
  const entries = [];
  for (const [key, item] of Object.entries(scx || {})) {
    if (!item || typeof item !== "object" || AD_HOST_KEYS.has(key.toLowerCase()))
      continue;
    const sx = item.sx || {};
    const label = sourceLabel(key, item);
    const t = sx.t;
    if (Array.isArray(t)) {
      for (const encoded of t)
        if (typeof encoded === "string")
          entries.push({ encoded, label, language: "T\xFCrk\xE7e" });
    } else if (t && typeof t === "object") {
      for (const [language, encoded] of Object.entries(t)) {
        if (typeof encoded === "string")
          entries.push({ encoded, label, language: languageLabel(language) });
      }
    }
    const p = sx.p;
    const parts = Array.isArray(p) ? p : p && typeof p === "object" ? Object.values(p) : [];
    parts.forEach((encoded, index) => {
      if (typeof encoded === "string")
        entries.push({ encoded, label, language: "T\xFCrk\xE7e", part: index + 1 });
    });
  }
  return entries;
}
function collectFallbackEmbeds(html) {
  const result = [], seen = /* @__PURE__ */ new Set();
  const re = /(?:data-src|data-url|src)\s*=\s*["'](https?:\/\/[^"']+)["']/gi;
  let match;
  while ((match = re.exec(String(html || ""))) !== null) {
    const url = unescapeJson(match[1]);
    if (seen.has(url) || isAdMediaUrl(url) || /google|facebook|analytics|gstatic/i.test(url))
      continue;
    seen.add(url);
    result.push({ encoded: "", url, label: "Embed", language: "T\xFCrk\xE7e" });
  }
  return result;
}
function resolvePage(row, pageUrl, domain) {
  return __async(this, null, function* () {
    const html = yield requestText(pageUrl, { headers: { Referer: domain + "/" } });
    let entries = flattenScx(extractScx(html));
    if (!entries.length)
      entries = collectFallbackEmbeds(html);
    if (!entries.length)
      return [];
    const streams = [], seen = /* @__PURE__ */ new Set();
    for (const entry of entries.slice(0, 6)) {
      const embedUrl = entry.url || decodeScxLink(entry.encoded);
      if (!/^https?:\/\//i.test(embedUrl) || isAdMediaUrl(embedUrl))
        continue;
      let resolved;
      try {
        resolved = yield extractHost(embedUrl, pageUrl);
      } catch (e) {
        resolved = [];
      }
      const candidates = [];
      const candidateSeen = /* @__PURE__ */ new Set();
      for (const stream of resolved || []) {
        const streamUrl = String(stream && stream.url || "");
        if (!/^https?:\/\//i.test(streamUrl) || isAdMediaUrl(streamUrl) || candidateSeen.has(streamUrl))
          continue;
        candidateSeen.add(streamUrl);
        candidates.push({ stream, url: streamUrl });
      }
      const decisions = yield Promise.all(candidates.map((candidate) => fullHdProbeMediaUrl(candidate.url, pageUrl)));
      for (let index = 0; index < candidates.length; index++) {
        if (decisions[index] !== true)
          continue;
        const stream = candidates[index].stream;
        const streamUrl = candidates[index].url;
        if (seen.has(streamUrl))
          continue;
        seen.add(streamUrl);
        const subtitles = Array.isArray(stream.subtitles) ? stream.subtitles : [];
        streams.push({
          url: ensureHlsExtHint(streamUrl),
          type: stream.type || (/\.m3u8/i.test(streamUrl) ? "m3u8" : "mp4"),
          quality: stream.quality || "Auto",
          headers: stream.headers || {},
          subtitles,
          name: "FullHDFilmizlesene " + entry.language + (entry.part ? " • Part " + entry.part : "") + " • " + (stream.host || "Kaynak")
        });
      }
    }
    return streams;
  });
}
function resolveTarget(tmdbId, mediaType) {
  return __async(this, null, function* () {
    if (mediaType !== "movie")
      return null;
    const info = yield getTmdbInfo(tmdbId, "movie");
    const targets = [...new Set([info.turkishTitle, info.title, info.originalTitle].filter(Boolean))];
    if (!targets.length)
      return null;
    const domains = (yield getDomainCandidates("fullhdfilmizlesenow", DOMAIN_CANDIDATES)).slice(0, 2);
    for (const domain of domains) {
      const rows = yield searchDomain(domain, targets, info.year);
      for (const row of rows.slice(0, 3)) {
        const pageUrl = buildPageUrl(domain, row);
        if (!pageUrl)
          continue;
        try {
          const streams = yield resolvePage(row, pageUrl, domain);
          if (streams.length)
            return { title: row.title || info.title, streams };
        } catch (e) {
        }
      }
    }
    return null;
  });
}
function getStreams(tmdbId, mediaType = "movie") {
  return __async(this, null, function* () {
    try {
      const resolved = yield withTimeout(resolveTarget(tmdbId, mediaType), RESOLVE_TIMEOUT_MS, "FullHDFilmizlesene stream resolution");
      if (!resolved)
        return [];
      return resolved.streams.map((stream) => ({
        name: stream.name,
        title: resolved.title,
        url: maybeEmbedSubsUrl(stream.url, stream.subtitles),
        quality: stream.quality,
        headers: stream.headers,
        provider: "fullhdfilmizlesenow",
        type: stream.type,
        subtitles: stream.subtitles
      }));
    } catch (e) {
      return [];
    }
  });
}
function getSubtitles(tmdbId, mediaType = "movie") {
  return __async(this, null, function* () {
    try {
      const resolved = yield withTimeout(resolveTarget(tmdbId, mediaType), RESOLVE_TIMEOUT_MS, "FullHDFilmizlesene subtitle resolution");
      const result = [], seen = /* @__PURE__ */ new Set();
      for (const stream of (resolved == null ? void 0 : resolved.streams) || []) {
        for (const subtitle of stream.subtitles || []) {
          if (!subtitle.url || seen.has(subtitle.url))
            continue;
          seen.add(subtitle.url);
          result.push(subtitle);
        }
      }
      return result;
    } catch (e) {
      return [];
    }
  });
}
function onSettings() {
  return __async(this, null, function* () {
    return [...embedSubsSettingsLayout(), ...tmdbApiKeySettingsLayout()];
  });
}
module.exports = { getStreams, getSubtitles, onSettings };
