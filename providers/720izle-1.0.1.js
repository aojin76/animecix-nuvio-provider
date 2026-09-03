/**
 * 720izle-1.0.1 - Built from src/720izle/
 * Generated: 2026-09-02T20:30:00.000Z
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
    const userKey = settings && (settings.tmdbApiKey || settings.tmdb_api_key || settings.apiKey ||
      settings.TMDB_API_KEY || settings.tmdbAccessToken || settings.tmdb_access_token || settings.tmdbToken);
    if (userKey)
      return String(userKey).trim();
  } catch (e) {
  }
  try {
    const injected = typeof globalThis !== "undefined" ? (globalThis.TMDB_API_KEY || globalThis.TMDB_ACCESS_TOKEN ||
      globalThis.TMDB_API_ACCESS_TOKEN || globalThis.__TMDB_API_KEY) : "";
    if (injected)
      return String(injected).trim();
  } catch (e) {
  }
  return DEFAULT_TMDB_API_KEY;
}
function isTmdbAccessToken(value) {
  return /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(String(value || ""));
}
function tmdbApiKeySettingsLayout() {
  return [
    { type: "header", label: "TMDB API Anahtarı (opsiyonel)" },
    {
      type: "text",
      key: "tmdbApiKey",
      label: "Kendi TMDB API anahtarın",
      description: "İsteğe bağlıdır. Anahtar girilirse TMDB API kullanılır; boş bırakılırsa herkese açık TMDB sayfasından başlık/yıl okunur.",
      defaultValue: ""
    }
  ];
}
function fetchJson(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const _a = options, { timeout = DEFAULT_TIMEOUT_MS } = _a, rest = __objRest(_a, ["timeout"]);
    return yield withTimeout((() => __async(this, null, function* () {
      const response = yield fetch(url, __spreadValues({ signal: timeoutSignal(timeout) }, rest));
      if (!response.ok)
        throw new Error("HTTP " + response.status + " on " + url);
      return yield response.json();
    }))(), timeout, url);
  });
}
function tmdbPublicTitle(html) {
  const source = String(html || "");
  const patterns = [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (!match || !match[1])
      continue;
    const title = String(match[1]).replace(/&amp;/gi, "&").replace(/&#39;|&apos;/gi, "'").replace(/\s*(?:\||-|—)\s*The Movie Database.*$/i, "").trim();
    if (title)
      return title;
  }
  return "";
}
function tmdbPublicInfo(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const empty = { title: "", originalTitle: "", turkishTitle: "", year: "", imdbId: null };
    const type = mediaType === "tv" ? "tv" : "movie";
    const url = "https://www.themoviedb.org/" + type + "/" + encodeURIComponent(String(tmdbId));
    try {
      const response = yield withTimeout(fetch(url, {
        headers: { Accept: "text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8" },
        signal: timeoutSignal(7000)
      }), 7500, url);
      if (!response || !response.ok)
        return empty;
      const title = tmdbPublicTitle(yield response.text());
      if (!title)
        return empty;
      const yearMatch = title.match(/\b(?:19|20)\d{2}\b/);
      return { title, originalTitle: title, turkishTitle: "", year: yearMatch ? yearMatch[0] : "", imdbId: null };
    } catch (e) {
      return empty;
    }
  });
}
function getTmdbInfo(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const type = mediaType === "tv" ? "tv" : "movie";
    const apiKey = getTmdbApiKey();
    return yield tmdbInfoCache.remember(
      type + ":" + tmdbId,
      () => __async(this, null, function* () {
        if (apiKey) {
          try {
            let url = "https://api.themoviedb.org/3/" + type + "/" + encodeURIComponent(String(tmdbId)) + "?append_to_response=external_ids,translations";
            const options = {};
            if (isTmdbAccessToken(apiKey))
              options.headers = { Accept: "application/json", Authorization: "Bearer " + apiKey };
            else
              url += "&api_key=" + encodeURIComponent(apiKey);
            const data = yield fetchJson(url, options);
            let turkishTitle = "";
            const translations = data && data.translations && data.translations.translations || [];
            const tr = translations.find((t) => t && (t.iso_3166_1 === "TR" || t.iso_639_1 === "tr"));
            if (tr)
              turkishTitle = tr.data && (tr.data.title || tr.data.name) || "";
            const info = {
              title: data && (data.name || data.title || data.original_title || data.original_name) || "",
              originalTitle: data && (data.original_title || data.original_name) || "",
              turkishTitle,
              year: data && (data.release_date || data.first_air_date || "").slice(0, 4) || "",
              imdbId: data && data.external_ids && data.external_ids.imdb_id || data && data.imdb_id || null
            };
            if (info.title || info.originalTitle || info.imdbId)
              return info;
          } catch (e) {
          }
        }
        return yield tmdbPublicInfo(tmdbId, type);
      }),
      30 * 60 * 1000,
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
  if (isProviderHlsUrl(value)) {
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


/* Site-specific provider implementation. */
var SITE_ID = "720izle";
var SITE_NAME = "720izle";
var PROVIDER_VERSION = "1.0.1";
var DOMAIN_CANDIDATES = ["https://720izle.com","https://www.720izle.com"];
var SITE_HEADERS2 = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache"
};
var REQUEST_TIMEOUT_MS = 9000;
var RESOLVE_TIMEOUT_MS = 32000;
var MIN_EPISODE_BYTES = 4 * 1024 * 1024;
var AD_HOST_KEYS = /* @__PURE__ */ new Set([
  "ad", "ads", "advid", "advidprox", "advert", "reklam", "reklamlar",
  "banner", "commercial", "promo", "preview", "trailer", "teaser",
  "preroll", "pre-roll", "interstitial", "sponsor", "popunder",
  "clickunder", "casino", "betting", "countdown", "splash", "watermark"
]);
var AD_MEDIA_URL_RE = /(?:^|[./?&#_=:\-])(?:ad|ads|advert|advertisement|reklam|reklamlar|banner|commercial|promo|preview|trailer|teaser|bumper|preroll|pre-roll|interstitial|sponsor|binomo|binomoreklam|advid|advidprox|adskeeper|popunder|clickunder|luxbet|peacock|casino|betting|countdown|splash|watermark|logo)(?:[./?&#_=:\-]|$)/i;

function isAdMediaUrl(url) {
  return AD_MEDIA_URL_RE.test(String(url || ""));
}


function readSiteResponseText(_0) {
  return __async(this, arguments, function* (response) {
    if (!response || !response.body || typeof response.body.getReader !== "function")
      return yield response.text();
    var reader;
    try {
      reader = response.body.getReader();
    } catch (e) {
      return yield response.text();
    }
    var decoder = typeof TextDecoder === "function" ? new TextDecoder() : null;
    var output = "";
    var total = 0;
    for (var count = 0; count < 128; count++) {
      var part;
      try {
        part = yield reader.read();
      } catch (e) {
        break;
      }
      if (!part || part.done)
        break;
      var value = part.value;
      if (typeof value === "string") {
        output += value;
        total += value.length;
      } else {
        total += value && value.length || 0;
        if (decoder)
          output += decoder.decode(value, { stream: true });
        else {
          for (var i = 0; value && i < value.length; i++)
            output += String.fromCharCode(value[i]);
        }
      }
      if (/<\/(?:html|body)>/i.test(output) || (/#EXTM3U/i.test(output) && /#EXT-X-(?:STREAM-INF|TARGETDURATION|ENDLIST)/i.test(output)) || total >= 2 * 1024 * 1024) {
        try { yield reader.cancel(); } catch (e) {}
        break;
      }
    }
    if (decoder) {
      try { output += decoder.decode(); } catch (e) {}
    }
    return output;
  });
}

function requestText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const timeout = Number(options.timeout) || REQUEST_TIMEOUT_MS;
    return yield withTimeout((() => __async(this, null, function* () {
      const headers = __spreadValues(__spreadValues({}, SITE_HEADERS2), options.headers || {});
      const response = yield fetch(url, {
        method: options.method || "GET",
        headers,
        body: options.body,
        redirect: "follow",
        signal: timeoutSignal(timeout)
      });
      if (!response || !response.ok)
        throw new Error("HTTP " + (response && response.status || 0) + " on " + url);
      return yield readSiteResponseText(response);
    }))(), timeout, url);
  });
}

function siteHtmlDecode(value) {
  var text = String(value || "");
  for (var i = 0; i < 2; i++) {
    text = text.replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#039;|&#39;/gi, "'");
    text = text.replace(/&#x([0-9a-f]+);/gi, function(_, hex) {
      return String.fromCharCode(parseInt(hex, 16));
    });
    text = text.replace(/&#([0-9]+);/g, function(_, code) {
      return String.fromCharCode(parseInt(code, 10));
    });
  }
  return text.replace(/\\u0026/gi, "&").replace(/\\\//g, "/").trim();
}

function absoluteSiteUrl(value, base) {
  var raw = siteHtmlDecode(value);
  if (!raw || /^(?:javascript|mailto|tel):/i.test(raw))
    return "";
  try {
    return new URL(raw, base || DOMAIN_CANDIDATES[0]).href;
  } catch (e) {
    if (/^https?:\/\//i.test(raw))
      return raw;
    var origin = originOf(base || DOMAIN_CANDIDATES[0]) || DOMAIN_CANDIDATES[0];
    return origin.replace(/\/+$/, "") + "/" + raw.replace(/^\/+/, "");
  }
}

function stripSiteHtml(value) {
  return siteHtmlDecode(String(value || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
}

function sitePathTitle(url) {
  try {
    var path = new URL(url).pathname.replace(/\/+$/, "").split("/").pop() || "";
    path = decodeURIComponent(path).replace(/[-_]+/g, " ");
    path = path.replace(/\b(?:fm[0-9a-z]+|i)\b/gi, " ");
    return path.replace(/\s+/g, " ").trim();
  } catch (e) {
    return "";
  }
}

function sitePageKindMatches(url) {
  var path = String(url || "");
  if (SITE_ID === "720izle")
    return /\/filmler11\//i.test(path);
  return /\/film\//i.test(path);
}

function sameSiteHost(url, domain) {
  try {
    var host = new URL(url).hostname.toLowerCase();
    var expected = new URL(domain).hostname.toLowerCase().replace(/^www\./, "");
    return host === expected || host === "www." + expected;
  } catch (e) {
    return false;
  }
}

function extractSiteLinks(html, domain) {
  var result = [];
  var seen = /* @__PURE__ */ new Set();
  var re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  var match;
  while ((match = re.exec(String(html || ""))) !== null) {
    var attrs = match[1] || "";
    var hrefMatch = attrs.match(/\b(?:href|data-href|data-url)\s*=\s*(['"])([\s\S]*?)\1/i);
    if (!hrefMatch)
      continue;
    var url = absoluteSiteUrl(hrefMatch[2], domain + "/");
    if (!url || !sameSiteHost(url, domain) || !sitePageKindMatches(url))
      continue;
    if (/(?:fragman|fragmani|trailer|oyuncular|yorum|login|register|wp-)/i.test(url))
      continue;
    var key = url.split("#")[0];
    if (seen.has(key))
      continue;
    seen.add(key);
    var titleMatch = attrs.match(/\b(?:title|aria-label)\s*=\s*(['"])([\s\S]*?)\1/i);
    var title = stripSiteHtml(titleMatch ? titleMatch[2] : match[2]) || sitePathTitle(url);
    result.push({ url: key, title: title });
  }
  return result;
}

function scoreSiteLink(item, targets, year) {
  var title = item && item.title || "";
  var score = 0;
  if (titlesMatch(title, targets))
    score += normalizeTitle(title) === normalizeTitle(targets[0]) ? 8 : 4;
  var url = String(item && item.url || "");
  if (year && new RegExp("(^|[^0-9])" + String(year) + "([^0-9]|$)").test(url))
    score += 2;
  if (SITE_ID === "filmmakinesi" && /\/film\//i.test(url))
    score++;
  if (SITE_ID === "720izle" && /\/filmler11\//i.test(url))
    score++;
  return score;
}

function searchUrlsFor(domain, query) {
  const encoded = encodeURIComponent(query);
  return [domain + "/arama/?s=" + encoded, domain + "/?s=" + encoded, domain + "/?search=" + encoded, domain + "/search/?q=" + encoded];
}

function searchDomain(domain, targets, year) {
  return __async(this, null, function* () {
    var jobs = [];
    for (var q of targets.slice(0, 2)) {
      for (var url of searchUrlsFor(domain, q).slice(0, 4)) {
        jobs.push(withTimeout(requestText(url, { headers: { Referer: domain + "/" } }), 5000, url).then(function(html) {
          return extractSiteLinks(html, domain);
        }).catch(function() {
          return [];
        }));
      }
    }
    var groups = yield Promise.all(jobs);
    var rows = [];
    var seen = /* @__PURE__ */ new Set();
    for (var group of groups) {
      for (var item of group) {
        var score = scoreSiteLink(item, targets, year);
        if (!score || seen.has(item.url))
          continue;
        seen.add(item.url);
        rows.push({ url: item.url, title: item.title, score: score });
      }
    }
    rows.sort(function(a, b) { return b.score - a.score; });
    return rows;
  });
}

function foldSiteText(value) {
  return asciiFold(String(value || "")).toLowerCase();
}

function makeSiteSlug(value) {
  var text = foldSiteText(value).replace(/&/g, " and ");
  text = text.replace(/['\u2019]/g, "").replace(/[^a-z0-9]+/g, "-");
  return text.replace(/^-+|-+$/g, "").replace(/-+/g, "-");
}

function uniqueSiteValues(values) {
  var result = [];
  var seen = /* @__PURE__ */ new Set();
  for (var value of values || []) {
    var item = String(value || "").trim();
    if (!item || seen.has(item))
      continue;
    seen.add(item);
    result.push(item);
  }
  return result;
}

function directSitePageCandidates(domain, info, mediaType, season, episode) {
  var titles = uniqueSiteValues([info && info.turkishTitle, info && info.title, info && info.originalTitle]);
  var slugs = uniqueSiteValues(titles.map(makeSiteSlug));
  var year = String(info && info.year || "").match(/\d{4}/);
  year = year ? year[0] : "";
  var s = parseInt(season, 10) || 1;
  var e = parseInt(episode, 10) || 1;
  var paths = [];
  for (var slug of slugs) {
    if (!slug)
      continue;
    var bases = [slug];
    if (year && !new RegExp("(^|-)" + year + "($|-)").test(slug))
      bases.unshift(slug + "-" + year);
    for (var base of bases) {
      if (SITE_ID === "filmmakinesi") {
        paths.push("/film/" + base + "/");
        if (mediaType === "tv") {
          paths.push("/dizi/" + base + "-sezon-" + s + "-bolum-" + e + "/");
          paths.push("/film/" + base + "-" + s + "-sezon-" + e + "-bolum/");
        }
        if (year) {
          paths.push("/film/" + base + "-fm1/");
          paths.push("/film/" + base + "-fm2/");
          paths.push("/film/" + base + "-fm3/");
          paths.push("/film/" + base + "-fm8/");
        }
      } else {
        paths.push("/filmler11/" + base + "/");
        paths.push("/filmler11/" + base + "-i/");
        if (mediaType === "tv") {
          paths.push("/filmler11/" + base + "-sezon-" + s + "-bolum-" + e + "/");
          paths.push("/filmler11/" + base + "-s" + s + "-b" + e + "/");
        }
      }
    }
  }
  return uniqueSiteValues(paths.map(function(path) { return domain.replace(/\/+$/, "") + path; }));
}

function extractSiteScx(html) {
  var text = String(html || "");
  var startAt = text.search(/\b(?:var\s+)?scx\s*=\s*\{/i);
  if (startAt < 0)
    return null;
  var start = text.indexOf("{", startAt);
  var depth = 0;
  var quote = "";
  var escaped = false;
  for (var i = start; i < text.length; i++) {
    var ch = text[i];
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
        var raw = text.slice(start, i + 1);
        try {
          return JSON.parse(raw);
        } catch (e) {
          try {
            return JSON.parse(raw.replace(/'/g, '"'));
          } catch (ignored) {
            return null;
          }
        }
      }
    }
  }
  return null;
}

function decodeProviderLink(value) {
  var raw = siteHtmlDecode(String(value || "")).replace(/\\\//g, "/").trim();
  var attempts = [];
  if (/^https?:\/\//i.test(raw))
    attempts.push(raw);
  try { attempts.push(decodeScxLink(raw)); } catch (e) {}
  try { attempts.push(decodeBase64(raw)); } catch (e) {}
  try { attempts.push(decodeBase64(rot13(raw))); } catch (e) {}
  try { attempts.push(decodeBase64(raw.split("").reverse().join(""))); } catch (e) {}
  for (var attempt of attempts) {
    var decoded = siteHtmlDecode(attempt).replace(/\\\//g, "/").trim();
    if (/^https?:\/\//i.test(decoded))
      return decoded;
  }
  return "";
}

function flattenSiteScx(scx) {
  var entries = [];
  for (var key of Object.keys(scx || {})) {
    var item = scx[key];
    if (!item || typeof item !== "object" || AD_HOST_KEYS.has(String(key).toLowerCase()))
      continue;
    var sx = item.sx && typeof item.sx === "object" ? item.sx : item;
    var label = key;
    try {
      var decodedLabel = decodeBase64(String(item.tt || ""));
      if (decodedLabel)
        label = decodedLabel;
    } catch (e) {}
    var t = sx.t;
    if (Array.isArray(t)) {
      for (var encoded of t)
        if (typeof encoded === "string")
          entries.push({ value: encoded, label: label, language: "Türkçe" });
    } else if (t && typeof t === "object") {
      for (var lang of Object.keys(t))
        if (typeof t[lang] === "string")
          entries.push({ value: t[lang], label: label, language: /tr|tur|dublaj/i.test(lang) ? "Türkçe Dublaj" : "Altyazılı" });
    }
    var p = sx.p;
    var parts = Array.isArray(p) ? p : p && typeof p === "object" ? Object.values(p) : [];
    parts.forEach(function(encoded, index) {
      if (typeof encoded === "string")
        entries.push({ value: encoded, label: label, language: "Türkçe", part: index + 1 });
    });
  }
  return entries;
}

function providerMediaType(url) {
  return isProviderHlsUrl(url) ? "m3u8" : "mp4";
}
function isProviderHlsUrl(url) {
  const value = String(url || "");
  return /\.m3u8(?:[?#]|$)/i.test(value) ||
    /[?&](?:ext|type|format|mime)=?(?:video\.)?m3u8/i.test(value) ||
    /\/(?:hls|playlist|manifest|stream)(?:[/?#]|$)/i.test(value) ||
    /(?:^|[?&])(?:stream|source|format|type)=hls(?:[&#]|$)/i.test(value);
}
function isProviderDirectMediaUrl(url) {
  const value = String(url || "");
  if (!/^https?:\/\//i.test(value) || isAdMediaUrl(value))
    return false;
  return isProviderHlsUrl(value) ||
    /\.(?:mp4|mkv|webm)(?:[?#]|$)/i.test(value) ||
    /\/(?:media|file|download)(?:[/?#]|$)/i.test(value);
}
function likelyProviderMedia(url) {
  const value = String(url || "");
  return /^https?:\/\//i.test(value) && !isAdMediaUrl(value) && (
    isProviderDirectMediaUrl(value) ||
    /(?:hotstream|rapid|close(?:load)?|trplayer|vidmoxy|filemoon|dood|streamtape|mixdrop|vidmoly|embed|player)/i.test(value)
  );
}
function extractSiteMediaUrls(html, base) {
  const result = [], seen = /* @__PURE__ */ new Set();
  const source = String(html || "").replace(/\\u0026/gi, "&").replace(/\\\//g, "/");
  const add = (raw) => {
    const decoded = siteHtmlDecode(String(raw || "")).replace(/[),;]+$/g, "").trim();
    const url = absoluteSiteUrl(decoded, base);
    if (!url || !likelyProviderMedia(url) || seen.has(url))
      return;
    seen.add(url);
    result.push(url);
  };
  const patterns = [
    /(?:(?:https?:)?\/\/)[^"'\\\s<>]+(?:\.(?:m3u8|mp4|mkv|webm)(?:[?#][^"'\\\s<>]*)?|\/(?:hls|playlist|manifest|stream)(?:[/?#][^"'\\\s<>]*)?)/gi,
    /(?:file|src|source|video_location|hls|playlist|contentUrl|video_url|stream_url)\s*["']?\s*[:=]\s*["']([^"']+)["']/gi,
    /(?:data-(?:src|url|file|video|video_url|video-url|stream|source)|data-litespeed-src)\s*=\s*["']([^"']+)["']/gi
  ];
  for (const re of patterns) {
    let match;
    while ((match = re.exec(source)) !== null)
      add(match[1] || match[0]);
  }
  return result;
}

function extractSiteFrames(html, base) {
  const result = [], seen = /* @__PURE__ */ new Set();
  const re = /<(?:iframe|frame|embed|object|video|source)\b([^>]*)>/gi;
  let match;
  while ((match = re.exec(String(html || ""))) !== null) {
    const attrs = match[1] || "";
    const srcRe = /\b(?:src|data|data-src|data-litespeed-src|data-iframe|data-embed|data-url|data-player|data-href|data-video_url|data-video-url|data-source|data-file|contentUrl)\s*=\s*(["'])([\s\S]*?)\1/gi;
    let srcMatch;
    while ((srcMatch = srcRe.exec(attrs)) !== null) {
      const url = absoluteSiteUrl(srcMatch[2], base);
      if (!url || isAdMediaUrl(url) || seen.has(url))
        continue;
      if (!/^(?:about:|javascript:|data:)/i.test(url)) {
        seen.add(url);
        result.push(url);
      }
    }
  }
  return result;
}

function extractSiteTracks(html, base) {
  var tracks = [];
  var seen = /* @__PURE__ */ new Set();
  var re = /<(?:track)\b([^>]*)>/gi;
  var match;
  while ((match = re.exec(String(html || ""))) !== null) {
    var attrs = match[1] || "";
    var src = attrs.match(/\bsrc\s*=\s*(['"])([\s\S]*?)\1/i);
    if (!src)
      continue;
    var url = absoluteSiteUrl(src[2], base);
    if (!url || seen.has(url))
      continue;
    seen.add(url);
    var label = (attrs.match(/\b(?:label|srclang)\s*=\s*(['"])([\s\S]*?)\1/i) || [])[2] || "Altyazı";
    tracks.push({ url: url, lang: label, language: label, name: label });
  }
  return tracks;
}

function collectProviderEmbeds(html, base) {
  const result = [], seen = /* @__PURE__ */ new Set();
  const add = (url, label) => {
    const value = absoluteSiteUrl(url, base);
    if (!value || isAdMediaUrl(value) || seen.has(value))
      return;
    if (!likelyProviderMedia(value) && !/^(?:https?:\/\/)?(?:www\.)?(?:hotstream|rapid|close(?:load)?|trplayer|vidmoxy|filemoon|dood|streamtape|mixdrop|vidmoly)\./i.test(value))
      return;
    seen.add(value);
    result.push({ url: value, label: label || "Embed" });
  };
  for (const url of extractSiteMediaUrls(html, base))
    add(url, "Media");
  for (const url of extractCloseLoadMedia(html, base))
    add(url, "CloseLoad");
  for (const frame of extractSiteFrames(html, base))
    add(frame, "Embed");
  const scx = extractSiteScx(html);
  for (const entry of flattenSiteScx(scx)) {
    const decoded = decodeProviderLink(entry.value);
    if (decoded)
      add(decoded, entry.label + " " + entry.language + (entry.part ? " • Part " + entry.part : ""));
  }
  return result;
}

function extractCloseLoadMedia(html, base) {
  const result = [], seen = /* @__PURE__ */ new Set();
  const add = (raw) => {
    const url = absoluteSiteUrl(raw, base);
    if (!url || isAdMediaUrl(url) || seen.has(url))
      return;
    if (!/close(?:load)?/i.test(url) && !isProviderDirectMediaUrl(url))
      return;
    seen.add(url);
    result.push(url);
  };
  const source = String(html || "").replace(/\\u0026/gi, "&").replace(/\\\//g, "/");
  const patterns = [
    /(?:data-(?:video[_-]?url|source|file|url)|contentUrl)\s*=\s*["']([^"']+)["']/gi,
    /<(?:iframe|frame|embed)\b[^>]*(?:src|data-src|data-url)\s*=\s*["']([^"']*(?:close(?:load)?)[^"']*)["']/gi
  ];
  for (const re of patterns) {
    let match;
    while ((match = re.exec(source)) !== null)
      add(match[1]);
  }
  return result;
}

/* Minimal CryptoJS-compatible AES-256-CBC path used by hotstream.club embeds. *//* Minimal CryptoJS-compatible AES-256-CBC path used by hotstream.club embeds. */
var HOT_SBOX = (function() {
  var hex = "637c777bf26b6fc53001672bfed7ab76ca82c97dfa5947f0add4a2af9ca472c0b7fd9326363ff7cc34a5e5f171d8311504c723c31896059a071280e2eb27b27509832c1a1b6e5aa0523bd6b329e32f8453d100ed20fcb15b6acbbe394a4c58cfd0efaafb434d338545f9027f503c9fa851a3408f929d38f5bcb6da2110fff3d2cd0c13ec5f974417c4a77e3d645d197360814fdc222a908846eeb814de5e0bdbe0323a0a4906245cc2d3ac629195e479e7c8376d8dd54ea96c56f4ea657aae08ba78252e1ca6b4c6e8dd741f4bbd8b8a703eb5664803f60e613557b986c11d9ee1f8981169d98e949b1e87e9ce5528df8ca1890dbfe6426841992d0fb054bb16";
  var out = [];
  for (var i = 0; i < hex.length; i += 2)
    out.push(parseInt(hex.slice(i, i + 2), 16));
  return out;
})();
var HOT_ISBOX = (function() {
  var hex = "52096ad53036a538bf40a39e81f3d7fb7ce339829b2fff87348e4344c4dee9cb547b9432a6c2233dee4c950b42fac34e082ea16628d924b2765ba2496d8bd12572f8f66486689816d4a45ccc5d65b6926c704850fdedb9da5e154657a78d9d8490d8ab008cbcd30af7e45805b8b34506d02c1e8fca3f0f02c1afbd0301138a6b3a9111414f67dcea97f2cfcef0b4e67396ac7422e7ad3585e2f937e81c75df6e47f11a711d29c5896fb7620eaa18be1bfc563e4bc6d279209adbc0fe78cd5af41fdda8338807c731b11210592780ec5f60517fa919b54a0d2de57a9f93c99cefa0e03b4dae2af5b0c8ebbb3c83539961172b047eba77d626e169146355210c7d";
  var out = [];
  for (var i = 0; i < hex.length; i += 2)
    out.push(parseInt(hex.slice(i, i + 2), 16));
  return out;
})();
var HOT_RCON = [0, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54, 108, 216, 171, 77];

function hotUtf8Bytes(value) {
  var text = String(value || "");
  var out = [];
  for (var i = 0; i < text.length; i++) {
    var code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      var next = text.charCodeAt(++i);
      code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
    }
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | code >> 6, 0x80 | code & 63);
    else if (code < 0x10000) out.push(0xe0 | code >> 12, 0x80 | code >> 6 & 63, 0x80 | code & 63);
    else out.push(0xf0 | code >> 18, 0x80 | code >> 12 & 63, 0x80 | code >> 6 & 63, 0x80 | code & 63);
  }
  return out;
}

function hotConcat() {
  var total = 0;
  for (var i = 0; i < arguments.length; i++)
    total += arguments[i].length;
  var out = new Array(total);
  var at = 0;
  for (var j = 0; j < arguments.length; j++)
    for (var k = 0; k < arguments[j].length; k++)
      out[at++] = arguments[j][k];
  return out;
}

function hotLeftRotate(value, shift) {
  return (value << shift) | (value >>> (32 - shift));
}

function hotMd5(message) {
  var a0 = 0x67452301 | 0;
  var b0 = 0xefcdab89 | 0;
  var c0 = 0x98badcfe | 0;
  var d0 = 0x10325476 | 0;
  var bitLength = message.length * 8;
  var blockCount = ((message.length + 9 + 63) >> 6) << 4;
  var words = new Array(blockCount).fill(0);
  for (var i = 0; i < message.length; i++)
    words[i >> 2] |= message[i] << ((i & 3) * 8);
  words[message.length >> 2] |= 0x80 << ((message.length & 3) * 8);
  words[blockCount - 2] = bitLength >>> 0;
  words[blockCount - 1] = Math.floor(bitLength / 0x100000000);
  var shifts = [
    [7, 12, 17, 22],
    [5, 9, 14, 20],
    [4, 11, 16, 23],
    [6, 10, 15, 21]
  ];
  var constants = [];
  for (var c = 0; c < 64; c++)
    constants[c] = Math.floor(Math.abs(Math.sin(c + 1)) * 0x100000000) >>> 0;
  for (var offset = 0; offset < blockCount; offset += 16) {
    var a = a0, b = b0, c2 = c0, d = d0;
    for (var round = 0; round < 64; round++) {
      var f, g;
      if (round < 16) {
        f = (b & c2) | (~b & d);
        g = round;
      } else if (round < 32) {
        f = (d & b) | (~d & c2);
        g = (5 * round + 1) % 16;
      } else if (round < 48) {
        f = b ^ c2 ^ d;
        g = (3 * round + 5) % 16;
      } else {
        f = c2 ^ (b | ~d);
        g = (7 * round) % 16;
      }
      f = (f + a + constants[round] + words[offset + g]) | 0;
      f = hotLeftRotate(f, shifts[round >> 4][round & 3]);
      a = d;
      d = c2;
      c2 = b;
      b = (b + f) | 0;
    }
    a0 = (a0 + a) | 0;
    b0 = (b0 + b) | 0;
    c0 = (c0 + c2) | 0;
    d0 = (d0 + d) | 0;
  }
  var output = [];
  var state = [a0, b0, c0, d0];
  for (var si = 0; si < state.length; si++)
    for (var bi = 0; bi < 4; bi++)
      output.push(state[si] >>> (bi * 8) & 255);
  return output;
}

function hotHexBytes(value) {
  var text = String(value || "").replace(/[^0-9a-f]/gi, "");
  var out = [];
  for (var i = 0; i + 1 < text.length; i += 2)
    out.push(parseInt(text.slice(i, i + 2), 16));
  return out;
}

function hotBase64Bytes(value) {
  var binary = decodeBase64(String(value || "").replace(/-/g, "+").replace(/_/g, "/"));
  var out = [];
  for (var i = 0; i < binary.length; i++)
    out.push(binary.charCodeAt(i) & 255);
  return out;
}

function hotEvpBytesToKey(password, salt, length) {
  var result = [];
  var previous = [];
  while (result.length < length)
    previous = hotMd5(hotConcat(previous, password, salt)), result = hotConcat(result, previous);
  return { key: result.slice(0, 32), iv: result.slice(32, 48) };
}

function hotGaloisMultiply(a, b) {
  var result = 0;
  while (b) {
    if (b & 1) result ^= a;
    a = (a << 1) ^ (a & 128 ? 0x11b : 0);
    b >>>= 1;
  }
  return result & 255;
}

function hotSubWord(word) {
  return (HOT_SBOX[word >>> 24] << 24 | HOT_SBOX[word >>> 16 & 255] << 16 | HOT_SBOX[word >>> 8 & 255] << 8 | HOT_SBOX[word & 255]) >>> 0;
}

function hotRotWord(word) {
  return (word << 8 | word >>> 24) >>> 0;
}

function hotAesDecryptBlock(block, key) {
  var words = new Array(60);
  for (var i = 0; i < 8; i++)
    words[i] = (key[i * 4] << 24 | key[i * 4 + 1] << 16 | key[i * 4 + 2] << 8 | key[i * 4 + 3]) >>> 0;
  for (var wi = 8; wi < 60; wi++) {
    var temp = words[wi - 1];
    if (wi % 8 === 0)
      temp = (hotSubWord(hotRotWord(temp)) ^ HOT_RCON[wi / 8] << 24) >>> 0;
    else if (wi % 8 === 4)
      temp = hotSubWord(temp);
    words[wi] = (words[wi - 8] ^ temp) >>> 0;
  }
  var state = block.slice();
  var addRoundKey = function(round) {
    for (var col = 0; col < 4; col++) {
      var word = words[round * 4 + col];
      state[col * 4] ^= word >>> 24;
      state[col * 4 + 1] ^= word >>> 16 & 255;
      state[col * 4 + 2] ^= word >>> 8 & 255;
      state[col * 4 + 3] ^= word & 255;
    }
  };
  var invSubBytes = function() {
    for (var i = 0; i < 16; i++)
      state[i] = HOT_ISBOX[state[i]];
  };
  var invShiftRows = function() {
    var copy = state.slice();
    for (var row = 0; row < 4; row++)
      for (var col = 0; col < 4; col++)
        state[col * 4 + row] = copy[((col - row + 4) % 4) * 4 + row];
  };
  var invMixColumns = function() {
    for (var col = 0; col < 4; col++) {
      var at = col * 4;
      var a = state[at], b = state[at + 1], c = state[at + 2], d = state[at + 3];
      state[at] = hotGaloisMultiply(a, 14) ^ hotGaloisMultiply(b, 11) ^ hotGaloisMultiply(c, 13) ^ hotGaloisMultiply(d, 9);
      state[at + 1] = hotGaloisMultiply(a, 9) ^ hotGaloisMultiply(b, 14) ^ hotGaloisMultiply(c, 11) ^ hotGaloisMultiply(d, 13);
      state[at + 2] = hotGaloisMultiply(a, 13) ^ hotGaloisMultiply(b, 9) ^ hotGaloisMultiply(c, 14) ^ hotGaloisMultiply(d, 11);
      state[at + 3] = hotGaloisMultiply(a, 11) ^ hotGaloisMultiply(b, 13) ^ hotGaloisMultiply(c, 9) ^ hotGaloisMultiply(d, 14);
    }
  };
  addRoundKey(14);
  for (var round = 13; round > 0; round--) {
    invShiftRows();
    invSubBytes();
    addRoundKey(round);
    invMixColumns();
  }
  invShiftRows();
  invSubBytes();
  addRoundKey(0);
  return state;
}

function hotUtf8Decode(bytes) {
  if (typeof TextDecoder === "function") {
    try { return new TextDecoder().decode(new Uint8Array(bytes)); } catch (e) {}
  }
  var binary = "";
  for (var i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i]);
  try { return decodeURIComponent(escape(binary)); } catch (e) { return binary; }
}

function hotAesDecrypt(hash, payload) {
  var parsed = JSON.parse(payload);
  var ciphertext = hotBase64Bytes(parsed.ct);
  if (!ciphertext.length || ciphertext.length % 16)
    return "";
  var salt = hotHexBytes(parsed.s || "");
  var derived = salt.length ? hotEvpBytesToKey(hotUtf8Bytes(hash), salt, 48) : { key: hotUtf8Bytes(hash).slice(0, 32), iv: hotHexBytes(parsed.iv || "") };
  if (derived.key.length !== 32 || derived.iv.length !== 16)
    return "";
  var plain = [];
  var previous = derived.iv;
  for (var offset = 0; offset < ciphertext.length; offset += 16) {
    var block = hotAesDecryptBlock(ciphertext.slice(offset, offset + 16), derived.key);
    for (var i = 0; i < 16; i++)
      plain.push(block[i] ^ previous[i]);
    previous = ciphertext.slice(offset, offset + 16);
  }
  var padding = plain[plain.length - 1];
  if (!padding || padding > 16)
    return "";
  for (var p = 1; p <= padding; p++)
    if (plain[plain.length - p] !== padding)
      return "";
  return hotUtf8Decode(plain.slice(0, plain.length - padding));
}

function extractHotstreamConfig(html) {
  var match = /bePlayer\s*\(\s*(['"])([\s\S]*?)\1\s*,\s*(['"])([\s\S]*?)\3\s*\)/i.exec(String(html || ""));
  if (!match)
    return null;
  try {
    var config = JSON.parse(hotAesDecrypt(match[2], match[4]));
    return config && typeof config === "object" ? config : null;
  } catch (e) {
    return null;
  }
}

function hotstreamSubtitleTracks(config, embedUrl) {
  var result = [];
  var seen = /* @__PURE__ */ new Set();
  var origin = originOf(embedUrl) || "https://hotstream.club";
  for (var track of Array.isArray(config && config.strSubtitles) ? config.strSubtitles : []) {
    if (!track || !track.file)
      continue;
    var url = absoluteSiteUrl(track.file, origin + "/");
    if (!url || seen.has(url))
      continue;
    seen.add(url);
    var label = String(track.label || track.language || "Türkçe").trim();
    result.push({ url: url, lang: label, language: label, name: label });
  }
  return result;
}

function hlsLooksLikeLongMedia(body) {
  var text = String(body || "");
  if (!/#EXTM3U/i.test(text))
    return false;
  if (/#EXT-X-STREAM-INF/i.test(text) || /#EXT-X-TARGETDURATION/i.test(text))
    return true;
  var duration = 0;
  var match;
  var re = /#EXTINF\s*:\s*([0-9]+(?:\.[0-9]+)?)/gi;
  while ((match = re.exec(text)) !== null)
    duration += Number(match[1]) || 0;
  return duration >= 30;
}

function resolveHotstream(embedUrl, referer, title) {
  return __async(this, null, function* () {
    var html;
    try {
      html = yield requestText(embedUrl, { timeout: 10000, headers: { Referer: referer || "" } });
    } catch (e) {
      return [];
    }
    var config = extractHotstreamConfig(html);
    var location = String(config && config.video_location || "");
    if (!/^https?:\/\//i.test(location) || isAdMediaUrl(location))
      return [];
    var playlist;
    try {
      playlist = yield requestText(location, {
        timeout: 8000,
        headers: {
          Referer: embedUrl,
          Accept: "application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*;q=0.8"
        }
      });
    } catch (e) {
      return [];
    }
    if (!hlsLooksLikeLongMedia(playlist))
      return [];
    var subtitles = hotstreamSubtitleTracks(config, embedUrl);
    return [{
      url: ensureHlsExtHint(location),
      host: "Hotstream",
      type: "m3u8",
      headers: { Referer: embedUrl, Origin: originOf(embedUrl) || "https://hotstream.club" },
      subtitles: subtitles,
      title: title || String(config && config.title || "")
    }];
  });
}

function resolveProviderFrame(url, referer, title, depth) {
  return __async(this, arguments, function* () {
    const currentDepth = Number(depth) || 0;
    if (!url || !/^https?:\/\//i.test(url) || currentDepth > 3)
      return [];
    if (isProviderDirectMediaUrl(url) && !/\/(?:embed|player|watch)(?:[/?#]|$)/i.test(url)) {
      return [{
        url,
        host: (new URL(url)).hostname.split(".")[0],
        type: providerMediaType(url),
        headers: { Referer: referer || "" },
        subtitles: []
      }];
    }
    if (/hotstream\.club/i.test(url))
      return yield resolveHotstream(url, referer, title);
    const direct = [];
    try {
      const frameHtml = yield requestText(url, { timeout: 8000, headers: { Referer: referer || "" } });
      const directUrls = [...extractSiteMediaUrls(frameHtml, url), ...extractCloseLoadMedia(frameHtml, url)];
      for (const directUrl of directUrls)
        direct.push({ url: directUrl, host: (new URL(url)).hostname.split(".")[0], type: providerMediaType(directUrl), headers: { Referer: url }, subtitles: extractSiteTracks(frameHtml, url) });
      if (direct.length)
        return direct;
      for (const nestedUrl of extractSiteFrames(frameHtml, url).slice(0, 6)) {
        const nestedStreams = yield resolveProviderFrame(nestedUrl, url, title, currentDepth + 1);
        if (nestedStreams.length)
          return nestedStreams;
      }
    } catch (e) {
    }
    try {
      const known = yield extractHost(url, referer || "");
      if (known && known.length)
        return known;
    } catch (e) {
    }
    return [];
  });
}

function resolvePage(pageUrl, domain, mediaType, season, episode, title) {
  return __async(this, null, function* () {
    var html = yield requestText(pageUrl, { timeout: REQUEST_TIMEOUT_MS, headers: { Referer: domain + "/" } });
    var embeds = collectProviderEmbeds(html, pageUrl);
    if (!embeds.length)
      return [];
    var streams = [];
    var seen = /* @__PURE__ */ new Set();
    for (var entry of embeds.slice(0, 8)) {
      var resolved = [];
      try {
        resolved = yield resolveProviderFrame(entry.url, pageUrl, title, 0);
      } catch (e) {
        resolved = [];
      }
      var candidates = [];
      for (var stream of resolved || []) {
        var streamUrl = String(stream && stream.url || "");
        if (!/^https?:\/\//i.test(streamUrl) || isAdMediaUrl(streamUrl) || seen.has(streamUrl))
          continue;
        seen.add(streamUrl);
        candidates.push({ stream: stream, url: streamUrl });
      }
      var decisions = yield Promise.all(candidates.map(function(candidate) {
        return fullHdProbeMediaUrl(candidate.url, pageUrl);
      }));
      for (var i = 0; i < candidates.length; i++) {
        if (decisions[i] !== true)
          continue;
        var item = candidates[i].stream;
        var streamUrl = candidates[i].url;
        var subtitles = Array.isArray(item.subtitles) ? item.subtitles : [];
        streams.push({
          url: ensureHlsExtHint(streamUrl),
          type: item.type || providerMediaType(streamUrl),
          quality: item.quality || "Auto",
          headers: item.headers || { Referer: pageUrl },
          subtitles: subtitles,
          name: SITE_NAME + " " + (entry.label || "Kaynak") + " • " + (item.host || "Embed")
        });
      }
    }
    return streams;
  });
}

function resolveTarget(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    var info = yield getTmdbInfo(tmdbId, mediaType === "tv" ? "tv" : "movie");
    var targets = uniqueSiteValues([info.turkishTitle, info.title, info.originalTitle]);
    if (!targets.length)
      return null;
    var domains = (yield getDomainCandidates(SITE_ID, DOMAIN_CANDIDATES)).slice(0, 3);
    for (var domain of domains) {
      var directPages = directSitePageCandidates(domain, info, mediaType, season, episode);
      var rows = yield searchDomain(domain, targets, info.year);
      var pages = uniqueSiteValues(directPages.concat(rows.slice(0, 4).map(function(row) { return row.url; })));
      for (var pageUrl of pages.slice(0, 10)) {
        try {
          var streams = yield resolvePage(pageUrl, domain, mediaType, season, episode, targets[0]);
          if (streams.length)
            return { title: targets[0], streams: streams };
        } catch (e) {}
      }
    }
    return null;
  });
}

function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      var resolved = yield withTimeout(resolveTarget(tmdbId, mediaType || "movie", season, episode), RESOLVE_TIMEOUT_MS, SITE_NAME + " stream resolution");
      if (!resolved)
        return [];
      return resolved.streams.map(function(stream) {
        return {
          name: stream.name,
          title: resolved.title,
          url: maybeEmbedSubsUrl(stream.url, stream.subtitles),
          quality: stream.quality,
          headers: stream.headers,
          provider: SITE_ID,
          type: stream.type,
          subtitles: stream.subtitles
        };
      });
    } catch (e) {
      return [];
    }
  });
}

function getSubtitles(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      var resolved = yield withTimeout(resolveTarget(tmdbId, mediaType || "movie", season, episode), RESOLVE_TIMEOUT_MS, SITE_NAME + " subtitle resolution");
      var result = [];
      var seen = /* @__PURE__ */ new Set();
      for (var stream of resolved && resolved.streams || []) {
        for (var subtitle of stream.subtitles || []) {
          if (!subtitle || !subtitle.url || seen.has(subtitle.url))
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