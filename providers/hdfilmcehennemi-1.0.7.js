/**
 * hdfilmcehennemi-1.0.7 - Built from src/hdfilmcehennemi/
 * Generated: 2026-09-02T13:31:38.184Z
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
var ROMAN_NUMERAL_MAP = {
  ii: "2",
  iii: "3",
  iv: "4",
  v: "5",
  vi: "6",
  vii: "7",
  viii: "8",
  ix: "9"
};
function normalizeTitleText(value) {
  return asciiFold(value).toLowerCase().replace(/\b(viii|vii|vi|iv|iii|ii|ix|v)\b/g, (_, roman) => ROMAN_NUMERAL_MAP[roman] || roman);
}
function normalizeTitle(value) {
  return normalizeTitleText(value).replace(/[^a-z0-9]/g, "");
}
function tokenizeTitle(value) {
  return normalizeTitleText(value).replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
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
function searchTitleVariants(targets) {
  const result = [];
  const add = (value) => {
    const text = String(value || "").trim();
    if (text && !result.includes(text))
      result.push(text);
  };
  for (const target of targets || []) {
    const text = String(target || "").trim();
    add(text);
    add(text.replace(/\b2\b/g, "II"));
    add(text.replace(/\bII\b/gi, "2"));
    add(text.replace(/\b3\b/g, "III"));
    add(text.replace(/\bIII\b/gi, "3"));
    add(text.replace(/\b4\b/g, "IV"));
    add(text.replace(/\bIV\b/gi, "4"));
    add(text.replace(/\b5\b/g, "V"));
    add(text.replace(/\bV\b/gi, "5"));
    add(text.replace(/\b6\b/g, "VI"));
    add(text.replace(/\bVI\b/gi, "6"));
    add(text.replace(/\b7\b/g, "VII"));
    add(text.replace(/\bVII\b/gi, "7"));
    add(text.replace(/\b8\b/g, "VIII"));
    add(text.replace(/\bVIII\b/gi, "8"));
    add(text.replace(/\b9\b/g, "IX"));
    add(text.replace(/\bIX\b/gi, "9"));
  }
  return result;
}

// src/hdfilmcehennemi/constants.js
var DOMAIN_CANDIDATES = [
  "https://www.hdfilmcehennemi.nl",
  "https://hdfilmcehennemi.nl",
  "https://hdfilmcehennemini.com",
  "https://www.hdfilmcehennemini.com",
  "https://www.hdfilmcehennemi.ws",
  "https://hdfilmcehennemi.ws"
];
var SITE_HEADERS2 = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8"
};

// src/hdfilmcehennemi/index.js
var REQUEST_TIMEOUT_MS = 7e3;
var SEARCH_TIMEOUT_MS = 5e3;
var CHILD_RESOLVE_TIMEOUT_MS = 7e3;
var RESOLVE_TIMEOUT_MS = 25e3;
function htmlUnescape(value) {
  return String(value || "").replace(/&quot;/gi, '"').replace(/&#34;/gi, '"').replace(/&#x27;|&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&amp;/gi, "&");
}
function stripTags(value) {
  return htmlUnescape(String(value || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
function originOf(url) {
  const match = String(url || "").match(/^(https?:\/\/[^/]+)/i);
  return match ? match[1] : "";
}
function absoluteUrl(value, base) {
  const raw = htmlUnescape(String(value || "").trim()).replace(/\\\//g, "/");
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
function siteHost(url) {
  return originOf(url).replace(/^https?:\/\//i, "").replace(/^www\./i, "").toLowerCase();
}
function sameSiteHost(left, right) {
  return siteHost(left) === siteHost(right);
}
function isContentPageUrl(url, domain, includeEpisodes = false) {
  if (!/^https?:\/\//i.test(String(url || "")) || !sameSiteHost(url, domain))
    return false;
  const match = String(url).match(/^https?:\/\/[^/]+(\/[^?#]*)?/i);
  const path = (match && match[1] || "/").replace(/\/+$/, "") || "/";
  if (path === "/" || /\.(?:css|js|json|xml|jpg|jpeg|png|gif|webp|svg|ico|woff2?)(?:$|[?#])/i.test(path))
    return false;
  if (/^\/(?:search|wp-json|feed|category|tag|page|author|iletisim|contact|giris|login|register|uyelik|wp-admin|populer-filmler|en-cok-izlenen|imdb-en-iyiler|film-arsivi|turkce-altyazili|turkce-dublaj|film-turleri|yabancidiziizle)(?:\/|$)/i.test(path))
    return false;
  if (!includeEpisodes && /\/(?:sezon|bolum)(?:[-_/]|$)/i.test(path))
    return false;
  return true;
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
function extractAnchors(html, base, includeEpisodes = false) {
  const result = [], seen = /* @__PURE__ */ new Set();
  const re = /<a\b([^>]+)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(String(html || ""))) !== null) {
    const href = (match[1].match(/\bhref\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!href)
      continue;
    const url = absoluteUrl(href, base);
    if (!isContentPageUrl(url, base, includeEpisodes))
      continue;
    const clean = url.split("#")[0];
    if (seen.has(clean))
      continue;
    seen.add(clean);
    result.push({ url: clean, title: stripTags(match[2]) });
  }
  return result;
}
function extractPlayerFrames(html, base) {
  const result = [], seen = /* @__PURE__ */ new Set();
  const re = /<(?:iframe|frame|video|embed|object|source)\b([^>]*)>/gi;
  let match;
  while ((match = re.exec(normalizeMediaText(html))) !== null) {
    const attrs = match[1] || "";
    const attrRe = /\b(?:src|data|data-src|data-iframe|data-embed|data-url|data-player|data-href|data-video_url|data-video-url|data-source|data-file|contentUrl)\s*=\s*(["'])([\s\S]*?)\1/gi;
    let attr;
    while ((attr = attrRe.exec(attrs)) !== null) {
      const url = absoluteUrl(attr[2] || attr[1], base);
      if (!/^https?:\/\//i.test(url) || seen.has(url))
        continue;
      seen.add(url);
      result.push(url);
    }
  }
  return result;
}
function extractPlayerLinks(html, base) {
  const result = [], seen = /* @__PURE__ */ new Set();
  const re = /<a\b([^>]*)>/gi;
  let match;
  while ((match = re.exec(normalizeMediaText(html))) !== null) {
    const attrs = match[1] || "";
    const href = (attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i) || [])[1] || "";
    if (!href || !/(?:rapidrame|vidmoly|yabancidizim|rplayer|playerr|closeload|hdfilmcehennemi\.mobi|\/embed\/|\/player\/|\/video\/embed\/)/i.test(href))
      continue;
    const url = absoluteUrl(href, base);
    if (!/^https?:\/\//i.test(url) || seen.has(url))
      continue;
    seen.add(url);
    result.push(url);
  }
  return result;
}
function extractVideoEndpointUrls(html, pageUrl) {
  const result = [], seen = /* @__PURE__ */ new Set();
  const origin = originOf(pageUrl);
  const re = /<[a-z][\w:-]*\b([^>]*)>/gi;
  let match;
  while ((match = re.exec(normalizeMediaText(html))) !== null) {
    const attrs = match[1] || "";
    const value = (attrs.match(/\b(?:data-video|data-video_url|data-video-url|data-source|data-file|data-url|data-player|data-embed|data-iframe|contentUrl)\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!value)
      continue;
    const raw = /^https?:\/\//i.test(value) || /^\//.test(value) ? value : `${origin}/video/${encodeURIComponent(value)}/`;
    const url = absoluteUrl(raw, origin);
    if (!/^https?:\/\//i.test(url) || seen.has(url))
      continue;
    seen.add(url);
    result.push(url);
  }
  return result;
}
function jsonSearchRows(text) {
  try {
    const rows = JSON.parse(text);
    if (!Array.isArray(rows))
      return [];
    return rows.map((row) => {
      var _a;
      return {
        url: row.url || row.link || "",
        title: stripTags(((_a = row.title) == null ? void 0 : _a.rendered) || row.title || row.name || "")
      };
    });
  } catch (e) {
    return [];
  }
}
function ajaxSearchRows(text, base) {
  try {
    const data = JSON.parse(text);
    if (!Array.isArray(data == null ? void 0 : data.results))
      return [];
    return data.results.map((fragment) => {
      const html = String(fragment || "");
      const href = (html.match(/\bhref\s*=\s*["']([^"']+)["']/i) || [])[1] || "";
      const title = stripTags((html.match(/<h4[^>]*class=["'][^"']*title[^"']*["'][^>]*>([\s\S]*?)<\/h4>/i) || [])[1]) || stripTags((html.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i) || [])[1]) || ((html.match(/\b(?:alt|data-title|title)\s*=\s*["']([^"']+)["']/i) || [])[1] || "");
      return { url: absoluteUrl(href, base), title };
    });
  } catch (e) {
    return [];
  }
}
function candidateYearMatches(row, year) {
  const wanted = Number(String(year || "").slice(0, 4));
  if (!Number.isInteger(wanted) || wanted < 1900 || wanted > 2100)
    return true;
  const text = `${row && row.title || ""} ${row && row.url || ""}`;
  const years = (text.match(/\b(?:19|20)\d{2}\b/g) || []).map(Number);
  return !years.length || years.some((value) => Math.abs(value - wanted) <= 1);
}

function searchDomain(domain, targets, year) {
  return __async(this, null, function* () {
    const rows = [], seen = /* @__PURE__ */ new Set();
    const queries = searchTitleVariants(targets).slice(0, 6);
    const jobs = [];
    for (const query of queries) {
      const encoded = encodeURIComponent(query);
      const endpoints = [
        { url: domain + "/search/?q=" + encoded, kind: "ajax" },
        { url: domain + "/arama/?s=" + encoded, kind: "html" },
        { url: domain + "/?s=" + encoded, kind: "html" },
        { url: domain + "/?search=" + encoded, kind: "html" },
        { url: domain + "/wp-json/wp/v2/search?search=" + encoded + "&per_page=20", kind: "json" }
      ];
      for (const endpoint of endpoints) {
        jobs.push(withTimeout(requestText(endpoint.url, {
          timeout: SEARCH_TIMEOUT_MS,
          headers: {
            Accept: endpoint.kind === "html" ? "text/html,application/xhtml+xml,*/*;q=0.8" : "application/json,text/html,*/*;q=0.8",
            "X-Requested-With": endpoint.kind === "ajax" ? "fetch" : undefined,
            Referer: domain + "/"
          }
        }), SEARCH_TIMEOUT_MS, endpoint.url).then((body) => {
          if (endpoint.kind === "ajax") return ajaxSearchRows(body, domain);
          if (endpoint.kind === "json") return jsonSearchRows(body);
          return extractAnchors(body, domain);
        }).catch(() => []));
      }
    }
    const groups = yield Promise.all(jobs);
    for (const group of groups) {
      for (const row of group || []) {
        const url = absoluteUrl(row.url, domain);
        if (!isContentPageUrl(url, domain)) continue;
        const title = row.title || url.split("/").filter(Boolean).pop().replace(/[-_]+/g, " ");
        if (!titlesMatch(title, targets) && !titlesMatch(url, targets)) continue;
        if (!candidateYearMatches({ title, url }, year)) continue;
        const key = url.split("#")[0];
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({ url: key, title });
      }
    }
    rows.sort((a,b)=>scoreCandidate(b,targets,year)-scoreCandidate(a,targets,year));
    return rows;
  });
}

function hdfSlug(value) {
  return asciiFold(String(value || "")).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function directHdfPageCandidates(domain, targets, year) {
  const result = [], seen = /* @__PURE__ */ new Set();
  for (const target of searchTitleVariants(targets).slice(0, 6)) {
    const slug = hdfSlug(target);
    if (!slug) continue;
    const bases = [slug];
    const wantedYear = String(year || "").match(/\d{4}/);
    if (wantedYear && !new RegExp("(^|-)" + wantedYear[0] + "($|-)").test(slug))
      bases.push(slug + "-" + wantedYear[0]);
    for (const base of bases) {
      for (const path of ["/" + base + "/", "/film/" + base + "/", "/filmler/" + base + "/"]) {
        const url = domain.replace(/\/+$/, "") + path;
        if (seen.has(url)) continue;
        seen.add(url);
        result.push({ url, title: target });
      }
    }
  }
  return result;
}
function scoreCandidate(row, targets, year) {
  const text = `${row.title} ${row.url}`;
  const exact = targets.map(normalizeTitle).filter(Boolean).some((value) => normalizeTitle(row.title) === value);
  const loose = titlesMatch(text, targets);
  const wanted = String(year || "").slice(0, 4);
  const yearBoost = wanted && text.includes(wanted) ? 2 : 0;
  return (exact ? 8 : loose ? 3 : 0) + yearBoost;
}
function episodeUrlFromSeries(html, domain, season, episode) {
  var _a;
  const links = extractAnchors(html, domain, true);
  const seasonNo = Number(season), episodeNo = Number(episode);
  const legacy = links.find((row) => {
    const match = row.url.match(/(?:^|[\/_-])(\d+)-sezon-(\d+)-bolum(?:[\/_-]|$)/i);
    return match && Number(match[1]) === seasonNo && Number(match[2]) === episodeNo;
  });
  if (legacy)
    return legacy.url;
  const wanted = new RegExp(`(?:sezon[-_/]?${Number(season)}[^a-z0-9]+bolum[-_/]?${Number(episode)}|s0?${Number(season)}[^a-z0-9]*b0?${Number(episode)})(?:[^0-9]|$)`, "i");
  return ((_a = links.find((row) => wanted.test(row.url) || wanted.test(row.title))) == null ? void 0 : _a.url) || "";
}
function pageForTarget(candidate, domain, mediaType, season, episode) {
  return __async(this, null, function* () {
    if (mediaType !== "tv")
      return candidate.url;
    let seriesHtml;
    try {
      seriesHtml = yield requestText(candidate.url, { headers: { Referer: `${domain}/` } });
    } catch (e) {
      return "";
    }
    const found = episodeUrlFromSeries(seriesHtml, domain, season, episode);
    if (found)
      return found;
    const match = candidate.url.match(/\/(?:dizi|series)\/([^/?#]+)/i);
    if (!match)
      return "";
    const prefix = /\/series\//i.test(candidate.url) ? "series" : "dizi";
    return `${domain}/${prefix}/${match[1]}/sezon-${Number(season) || 1}/bolum-${Number(episode) || 1}-hd1/`;
  });
}
function mediaUrl(value, base) {
  const url = absoluteUrl(String(value || "").replace(/\\u0026/g, "&"), base);
  if (!/^https?:\/\//i.test(url))
    return "";
  return url;
}

var AD_MEDIA_URL_RE = /(?:^|[./?&#_=:\-])(?:ad|ads|advert|advertisement|banner|commercial|promo|preview|trailer|teaser|bumper|preroll|pre-roll|interstitial|sponsor|reklam|reklamlar|binomoreklam|advid|advidprox|luxbet|peacock|casino|betting|countdown|splash|watermark|logo)(?:[./?&#_=:\-]|$)/i;
var MIN_EPISODE_BYTES = 8 * 1024 * 1024;
function isAdMediaUrl(url) {
  return AD_MEDIA_URL_RE.test(String(url || ""));
}
function normalizeMediaText(html) {
  let text = String(html || "");
  try {
    const data = JSON.parse(text);
    if (data && typeof data === "object") {
      const nested = data.data;
      text += `\n${data.html || ""}\n${typeof nested === "string" ? nested : ""}\n${data.content || ""}`;
      if (nested && typeof nested === "object") {
        text += `\n${nested.html || ""}\n${nested.content || ""}\n${typeof nested.data === "string" ? nested.data : ""}`;
      }
    }
  } catch (e) {
  }
  return text.replace(/\\u003c/gi, "<").replace(/\\u003e/gi, ">").replace(/\\u0022/gi, '"').replace(/\\u0027/gi, "'").replace(/\\u0026/gi, "&").replace(/\\u002f/gi, "/").replace(/\\u([0-9a-f]{4})/gi, (_, code) => String.fromCharCode(parseInt(code, 16))).replace(/\\x([0-9a-f]{2})/gi, (_, code) => String.fromCharCode(parseInt(code, 16))).replace(/\\\//g, "/").replace(/\\"/g, '"').replace(/\\'/g, "'");
}
function mediaScore(url) {
  const value = String(url || "");
  if (isAdMediaUrl(value))
    return -1000;
  let score = 0;
  if (/\.m3u8(?:[?#]|$)|\/(?:hls|playlist|stream)(?:[/?#]|$)/i.test(value))
    score += 100;
  if (/\.mp4(?:[?#]|$)/i.test(value))
    score += 60;
  if (/\/(?:playlist|stream|video)(?:[/?#]|$)/i.test(value))
    score += 20;
  if (/(?:episode|bolum|season|sezon|series|dizi|movie|film)/i.test(value))
    score += 5;
  return score;
}
function sortMediaUrls(urls) {
  const result = [], seen = /* @__PURE__ */ new Set();
  for (const value of urls || []) {
    const url = String(value || "");
    if (!/^https?:\/\//i.test(url) || isAdMediaUrl(url) || seen.has(url))
      continue;
    seen.add(url);
    result.push(url);
  }
  result.sort((a, b) => mediaScore(b) - mediaScore(a));
  return result;
}

function hdfIsHlsUrl(url) {
  const value = String(url || "");
  return /\.m3u8(?:[?#]|$)/i.test(value) ||
    /[?&](?:ext|type|format|mime)=?(?:video\.)?m3u8/i.test(value) ||
    /\/(?:hls|playlist|manifest|stream)(?:[/?#]|$)/i.test(value) ||
    /(?:^|[?&])(?:stream|source|format|type)=hls(?:[&#]|$)/i.test(value);
}
function hdfIsDirectMediaUrl(url) {
  const value = String(url || "");
  if (!/^https?:\/\//i.test(value) || isAdMediaUrl(value) || isPlayerEndpointUrl(value))
    return false;
  return hdfIsHlsUrl(value) || /\.(?:mp4|mkv|webm)(?:[?#]|$)/i.test(value) ||
    /\/(?:media|file|download)(?:[/?#]|$)/i.test(value);
}
function hdfExtractCloseLoadMedia(html, base) {
  const result = [], seen = /* @__PURE__ */ new Set();
  const add = (raw) => {
    const url = mediaUrl(raw, base);
    if (!url || seen.has(url) || isAdMediaUrl(url)) return;
    if (!/close(?:load)?/i.test(url) && !hdfIsDirectMediaUrl(url)) return;
    seen.add(url);
    result.push(url);
  };
  const source = normalizeMediaText(html);
  const patterns = [
    /(?:data-(?:video[_-]?url|source|file|url)|contentUrl)\s*=\s*["']([^"']+)["']/gi,
    /<(?:iframe|frame|embed)\b[^>]*(?:src|data-src|data-url)\s*=\s*["']([^"']*(?:close(?:load)?)[^"']*)["']/gi
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source)) !== null) add(match[1]);
  }
  return result;
}
function hdfRouterUrl(pageUrl) {
  try {
    const url = new URL(pageUrl);
    url.searchParams.set("router", "1");
    return url.href;
  } catch (e) {
    return String(pageUrl || "");
  }
}
function requestHdfPageHtml(pageUrl, referer) {
  return __async(this, arguments, function* () {
    const variants = [...new Set([hdfRouterUrl(pageUrl), pageUrl].filter(Boolean))];
    let fallback = "";
    for (const candidate of variants) {
      try {
        const html = yield requestText(candidate, { headers: { Referer: referer || "" } });
        if (!fallback) fallback = html;
        if (candidate === pageUrl || /(?:data-video|contentUrl|m3u8|mp4|closeload|close-load|iframe|player)/i.test(html))
          return html;
      } catch (e) {
      }
    }
    return fallback;
  });
}

function directMediaUrls(html, base) {
  const result = [], seen = /* @__PURE__ */ new Set();
  const text = normalizeMediaText(html);
  const add = (value) => {
    const url = mediaUrl(value, base);
    if (!url || !hdfIsDirectMediaUrl(url) || seen.has(url)) return;
    seen.add(url);
    result.push(url);
  };
  const patterns = [
    /(?:file|src|source|url|contentUrl|hls|playlist|video_url|video-url|videoUrl|stream_url|data-video_url|data-source)\s*["']?\s*[:=]\s*["']([^"']+)["']/gi,
    /(?:data-(?:src|url|file|video|video_url|video-url|stream|source)|data-litespeed-src)\s*=\s*["']([^"']+)["']/gi,
    /(?:(?:https?:)?\/\/)[^"'\\\s<>]+(?:\.(?:m3u8|mp4|mkv|webm)(?:[?#][^"'\\\s<>]*)?|\/(?:hls|playlist|manifest|stream)(?:[/?#][^"'\\\s<>]*)?)/gi
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) add(match[1] || match[0]);
  }
  return sortMediaUrls(result);
}

function responseHeader(response, name) {
  try {
    return response && response.headers && typeof response.headers.get === "function" ?
      String(response.headers.get(name) || "") : "";
  } catch (e) {
    return "";
  }
}
function responseTotalBytes(response) {
  const range = responseHeader(response, "content-range").match(/\/([0-9]+)\s*$/);
  if (range)
    return Number(range[1]);
  const length = Number(responseHeader(response, "content-length"));
  return isFinite(length) && length > 0 ? length : 0;
}
function responseLooksLikeVideo(response) {
  const type = responseHeader(response, "content-type");
  return !type || /(?:^|\/)video\//i.test(type) || /application\/(?:octet-stream|mp4|vnd\.apple\.mpegurl|x-mpegurl)/i.test(type);
}
function assessMediaResponse(url, response) {
  if (!response || response.status && response.status >= 400)
    return null;
  if (!responseLooksLikeVideo(response))
    return false;
  const total = responseTotalBytes(response);
  if (/\.mp4(?:[?#]|$)/i.test(url) && total && total < MIN_EPISODE_BYTES)
    return false;
  return true;
}
function probeHlsUrl(url, referer) {
  return fetch(url, {
    method: "GET",
    headers: __spreadProps(__spreadValues({}, SITE_HEADERS2), {
      Accept: "application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*;q=0.8",
      Referer: referer || "",
      Origin: originOf(referer)
    }),
    signal: timeoutSignal(6e3)
  }).then((response) => {
    if (!response || response.status && response.status >= 400)
      throw new Error("HLS probe failed");
    return response.text().then((body) => {
      if (!/#EXTM3U/i.test(body))
        return false;
      let total = 0;
      const durationRe = /#EXTINF\s*:\s*([0-9]+(?:\.[0-9]+)?)/gi;
      let durationMatch;
      while ((durationMatch = durationRe.exec(String(body))) !== null)
        total += Number(durationMatch[1]) || 0;
      return total > 0 && total < 30 ? false : true;
    });
  }).catch(() => false);
}
function isPlayerEndpointUrl(url) {
  const value = String(url || "");
  const path = value.split(/[?#]/)[0];
  if (/\.(?:m3u8|mp4|mkv)$/i.test(path))
    return false;
  return /\/(?:rplayer|rapidrame|vidmoly|embed|player|playerr|watch)(?:[/?#]|$)/i.test(path) || /\/video\/embed(?:[/?#]|$)/i.test(path);
}
function probeMp4Url(url, referer) {
  const headers = __spreadProps(__spreadValues({}, SITE_HEADERS2), {
    Accept: "video/mp4,video/*;q=0.9,*/*;q=0.7",
    Referer: referer || "",
    Origin: originOf(referer)
  });
  const assess = (response) => {
    const decision = assessMediaResponse(url, response);
    if (decision === null)
      throw new Error("MP4 probe unavailable");
    return decision;
  };
  return fetch(url, {
    method: "HEAD",
    headers,
    signal: timeoutSignal(4500)
  }).then(assess).catch(() => fetch(url, {
    method: "GET",
    headers: __spreadProps(__spreadValues({}, headers), { Range: "bytes=0-0" }),
    signal: timeoutSignal(4500)
  }).then((response) => {
    const decision = assessMediaResponse(url, response);
    if (decision === null)
      throw new Error("MP4 probe unavailable");
    return decision;
  }).catch(() => false));
}
function filterMediaUrls(urls, referer) {
  const candidates = sortMediaUrls(urls);
  if (!candidates.length)
    return Promise.resolve([]);
  return Promise.all(candidates.map((url) => {
    if (isAdMediaUrl(url))
      return Promise.resolve({ url, keep: false, score: -1000 });
    const probe = hdfIsHlsUrl(url) ?
      probeHlsUrl(url, referer) : probeMp4Url(url, referer);
    return probe.then((decision) => ({ url, keep: decision === true, score: mediaScore(url) }));
  })).then((results) => results.filter((row) => row.keep).sort((a, b) => b.score - a.score).map((row) => row.url));
}
var PACKER_DIGITS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
function baseN(value, radix) {
  if (value === 0)
    return "0";
  let output = "";
  let number = value;
  while (number > 0) {
    output = PACKER_DIGITS[number % radix] + output;
    number = Math.floor(number / radix);
  }
  return output;
}
function unpackJS(payload, radix, count, dictionary) {
  const words = String(dictionary || "").split("|");
  let output = String(payload || "");
  for (let i = count - 1; i >= 0; i--) {
    if (!words[i])
      continue;
    output = output.replace(new RegExp(`\\b${baseN(i, radix)}\\b`, "g"), words[i]);
  }
  return output;
}
function rot13(value) {
  return String(value || "").replace(/[a-z]/gi, (char) => {
    const base = char <= "Z" ? 65 : 97;
    return String.fromCharCode((char.charCodeAt(0) - base + 13) % 26 + base);
  });
}
function characterUnmix(value) {
  let output = "";
  for (let i = 0; i < value.length; i++) {
    const code = (value.charCodeAt(i) - 399756995 % (i + 5) + 256) % 256;
    output += String.fromCharCode(code);
  }
  return output;
}
function decodeVariant1(value) {
  return characterUnmix(decodeBase64(rot13(value)));
}
function decodeVariant2(value) {
  return characterUnmix(rot13(decodeBase64(value)));
}
function decodeVariant3(value) {
  return characterUnmix(rot13(decodeBase64(value).split("").reverse().join("")));
}
function isValidVideoUrl(value) {
  return hdfIsDirectMediaUrl(value);
}
function decodeVideoUrl(parts) {
  const joined = parts.join("");
  const reversed = joined.split("").reverse().join("");
  for (const fn of [() => decodeVariant3(joined), () => decodeVariant1(reversed), () => decodeVariant2(reversed)]) {
    try {
      const value = fn();
      if (isValidVideoUrl(value))
        return value;
    } catch (e) {
    }
  }
  return "";
}
function base64Bytes(value) {
  const decoded = decodeBase64(String(value || "").replace(/\s+/g, ""));
  const bytes = [];
  for (let i = 0; i < decoded.length; i++)
    bytes.push(decoded.charCodeAt(i) & 255);
  return bytes;
}
function bytesText(bytes) {
  let output = "";
  for (const byte of bytes || [])
    output += String.fromCharCode(byte & 255);
  return output;
}
function rot13Bytes(bytes) {
  return (bytes || []).map((byte) => {
    if (byte >= 65 && byte <= 90)
      return (byte - 65 + 13) % 26 + 65;
    if (byte >= 97 && byte <= 122)
      return (byte - 97 + 13) % 26 + 97;
    return byte;
  });
}
function reverseBytes(bytes) {
  return [...(bytes || [])].reverse();
}
function unmixBytes(bytes) {
  let output = "";
  for (let i = 0; i < (bytes || []).length; i++) {
    const code = ((bytes[i] & 255) - 399756995 % (i + 5) + 256) % 256;
    output += String.fromCharCode(code);
  }
  return output;
}
function decodeRapidrameUrl(parts) {
  const value = (parts || []).join("");
  const reversed = value.split("").reverse().join("");
  const strategies = [
    // Rapidrame's current order: base64 -> ROT13 bytes -> reverse -> unmix.
    () => unmixBytes(reverseBytes(rot13Bytes(base64Bytes(value)))),
    // Some pages use a double-base64 payload after reversing the parts.
    () => unmixBytes(base64Bytes(bytesText(base64Bytes(reversed)))),
    // Older HDFilm player variants.
    () => unmixBytes(base64Bytes(rot13(reversed))),
    () => unmixBytes(rot13Bytes(base64Bytes(reversed))),
    () => unmixBytes(rot13Bytes(reverseBytes(base64Bytes(value)))),
    () => unmixBytes(reverseBytes(base64Bytes(rot13(value)))),
    () => unmixBytes(reverseBytes(rot13Bytes(base64Bytes(reversed))))
  ];
  for (const strategy of strategies) {
    try {
      const decoded = strategy();
      if (isValidVideoUrl(decoded))
        return decoded;
    } catch (e) {
    }
  }
  return "";
}
function decodePackedLiteral(value) {
  return String(value || "").replace(/\\u([0-9a-f]{4})/gi, (_, code) => String.fromCharCode(parseInt(code, 16))).replace(/\\x([0-9a-f]{2})/gi, (_, code) => String.fromCharCode(parseInt(code, 16))).replace(/\\\//g, "/").replace(/\\"/g, '"').replace(/\\'/g, "'");
}
function quotedArrayParts(value) {
  const result = [];
  const re = /"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)'/g;
  let match;
  while ((match = re.exec(String(value || ""))) !== null)
    result.push(decodePackedLiteral(match[1] !== void 0 ? match[1] : match[2]));
  return result;
}
function unpackEvalBodies(html) {
  const text = normalizeMediaText(html);
  const bodies = [text];
  const patterns = [
    /eval\(function\(p,a,c,k,e,d\)\{[\s\S]*?\}\('([\s\S]*?)',\s*(\d+),\s*(\d+),\s*'([^']*)'/gi,
    /eval\(function\(p,a,c,k,e,d\)\{[\s\S]*?\}\("([\s\S]*?)",\s*(\d+),\s*(\d+),\s*"([^"]*)"/gi
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      try {
        const unpacked = unpackJS(match[1], Number(match[2]), Number(match[3]), match[4]);
        if (unpacked && !bodies.includes(unpacked))
          bodies.push(unpacked);
      } catch (e) {
      }
    }
  }
  return bodies;
}
function packedMediaUrls(html) {
  const result = [], seen = /* @__PURE__ */ new Set();
  const add = (value, base) => {
    const url = mediaUrl(value, base);
    if (!url || !isValidVideoUrl(url) || seen.has(url))
      return;
    seen.add(url);
    result.push(url);
  };
  const text = normalizeMediaText(html);
  for (const body of unpackEvalBodies(text)) {
    const calls = /(?:[\w$]+\s*=\s*)?[\w$]+\s*\(\s*\[([\s\S]*?)\]\s*\)/gi;
    let call;
    while ((call = calls.exec(body)) !== null) {
      const parts = quotedArrayParts(call[1]);
      if (!parts.length)
        continue;
      add(decodeRapidrameUrl(parts), "");
      add(decodeVideoUrl(parts), "");
    }
    const fileLinks = /file_link\s*=\s*["']([^"']+)["']/gi;
    let fileLink;
    while ((fileLink = fileLinks.exec(body)) !== null)
      add(decodeRapidrameUrl([decodePackedLiteral(fileLink[1])]), "");
  }
  return sortMediaUrls(result);
}
function extractTracks(html, base) {
  const tracks = [], seen = /* @__PURE__ */ new Set();
  const re = /<track\b([^>]+)>/gi;
  let match;
  while ((match = re.exec(String(html || ""))) !== null) {
    const attrs = match[1];
    const src = (attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!src)
      continue;
    const url = absoluteUrl(src, base);
    if (!/^https?:\/\//i.test(url) || seen.has(url))
      continue;
    seen.add(url);
    const label = (attrs.match(/\blabel\s*=\s*["']([^"']+)["']/i) || [])[1] || "Altyaz\u0131";
    const lang = (attrs.match(/\bsrclang\s*=\s*["']([^"']+)["']/i) || [])[1] || "und";
    tracks.push({ url, lang, label, language: label, name: label, format: /\.srt(?:\?|$)/i.test(url) ? "srt" : "vtt" });
  }
  return tracks;
}
function expandRapidrameUrls(url, referer) {
  const result = [url], seen = /* @__PURE__ */ new Set([url]);
  const match = String(url || "").match(/[?&]rapidrame_id=([^&#]+)/i);
  if (!match)
    return result;
  let id = match[1];
  try {
    id = decodeURIComponent(id);
  } catch (e) {
  }
  for (const origin of [originOf(url), originOf(referer)]) {
    if (!origin)
      continue;
    for (const path of ["rplayer", "playerr"]) {
      const candidate = `${origin}/${path}/${id}/`;
      if (seen.has(candidate))
        continue;
      seen.add(candidate);
      result.push(candidate);
    }
  }
  return result;
}
function resolvePage(pageUrl, referer, depth = 0) {
  return __async(this, null, function* () {
    const html = yield requestHdfPageHtml(pageUrl, referer);
    const pageOrigin = originOf(pageUrl);
    const subtitles = extractTracks(html, pageOrigin);
    let urls = sortMediaUrls([.../* @__PURE__ */ new Set([
      ...directMediaUrls(html, pageOrigin),
      ...hdfExtractCloseLoadMedia(html, pageOrigin),
      ...packedMediaUrls(html)
    ])]);
    urls = yield filterMediaUrls(urls, pageUrl);
    if (urls.length)
      return urls.map((url) => ({ url, subtitles, playerOrigin: pageOrigin, playerReferer: pageUrl }));
    if (depth >= 3) return [];
    const children = [], seen = /* @__PURE__ */ new Set();
    for (const rawChild of [
      ...extractVideoEndpointUrls(html, pageUrl),
      ...extractPlayerFrames(html, pageOrigin),
      ...extractPlayerLinks(html, pageOrigin),
      ...hdfExtractCloseLoadMedia(html, pageOrigin)
    ]) {
      const child = absoluteUrl(rawChild, pageOrigin);
      if (!child || seen.has(child) || child === pageUrl) continue;
      seen.add(child);
      children.push(child);
    }
    for (const child of children.slice(0, 8)) {
      try {
        const streams = yield withTimeout(resolvePage(child, pageUrl, depth + 1), CHILD_RESOLVE_TIMEOUT_MS, "HDFilmCehennemi player traversal");
        if (streams.length) return streams;
      } catch (e) {
      }
    }
    return [];
  });
}
function firstSuccessful(tasks) {
  return new Promise((resolve) => {
    if (!tasks.length) { resolve(null); return; }
    let pending = tasks.length;
    let finished = false;
    const rejected = () => {
      pending -= 1;
      if (!pending && !finished) { finished = true; resolve(null); }
    };
    for (const task of tasks) {
      Promise.resolve().then(task).then((value) => {
        if (finished) return;
        if (value) { finished = true; resolve(value); return; }
        rejected();
      }).catch(rejected);
    }
  });
}
function resolveDomainTarget(domain, targets, type, season, episode, info) {
  return __async(this, arguments, function* (domain, targets, type, season, episode, info) {
    let candidates = yield searchDomain(domain, targets, info && info.year);
    if (!candidates.length && type !== "tv")
      candidates = directHdfPageCandidates(domain, targets, info && info.year);
    for (const candidate of candidates.slice(0, 3)) {
      const pageUrl = yield pageForTarget(candidate, domain, type, season || 1, episode || 1);
      if (!pageUrl) continue;
      try {
        const streams = yield resolvePage(pageUrl, `${domain}/`);
        if (streams.length) return { title: candidate.title || info.title, streams };
      } catch (e) {
      }
    }
    return null;
  });
}
function resolveTarget(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    const type = mediaType === "tv" ? "tv" : "movie";
    const info = yield getTmdbInfo(tmdbId, type);
    const targets = [...new Set([info.turkishTitle, info.title, info.originalTitle].filter(Boolean))];
    if (!targets.length) return null;
    const domains = (yield getDomainCandidates("hdfilmcehennemi", DOMAIN_CANDIDATES)).slice(0, 3);
    const tasks = domains.map((domain) => () => resolveDomainTarget(domain, targets, type, season || 1, episode || 1, info));
    return yield firstSuccessful(tasks);
  });
}function getStreams(tmdbId, mediaType = "movie", season = 1, episode = 1) {
  return __async(this, null, function* () {
    try {
      const resolved = yield withTimeout(resolveTarget(tmdbId, mediaType, season, episode), RESOLVE_TIMEOUT_MS, "HDFilmCehennemi stream resolution");
      if (!resolved)
        return [];
      return resolved.streams.map((stream) => {
        const type = hdfIsHlsUrl(stream.url) ? "m3u8" : "mp4";
        const url = type === "m3u8" ? ensureHlsExtHint(stream.url) : stream.url;
        return {
          name: `HDFilmCehennemi \u2022 ${type.toUpperCase()}`,
          title: resolved.title,
          url: maybeEmbedSubsUrl(url, stream.subtitles),
          quality: "Auto",
          headers: __spreadProps(__spreadValues({}, SITE_HEADERS2), { Referer: stream.playerReferer || stream.playerOrigin + "/", Origin: stream.playerOrigin }),
          provider: "hdfilmcehennemi",
          type,
          subtitles: stream.subtitles
        };
      });
    } catch (e) {
      return [];
    }
  });
}
function getSubtitles(tmdbId, mediaType = "movie", season = 1, episode = 1) {
  return __async(this, null, function* () {
    try {
      const resolved = yield withTimeout(resolveTarget(tmdbId, mediaType, season, episode), RESOLVE_TIMEOUT_MS, "HDFilmCehennemi subtitle resolution");
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