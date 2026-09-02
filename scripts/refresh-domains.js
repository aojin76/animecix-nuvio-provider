#!/usr/bin/env node

/**
 * Alan adı kaydını normal web araması + doğrudan sağlık kontrolüyle yeniler.
 *
 * Bu script erişim engellerini aşmaz: proxy, CAPTCHA çözümü, Cloudflare
 * atlatma veya üçüncü taraf proxy listesi kullanmaz. Bir aday doğrudan
 * doğrulanamıyorsa kayda alınmaz; mevcut çalışan adres korunur.
 *
 * Kullanım:
 *   node scripts/refresh-domains.js
 *   node scripts/refresh-domains.js --dry-run
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, '..', 'domains.json');
const REQUEST_TIMEOUT_MS = 12000;
const MAX_BODY_BYTES = 512 * 1024;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const DRY_RUN = process.argv.includes('--dry-run');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeDomain(value) {
    try {
        const url = new URL(String(value || '').trim());
        if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.port) return '';
        return `${url.protocol}//${url.hostname.toLowerCase()}`;
    } catch {
        return '';
    }
}

function domainKey(value) {
    return normalizeDomain(value).toLowerCase();
}

function uniqueDomains(values) {
    const result = [];
    const seen = new Set();
    for (const value of values || []) {
        const domain = normalizeDomain(value);
        const key = domainKey(domain);
        if (!domain || seen.has(key)) continue;
        seen.add(key);
        result.push(domain);
    }
    return result;
}

function hostAllowed(entry, domain) {
    const normalized = normalizeDomain(domain);
    if (!normalized) return false;
    try {
        const host = new URL(normalized).hostname;
        return entry.allowedHost ? new RegExp(entry.allowedHost, 'i').test(host) : true;
    } catch {
        return false;
    }
}

function htmlDecode(value) {
    return String(value || '')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#34;/gi, '"')
        .replace(/&#x27;|&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>');
}

async function fetchText(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeout || REQUEST_TIMEOUT_MS);
    try {
        const response = await fetch(url, {
            redirect: 'follow',
            headers: {
                'User-Agent': USER_AGENT,
                Accept: options.accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
                ...(options.headers || {})
            },
            signal: controller.signal
        });
        const text = await response.text();
        return { response, text: text.slice(0, MAX_BODY_BYTES) };
    } finally {
        clearTimeout(timer);
    }
}

function isCloudflare(response, body) {
    const headers = response?.headers;
    const marker = [
        headers?.get?.('cf-mitigated') || '',
        headers?.get?.('server') || '',
        body || ''
    ].join(' ').toLowerCase();
    return response?.status === 403 && (
        marker.includes('challenge') ||
        marker.includes('just a moment') ||
        marker.includes('cf-chl-') ||
        marker.includes('/challenge-platform/')
    );
}

function signatureMatches(entry, body) {
    const text = String(body || '').toLowerCase();
    const signatures = Array.isArray(entry.signatures) ? entry.signatures : [];
    if (!signatures.length) return true;
    // A page signature list is intentionally OR: different skins of the same
    // site often expose only one of the known markers on their home page.
    return signatures.some(signature => text.includes(String(signature).toLowerCase()));
}

async function probeDomain(entry, domain) {
    const normalized = normalizeDomain(domain);
    if (!normalized || !hostAllowed(entry, normalized)) {
        return { domain: normalized || domain, ok: false, status: 'invalid' };
    }

    try {
        const { response, text } = await fetchText(`${normalized}/`);
        const finalDomain = normalizeDomain(response.url || normalized);
        const cloudflare = isCloudflare(response, text);
        const signature = signatureMatches(entry, text);
        const ok = response.status >= 200 && response.status < 400 && !cloudflare && signature;
        let status = ok ? 'active' : `http-${response.status}`;
        if (cloudflare) status = 'blocked-cloudflare';
        else if (response.status >= 200 && response.status < 400 && !signature) status = 'unverified-signature';

        return {
            domain: normalized,
            finalDomain,
            status,
            httpStatus: response.status,
            ok,
            redirected: finalDomain && finalDomain !== normalized
        };
    } catch (error) {
        return { domain: normalized, ok: false, status: 'network-error', error: error.message };
    }
}

function resultLinks(html) {
    const links = [];
    const seen = new Set();
    const add = raw => {
        let value = htmlDecode(raw).trim();
        if (!value) return;
        try {
            // DuckDuckGo wraps result links in uddg=; Bing/HTML pages usually
            // expose the destination directly.
            const wrapped = new URL(value, 'https://html.duckduckgo.com');
            const uddg = wrapped.searchParams.get('uddg');
            if (uddg) value = uddg;
        } catch {
            // continue with the raw value
        }
        try {
            const url = new URL(value);
            if (!/^https?:$/.test(url.protocol)) return;
            const key = `${url.protocol}//${url.hostname.toLowerCase()}`;
            if (seen.has(key)) return;
            seen.add(key);
            links.push(`${url.protocol}//${url.hostname.toLowerCase()}`);
        } catch {
            // ignore malformed search result
        }
    };

    const patterns = [
        /class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["']/gi,
        /href=["']([^"']+)["'][^>]*class=["'][^"']*result__a[^"']*["']/gi,
        /<h2[^>]*>\s*<a[^>]*href=["']([^"']+)["']/gi,
        /<a[^>]*href=["'](https?:\/\/[^"']+)["']/gi
    ];
    for (const re of patterns) {
        let match;
        while ((match = re.exec(String(html || ''))) !== null) add(match[1]);
    }
    return links;
}

async function searchWeb(query) {
    const encoded = encodeURIComponent(query);
    const urls = [
        `https://html.duckduckgo.com/html/?q=${encoded}`,
        `https://www.bing.com/search?q=${encoded}`
    ];
    const found = [];
    const seen = new Set();
    for (const url of urls) {
        try {
            const { text: body } = await fetchText(url, { timeout: 10000 });
            for (const link of resultLinks(body)) {
                const key = domainKey(link);
                if (seen.has(key)) continue;
                seen.add(key);
                found.push(link);
            }
            if (found.length) break;
        } catch {
            // Try the next ordinary search endpoint.
        }
        await sleep(150);
    }
    return found;
}

function loadRegistry() {
    const parsed = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || !parsed.providers) {
        throw new Error('domains.json geçersiz: providers eksik');
    }
    return parsed;
}

function formatResult(result) {
    const extra = result.error ? ` (${result.error})` : '';
    return `${result.domain} → ${result.status}${result.httpStatus ? `/${result.httpStatus}` : ''}${extra}`;
}

async function refreshProvider(id, entry) {
    const current = uniqueDomains(entry.domains || []).filter(domain => hostAllowed(entry, domain));
    const candidates = [...current];

    if (entry.autoDiscover && Array.isArray(entry.searchQueries)) {
        for (const query of entry.searchQueries.slice(0, 3)) {
            const links = await searchWeb(query);
            for (const link of links) {
                if (hostAllowed(entry, link)) candidates.push(link);
            }
            // Search results are noisy; two queries are usually enough and
            // keeps the daily workflow polite to public search endpoints.
            if (candidates.length > current.length + 5) break;
        }
    }

    const results = [];
    const seen = new Set();
    for (const domain of uniqueDomains(candidates).slice(0, 12)) {
        const key = domainKey(domain);
        if (seen.has(key)) continue;
        seen.add(key);
        const result = await probeDomain(entry, domain);
        results.push(result);
        console.log(`  ${formatResult(result)}`);
    }

    const active = results.filter(result => result.ok && hostAllowed(entry, result.finalDomain || result.domain));
    const verifiedDomains = uniqueDomains(active.map(result => result.finalDomain || result.domain));
    const oldActive = current.filter(domain => results.find(result => domainKey(result.domain) === domainKey(domain) && result.ok));
    const newDomains = uniqueDomains([...verifiedDomains, ...oldActive, ...current]);

    // Never replace a domain with an unverified search result. Keeping current
    // fallbacks is deliberate: a site may briefly rate-limit the health check.
    const next = { ...entry, domains: newDomains };
    if (active.length) {
        next.status = 'active';
    }

    const changed = JSON.stringify(next) !== JSON.stringify(entry);
    return { id, next, changed, results, hasActive: active.length > 0 };
}

async function main() {
    const registry = loadRegistry();
    const updates = [];
    let requiredFailure = false;

    for (const [id, entry] of Object.entries(registry.providers)) {
        console.log(`\n=== ${id} ===`);
        const update = await refreshProvider(id, entry);
        updates.push(update);
        if (entry.required && !update.hasActive) requiredFailure = true;
    }

    const changed = updates.some(update => update.changed);
    if (changed) {
        registry.updatedAt = new Date().toISOString();
        for (const update of updates) {
            if (update.changed) registry.providers[update.id] = update.next;
        }
    }

    if (DRY_RUN) {
        console.log('\n[dry-run] domains.json yazılmadı.');
    } else if (changed) {
        fs.writeFileSync(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`);
        console.log('\n✅ domains.json güncellendi.');
    } else {
        console.log('\n✅ Doğrulanmış değişiklik yok; domains.json aynı bırakıldı.');
    }

    if (requiredFailure) {
        // Ulaşılamayan bir siteyi kayıttan silmek veya doğrulanmamış adrese
        // geçmek güvenli değildir; ancak bu durum keşif işinin diğer
        // provider'larda doğrulanmış güncellemeleri yayımlamasını engellemez.
        console.error('⚠️  En az bir zorunlu provider doğrudan doğrulanamadı. Mevcut fallback adresleri korunuyor.');
    }
}

main().catch(error => {
    console.error('refresh-domains.js hata verdi:', error.message);
    process.exitCode = 1;
});
