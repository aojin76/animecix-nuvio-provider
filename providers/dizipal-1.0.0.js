/**
 * dizipal - Built from src/dizipal/
 * Generated: 2026-09-02T13:31:38.160Z
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
var DEFAULT_TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
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
    { type: "header", label: "TMDB API Anahtar\u0131 (opsiyonel)" },
    {
      type: "text",
      key: "tmdbApiKey",
      label: "Kendi TMDB API anahtar\u0131n",
      description: "Bo\u015F b\u0131rak\u0131rsan payla\u015F\u0131lan varsay\u0131lan anahtar kullan\u0131l\u0131r. Kendi TMDB v3 API anahtar\u0131n\u0131 girersen (themoviedb.org hesab\u0131ndan \xFCcretsiz al\u0131n\u0131r) bu ekrandaki t\xFCm TMDB istekleri onunla yap\u0131l\u0131r.",
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
function decodeBase64Bytes(input) {
  const decoded = decodeBase64(input);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i);
  }
  return bytes;
}

// src/fullhdfilm/utils.js
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

// src/dizipal/constants.js
var DOMAIN_CANDIDATES = [
  "https://dizipal1578.com"
];
var DIZIPAL_PLAYER_PASSWORD = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";
var SITE_HEADERS2 = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8"
};

// src/dizipal/crypto.js
function concatBytes(...arrays) {
  const length = arrays.reduce((sum, item) => sum + item.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const item of arrays) {
    output.set(item, offset);
    offset += item.length;
  }
  return output;
}
function utf8Bytes(value) {
  const output = [];
  const text = String(value || "");
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code >= 55296 && code <= 56319 && i + 1 < text.length) {
      const low = text.charCodeAt(++i);
      code = 65536 + (code - 55296 << 10) + (low - 56320);
    }
    if (code < 128)
      output.push(code);
    else if (code < 2048)
      output.push(192 | code >> 6, 128 | code & 63);
    else if (code < 65536)
      output.push(224 | code >> 12, 128 | code >> 6 & 63, 128 | code & 63);
    else
      output.push(240 | code >> 18, 128 | code >> 12 & 63, 128 | code >> 6 & 63, 128 | code & 63);
  }
  return new Uint8Array(output);
}
function bytesToUtf8(bytes) {
  let output = "";
  for (let i = 0; i < bytes.length; ) {
    const first = bytes[i++];
    if (first < 128) {
      output += String.fromCharCode(first);
    } else if (first < 224 && i < bytes.length) {
      output += String.fromCharCode((first & 31) << 6 | bytes[i++] & 63);
    } else if (first < 240 && i + 1 < bytes.length) {
      output += String.fromCharCode((first & 15) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63);
    } else if (i + 2 < bytes.length) {
      const code = (first & 7) << 18 | (bytes[i++] & 63) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
      const value = code - 65536;
      output += String.fromCharCode(55296 | value >> 10, 56320 | value & 1023);
    }
  }
  return output;
}
function hexBytes(value) {
  const clean = String(value || "").replace(/[^0-9a-f]/gi, "");
  const output = new Uint8Array(Math.floor(clean.length / 2));
  for (let i = 0; i < output.length; i++)
    output[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return output;
}
function add64(a, b) {
  const lo = a.lo + b.lo >>> 0;
  return { hi: a.hi + b.hi + (lo < a.lo ? 1 : 0) >>> 0, lo };
}
function addMany(...values) {
  let result = { hi: 0, lo: 0 };
  for (const value of values)
    result = add64(result, value);
  return result;
}
function xor64(a, b) {
  return { hi: (a.hi ^ b.hi) >>> 0, lo: (a.lo ^ b.lo) >>> 0 };
}
function and64(a, b) {
  return { hi: (a.hi & b.hi) >>> 0, lo: (a.lo & b.lo) >>> 0 };
}
function not64(a) {
  return { hi: ~a.hi >>> 0, lo: ~a.lo >>> 0 };
}
function rotr64(value, bits) {
  const n = bits % 64;
  if (!n)
    return { hi: value.hi, lo: value.lo };
  if (n < 32) {
    return {
      hi: (value.hi >>> n | value.lo << 32 - n) >>> 0,
      lo: (value.lo >>> n | value.hi << 32 - n) >>> 0
    };
  }
  if (n === 32)
    return { hi: value.lo, lo: value.hi };
  const m = n - 32;
  return {
    hi: (value.lo >>> m | value.hi << 32 - m) >>> 0,
    lo: (value.hi >>> m | value.lo << 32 - m) >>> 0
  };
}
function shr64(value, bits) {
  if (bits === 0)
    return { hi: value.hi, lo: value.lo };
  if (bits < 32)
    return { hi: value.hi >>> bits, lo: (value.lo >>> bits | value.hi << 32 - bits) >>> 0 };
  if (bits === 32)
    return { hi: 0, lo: value.hi };
  if (bits < 64)
    return { hi: 0, lo: value.hi >>> bits - 32 };
  return { hi: 0, lo: 0 };
}
function parse64(value) {
  return { hi: parseInt(value.slice(0, 8), 16) >>> 0, lo: parseInt(value.slice(8), 16) >>> 0 };
}
var SHA512_K = [
  "428a2f98d728ae22",
  "7137449123ef65cd",
  "b5c0fbcfec4d3b2f",
  "e9b5dba58189dbbc",
  "3956c25bf348b538",
  "59f111f1b605d019",
  "923f82a4af194f9b",
  "ab1c5ed5da6d8118",
  "d807aa98a3030242",
  "12835b0145706fbe",
  "243185be4ee4b28c",
  "550c7dc3d5ffb4e2",
  "72be5d74f27b896f",
  "80deb1fe3b1696b1",
  "9bdc06a725c71235",
  "c19bf174cf692694",
  "e49b69c19ef14ad2",
  "efbe4786384f25e3",
  "0fc19dc68b8cd5b5",
  "240ca1cc77ac9c65",
  "2de92c6f592b0275",
  "4a7484aa6ea6e483",
  "5cb0a9dcbd41fbd4",
  "76f988da831153b5",
  "983e5152ee66dfab",
  "a831c66d2db43210",
  "b00327c898fb213f",
  "bf597fc7beef0ee4",
  "c6e00bf33da88fc2",
  "d5a79147930aa725",
  "06ca6351e003826f",
  "142929670a0e6e70",
  "27b70a8546d22ffc",
  "2e1b21385c26c926",
  "4d2c6dfc5ac42aed",
  "53380d139d95b3df",
  "650a73548baf63de",
  "766a0abb3c77b2a8",
  "81c2c92e47edaee6",
  "92722c851482353b",
  "a2bfe8a14cf10364",
  "a81a664bbc423001",
  "c24b8b70d0f89791",
  "c76c51a30654be30",
  "d192e819d6ef5218",
  "d69906245565a910",
  "f40e35855771202a",
  "106aa07032bbd1b8",
  "19a4c116b8d2d0c8",
  "1e376c085141ab53",
  "2748774cdf8eeb99",
  "34b0bcb5e19b48a8",
  "391c0cb3c5c95a63",
  "4ed8aa4ae3418acb",
  "5b9cca4f7763e373",
  "682e6ff3d6b2b8a3",
  "748f82ee5defb2fc",
  "78a5636f43172f60",
  "84c87814a1f0ab72",
  "8cc702081a6439ec",
  "90befffa23631e28",
  "a4506cebde82bde9",
  "bef9a3f7b2c67915",
  "c67178f2e372532b",
  "ca273eceea26619c",
  "d186b8c721c0c207",
  "eada7dd6cde0eb1e",
  "f57d4f7fee6ed178",
  "06f067aa72176fba",
  "0a637dc5a2c898a6",
  "113f9804bef90dae",
  "1b710b35131c471b",
  "28db77f523047d84",
  "32caab7b40c72493",
  "3c9ebe0a15c9bebc",
  "431d67c49c100d4c",
  "4cc5d4becb3e42b6",
  "597f299cfc657e2a",
  "5fcb6fab3ad6faec",
  "6c44198c4a475817"
].map(parse64);
var SHA512_H = [
  "6a09e667f3bcc908",
  "bb67ae8584caa73b",
  "3c6ef372fe94f82b",
  "a54ff53a5f1d36f1",
  "510e527fade682d1",
  "9b05688c2b3e6c1f",
  "1f83d9abfb41bd6b",
  "5be0cd19137e2179"
].map(parse64);
function sha512(input) {
  const bitLength = input.length * 8;
  let paddedLength = input.length + 1;
  while (paddedLength % 128 !== 112)
    paddedLength++;
  const padded = new Uint8Array(paddedLength + 16);
  padded.set(input);
  padded[input.length] = 128;
  let length = bitLength;
  for (let i = 0; i < 8; i++) {
    padded[padded.length - 1 - i] = length & 255;
    length = Math.floor(length / 256);
  }
  const h = SHA512_H.map((value) => ({ hi: value.hi, lo: value.lo }));
  for (let offset = 0; offset < padded.length; offset += 128) {
    const w = new Array(80);
    for (let i = 0; i < 16; i++) {
      const at = offset + i * 8;
      w[i] = {
        hi: (padded[at] << 24 | padded[at + 1] << 16 | padded[at + 2] << 8 | padded[at + 3]) >>> 0,
        lo: (padded[at + 4] << 24 | padded[at + 5] << 16 | padded[at + 6] << 8 | padded[at + 7]) >>> 0
      };
    }
    for (let i = 16; i < 80; i++) {
      const a2 = w[i - 15], b2 = w[i - 2];
      const s0 = xor64(xor64(rotr64(a2, 1), rotr64(a2, 8)), shr64(a2, 7));
      const s1 = xor64(xor64(rotr64(b2, 19), rotr64(b2, 61)), shr64(b2, 6));
      w[i] = addMany(s1, w[i - 7], s0, w[i - 16]);
    }
    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], k = h[7];
    for (let i = 0; i < 80; i++) {
      const S1 = xor64(xor64(rotr64(e, 14), rotr64(e, 18)), rotr64(e, 41));
      const ch = xor64(and64(e, f), and64(not64(e), g));
      const temp1 = addMany(k, S1, ch, SHA512_K[i], w[i]);
      const S0 = xor64(xor64(rotr64(a, 28), rotr64(a, 34)), rotr64(a, 39));
      const maj = xor64(xor64(and64(a, b), and64(a, c)), and64(b, c));
      const temp2 = add64(S0, maj);
      k = g;
      g = f;
      f = e;
      e = add64(d, temp1);
      d = c;
      c = b;
      b = a;
      a = add64(temp1, temp2);
    }
    h[0] = add64(h[0], a);
    h[1] = add64(h[1], b);
    h[2] = add64(h[2], c);
    h[3] = add64(h[3], d);
    h[4] = add64(h[4], e);
    h[5] = add64(h[5], f);
    h[6] = add64(h[6], g);
    h[7] = add64(h[7], k);
  }
  const output = new Uint8Array(64);
  h.forEach((value, index) => {
    const at = index * 8;
    output[at] = value.hi >>> 24;
    output[at + 1] = value.hi >>> 16;
    output[at + 2] = value.hi >>> 8;
    output[at + 3] = value.hi;
    output[at + 4] = value.lo >>> 24;
    output[at + 5] = value.lo >>> 16;
    output[at + 6] = value.lo >>> 8;
    output[at + 7] = value.lo;
  });
  return output;
}
function hmacSha512(key, message) {
  let actualKey = key;
  if (actualKey.length > 128)
    actualKey = sha512(actualKey);
  const padded = new Uint8Array(128);
  padded.set(actualKey);
  const ipad = new Uint8Array(128), opad = new Uint8Array(128);
  for (let i = 0; i < 128; i++) {
    ipad[i] = padded[i] ^ 54;
    opad[i] = padded[i] ^ 92;
  }
  return sha512(concatBytes(opad, sha512(concatBytes(ipad, message))));
}
function pbkdf2Sha512(password, salt, iterations, length) {
  const block = new Uint8Array(salt.length + 4);
  block.set(salt);
  block[block.length - 1] = 1;
  let u = hmacSha512(password, block);
  const output = new Uint8Array(u);
  for (let i = 1; i < iterations; i++) {
    u = hmacSha512(password, u);
    for (let j = 0; j < output.length; j++)
      output[j] ^= u[j];
  }
  return output.slice(0, length);
}
var SBOX = new Uint8Array(256);
var INV_SBOX = new Uint8Array(256);
(function initSbox() {
  let p = 1, q = 1;
  do {
    p = p ^ p << 1 ^ (p & 128 ? 283 : 0);
    p &= 255;
    q ^= q << 1;
    q ^= q << 2;
    q ^= q << 4;
    q &= 255;
    if (q & 128)
      q ^= 9;
    const rotate = (value) => (value << 1 | value >>> 7) & 255;
    SBOX[p] = (q ^ rotate(q) ^ rotate(rotate(q)) ^ rotate(rotate(rotate(q))) ^ rotate(rotate(rotate(rotate(q)))) ^ 99) & 255;
  } while (p !== 1);
  SBOX[0] = 99;
  for (let i = 0; i < 256; i++)
    INV_SBOX[SBOX[i]] = i;
})();
function mul(a, b) {
  let result = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1)
      result ^= a;
    a = (a << 1 ^ (a & 128 ? 27 : 0)) & 255;
    b >>= 1;
  }
  return result & 255;
}
function expandKey(key) {
  const words = new Array(60);
  for (let i = 0; i < 8; i++)
    words[i] = [key[i * 4], key[i * 4 + 1], key[i * 4 + 2], key[i * 4 + 3]];
  const rcon = [1, 2, 4, 8, 16, 32, 64, 128, 27, 54, 108, 216, 171, 77];
  for (let i = 8; i < 60; i++) {
    let temp = words[i - 1].slice();
    if (i % 8 === 0) {
      temp = [temp[1], temp[2], temp[3], temp[0]].map((value) => SBOX[value]);
      temp[0] ^= rcon[i / 8 - 1];
    } else if (i % 8 === 4) {
      temp = temp.map((value) => SBOX[value]);
    }
    words[i] = words[i - 8].map((value, index) => value ^ temp[index]);
  }
  return words;
}
function decryptAesBlock(block, words) {
  const state = Array.from(block);
  const addRoundKey = (round) => {
    for (let column = 0; column < 4; column++) {
      for (let row = 0; row < 4; row++)
        state[row + column * 4] ^= words[round * 4 + column][row];
    }
  };
  const invShiftRows = () => {
    const copy = state.slice();
    for (let row = 1; row < 4; row++) {
      for (let column = 0; column < 4; column++) {
        state[row + column * 4] = copy[row + (column - row + 4) % 4 * 4];
      }
    }
  };
  const invSubBytes = () => {
    for (let i = 0; i < 16; i++)
      state[i] = INV_SBOX[state[i]];
  };
  const invMixColumns = () => {
    for (let column = 0; column < 4; column++) {
      const at = column * 4, s0 = state[at], s1 = state[at + 1], s2 = state[at + 2], s3 = state[at + 3];
      state[at] = mul(s0, 14) ^ mul(s1, 11) ^ mul(s2, 13) ^ mul(s3, 9);
      state[at + 1] = mul(s0, 9) ^ mul(s1, 14) ^ mul(s2, 11) ^ mul(s3, 13);
      state[at + 2] = mul(s0, 13) ^ mul(s1, 9) ^ mul(s2, 14) ^ mul(s3, 11);
      state[at + 3] = mul(s0, 11) ^ mul(s1, 13) ^ mul(s2, 9) ^ mul(s3, 14);
    }
  };
  addRoundKey(14);
  for (let round = 13; round >= 1; round--) {
    invShiftRows();
    invSubBytes();
    addRoundKey(round);
    invMixColumns();
  }
  invShiftRows();
  invSubBytes();
  addRoundKey(0);
  return new Uint8Array(state);
}
function aesCbcDecrypt(key, iv, ciphertext) {
  if (!ciphertext.length || ciphertext.length % 16)
    return new Uint8Array(0);
  const words = expandKey(key);
  const output = new Uint8Array(ciphertext.length);
  let previous = iv;
  for (let offset = 0; offset < ciphertext.length; offset += 16) {
    const block = ciphertext.slice(offset, offset + 16);
    const plain = decryptAesBlock(block, words);
    for (let i = 0; i < 16; i++)
      output[offset + i] = plain[i] ^ previous[i];
    previous = block;
  }
  const padding = output[output.length - 1];
  if (padding > 0 && padding <= 16)
    return output.slice(0, output.length - padding);
  return output;
}
function decryptWithWebCrypto(password, salt, iv, ciphertext) {
  return __async(this, null, function* () {
    const webCrypto = typeof globalThis !== "undefined" ? globalThis.crypto : null;
    if (!(webCrypto == null ? void 0 : webCrypto.subtle))
      return null;
    try {
      const baseKey = yield webCrypto.subtle.importKey("raw", utf8Bytes(password), { name: "PBKDF2" }, false, ["deriveKey"]);
      const key = yield webCrypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 999, hash: "SHA-512" },
        baseKey,
        { name: "AES-CBC", length: 256 },
        false,
        ["decrypt"]
      );
      const plain = yield webCrypto.subtle.decrypt({ name: "AES-CBC", iv }, key, ciphertext);
      return bytesToUtf8(new Uint8Array(plain));
    } catch (e) {
      return null;
    }
  });
}
function decryptDizipalPayload(payload) {
  return __async(this, null, function* () {
    if (!payload || !payload.ciphertext || !payload.iv || !payload.salt)
      return null;
    const ciphertext = decodeBase64Bytes(payload.ciphertext);
    const iv = hexBytes(payload.iv);
    const salt = hexBytes(payload.salt);
    if (iv.length !== 16 || !ciphertext.length || !salt.length)
      return null;
    const webResult = yield decryptWithWebCrypto(DIZIPAL_PLAYER_PASSWORD, salt, iv, ciphertext);
    if (webResult)
      return webResult;
    try {
      const key = pbkdf2Sha512(utf8Bytes(DIZIPAL_PLAYER_PASSWORD), salt, 999, 32);
      return bytesToUtf8(aesCbcDecrypt(key, iv, ciphertext));
    } catch (e) {
      return null;
    }
  });
}

// src/dizipal/index.js
var REQUEST_TIMEOUT_MS = 15e3;
function htmlUnescape(value) {
  return String(value || "").replace(/&quot;/gi, '"').replace(/&#34;/gi, '"').replace(/&#x27;|&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&amp;/gi, "&");
}
function originOf(url) {
  const match = String(url || "").match(/^(https?:\/\/[^/]+)/i);
  return match ? match[1] : "";
}
function absoluteUrl(value, base) {
  const raw = String(value || "").trim().replace(/\\\//g, "/");
  if (!raw)
    return "";
  if (/^\/\//.test(raw))
    return `https:${raw}`;
  if (/^https?:\/\//i.test(raw))
    return raw;
  if (/^\//.test(raw))
    return `${base}${raw}`;
  return `${base}/${raw.replace(/^\/+/, "")}`;
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
function searchOnDomain(domain, query) {
  return __async(this, null, function* () {
    const body = `searchterm=${encodeURIComponent(query)}`;
    const text = yield requestText(`${domain}/bg/searchcontent`, {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${domain}/`
      }
    });
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return [];
    }
    const result = Array.isArray(data) ? data : Array.isArray(data == null ? void 0 : data.result) ? data.result : [];
    return result.filter((item) => item && (item.used_slug || item.object_id));
  });
}
function itemTitle(item) {
  return [item == null ? void 0 : item.object_name, item == null ? void 0 : item.object_alternative_name, item == null ? void 0 : item.object_original_name].filter(Boolean).join(" / ");
}
function itemYear(item) {
  return String((item == null ? void 0 : item.object_release_year) || (item == null ? void 0 : item.object_year) || "").slice(0, 4);
}
function scoreItem(item, targets, year, imdbId, mediaType) {
  const targetNorms = targets.map(normalizeTitle).filter(Boolean);
  const title = itemTitle(item);
  const normalized = normalizeTitle(title);
  const exact = targetNorms.some((target) => target === normalized);
  const loose = titlesMatch(title, targets);
  const yearMatch = year && itemYear(item) === String(year);
  const idMatch = imdbId && String(item.object_related_imdb_id || "") === String(imdbId);
  const type = String(item.used_type || "").toLowerCase();
  const typeMatch = mediaType === "tv" ? /series|dizi|tv|show/.test(type) : /movie|film|movie/.test(type);
  return (idMatch ? 20 : 0) + (exact ? 8 : loose ? 3 : 0) + (yearMatch ? 2 : 0) + (typeMatch ? 1 : 0);
}
function findContent(domain, targets, year, imdbId, mediaType) {
  return __async(this, null, function* () {
    const seen = /* @__PURE__ */ new Set();
    const all = [];
    for (const query of targets.slice(0, 3)) {
      let rows;
      try {
        rows = yield searchOnDomain(domain, query);
      } catch (e) {
        continue;
      }
      for (const item of rows) {
        const key = String(item.object_id || item.used_slug || "");
        if (!key || seen.has(key))
          continue;
        seen.add(key);
        const score = scoreItem(item, targets, year, imdbId, mediaType);
        if (score > 0)
          all.push({ item, score });
      }
    }
    all.sort((a, b) => b.score - a.score);
    return all.map((row) => row.item);
  });
}
function contentPath(item, mediaType) {
  let slug = String((item == null ? void 0 : item.used_slug) || "").trim().replace(/^\/+/, "");
  if (!slug)
    return "";
  if (/^https?:\/\//i.test(slug))
    return slug;
  if (slug.startsWith("series/") || slug.startsWith("movies/") || slug.startsWith("movie/"))
    return `/${slug}`;
  return `/${mediaType === "tv" ? "series" : "movies"}/${slug}`;
}
function extractEpisodeLinks(html, base) {
  const links = [];
  const seen = /* @__PURE__ */ new Set();
  const re = /(?:href|data-href)\s*=\s*["']([^"']*\/bolum\/[^"']+)["']/gi;
  let match;
  while ((match = re.exec(String(html || ""))) !== null) {
    const url = absoluteUrl(htmlUnescape(match[1]), base);
    if (!url || seen.has(url))
      continue;
    seen.add(url);
    links.push(url);
  }
  return links;
}
function buildEpisodeUrl(domain, item, season, episode) {
  return __async(this, null, function* () {
    const seriesPath = contentPath(item, "tv");
    if (!seriesPath)
      return "";
    const seriesUrl = /^https?:\/\//i.test(seriesPath) ? seriesPath : `${domain}${seriesPath}`;
    try {
      const html = yield requestText(seriesUrl, { headers: { Referer: `${domain}/` } });
      const links = extractEpisodeLinks(html, domain);
      const suffix = new RegExp(`-${Number(season)}x${Number(episode)}(?:[/?#"']|$)`, "i");
      const exact = links.find((url) => suffix.test(url));
      if (exact)
        return exact;
    } catch (e) {
    }
    const slug = seriesPath.replace(/^\/series\//i, "").replace(/\/$/, "");
    return `${domain}/bolum/${slug}-${Number(season) || 1}x${Number(episode) || 1}`;
  });
}
function extractPlayerPayload(html) {
  const match = /data-rm-k\s*=\s*["']true["'][^>]*>([\s\S]*?)<\/div>/i.exec(String(html || ""));
  if (!match)
    return null;
  try {
    return JSON.parse(htmlUnescape(match[1].trim()));
  } catch (e) {
    return null;
  }
}
function extractTracks(html, base) {
  const tracks = [];
  const re = /<track\b([^>]+)>/gi;
  let match;
  while ((match = re.exec(String(html || ""))) !== null) {
    const attrs = match[1];
    const src = (attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!src)
      continue;
    const label = (attrs.match(/\blabel\s*=\s*["']([^"']+)["']/i) || [])[1] || "Altyaz\u0131";
    const lang = (attrs.match(/\bsrclang\s*=\s*["']([^"']+)["']/i) || [])[1] || (/t[uü]rk|tur/i.test(label) ? "tr" : "und");
    tracks.push({ url: absoluteUrl(htmlUnescape(src), base), lang, label, language: label, name: label, format: /\.srt(?:\?|$)/i.test(src) ? "srt" : "vtt" });
  }
  return tracks.filter((track) => /^https?:\/\//i.test(track.url));
}
function extractMediaUrls(html, base) {
  const found = /* @__PURE__ */ new Set();
  const text = String(html || "");
  const patterns = [
    /(?:file|src|source|videoUrl|hls|playlist)\s*["']?\s*[:=]\s*["'](https?:[^"'\\\s<>]+(?:m3u8|mp4)[^"'\\\s<>]*)["']/gi,
    /https?:\/\/[^"'\\\s<>]+\.(?:m3u8|mp4)(?:\?[^"'\\\s<>]*)?/gi,
    /(?:file|src)\s*=\s*["'](\/[^"']+(?:m3u8|mp4)[^"']*)["']/gi
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const url = absoluteUrl(htmlUnescape(match[1] || match[0]), base).replace(/\\u0026/g, "&");
      if (/^https?:\/\//i.test(url))
        found.add(url);
    }
  }
  return [...found];
}
function resolveEpisodePage(pageUrl, siteReferer) {
  return __async(this, null, function* () {
    let html;
    try {
      html = yield requestText(pageUrl, { headers: { Referer: siteReferer } });
    } catch (e) {
      return [];
    }
    const payload = extractPlayerPayload(html);
    if (!payload)
      return [];
    const decrypted = yield decryptDizipalPayload(payload);
    if (!decrypted)
      return [];
    const embedUrl = absoluteUrl(decrypted.trim().replace(/^['"]|['"]$/g, ""), originOf(pageUrl));
    if (!/^https?:\/\//i.test(embedUrl))
      return [];
    let embedHtml;
    try {
      embedHtml = yield requestText(embedUrl, { headers: { Referer: pageUrl } });
    } catch (e) {
      return [];
    }
    const origin = originOf(embedUrl);
    const subtitles = extractTracks(embedHtml, origin);
    const urls = extractMediaUrls(embedHtml, origin);
    return urls.map((url) => ({
      url: ensureHlsExtHint(url),
      type: /\.m3u8(?:\?|#|$)/i.test(url) ? "m3u8" : "mp4",
      quality: "Auto",
      headers: __spreadProps(__spreadValues({}, SITE_HEADERS2), { Referer: `${origin}/` }),
      subtitles
    }));
  });
}
function resolveTarget(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    const type = mediaType === "tv" ? "tv" : "movie";
    const info = yield getTmdbInfo(tmdbId, type);
    const targets = [...new Set([info.turkishTitle, info.title, info.originalTitle].filter(Boolean))];
    if (!targets.length)
      return null;
    const domains = yield getDomainCandidates("dizipal", DOMAIN_CANDIDATES);
    for (const domain of domains) {
      const items = yield findContent(domain, targets, info.year, info.imdbId, type);
      for (const item of items.slice(0, 5)) {
        try {
          const pageUrl = type === "tv" ? yield buildEpisodeUrl(domain, item, season || 1, episode || 1) : `${domain}${contentPath(item, type)}`;
          if (!pageUrl)
            continue;
          const streams = yield resolveEpisodePage(pageUrl, `${domain}/`);
          if (streams.length) {
            return {
              title: `${itemTitle(item) || info.title}${type === "tv" ? ` S${season}E${episode}` : ""}`,
              streams
            };
          }
        } catch (e) {
        }
      }
    }
    return null;
  });
}
function getStreams(tmdbId, mediaType = "movie", season = 1, episode = 1) {
  return __async(this, null, function* () {
    try {
      const resolved = yield resolveTarget(tmdbId, mediaType, season, episode);
      if (!resolved)
        return [];
      return resolved.streams.map((stream) => ({
        name: `Dizipal \u2022 ${stream.quality}`,
        title: resolved.title,
        url: maybeEmbedSubsUrl(stream.url, stream.subtitles),
        quality: stream.quality,
        headers: stream.headers,
        provider: "dizipal",
        type: stream.type,
        subtitles: stream.subtitles
      }));
    } catch (e) {
      return [];
    }
  });
}
function getSubtitles(tmdbId, mediaType = "movie", season = 1, episode = 1) {
  return __async(this, null, function* () {
    try {
      const resolved = yield resolveTarget(tmdbId, mediaType, season, episode);
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
