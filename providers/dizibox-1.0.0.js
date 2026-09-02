/**
 * dizibox - Nuvio provider
 *
 * DiziBox episode pages expose a king.php iframe.  That page points to a
 * MolyStream embed whose HTML is encrypted with CryptoJS AES using the
 * OpenSSL salted format.  This bundle contains the small MD5/AES routines
 * needed to read that payload without Node or third-party dependencies.
 *
 * The provider makes ordinary HTTP requests only.  It does not try to bypass
 * Cloudflare, CAPTCHA, VPN/IP restrictions, or other access controls.
 */

var DEFAULT_DOMAIN = "https://www.dizibox.live";
var REGISTRY_URL = "https://raw.githubusercontent.com/aojin76/animecix-nuvio-provider/main/domains.json";
var TMDB_URL = "https://api.themoviedb.org/3";
var PROVIDER_VERSION = "1.0.0";
var DEFAULT_TMDB_API_KEY = "";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
var PAGE_HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "User-Agent": USER_AGENT
};
var API_HEADERS = {
  Accept: "application/json",
  "User-Agent": USER_AGENT
};

var tmdbCache = {};
var registryCache = null;
var registryExpiresAt = 0;

function withTimeout(promise, timeoutMs, label) {
  var timeout = Number(timeoutMs) || 15000;
  var timer = null;
  var guard = new Promise(function(_, reject) {
    timer = setTimeout(function() {
      reject(new Error("Timeout after " + timeout + "ms" + (label ? " (" + label + ")" : "")));
    }, timeout);
  });
  return Promise.race([promise, guard]).then(function(value) {
    if (timer)
      clearTimeout(timer);
    return value;
  }, function(error) {
    if (timer)
      clearTimeout(timer);
    throw error;
  });
}

function request(url, options, timeoutMs) {
  var opts = options || {};
  var headers = opts.headers || PAGE_HEADERS;
  var requestOptions = {
    method: opts.method || "GET",
    headers: headers
  };
  if (opts.body !== void 0)
    requestOptions.body = opts.body;
  return withTimeout(Promise.resolve().then(function() {
    return fetch(url, requestOptions);
  }), timeoutMs || 15000, url);
}

function fetchText(url, options, timeoutMs) {
  return request(url, options || { headers: PAGE_HEADERS }, timeoutMs || 15000).then(function(response) {
    if (!response || response.ok === false || response.status && response.status >= 400)
      throw new Error("HTTP " + (response && response.status ? response.status : "error") + " on " + url);
    return response.text();
  });
}

function fetchJson(url, options, timeoutMs) {
  return request(url, options || { headers: API_HEADERS }, timeoutMs || 15000).then(function(response) {
    if (!response || response.ok === false || response.status && response.status >= 400)
      throw new Error("HTTP " + (response && response.status ? response.status : "error") + " on " + url);
    return response.json();
  });
}

function getTmdbApiKey() {
  try {
    var settings = typeof globalThis !== "undefined" ? globalThis.SCRAPER_SETTINGS : null;
    var userKey = settings && (settings.tmdbApiKey || settings.tmdb_api_key || settings.apiKey);
    if (userKey && String(userKey).trim())
      return String(userKey).trim();
  } catch (_) {
  }
  try {
    var injected = typeof globalThis !== "undefined" ? (globalThis.TMDB_API_KEY || globalThis.__TMDB_API_KEY) : "";
    if (injected && String(injected).trim())
      return String(injected).trim();
  } catch (_) {
  }
  return DEFAULT_TMDB_API_KEY;
}

function getTmdbInfo(tmdbId, mediaType) {
  var type = mediaType === "movie" ? "movie" : "tv";
  var cacheKey = type + ":" + String(tmdbId);
  if (tmdbCache[cacheKey])
    return Promise.resolve(tmdbCache[cacheKey]);
  var empty = {
    title: "",
    originalTitle: "",
    turkishTitle: "",
    year: "",
    imdbId: null,
    seasons: [],
    tmdbId: String(tmdbId)
  };
  var key = getTmdbApiKey();
  if (!key)
    return Promise.resolve(empty);
  var url = TMDB_URL + "/" + type + "/" + encodeURIComponent(String(tmdbId)) +
    "?api_key=" + encodeURIComponent(key) + "&append_to_response=external_ids,translations";
  return fetchJson(url, { headers: API_HEADERS }, 20000).then(function(data) {
    data = data || {};
    var translations = data.translations && Array.isArray(data.translations.translations) ? data.translations.translations : [];
    var tr = null;
    for (var i = 0; i < translations.length; i++) {
      if (translations[i] && (translations[i].iso_3166_1 === "TR" || translations[i].iso_639_1 === "tr")) {
        tr = translations[i];
        break;
      }
    }
    var trData = tr && tr.data || {};
    var info = {
      title: String(data.name || data.title || data.original_name || data.original_title || ""),
      originalTitle: String(data.original_name || data.original_title || ""),
      turkishTitle: String(trData.name || trData.title || ""),
      year: String((data.first_air_date || data.release_date || "").slice(0, 4)),
      imdbId: data.external_ids && data.external_ids.imdb_id ? String(data.external_ids.imdb_id) : null,
      seasons: Array.isArray(data.seasons) ? data.seasons : [],
      tmdbId: String(tmdbId)
    };
    tmdbCache[cacheKey] = info;
    return info;
  }).catch(function() {
    return empty;
  });
}

function foldTurkish(value) {
  return String(value || "")
    .replace(/[çÇ]/g, "c")
    .replace(/[ğĞ]/g, "g")
    .replace(/[ıİ]/g, "i")
    .replace(/[öÖ]/g, "o")
    .replace(/[şŞ]/g, "s")
    .replace(/[üÜ]/g, "u")
    .replace(/[âÂ]/g, "a")
    .replace(/[îÎ]/g, "i")
    .replace(/[ûÛ]/g, "u");
}

function normalizeTitle(value) {
  return foldTurkish(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function htmlDecode(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, function(_, code) {
      var n = parseInt(code, 10);
      return n ? String.fromCharCode(n) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, function(_, code) {
      var n = parseInt(code, 16);
      return n ? String.fromCharCode(n) : "";
    });
}

function absoluteUrl(value, base) {
  var raw = htmlDecode(String(value || "").trim()).replace(/\\\//g, "/");
  if (!raw)
    return "";
  if (/^https?:\/\//i.test(raw))
    return raw;
  if (/^\/\//.test(raw))
    return "https:" + raw;
  if (raw.charAt(0) === "/") {
    var origin = originOf(base || DEFAULT_DOMAIN);
    return origin + raw;
  }
  return String(base || DEFAULT_DOMAIN).replace(/\/+$/, "") + "/" + raw.replace(/^\/+/, "");
}

function originOf(url) {
  var match = String(url || "").match(/^(https?:\/\/[^/]+)/i);
  return match ? match[1] : DEFAULT_DOMAIN;
}

function makeSlug(value, removeApostrophe) {
  var text = foldTurkish(value).toLowerCase();
  if (removeApostrophe)
    text = text.replace(/[\u0027\u2019]/g, "");
  else
    text = text.replace(/[\u0027\u2019]/g, " ");
  return text
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slugVariants(value) {
  var result = [];
  var values = [makeSlug(value, false), makeSlug(value, true)];
  for (var i = 0; i < values.length; i++) {
    if (values[i] && result.indexOf(values[i]) === -1)
      result.push(values[i]);
  }
  return result;
}

function getSlugCandidates(info) {
  var result = [];
  var targets = [info.originalTitle, info.title, info.turkishTitle];
  for (var i = 0; i < targets.length; i++) {
    var variants = slugVariants(targets[i]);
    for (var j = 0; j < variants.length; j++) {
      if (result.indexOf(variants[j]) === -1)
        result.push(variants[j]);
    }
  }
  return result.slice(0, 8);
}

function episodeUrl(domain, slug, season, episode) {
  return String(domain).replace(/\/+$/, "") + "/" + slug + "-" +
    String(parseInt(season, 10) || 1) + "-sezon-" + String(parseInt(episode, 10) || 1) + "-bolum-izle/";
}

function mergeHeaders(extra) {
  var headers = {};
  var base = PAGE_HEADERS;
  for (var key in base) {
    if (Object.prototype.hasOwnProperty.call(base, key))
      headers[key] = base[key];
  }
  var additions = extra || {};
  for (var name in additions) {
    if (Object.prototype.hasOwnProperty.call(additions, name))
      headers[name] = additions[name];
  }
  return headers;
}

function extractIframeSrc(html, matcher, base) {
  var source = String(html || "");
  var re = /<(?:iframe|frame)\b([^>]*)>/gi;
  var match;
  while ((match = re.exec(source)) !== null) {
    var attrs = match[1] || "";
    var srcMatch = attrs.match(/\b(?:src|data-src)\s*=\s*(["'])([\s\S]*?)\1/i);
    if (!srcMatch)
      continue;
    var src = htmlDecode(srcMatch[2]).replace(/\\\//g, "/");
    if (!matcher || matcher.test(src))
      return absoluteUrl(src, base);
  }
  return "";
}

function extractTracks(html, base) {
  var tracks = [];
  var seen = {};
  var re = /<track\b([^>]*)>/gi;
  var match;
  while ((match = re.exec(String(html || ""))) !== null) {
    var attrs = match[1] || "";
    var srcMatch = attrs.match(/\bsrc\s*=\s*(["'])([\s\S]*?)\1/i);
    if (!srcMatch)
      continue;
    var url = absoluteUrl(srcMatch[2], base);
    if (!url || seen[url])
      continue;
    seen[url] = true;
    var labelMatch = attrs.match(/\blabel\s*=\s*(["'])([\s\S]*?)\1/i);
    var langMatch = attrs.match(/\bsrclang\s*=\s*(["'])([\s\S]*?)\1/i);
    var label = htmlDecode(labelMatch ? labelMatch[2] : "Türkçe");
    tracks.push({
      url: url,
      lang: htmlDecode(langMatch ? langMatch[2] : /t[uü]rk|tur/i.test(label) ? "tr" : "und"),
      label: label,
      language: label,
      name: label,
      format: /\.srt(?:[?#]|$)/i.test(url) ? "srt" : "vtt"
    });
  }
  return tracks;
}

function sourceType(url) {
  var value = String(url || "");
  return /\.m3u8(?:[?#]|$)|\/hls(?:[/?#]|$)/i.test(value) ? "m3u8" : "mp4";
}

function extractMediaUrls(html, base) {
  var source = String(html || "").replace(/\\\//g, "/");
  var found = [];
  var seen = {};
  function add(raw, allowUnknownExtension) {
    var url = absoluteUrl(raw, base).replace(/\\u0026/g, "&");
    if (!/^https?:\/\//i.test(url) || seen[url])
      return;
    if (!allowUnknownExtension && !/\.(?:m3u8|mp4)(?:[?#]|$)|\/hls(?:[/?#]|$)|\/playlist(?:[/?#]|$)/i.test(url))
      return;
    seen[url] = true;
    found.push(url);
  }
  var tagRe = /<(?:source|video)\b([^>]*)>/gi;
  var tag;
  while ((tag = tagRe.exec(source)) !== null) {
    var attrs = tag[1] || "";
    var srcMatch = attrs.match(/\b(?:src|file)\s*=\s*(["'])([\s\S]*?)\1/i);
    if (srcMatch)
      add(srcMatch[2], true);
  }
  var patterns = [
    /(?:file|source|videoUrl|playlist)\s*[:=]\s*["'](https?:[^"'\\\s<>]+)["']/gi,
    /https?:\/\/[^"'\\\s<>]+\.(?:m3u8|mp4)(?:\?[^"'\\\s<>]*)?/gi
  ];
  for (var p = 0; p < patterns.length; p++) {
    var match;
    while ((match = patterns[p].exec(source)) !== null)
      add(match[1] || match[0], p === 0);
  }
  return found;
}

// --- CryptoJS-compatible OpenSSL AES passphrase decryption -----------------

function concatBytes() {
  var arrays = Array.prototype.slice.call(arguments);
  var length = 0;
  for (var i = 0; i < arrays.length; i++)
    length += arrays[i].length;
  var output = new Uint8Array(length);
  var offset = 0;
  for (var j = 0; j < arrays.length; j++) {
    output.set(arrays[j], offset);
    offset += arrays[j].length;
  }
  return output;
}

function utf8Bytes(value) {
  var output = [];
  var text = String(value || "");
  for (var i = 0; i < text.length; i++) {
    var code = text.charCodeAt(i);
    if (code >= 55296 && code <= 56319 && i + 1 < text.length) {
      var low = text.charCodeAt(++i);
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
  var output = "";
  for (var i = 0; i < bytes.length; ) {
    var first = bytes[i++];
    if (first < 128) {
      output += String.fromCharCode(first);
    } else if (first < 224 && i < bytes.length) {
      output += String.fromCharCode((first & 31) << 6 | bytes[i++] & 63);
    } else if (first < 240 && i + 1 < bytes.length) {
      output += String.fromCharCode((first & 15) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63);
    } else if (i + 2 < bytes.length) {
      var code = (first & 7) << 18 | (bytes[i++] & 63) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
      var value = code - 65536;
      output += String.fromCharCode(55296 | value >> 10, 56320 | value & 1023);
    }
  }
  return output;
}

var B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

function decodeBase64(input) {
  var text = String(input || "").replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (typeof atob === "function") {
    try {
      var decoded = atob(text);
      var bytes = new Uint8Array(decoded.length);
      for (var i = 0; i < decoded.length; i++)
        bytes[i] = decoded.charCodeAt(i);
      return bytes;
    } catch (_) {
    }
  }
  var output = [];
  var buffer = 0;
  var bits = 0;
  for (var j = 0; j < text.length; j++) {
    var value = B64_CHARS.indexOf(text.charAt(j));
    if (value < 0 || value === 64)
      continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output.push((buffer >> bits) & 255);
    }
  }
  return new Uint8Array(output);
}

function rotl32(value, bits) {
  return (value << bits | value >>> 32 - bits) >>> 0;
}

var MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
];
var MD5_K = [];
for (var md5Index = 0; md5Index < 64; md5Index++)
  MD5_K.push(Math.floor(Math.abs(Math.sin(md5Index + 1)) * 4294967296) >>> 0);

function md5Bytes(input) {
  var bitLength = input.length * 8;
  var paddedLength = Math.ceil((input.length + 9) / 64) * 64;
  var padded = new Uint8Array(paddedLength);
  padded.set(input);
  padded[input.length] = 128;
  var low = bitLength >>> 0;
  var high = Math.floor(bitLength / 4294967296) >>> 0;
  for (var i = 0; i < 4; i++) {
    padded[padded.length - 8 + i] = low >>> (i * 8) & 255;
    padded[padded.length - 4 + i] = high >>> (i * 8) & 255;
  }

  var a0 = 1732584193;
  var b0 = 4023233417;
  var c0 = 2562383102;
  var d0 = 271733878;
  for (var offset = 0; offset < padded.length; offset += 64) {
    var words = new Array(16);
    for (var w = 0; w < 16; w++) {
      var at = offset + w * 4;
      words[w] = (padded[at] | padded[at + 1] << 8 | padded[at + 2] << 16 | padded[at + 3] << 24) >>> 0;
    }
    var a = a0, b = b0, c = c0, d = d0;
    for (var k = 0; k < 64; k++) {
      var f, g;
      if (k < 16) {
        f = b & c | ~b & d;
        g = k;
      } else if (k < 32) {
        f = d & b | ~d & c;
        g = 5 * k + 1 & 15;
      } else if (k < 48) {
        f = b ^ c ^ d;
        g = 3 * k + 5 & 15;
      } else {
        f = c ^ (b | ~d);
        g = 7 * k & 15;
      }
      var next = d;
      var sum = (a + f + MD5_K[k] + words[g]) >>> 0;
      d = c;
      c = b;
      b = (b + rotl32(sum, MD5_S[k])) >>> 0;
      a = next;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }
  var result = new Uint8Array(16);
  var values = [a0, b0, c0, d0];
  for (var v = 0; v < values.length; v++) {
    result[v * 4] = values[v] & 255;
    result[v * 4 + 1] = values[v] >>> 8 & 255;
    result[v * 4 + 2] = values[v] >>> 16 & 255;
    result[v * 4 + 3] = values[v] >>> 24 & 255;
  }
  return result;
}

function evpBytesToKey(password, salt, length) {
  var output = new Uint8Array(0);
  var previous = new Uint8Array(0);
  while (output.length < length) {
    previous = md5Bytes(concatBytes(previous, password, salt));
    output = concatBytes(output, previous);
  }
  return output.slice(0, length);
}

var AES_SBOX = new Uint8Array(256);
var AES_INV_SBOX = new Uint8Array(256);
(function initAesSbox() {
  var p = 1, q = 1;
  do {
    p = p ^ p << 1 ^ (p & 128 ? 283 : 0);
    p &= 255;
    q ^= q << 1;
    q ^= q << 2;
    q ^= q << 4;
    q &= 255;
    if (q & 128)
      q ^= 9;
    function rotate(value) {
      return (value << 1 | value >>> 7) & 255;
    }
    AES_SBOX[p] = (q ^ rotate(q) ^ rotate(rotate(q)) ^ rotate(rotate(rotate(q))) ^ rotate(rotate(rotate(rotate(q)))) ^ 99) & 255;
  } while (p !== 1);
  AES_SBOX[0] = 99;
  for (var i = 0; i < 256; i++)
    AES_INV_SBOX[AES_SBOX[i]] = i;
})();

function aesMul(a, b) {
  var result = 0;
  for (var i = 0; i < 8; i++) {
    if (b & 1)
      result ^= a;
    a = (a << 1 ^ (a & 128 ? 27 : 0)) & 255;
    b >>= 1;
  }
  return result & 255;
}

function aesExpandKey(key) {
  var words = new Array(60);
  for (var i = 0; i < 8; i++)
    words[i] = [key[i * 4], key[i * 4 + 1], key[i * 4 + 2], key[i * 4 + 3]];
  var rcon = [1, 2, 4, 8, 16, 32, 64, 128, 27, 54, 108, 216, 171, 77];
  for (var j = 8; j < 60; j++) {
    var temp = words[j - 1].slice();
    if (j % 8 === 0) {
      temp = [temp[1], temp[2], temp[3], temp[0]].map(function(value) { return AES_SBOX[value]; });
      temp[0] ^= rcon[j / 8 - 1];
    } else if (j % 8 === 4) {
      temp = temp.map(function(value) { return AES_SBOX[value]; });
    }
    words[j] = words[j - 8].map(function(value, index) { return value ^ temp[index]; });
  }
  return words;
}

function aesDecryptBlock(block, words) {
  var state = Array.prototype.slice.call(block);
  function addRoundKey(round) {
    for (var column = 0; column < 4; column++) {
      for (var row = 0; row < 4; row++)
        state[row + column * 4] ^= words[round * 4 + column][row];
    }
  }
  function invShiftRows() {
    var copy = state.slice();
    for (var row = 1; row < 4; row++) {
      for (var column = 0; column < 4; column++)
        state[row + column * 4] = copy[row + (column - row + 4) % 4 * 4];
    }
  }
  function invSubBytes() {
    for (var i = 0; i < 16; i++)
      state[i] = AES_INV_SBOX[state[i]];
  }
  function invMixColumns() {
    for (var column = 0; column < 4; column++) {
      var at = column * 4;
      var s0 = state[at], s1 = state[at + 1], s2 = state[at + 2], s3 = state[at + 3];
      state[at] = aesMul(s0, 14) ^ aesMul(s1, 11) ^ aesMul(s2, 13) ^ aesMul(s3, 9);
      state[at + 1] = aesMul(s0, 9) ^ aesMul(s1, 14) ^ aesMul(s2, 11) ^ aesMul(s3, 13);
      state[at + 2] = aesMul(s0, 13) ^ aesMul(s1, 9) ^ aesMul(s2, 14) ^ aesMul(s3, 11);
      state[at + 3] = aesMul(s0, 11) ^ aesMul(s1, 13) ^ aesMul(s2, 9) ^ aesMul(s3, 14);
    }
  }
  addRoundKey(14);
  for (var round = 13; round >= 1; round--) {
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
  if (!ciphertext.length || ciphertext.length % 16 || iv.length !== 16)
    return new Uint8Array(0);
  var words = aesExpandKey(key);
  var output = new Uint8Array(ciphertext.length);
  var previous = iv;
  for (var offset = 0; offset < ciphertext.length; offset += 16) {
    var block = ciphertext.slice(offset, offset + 16);
    var plain = aesDecryptBlock(block, words);
    for (var i = 0; i < 16; i++)
      output[offset + i] = plain[i] ^ previous[i];
    previous = block;
  }
  var padding = output[output.length - 1];
  if (!padding || padding > 16)
    return new Uint8Array(0);
  for (var j = 1; j <= padding; j++) {
    if (output[output.length - j] !== padding)
      return new Uint8Array(0);
  }
  return output.slice(0, output.length - padding);
}

function decryptOpenSsl(ciphertext, password) {
  var bytes = decodeBase64(ciphertext);
  if (bytes.length < 32 || bytesToUtf8(bytes.slice(0, 8)) !== "Salted__")
    return "";
  var salt = bytes.slice(8, 16);
  var encrypted = bytes.slice(16);
  var keyIv = evpBytesToKey(utf8Bytes(password), salt, 48);
  var plain = aesCbcDecrypt(keyIv.slice(0, 32), keyIv.slice(32, 48), encrypted);
  return plain.length ? bytesToUtf8(plain) : "";
}

function decodeJsString(value) {
  var raw = String(value || "").trim();
  if (!raw)
    return "";
  if (raw.charAt(0) === '"') {
    try {
      return JSON.parse(raw);
    } catch (_) {
    }
  }
  if (raw.charAt(0) === "'" && raw.charAt(raw.length - 1) === "'")
    raw = raw.slice(1, -1);
  return raw
    .replace(/\\u([0-9a-f]{4})/gi, function(_, code) { return String.fromCharCode(parseInt(code, 16)); })
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
}

function extractEncryptedPayload(html) {
  var patterns = [
    /CryptoJS\.AES\.decrypt\s*\(\s*(["'])([\s\S]*?)\1\s*,\s*(["'])([\s\S]*?)\3\s*\)/i,
    /AES\.decrypt\s*\(\s*(["'])([\s\S]*?)\1\s*,\s*(["'])([\s\S]*?)\3\s*\)/i
  ];
  for (var i = 0; i < patterns.length; i++) {
    var match = patterns[i].exec(String(html || ""));
    if (match)
      return { ciphertext: decodeJsString(match[2]), password: decodeJsString(match[4]) };
  }
  return null;
}

function resolveEpisodePage(pageUrl, domain, season, episode, title) {
  return fetchText(pageUrl, {
    headers: mergeHeaders({ Referer: String(domain).replace(/\/+$/, "") + "/" })
  }, 8000).then(function(pageHtml) {
    var kingUrl = extractIframeSrc(pageHtml, /king\.php/i, pageUrl);
    if (!kingUrl)
      return null;
    return fetchText(kingUrl, {
      headers: mergeHeaders({ Referer: pageUrl })
    }, 10000).then(function(kingHtml) {
      var molyUrl = extractIframeSrc(kingHtml, /molystream\.org\/embed\//i, kingUrl);
      if (!molyUrl)
        return null;
      return fetchText(molyUrl, {
        headers: mergeHeaders({ Referer: kingUrl })
      }, 12000).then(function(molyHtml) {
        var payload = extractEncryptedPayload(molyHtml);
        if (!payload || !payload.ciphertext || !payload.password)
          return null;
        var decrypted = decryptOpenSsl(payload.ciphertext, payload.password);
        if (!decrypted)
          return null;
        var urls = extractMediaUrls(decrypted, originOf(molyUrl));
        var subtitles = extractTracks(decrypted, originOf(molyUrl));
        var streams = [];
        var seen = {};
        for (var i = 0; i < urls.length; i++) {
          var url = urls[i];
          if (seen[url])
            continue;
          seen[url] = true;
          var type = sourceType(url);
          streams.push({
            name: "DiziBox • " + type.toUpperCase(),
            title: title,
            url: url,
            quality: "Auto",
            size: "Unknown",
            headers: {
              "User-Agent": USER_AGENT,
              Referer: molyUrl,
              Origin: originOf(molyUrl)
            },
            provider: "dizibox",
            type: type,
            subtitles: subtitles
          });
        }
        return streams.length ? { streams: streams, subtitles: subtitles } : null;
      });
    });
  }).catch(function() {
    return null;
  });
}

function loadRegistry() {
  if (registryCache && registryExpiresAt > Date.now())
    return Promise.resolve(registryCache);
  return fetchJson(REGISTRY_URL, { headers: API_HEADERS }, 6000).then(function(data) {
    if (!data || typeof data !== "object" || !data.providers)
      throw new Error("invalid domain registry");
    registryCache = data;
    registryExpiresAt = Date.now() + 15 * 60 * 1000;
    return data;
  }).catch(function() {
    return null;
  });
}

function getDomainCandidates() {
  return loadRegistry().then(function(registry) {
    var domains = [];
    var entry = registry && registry.providers && registry.providers.dizibox;
    var remote = entry && Array.isArray(entry.domains) ? entry.domains : [];
    var all = remote.concat([DEFAULT_DOMAIN]);
    for (var i = 0; i < all.length; i++) {
      var value = String(all[i] || "").replace(/\/+$/, "");
      if (/^https?:\/\/[^/\s]+$/i.test(value) && domains.indexOf(value) === -1)
        domains.push(value);
    }
    return domains.length ? domains : [DEFAULT_DOMAIN];
  });
}

function resolveTarget(tmdbId, mediaType, season, episode) {
  return getTmdbInfo(tmdbId, mediaType).then(function(info) {
    if (!info.title && !info.originalTitle && !info.turkishTitle)
      return null;
    var slugs = getSlugCandidates(info);
    if (!slugs.length)
      return null;
    return getDomainCandidates().then(function(domains) {
      var domainIndex = 0;
      function nextDomain() {
        if (domainIndex >= domains.length)
          return Promise.resolve(null);
        var domain = domains[domainIndex++];
        var slugIndex = 0;
        function nextSlug() {
          if (slugIndex >= slugs.length)
            return nextDomain();
          var currentSlug = slugs[slugIndex++];
          var url = episodeUrl(domain, currentSlug, season || 1, episode || 1);
          var title = info.title || info.originalTitle || currentSlug;
          return resolveEpisodePage(url, domain, season || 1, episode || 1, title).then(function(result) {
            if (result && result.streams && result.streams.length)
              return { title: title, streams: result.streams, subtitles: result.subtitles || [] };
            return nextSlug();
          });
        }
        return nextSlug();
      }
      return nextDomain();
    });
  });
}

function getStreams(tmdbId, mediaType, season, episode) {
  return resolveTarget(tmdbId, mediaType || "tv", season || 1, episode || 1).then(function(result) {
    return result && result.streams ? result.streams : [];
  }).catch(function() {
    return [];
  });
}

function getSubtitles(tmdbId, mediaType, season, episode) {
  return resolveTarget(tmdbId, mediaType || "tv", season || 1, episode || 1).then(function(result) {
    return result && result.subtitles ? result.subtitles : [];
  }).catch(function() {
    return [];
  });
}

function onSettings() {
  return Promise.resolve([
    { type: "header", label: "TMDB API Anahtarı (opsiyonel)" },
    {
      type: "text",
      key: "tmdbApiKey",
      label: "Kendi TMDB API anahtarın",
      description: "Boş bırakırsan varsayılan anahtar kullanılır. Kendi TMDB v3 API anahtarını girersen bu sağlayıcı TMDB isteklerinde onu kullanır.",
      defaultValue: ""
    }
  ]);
}

module.exports = { getStreams: getStreams, getSubtitles: getSubtitles, onSettings: onSettings };
