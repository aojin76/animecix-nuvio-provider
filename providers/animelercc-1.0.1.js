/**
 * animelercc - Built from src/animelercc/
 * Generated: 2026-09-02T11:12:08.111Z
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

// src/animelercc/index.js
var BASE_URL = "https://animeler.cc";
var TMDB = "https://api.themoviedb.org/3";
var PROVIDER_VERSION = "1.0.1";
var DEFAULT_TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
var PAGE_HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "User-Agent": USER_AGENT
};
function getTmdbKeys() {
  var keys = [];
  try {
    if (typeof globalThis !== "undefined") {
      var settings = globalThis.SCRAPER_SETTINGS || {};
      var key = settings.tmdbApiKey || settings.tmdb_api_key || settings.apiKey;
      if (key && String(key).trim())
        keys.push(String(key).trim());
    }
  } catch (_) {
  }
  try {
    if (typeof globalThis !== "undefined") {
      var injected = globalThis.TMDB_API_KEY || globalThis.__TMDB_API_KEY;
      if (injected && String(injected).trim())
        keys.push(String(injected).trim());
    }
  } catch (_) {
  }
  if (!keys.length)
    keys.push(DEFAULT_TMDB_API_KEY);
  var unique = [];
  for (var i = 0; i < keys.length; i++) {
    if (unique.indexOf(keys[i]) === -1)
      unique.push(keys[i]);
  }
  return unique;
}
function fetchResponse(url, timeoutMs, headers) {
  var timeout = timeoutMs || 15e3;
  var requestHeaders = {};
  var sourceHeaders = headers || {};
  for (var name in sourceHeaders) {
    if (Object.prototype.hasOwnProperty.call(sourceHeaders, name)) {
      requestHeaders[name] = sourceHeaders[name];
    }
  }
  var request = fetch(url, { headers: requestHeaders });
  if (typeof setTimeout !== "function")
    return request;
  return new Promise(function(resolve, reject) {
    var settled = false;
    var timer = setTimeout(function() {
      if (settled)
        return;
      settled = true;
      reject(new Error("Request timeout: " + url));
    }, timeout);
    request.then(function(response) {
      if (settled)
        return;
      settled = true;
      clearTimeout(timer);
      resolve(response);
    }).catch(function(error) {
      if (settled)
        return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
  });
}
function fetchText(url, timeoutMs, headers) {
  return __async(this, null, function* () {
    var response = yield fetchResponse(url, timeoutMs || 15e3, headers || PAGE_HEADERS);
    if (!response || response.ok === false || response.status && response.status >= 400) {
      throw new Error("HTTP " + (response && response.status ? response.status : "error") + ": " + url);
    }
    return yield response.text();
  });
}
function fetchJson(url, timeoutMs) {
  return __async(this, null, function* () {
    var headers = {
      Accept: "application/json",
      "User-Agent": USER_AGENT
    };
    var response = yield fetchResponse(url, timeoutMs || 15e3, headers);
    if (!response || response.ok === false || response.status && response.status >= 400) {
      throw new Error("HTTP " + (response && response.status ? response.status : "error") + ": " + url);
    }
    return yield response.json();
  });
}
function decodeHtml(value) {
  return String(value || "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#(\d+);/g, function(_, code) {
    var number = parseInt(code, 10);
    return number ? String.fromCharCode(number) : "";
  }).replace(/&#x([0-9a-f]+);/gi, function(_, code) {
    var number = parseInt(code, 16);
    return number ? String.fromCharCode(number) : "";
  });
}
function htmlToText(value) {
  return decodeHtml(String(value || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
function foldTurkish(value) {
  return String(value || "").replace(/[çÇ]/g, "c").replace(/[ğĞ]/g, "g").replace(/[ıİ]/g, "i").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[üÜ]/g, "u").replace(/[âÂ]/g, "a").replace(/[îÎ]/g, "i").replace(/[ûÛ]/g, "u").replace(/[āĀ]/g, "a").replace(/[ēĒ]/g, "e").replace(/[īĪ]/g, "i").replace(/[ōŌ]/g, "o").replace(/[ūŪ]/g, "u");
}
function normalize(value) {
  return foldTurkish(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}
function uniqueValues(values) {
  var output = [];
  var seen = [];
  for (var i = 0; i < values.length; i++) {
    var value = String(values[i] || "").trim();
    var key = normalize(value);
    if (!key || seen.indexOf(key) !== -1)
      continue;
    seen.push(key);
    output.push(value);
  }
  return output;
}
function getTmdbInfo(tmdbId, mediaType) {
  return __async(this, null, function* () {
    var type = mediaType === "movie" ? "movie" : "tv";
    var keys = getTmdbKeys();
    for (var i = 0; i < keys.length; i++) {
      try {
        var url = TMDB + "/" + type + "/" + encodeURIComponent(String(tmdbId)) + "?api_key=" + encodeURIComponent(keys[i]) + "&append_to_response=external_ids";
        var data = yield fetchJson(url, 2e4);
        if (!data)
          continue;
        var title = data.name || data.title || data.original_name || data.original_title || "";
        var original = data.original_name || data.original_title || "";
        if (title || original) {
          return {
            title: String(title),
            original: String(original),
            seasons: Array.isArray(data.seasons) ? data.seasons : []
          };
        }
      } catch (_) {
      }
    }
    return null;
  });
}
function makeAbsoluteUrl(href) {
  var value = decodeHtml(String(href || "").trim());
  if (/^https?:\/\//i.test(value))
    return value;
  if (value.charAt(0) === "/")
    return BASE_URL + value;
  return BASE_URL + "/" + value.replace(/^\/+/, "");
}
function getAnimeSlug(href) {
  var value = decodeHtml(String(href || "").trim());
  var match = /\/anime\/([^/?#"']+)/i.exec(value);
  return match ? match[1] : "";
}
function titleScore(requested, candidate) {
  var left = normalize(requested);
  var right = normalize(candidate);
  if (!left || !right)
    return 0;
  if (left === right)
    return 100;
  if (right.indexOf(left) !== -1 && left.length >= 5)
    return 70;
  if (left.indexOf(right) !== -1 && right.length >= 5)
    return 60;
  var leftParts = foldTurkish(requested).toLowerCase().split(/[^a-z0-9]+/).filter(function(part) {
    return part.length >= 3;
  });
  var rightText = foldTurkish(candidate).toLowerCase();
  var matches = 0;
  for (var i = 0; i < leftParts.length; i++) {
    if (rightText.indexOf(leftParts[i]) !== -1)
      matches++;
  }
  return leftParts.length && matches === leftParts.length ? 40 : 0;
}
function parseSearchResults(html) {
  var output = [];
  var seen = [];
  var anchorPattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  var match;
  while (match = anchorPattern.exec(String(html || ""))) {
    var animeSlug = getAnimeSlug(match[1]);
    if (!animeSlug)
      continue;
    var key = animeSlug.toLowerCase();
    if (seen.indexOf(key) !== -1)
      continue;
    seen.push(key);
    output.push({
      slug: animeSlug,
      name: htmlToText(match[2]),
      url: makeAbsoluteUrl(match[1])
    });
  }
  return output;
}
function searchAnime(query) {
  return __async(this, null, function* () {
    var value = String(query || "").trim();
    if (!value)
      return [];
    try {
      var url = BASE_URL + "/animeler?q=" + encodeURIComponent(value);
      var html = yield fetchText(url, 15e3, PAGE_HEADERS);
      return parseSearchResults(html);
    } catch (_) {
      return [];
    }
  });
}
function findAnime(title, original) {
  return __async(this, null, function* () {
    var queries = uniqueValues([title, original]);
    var best = null;
    var bestScore = 0;
    for (var q = 0; q < queries.length; q++) {
      var results = yield searchAnime(queries[q]);
      for (var i = 0; i < results.length; i++) {
        var result = results[i];
        var score = titleScore(queries[q], result.name);
        if (score > bestScore) {
          best = result;
          bestScore = score;
        }
      }
      if (bestScore === 100)
        return best;
    }
    return best;
  });
}
function getEpisodes(anime) {
  return __async(this, null, function* () {
    if (!anime || !anime.slug)
      return {};
    try {
      var url = BASE_URL + "/anime/" + anime.slug;
      var html = yield fetchText(url, 15e3, PAGE_HEADERS);
      var episodes = {};
      var linkPattern = /<a\b[^>]*href\s*=\s*["']([^"']*\/izle\/[^"']+\/([0-9]+)-bolum[^"']*)["'][^>]*>/gi;
      var match;
      while (match = linkPattern.exec(String(html || ""))) {
        var number = parseInt(match[2], 10);
        if (!number || episodes[number])
          continue;
        episodes[number] = makeAbsoluteUrl(match[1]);
      }
      return episodes;
    } catch (_) {
      return {};
    }
  });
}
function maxEpisode(episodes) {
  var max = 0;
  for (var key in episodes) {
    if (!Object.prototype.hasOwnProperty.call(episodes, key))
      continue;
    var number = parseInt(key, 10);
    if (number > max)
      max = number;
  }
  return max;
}
function getSeasonCounts(info) {
  var seasons = info && Array.isArray(info.seasons) ? info.seasons : [];
  if (!seasons.length)
    return null;
  var counts = [];
  for (var i = 0; i < seasons.length; i++) {
    var season = seasons[i] || {};
    var number = parseInt(season.season_number, 10);
    var count = parseInt(season.episode_count, 10);
    if (number < 1 || !count || count < 1)
      continue;
    counts[number - 1] = count;
  }
  return counts.length ? counts : null;
}
function getAbsoluteEpisode(info, season, episode) {
  var s = parseInt(season, 10) || 1;
  var e = parseInt(episode, 10) || 1;
  if (s <= 1)
    return e;
  var counts = getSeasonCounts(info);
  if (!counts || !counts[s - 1])
    return null;
  var offset = 0;
  for (var i = 0; i < s - 1; i++) {
    if (!counts[i])
      return null;
    offset += counts[i];
  }
  return offset + e;
}
function chooseEpisode(episodes, info, season, episode) {
  var s = parseInt(season, 10) || 1;
  var e = parseInt(episode, 10) || 1;
  var available = maxEpisode(episodes);
  var direct = episodes[e] || null;
  var absoluteNumber = getAbsoluteEpisode(info, s, e);
  var absolute = absoluteNumber ? episodes[absoluteNumber] || null : null;
  var counts = getSeasonCounts(info);
  var currentCount = counts && counts[s - 1] ? counts[s - 1] : 0;
  if (s > 1 && absolute && absoluteNumber !== e && available > currentCount) {
    return { number: absoluteNumber, url: absolute };
  }
  if (direct)
    return { number: e, url: direct };
  if (absolute)
    return { number: absoluteNumber, url: absolute };
  return null;
}
function getPlayerUrl(html) {
  var match = /\bvar\s+src\s*=\s*["']([^"']+)["']/i.exec(String(html || ""));
  if (!match)
    return null;
  var url = decodeHtml(match[1]);
  if (!/^https?:\/\//i.test(url))
    return null;
  return url;
}
function resolvePlayer(episodeUrl) {
  return __async(this, null, function* () {
    try {
      var html = yield fetchText(episodeUrl, 15e3, {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
        Referer: BASE_URL + "/",
        "User-Agent": USER_AGENT
      });
      return getPlayerUrl(html);
    } catch (_) {
      return null;
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      console.log("[Animeler.cc v" + PROVIDER_VERSION + "] getStreams tmdb=" + String(tmdbId) + " type=" + String(mediaType) + " S" + String(season) + "E" + String(episode));
      var info = yield getTmdbInfo(tmdbId, mediaType);
      if (!info) {
        console.error("[Animeler.cc] TMDB ba\u015Fl\u0131\u011F\u0131 al\u0131namad\u0131; sa\u011Flay\u0131c\u0131 ayar\u0131ndaki TMDB API anahtar\u0131n\u0131 kontrol et");
        return [];
      }
      var s = mediaType === "movie" ? 1 : parseInt(season, 10) || 1;
      var e = mediaType === "movie" ? 1 : parseInt(episode, 10) || 1;
      var anime = yield findAnime(info.title, info.original);
      if (!anime) {
        console.log("[Animeler.cc] ba\u015Fl\u0131k e\u015Fle\u015Fmesi yok: " + info.title);
        return [];
      }
      var episodes = yield getEpisodes(anime);
      var selected = chooseEpisode(episodes, info, s, e);
      if (!selected) {
        console.log("[Animeler.cc] b\xF6l\xFCm bulunamad\u0131: " + info.title + " S" + String(s) + "E" + String(e));
        return [];
      }
      var playerUrl = yield resolvePlayer(selected.url);
      if (!playerUrl) {
        console.log("[Animeler.cc] oynat\u0131c\u0131 URLsi bulunamad\u0131: " + selected.url);
        return [];
      }
      return [{
        name: "Animeler.cc (MP4)",
        title: String(info.title) + " - S" + String(s) + "B" + String(e),
        url: playerUrl,
        quality: "Auto",
        size: "Unknown",
        headers: {
          "User-Agent": USER_AGENT,
          Referer: selected.url,
          Origin: BASE_URL
        },
        provider: "animelercc",
        type: "mp4"
      }];
    } catch (_) {
      return [];
    }
  });
}
function onSettings() {
  return __async(this, null, function* () {
    return [
      { type: "header", label: "TMDB API Anahtar\u0131 (opsiyonel)" },
      {
        type: "text",
        key: "tmdbApiKey",
        label: "TMDB API Key (v3)",
        description: "Bo\u015F b\u0131rak\u0131rsan varsay\u0131lan anahtar kullan\u0131l\u0131r. Kendi TMDB v3 anahtar\u0131n\u0131 girersen bu sa\u011Flay\u0131c\u0131 onu kullan\u0131r. Okuma Eri\u015Fim Jetonu de\u011Fildir.",
        defaultValue: ""
      }
    ];
  });
}
module.exports = { getStreams, onSettings };
