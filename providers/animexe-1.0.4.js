/**
 * animexe - Nuvio provider
 *
 * Animexe exposes a small JSON title-suggest endpoint and embeds the playable
 * MP4/HLS URLs in the watch page.  This bundle intentionally uses only fetch
 * and standard JavaScript APIs so it can run in Nuvio's local scraper runtime.
 */

var BASE_URL = "https://animexe.com";
var TMDB_URL = "https://api.themoviedb.org/3";
var REGISTRY_URL = "https://raw.githubusercontent.com/aojin76/animecix-nuvio-provider/main/domains.json";
var PROVIDER_VERSION = "1.0.4";
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
  if (typeof setTimeout !== "function")
    return Promise.resolve(promise);
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
    var userKey = settings && (settings.tmdbApiKey || settings.tmdb_api_key || settings.apiKey ||
      settings.TMDB_API_KEY || settings.tmdbAccessToken || settings.tmdb_access_token || settings.tmdbToken);
    if (userKey && String(userKey).trim())
      return String(userKey).trim();
  } catch (_) {
  }
  try {
    var injected = typeof globalThis !== "undefined" ? (globalThis.TMDB_API_KEY || globalThis.TMDB_ACCESS_TOKEN ||
      globalThis.TMDB_API_ACCESS_TOKEN || globalThis.__TMDB_API_KEY) : "";
    if (injected && String(injected).trim())
      return String(injected).trim();
  } catch (_) {
  }
  return DEFAULT_TMDB_API_KEY;
}

function isTmdbAccessToken(value) {
  return /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(String(value || ""));
}

function tmdbRequest(type, tmdbId, key) {
  var url = TMDB_URL + "/" + type + "/" + encodeURIComponent(String(tmdbId)) +
    "?append_to_response=external_ids,translations";
  var headers = API_HEADERS;
  if (isTmdbAccessToken(key)) {
    headers = {
      Accept: API_HEADERS.Accept,
      Authorization: "Bearer " + String(key),
      "User-Agent": USER_AGENT
    };
  } else {
    url += "&api_key=" + encodeURIComponent(String(key));
  }
  return { url: url, headers: headers };
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
    seasons: []
  };
  var key = getTmdbApiKey();
  if (!key) {
    try { console.log("[Animexe] TMDB anahtarı eksik; provider ayarlarından tmdbApiKey girin"); } catch (_) {
    }
    return Promise.resolve(empty);
  }
  var requestInfo = tmdbRequest(type, tmdbId, key);
  return fetchJson(requestInfo.url, { headers: requestInfo.headers }, 20000).then(function(data) {
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
    .replace(/[ûÛ]/g, "u")
    .replace(/[āĀ]/g, "a")
    .replace(/[ēĒ]/g, "e")
    .replace(/[īĪ]/g, "i")
    .replace(/[ōŌ]/g, "o")
    .replace(/[ūŪ]/g, "u");
}

function normalizeTitle(value) {
  return foldTurkish(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function titleTokens(value) {
  return foldTurkish(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
}

function titleMatches(candidate, target) {
  var left = normalizeTitle(candidate);
  var right = normalizeTitle(target);
  if (!left || !right)
    return false;
  if (left === right)
    return true;
  if (left.length >= 5 && right.length >= 5 && (left.indexOf(right) !== -1 || right.indexOf(left) !== -1))
    return true;
  var candidateParts = titleTokens(candidate);
  var targetParts = titleTokens(target);
  if (targetParts.length < 2)
    return false;
  for (var i = 0; i < targetParts.length; i++) {
    if (candidateParts.indexOf(targetParts[i]) === -1)
      return false;
  }
  return true;
}

function titleScore(candidate, targets) {
  var best = 0;
  for (var i = 0; i < targets.length; i++) {
    var left = normalizeTitle(candidate);
    var right = normalizeTitle(targets[i]);
    if (!left || !right)
      continue;
    if (left === right)
      best = Math.max(best, 100);
    else if (left.length >= 5 && right.length >= 5 && (left.indexOf(right) !== -1 || right.indexOf(left) !== -1))
      best = Math.max(best, 70);
    else if (titleMatches(candidate, targets[i]))
      best = Math.max(best, 55);
  }
  return best;
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
  if (raw.charAt(0) === "/")
    return originOf(base || BASE_URL) + raw;
  return String(base || BASE_URL).replace(/\/+$/, "") + "/" + raw.replace(/^\/+/, "");
}

function originOf(url) {
  var match = String(url || "").match(/^(https?:\/\/[^/]+)/i);
  return match ? match[1] : BASE_URL;
}

function slug(value) {
  return foldTurkish(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slugVariants(value) {
  var folded = foldTurkish(value).toLowerCase();
  var values = [slug(value), slug(folded.replace(/['’]/g, "")), slug(folded.replace(/&/g, " and "))];
  var result = [];
  for (var i = 0; i < values.length; i++) {
    if (values[i] && result.indexOf(values[i]) === -1)
      result.push(values[i]);
  }
  return result;
}

function searchAnime(query, domain) {
  var q = String(query || "").trim();
  if (!q)
    return Promise.resolve([]);
  var site = String(domain || BASE_URL).replace(/\/+$/, "");
  var url = site + "/search/suggest?q=" + encodeURIComponent(q);
  return fetchJson(url, {
    headers: {
      Accept: API_HEADERS.Accept,
      Referer: site + "/",
      "User-Agent": USER_AGENT
    }
  }, 10000).then(function(data) {
    return data && Array.isArray(data.results) ? data.results : [];
  }).catch(function() {
    return [];
  });
}

function candidateNames(row) {
  return [row && row.title, row && row.title_en, row && row.name, row && row.original_title].filter(Boolean);
}

function findCandidates(info, mediaType, season, domain) {
  var targets = [];
  var preferTybw = isBleachTybwRequest(info, mediaType);
  var rawTargets = preferTybw ? ["Bleach: Thousand-Year Blood War", info.turkishTitle, info.title, info.originalTitle] : [info.turkishTitle, info.title, info.originalTitle];
  for (var i = 0; i < rawTargets.length; i++) {
    var value = String(rawTargets[i] || "").trim();
    if (value && targets.indexOf(value) === -1)
      targets.push(value);
  }
  var rows = [];
  var seen = {};
  var queries = targets.slice(0, 4);
  var chain = Promise.resolve();
  queries.forEach(function(query) {
    chain = chain.then(function() {
      return searchAnime(query, domain).then(function(found) {
        for (var j = 0; j < found.length; j++) {
          var row = found[j] || {};
          var rowSlug = String(row.slug || "").trim();
          if (!rowSlug || seen[rowSlug])
            continue;
          seen[rowSlug] = true;
          var names = candidateNames(row);
          var score = 0;
          for (var k = 0; k < names.length; k++)
            score = Math.max(score, titleScore(names[k], targets));
          var type = String(row.type || "").toLowerCase();
          if (mediaType === "movie" && /series|tv|show/.test(type))
            score -= 8;
          if (mediaType === "tv" && /movie|film/.test(type))
            score -= 8;
          if (info.year && String(row.year || "").slice(0, 4) === String(info.year).slice(0, 4))
            score += 4;
          if (preferTybw && normalizeTitle(rowSlug).indexOf("bleachthousandyearbloodwar") !== -1)
            score += 1000;
          if (score > 0)
            rows.push({ row: row, score: score });
        }
      });
    });
  });
  return chain.then(function() {
    rows.sort(function(a, b) { return b.score - a.score; });
    var output = rows.map(function(item) { return item.row; });
    if (!output.length) {
      for (var i = 0; i < targets.length; i++) {
        var variants = slugVariants(targets[i]);
        for (var j = 0; j < variants.length; j++) {
          if (!seen[variants[j]]) {
            seen[variants[j]] = true;
            output.push({ slug: variants[j], title: targets[i] });
          }
        }
      }
    }
    if (preferTybw) {
      var hasTybw = false;
      for (var c = 0; c < output.length; c++) {
        if (normalizeTitle(output[c] && output[c].slug).indexOf("bleachthousandyearbloodwar") !== -1) {
          hasTybw = true;
          break;
        }
      }
      if (!hasTybw)
        output.unshift({ slug: "bleach-thousand-year-blood-war-7443", title: "Bleach: Thousand-Year Blood War" });
    }
    return output.slice(0, 6);
  });
}

var BLEACH_SEASON_COUNTS = [20, 21, 22, 28, 18, 22, 20, 16, 22, 16, 7, 17, 36, 51, 26, 24];

function isBleachMain(info) {
  if (String(info && info.tmdbId) === "30984")
    return true;
  var text = normalizeTitle((info && info.title) || "") + normalizeTitle((info && info.originalTitle) || "");
  return text.indexOf("bleach") !== -1 && text.indexOf("thousandyearbloodwar") === -1 && text.indexOf("sennenkessen") === -1;
}

function isBleachTybw(info) {
  var text = normalizeTitle((info && info.title) || "") + normalizeTitle((info && info.originalTitle) || "") + normalizeTitle((info && info.turkishTitle) || "");
  return text.indexOf("bleach") !== -1 && (text.indexOf("thousandyearbloodwar") !== -1 || text.indexOf("sennenkessen") !== -1);
}

function isBleachTybwRequest(info, mediaType) {
  if (mediaType === "movie")
    return false;
  return isBleachTybw(info);
}

function bleachAbsoluteEpisode(season, episode) {
  var s = parseInt(season, 10) || 1;
  var e = parseInt(episode, 10) || 1;
  if (s < 1 || s > BLEACH_SEASON_COUNTS.length || e < 1 || e > BLEACH_SEASON_COUNTS[s - 1])
    return 0;
  var offset = 0;
  for (var i = 0; i < s - 1; i++)
    offset += BLEACH_SEASON_COUNTS[i];
  return offset + e;
}

function episodeUrlVariants(candidate, info, mediaType, season, episode, domain) {
  var value = String(candidate && candidate.slug || "").replace(/^\/+|\/+$/g, "");
  if (!value)
    return [];
  var s = parseInt(season, 10) || 1;
  var e = parseInt(episode, 10) || 1;
  var site = String(domain || BASE_URL).replace(/\/+$/, "");
  var urls = [];
  var tybwRequest = isBleachTybwRequest(info, mediaType);
  var normalizedSlug = normalizeTitle(value);
  if (tybwRequest && isBleachMain(info) && normalizedSlug.indexOf("bleachthousandyearbloodwar") === -1)
    return [];
  function add(seasonNumber, episodeNumber) {
    var url = site + "/watch/" + value + "/" + String(seasonNumber) + "/" + String(episodeNumber);
    if (urls.indexOf(url) === -1)
      urls.push(url);
  }
  if (mediaType === "movie")
    add(1, 1);
  else if (tybwRequest)
    // Animexe keeps TYBW in a separate title with a single episode sequence.
    add(1, e);
  else
    add(s, e);
  if (mediaType !== "movie" && !tybwRequest && isBleachMain(info) && s !== 1) {
    var absolute = bleachAbsoluteEpisode(s, e);
    if (absolute)
      add(1, absolute);
  }
  return urls;
}

function assignmentValue(text, name) {
  var re = new RegExp("(?:const|let|var)\\s+" + name + "\\s*=\\s*([^;]+);", "i");
  var match = re.exec(String(text || ""));
  return match ? String(match[1]).trim() : "";
}

function decodeJsString(value) {
  var raw = String(value || "").trim();
  if (!raw || raw === "null" || raw === "undefined")
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
    .replace(/\\x([0-9a-f]{2})/gi, function(_, code) { return String.fromCharCode(parseInt(code, 16)); })
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
}

function extractBalancedArray(text, marker) {
  var source = String(text || "");
  var markerIndex = source.indexOf(marker);
  if (markerIndex < 0)
    return "";
  var start = source.indexOf("[", markerIndex + marker.length);
  if (start < 0)
    return "";
  var depth = 0;
  var quote = "";
  var escaped = false;
  for (var i = start; i < source.length; i++) {
    var ch = source.charAt(i);
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
    if (ch === "[")
      depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0)
        return source.slice(start, i + 1);
    }
  }
  return "";
}

function parseJsonArray(text, marker) {
  var raw = extractBalancedArray(text, marker);
  if (!raw)
    return [];
  try {
    var value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch (_) {
    return [];
  }
}

function sourceType(url, declaredType) {
  var type = String(declaredType || "").toLowerCase();
  if (type === "m3u8" || type === "hls")
    return "m3u8";
  if (type === "mp4")
    return "mp4";
  return /\.m3u8(?:[?#]|$)/i.test(String(url || "")) ? "m3u8" : "mp4";
}

function sourceHeaders(url, watchUrl) {
  var headers = { "User-Agent": USER_AGENT };
  if (/^https?:\/\/(?:www\.)?animexe\.com\//i.test(String(url || ""))) {
    headers.Referer = watchUrl;
    headers.Origin = originOf(watchUrl);
  }
  return headers;
}

function extractSubtitles(html, base) {
  var rows = parseJsonArray(html, "const SUBS");
  var output = [];
  var seen = {};
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i] || {};
    var url = absoluteUrl(row.url || row.src || row.file, base || BASE_URL);
    if (!url || seen[url])
      continue;
    seen[url] = true;
    output.push({
      url: url,
      lang: String(row.lang || row.language || "tr"),
      label: String(row.label || row.name || "Türkçe"),
      language: String(row.label || row.name || "Türkçe"),
      name: String(row.label || row.name || "Türkçe"),
      format: /\.srt(?:[?#]|$)/i.test(url) ? "srt" : "vtt"
    });
  }
  return output;
}

function extractWatchSources(html, watchUrl, title, season, episode) {
  var rows = parseJsonArray(html, "const VIDEO_SOURCES");
  var m3u8 = decodeJsString(assignmentValue(html, "M3U8"));
  var mp4 = decodeJsString(assignmentValue(html, "MP4"));
  var found = [];
  var seen = {};
  function add(url, type, quality, label) {
    var absolute = absoluteUrl(url, originOf(watchUrl));
    if (!absolute || seen[absolute])
      return;
    seen[absolute] = true;
    var resolvedType = sourceType(absolute, type);
    found.push({
      name: "Animexe" + (label ? " • " + String(label) : " • " + resolvedType.toUpperCase()),
      title: title,
      url: absolute,
      quality: String(quality || "Auto"),
      size: "Unknown",
      headers: sourceHeaders(absolute, watchUrl),
      provider: "animexe",
      type: resolvedType
    });
  }
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i] || {};
    if (row.url)
      add(row.url, row.type, row.quality, row.label || row.name || row.source);
  }
  if (m3u8)
    add(m3u8, "m3u8", "Auto", "HLS");
  if (mp4)
    add(mp4, "mp4", "Auto", "MP4");

  if (!found.length) {
    var normalized = String(html || "").replace(/\\\//g, "/");
    var patterns = [
      /https?:\/\/[^"'\\\s<>]+\.m3u8(?:\?[^"'\\\s<>]*)?/gi,
      /https?:\/\/[^"'\\\s<>]+\.mp4(?:\?[^"'\\\s<>]*)?/gi
    ];
    for (var p = 0; p < patterns.length; p++) {
      var match;
      while ((match = patterns[p].exec(normalized)) !== null)
        add(match[0], sourceType(match[0]), "Auto", sourceType(match[0]).toUpperCase());
    }
  }
  return { streams: found, subtitles: extractSubtitles(html, watchUrl) };
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
    var entry = registry && registry.providers && registry.providers.animexe;
    var remote = entry && Array.isArray(entry.domains) ? entry.domains : [];
    var all = remote.concat([BASE_URL]);
    for (var i = 0; i < all.length; i++) {
      var value = String(all[i] || "").replace(/\/+$/, "");
      if (/^https?:\/\/[^/\s]+$/i.test(value) && domains.indexOf(value) === -1)
        domains.push(value);
    }
    return domains.length ? domains : [BASE_URL];
  });
}

function resolveTarget(tmdbId, mediaType, season, episode) {
  return getTmdbInfo(tmdbId, mediaType).then(function(info) {
    if (!info.title && !info.originalTitle && !info.turkishTitle)
      return null;
    return getDomainCandidates().then(function(domains) {
      return findCandidates(info, mediaType, season, domains[0] || BASE_URL).then(function(candidates) {
        var domainIndex = 0;
        function tryDomain() {
          if (domainIndex >= domains.length)
            return Promise.resolve(null);
          var domain = domains[domainIndex++];
          var candidateIndex = 0;
          function tryCandidate() {
            if (candidateIndex >= candidates.length)
              return tryDomain();
            var candidate = candidates[candidateIndex++];
            var urls = episodeUrlVariants(candidate, info, mediaType, season, episode, domain);
            var pageIndex = 0;
            function tryPage() {
              if (pageIndex >= urls.length)
                return tryCandidate();
              var pageUrl = urls[pageIndex++];
              return fetchText(pageUrl, {
                headers: {
                  Accept: PAGE_HEADERS.Accept,
                  "Accept-Language": PAGE_HEADERS["Accept-Language"],
                  Referer: domain + "/",
                  "User-Agent": USER_AGENT
                }
              }, 10000).then(function(html) {
                var name = String(candidate.title || info.title || info.originalTitle || "Animexe");
                var label = mediaType === "movie" ? name + " - Film" : name + " - S" + String(parseInt(season, 10) || 1) + "B" + String(parseInt(episode, 10) || 1);
                var parsed = extractWatchSources(html, pageUrl, label, season, episode);
                return parsed.streams.length ? {
                  info: info,
                  title: label,
                  streams: parsed.streams,
                  subtitles: parsed.subtitles
                } : tryPage();
              }).catch(function() {
                return tryPage();
              });
            }
            return tryPage();
          }
          return tryCandidate();
        }
        return tryDomain();
      });
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
    { type: "header", label: "TMDB API Anahtarı (gerekli)" },
    {
      type: "text",
      key: "tmdbApiKey",
      label: "TMDB API Key veya Read Access Token",
      description: "Başlık eşleştirmesi için kendi TMDB v3 API Key'ini veya v4 Read Access Token'ını gir.",
      defaultValue: ""
    }
  ]);
}

module.exports = { getStreams: getStreams, getSubtitles: getSubtitles, onSettings: onSettings };
