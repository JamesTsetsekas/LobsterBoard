const os = require('os');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(process.env.HOME || os.homedir(), '.claude', '.credentials.json');

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

async function fetchUsage() {
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

  if (!resp.ok) {
    return { error: `API returned ${resp.status}` };
  }

  const data = await resp.json();
  return { subscription: sub, tier, ...data };
}

module.exports = function(ctx) {
  return {
    routes: {
      'GET /usage': async (req, res) => {
        return await fetchUsage();
      }
    }
  };
};
