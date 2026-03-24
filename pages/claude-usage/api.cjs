const os = require('os');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(process.env.HOME || os.homedir(), '.claude', '.credentials.json');
const CACHE_TTL_MS = 120_000; // 2 minutes — Anthropic rate limits are strict

// In-memory cache: survives across requests, resets on server restart
let _cache = { data: null, ts: 0, error: null, errorTs: 0 };

function readCredentials() {
  return JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
}

function isTokenExpired(creds) {
  return Date.now() > (creds.claudeAiOauth?.expiresAt || 0);
}

function refreshToken() {
  try {
    execSync('echo "hi" | claude -p "hi" 2>/dev/null', {
      timeout: 45000,
      encoding: 'utf-8',
      env: { ...process.env, HOME: process.env.HOME || os.homedir() }
    });
  } catch (_) {}
}

async function fetchUsageFresh() {
  let creds = readCredentials();

  if (isTokenExpired(creds)) {
    refreshToken();
    creds = readCredentials();
    if (isTokenExpired(creds)) {
      return { error: 'Token expired and refresh failed' };
    }
  }

  const token = creds.claudeAiOauth.accessToken;
  const tier = creds.claudeAiOauth.rateLimitTier || 'unknown';
  const sub = creds.claudeAiOauth.subscriptionType || 'unknown';

  const resp = await fetch('https://api.anthropic.com/api/oauth/usage', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'claude-code/2.1.42',
      'anthropic-beta': 'oauth-2025-04-20'
    }
  });

  if (resp.status === 429) {
    // Rate limited — return stale cache if available, otherwise error
    if (_cache.data) {
      return { ..._cache.data, cached: true, stale: true };
    }
    return { error: 'Rate limited (429). Try again in a few minutes.' };
  }

  if (!resp.ok) {
    return { error: `API returned ${resp.status}` };
  }

  const data = await resp.json();
  return { subscription: sub, tier, ...data };
}

async function fetchUsageCached() {
  const now = Date.now();

  // Return cached data if fresh
  if (_cache.data && (now - _cache.ts) < CACHE_TTL_MS) {
    return { ..._cache.data, cached: true };
  }

  // Fetch fresh
  const result = await fetchUsageFresh();

  // Cache successful results
  if (!result.error) {
    _cache.data = result;
    _cache.ts = now;
    _cache.error = null;
  } else if (result.error.includes('429') || result.error.includes('rate')) {
    // On rate limit, return stale cache if available
    if (_cache.data) {
      return { ..._cache.data, cached: true, stale: true };
    }
    // Cache the error briefly (30s) to avoid hammering
    _cache.error = result;
    _cache.errorTs = now;
  }

  return result;
}

module.exports = function(ctx) {
  return {
    routes: {
      'GET /usage': async (req, res) => {
        return await fetchUsageCached();
      }
    }
  };
};
