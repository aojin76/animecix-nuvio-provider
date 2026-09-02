/**
 * animecix - Built from src/animecix/
 * Generated: 2026-09-02T10:37:05.824Z
 */
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

// src/animecix/index.js
var ANIMECIX = "https://animecix.tv";
var TAU_VIDEO = "https://tau-video.xyz";
var TMDB = "https://api.themoviedb.org/3";
var EPISODE_MAPPING = "https://id-mapping-api-malid.hf.space/api/resolve";
var PROVIDER_VERSION = "2.5.0";
var TAU_STREAM_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Referer: TAU_VIDEO + "/",
  Origin: TAU_VIDEO
};
var BLEACH_SEASON_COUNTS = [20, 21, 22, 28, 18, 22, 20, 16, 22, 16, 7, 17, 36, 51, 26, 24];
var BLEACH_TYBW_TMDB_IDS = ["214779", "212624"];
var BLEACH_TYBW_SEASON_COUNTS = [13, 13, 14, 6];
function getTmdbKeys() {
  var keys = [];
  try {
    if (typeof globalThis !== "undefined") {
      var settings = globalThis.SCRAPER_SETTINGS || {};
      var key = settings.tmdbApiKey || settings.tmdb_api_key || settings.apiKey ||
        settings.TMDB_API_KEY || settings.tmdbAccessToken || settings.tmdb_access_token || settings.tmdbToken;
      if (key && String(key).trim())
        keys.push(String(key).trim());
    }
  } catch (_) {
  }
  try {
    if (typeof globalThis !== "undefined") {
      var injected = globalThis.TMDB_API_KEY || globalThis.TMDB_ACCESS_TOKEN || globalThis.TMDB_API_ACCESS_TOKEN || globalThis.__TMDB_API_KEY;
      if (injected && String(injected).trim())
        keys.push(String(injected).trim());
    }
  } catch (_) {
  }
  return keys;
}
function isTmdbAccessToken(value) {
  return /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(String(value || ""));
}
function fetchJson(url, timeoutMs, extraHeaders) {
  var timeout = timeoutMs || 15e3;
  var headers = {
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  };
  if (extraHeaders) {
    for (var headerName in extraHeaders) {
      if (Object.prototype.hasOwnProperty.call(extraHeaders, headerName)) {
        headers[headerName] = extraHeaders[headerName];
      }
    }
  }
  if (typeof setTimeout !== "function") {
    return fetch(url, { headers }).then(function(response) {
      if (!response || response.ok === false || response.status && response.status >= 400) {
        throw new Error("HTTP " + (response && response.status ? response.status : "error"));
      }
      return response.json();
    });
  }
  return new Promise(function(resolve, reject) {
    var settled = false;
    var timer = setTimeout(function() {
      if (settled)
        return;
      settled = true;
      reject(new Error("Request timeout: " + url));
    }, timeout);
    fetch(url, { headers }).then(function(response) {
      if (!response || response.ok === false || response.status && response.status >= 400) {
        throw new Error("HTTP " + (response && response.status ? response.status : "error"));
      }
      return response.json();
    }).then(function(data) {
      if (settled)
        return;
      settled = true;
      clearTimeout(timer);
      resolve(data);
    }).catch(function(error) {
      if (settled)
        return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
  });
}
function foldTurkish(value) {
  return String(value || "").replace(/[çÇ]/g, "c").replace(/[ğĞ]/g, "g").replace(/[ıİ]/g, "i").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[üÜ]/g, "u").replace(/[âÂ]/g, "a").replace(/[îÎ]/g, "i").replace(/[ûÛ]/g, "u").replace(/[āĀ]/g, "a").replace(/[ēĒ]/g, "e").replace(/[īĪ]/g, "i").replace(/[ōŌ]/g, "o").replace(/[ūŪ]/g, "u");
}
function normalize(value) {
  return foldTurkish(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}
function slug(value) {
  return foldTurkish(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function uniqueValues(values) {
  var output = [];
  var seen = [];
  for (var i = 0; i < values.length; i++) {
    var value = values[i];
    if (!value)
      continue;
    var key = foldTurkish(value).trim().toLowerCase();
    if (!key || seen.indexOf(key) !== -1)
      continue;
    seen.push(key);
    output.push(String(value).trim());
  }
  return output;
}
function getTmdbTitle(tmdbId, mediaType) {
  return __async(this, null, function* () {
    var type = mediaType === "movie" ? "movie" : "tv";
    var keys = getTmdbKeys();
    for (var i = 0; i < keys.length; i++) {
      try {
        var url = TMDB + "/" + type + "/" + encodeURIComponent(String(tmdbId)) + "?append_to_response=external_ids";
        var headers = null;
        if (isTmdbAccessToken(keys[i])) {
          headers = {
            Accept: "application/json",
            Authorization: "Bearer " + String(keys[i]),
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
          };
        } else {
          url += "&api_key=" + encodeURIComponent(keys[i]);
        }
        var data = yield fetchJson(url, 2e4, headers);
        if (!data)
          continue;
        var title = data.name || data.title || data.original_name || data.original_title || "";
        var original = data.original_name || data.original_title || "";
        var imdbId = data.external_ids && data.external_ids.imdb_id ? String(data.external_ids.imdb_id) : "";
        if (title || original) {
          return {
            title: String(title),
            original: String(original),
            imdbId,
            seasons: Array.isArray(data.seasons) ? data.seasons : []
          };
        }
      } catch (_) {
      }
    }
    return null;
  });
}
function getEpisodeMapping(imdbId, season, episode) {
  return __async(this, null, function* () {
    if (!imdbId)
      return null;
    try {
      var url = EPISODE_MAPPING + "?id=" + encodeURIComponent(String(imdbId)) + "&s=" + encodeURIComponent(String(season)) + "&e=" + encodeURIComponent(String(episode));
      var data = yield fetchJson(url, 6e3);
      var absoluteEpisode = data && parseInt(data.mal_episode, 10);
      if (!absoluteEpisode || absoluteEpisode < 1)
        return null;
      return { season: 1, episode: absoluteEpisode };
    } catch (_) {
      return null;
    }
  });
}
function searchAnime(query) {
  return __async(this, null, function* () {
    var value = slug(query);
    if (!value)
      return [];
    try {
      var url = ANIMECIX + "/secure/search/" + encodeURIComponent(value) + "?type=&limit=20";
      var data = yield fetchJson(url, 2e4);
      return data && Array.isArray(data.results) ? data.results : [];
    } catch (_) {
      return [];
    }
  });
}
function resultNames(result) {
  if (!result)
    return [];
  return [result.name, result.name_english, result.name_romanji, result.original_title];
}
function isTitleMatch(requested, result) {
  var left = normalize(requested);
  if (left.length < 3)
    return false;
  var names = resultNames(result);
  for (var i = 0; i < names.length; i++) {
    var right = normalize(names[i]);
    if (!right)
      continue;
    if (left === right)
      return true;
    if (left.length >= 6 && right.length >= 6 && (left.indexOf(right) !== -1 || right.indexOf(left) !== -1)) {
      return true;
    }
  }
  return false;
}
function isExactTitleMatch(requested, result) {
  var left = normalize(requested);
  if (left.length < 3)
    return false;
  var names = resultNames(result);
  for (var i = 0; i < names.length; i++) {
    if (left === normalize(names[i]))
      return true;
  }
  return false;
}
function isBleach(tmdbId, info) {
  if (String(tmdbId) === "30984")
    return true;
  return normalize(info && info.title) === "bleach" || normalize(info && info.original) === "bleach";
}
function isBleachTybw(tmdbId, info) {
  var id = String(tmdbId || "");
  if (BLEACH_TYBW_TMDB_IDS.indexOf(id) !== -1)
    return true;
  var text = normalize(info && info.title) + normalize(info && info.original);
  return text.indexOf("thousandyearbloodwar") !== -1 || text.indexOf("sennenkessenhen") !== -1 || text.indexOf("sennenkessen") !== -1;
}
function isBleachTybwRequest(tmdbId, info, season) {
  if (isBleachTybw(tmdbId, info))
    return true;
  var s = parseInt(season, 10) || 1;
  return isBleach(tmdbId, info) && s > 1;
}
function getSeasonCounts(info) {
  var seasons = info && Array.isArray(info.seasons) ? info.seasons : [];
  if (!seasons.length)
    return null;
  var counts = [];
  for (var i = 0; i < seasons.length; i++) {
    var item = seasons[i] || {};
    var number = parseInt(item.season_number, 10);
    var count = parseInt(item.episode_count, 10);
    if (number < 1 || !count || count < 1)
      continue;
    counts[number - 1] = count;
  }
  return counts.length ? counts : null;
}
function getBleachTybwAbsoluteEpisode(info, season, episode) {
  var s = parseInt(season, 10) || 1;
  var e = parseInt(episode, 10) || 1;
  var counts = getSeasonCounts(info) || BLEACH_TYBW_SEASON_COUNTS;
  var currentCount = counts[s - 1];
  if (!currentCount && s === 1 && e >= 1 && e <= 46)
    return e;
  if (!currentCount || e < 1 || e > currentCount)
    return null;
  var offset = 0;
  for (var i = 0; i < s - 1; i++)
    offset += counts[i] || 0;
  return offset + e;
}
function getBleachAbsoluteEpisode(season, episode) {
  var s = parseInt(season, 10) || 1;
  var e = parseInt(episode, 10) || 1;
  if (s < 1 || s > BLEACH_SEASON_COUNTS.length || e < 1 || e > BLEACH_SEASON_COUNTS[s - 1]) {
    return null;
  }
  var offset = 0;
  for (var i = 0; i < s - 1; i++)
    offset += BLEACH_SEASON_COUNTS[i];
  return offset + e;
}
function getSourceEpisode(tmdbId, info, season, episode, mapped) {
  var s = parseInt(season, 10) || 1;
  var e = parseInt(episode, 10) || 1;
  if (isBleachTybwRequest(tmdbId, info, s)) {
    // Animecix stores TYBW as its own second season; the episode number is direct.
    return { season: 2, episode: e };
  }
  if (isBleach(tmdbId, info)) {
    if (s >= 1 && s <= BLEACH_SEASON_COUNTS.length) {
      var absolute = mapped && mapped.episode ? mapped.episode : getBleachAbsoluteEpisode(s, e);
      if (absolute)
        return { season: 1, episode: absolute };
    }
    if (s === 17)
      return { season: 2, episode: e };
    if (s === 2 && e > BLEACH_SEASON_COUNTS[1])
      return { season: 2, episode: e };
  }
  return { season: s, episode: e };
}
function findAnime(tmdbId, title, original, allowBleachAlias) {
  return __async(this, null, function* () {
    var queries = uniqueValues([title, original]);
    var fallback = null;
    for (var q = 0; q < queries.length; q++) {
      var results = yield searchAnime(queries[q]);
      for (var i = 0; i < results.length; i++) {
        var result = results[i];
        if (result && result.tmdb_id && String(result.tmdb_id) === String(tmdbId)) {
          return result;
        }
      }
      if (!fallback) {
        for (var j = 0; j < results.length; j++) {
          var candidate = results[j];
          var idMatches = candidate && candidate.tmdb_id && String(candidate.tmdb_id) === String(tmdbId);
          var idMissing = candidate && !candidate.tmdb_id;
          if (isExactTitleMatch(queries[q], candidate) || (idMatches || idMissing) && isTitleMatch(queries[q], candidate)) {
            fallback = candidate;
            break;
          }
        }
      }
    }
    if (allowBleachAlias) {
      var bleachResults = yield searchAnime("bleach");
      for (var k = 0; k < bleachResults.length; k++) {
        var bleach = bleachResults[k];
        if (bleach && (String(bleach.id) === "82" || String(bleach.tmdb_id) === "30984" || normalize(bleach.name) === "bleach")) {
          return bleach;
        }
      }
    }
    return fallback;
  });
}
function getEpisodeVideos(animeId, season, episode) {
  return __async(this, null, function* () {
    try {
      var url = ANIMECIX + "/secure/episode-videos?titleId=" + encodeURIComponent(String(animeId)) + "&episode=" + encodeURIComponent(String(episode)) + "&season=" + encodeURIComponent(String(season));
      var data = yield fetchJson(url, 2e4);
      if (Array.isArray(data))
        return data;
      if (data && Array.isArray(data.videos))
        return data.videos;
      if (data && Array.isArray(data.data))
        return data.data;
    } catch (_) {
    }
    return [];
  });
}
function getTauId(url) {
  var match = /tau-video\.xyz\/embed[-/]([A-Za-z0-9]+)/i.exec(String(url || ""));
  return match ? match[1] : null;
}
function qualityNumber(label) {
  var match = /([0-9]+)/.exec(String(label || ""));
  return match ? parseInt(match[1], 10) : 0;
}
function formatSize(bytes) {
  var value = Number(bytes);
  if (!value || !isFinite(value))
    return "Unknown";
  return Math.round(value / (1024 * 1024)) + " MB";
}
function getTauStreams(tauId, animeTitle, episodeLabel, translator) {
  return __async(this, null, function* () {
    if (!tauId)
      return [];
    try {
      var data = yield fetchJson(TAU_VIDEO + "/api/video/" + encodeURIComponent(tauId), 2e4, {
        Referer: TAU_VIDEO + "/",
        Origin: TAU_VIDEO
      });
      var urls = data && Array.isArray(data.urls) ? data.urls.slice() : [];
      urls.sort(function(a, b) {
        return qualityNumber(b && b.label) - qualityNumber(a && a.label);
      });
      var output = [];
      var suffix = translator ? " \u2022 " + String(translator).slice(0, 50) : "";
      for (var i = 0; i < urls.length; i++) {
        var entry = urls[i];
        if (!entry || !entry.url)
          continue;
        var url = String(entry.url);
        if (!/^https?:\/\//i.test(url))
          continue;
        output.push({
          name: "Animecix (" + (entry.label || "Auto") + ")" + suffix,
          title: String(animeTitle || "Anime") + " - " + episodeLabel,
          url,
          quality: entry.label || "Auto",
          size: formatSize(entry.size),
          headers: TAU_STREAM_HEADERS,
          provider: "animecix",
          type: /\.m3u8(?:\?|$)/i.test(url) ? "m3u8" : "mp4"
        });
      }
      return output;
    } catch (_) {
      return [];
    }
  });
}
function resolveEpisode(animeId, season, episode, animeTitle, displayLabel) {
  return __async(this, null, function* () {
    var sources = yield getEpisodeVideos(animeId, season, episode);
    var streams = [];
    var seen = [];
    var label = displayLabel || "B\xF6l\xFCm " + String(episode);
    var requests = [];
    for (var i = 0; i < sources.length; i++) {
      var source = sources[i] || {};
      var tauId = getTauId(source.url);
      if (!tauId || seen.indexOf(tauId) !== -1)
        continue;
      seen.push(tauId);
      requests.push(getTauStreams(tauId, animeTitle, label, source.extra));
    }
    var parts = yield Promise.all(requests);
    for (var p = 0; p < parts.length; p++) {
      var part = parts[p] || [];
      for (var j = 0; j < part.length; j++)
        streams.push(part[j]);
    }
    return streams;
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      console.log("[Animecix v" + PROVIDER_VERSION + "] getStreams tmdb=" + String(tmdbId) + " type=" + String(mediaType) + " S" + String(season) + "E" + String(episode));
      var info = yield getTmdbTitle(tmdbId, mediaType);
      if (!info) {
        console.error("[Animecix] TMDB ba\u015Fl\u0131\u011F\u0131 al\u0131namad\u0131; API ayar\u0131n\u0131 veya uygulama TMDB anahtar\u0131n\u0131 kontrol et");
        return [];
      }
      var s = mediaType === "movie" ? 1 : parseInt(season, 10) || 1;
      var e = mediaType === "movie" ? 1 : parseInt(episode, 10) || 1;
      var bleachTybw = isBleachTybwRequest(tmdbId, info, s);
      var lookup = yield Promise.all([
        findAnime(tmdbId, info.title, info.original, bleachTybw),
        mediaType === "movie" || bleachTybw ? Promise.resolve(null) : getEpisodeMapping(info.imdbId, s, e)
      ]);
      var anime = lookup[0];
      var mapped = lookup[1];
      if (!anime || !anime.id) {
        console.log("[Animecix] Animecix e\u015Fle\u015Fmesi yok: " + info.title);
        return [];
      }
      var title = anime.name || info.title;
      var sourceEpisode = getSourceEpisode(tmdbId, info, s, e, mapped);
      var displayLabel = mediaType === "movie" ? "Film" : "S" + String(s) + "B" + String(e);
      var resolvedSource = sourceEpisode;
      var streams = yield resolveEpisode(anime.id, sourceEpisode.season, sourceEpisode.episode, title, displayLabel);
      if (!streams.length && mapped && (sourceEpisode.season !== mapped.season || sourceEpisode.episode !== mapped.episode)) {
        streams = yield resolveEpisode(anime.id, mapped.season, mapped.episode, title, displayLabel);
        if (streams.length)
          resolvedSource = mapped;
      }
      console.log("[Animecix] " + title + " S" + String(s) + "E" + String(e) + " -> kaynak S" + String(resolvedSource.season) + "E" + String(resolvedSource.episode) + " -> " + String(streams.length) + " stream");
      return streams;
    } catch (_) {
      return [];
    }
  });
}
function onSettings() {
  return __async(this, null, function* () {
    return [
      { type: "header", label: "TMDB API Anahtar\u0131 (gerekli)" },
      {
        type: "text",
        key: "tmdbApiKey",
        label: "TMDB API Key veya Read Access Token",
        description: "Kendi TMDB v3 API Key'ini veya v4 Read Access Token'\u0131n\u0131 gir. Anahtar koda kaydedilmez.",
        defaultValue: ""
      }
    ];
  });
}
module.exports = { getStreams, onSettings };
