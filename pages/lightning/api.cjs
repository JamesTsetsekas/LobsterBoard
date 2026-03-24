const os = require('os');
const { execSync } = require('child_process');
const path = require('path');

const LNBITS_URL = process.env.LNBITS_URL || 'https://your-lnbits-instance.com';
const LNBITS_KEY = process.env.LNBITS_ADMIN_KEY || '';
const LNM_CLI = process.env.LNM_CLI_PATH || path.join(process.env.HOME || '/home/user', 'clawd/skills/lnmarkets/scripts/lnmarkets_cli.py');

// LN Markets credentials
const LNM_ENV = {
  PATH: process.env.PATH,
  HOME: process.env.HOME || os.homedir(),
  LNM_API_KEY: process.env.LNM_API_KEY || '',
  LNM_API_SECRET: process.env.LNM_API_SECRET || '',
  LNM_API_PASSPHRASE: process.env.LNM_API_PASSPHRASE || ''
};

// Try loading from user's env if not in process.env
if (!LNM_ENV.LNM_API_KEY) {
  try {
    const envOut = execSync('bash -lc "env"', { encoding: 'utf-8', timeout: 5000 });
    for (const line of envOut.split('\n')) {
      const [k, ...v] = line.split('=');
      if (k.startsWith('LNM_')) LNM_ENV[k] = v.join('=');
    }
  } catch (_) {}
}

function lnmCmd(args) {
  try {
    const out = execSync(`python3 ${LNM_CLI} ${args}`, {
      timeout: 15000,
      encoding: 'utf-8',
      env: LNM_ENV
    });
    return JSON.parse(out);
  } catch (e) {
    return { error: e.message };
  }
}

function lnbitsBalance() {
  try {
    const https = require('https');
    return new Promise((resolve) => {
      const req = https.get(`${LNBITS_URL}/api/v1/wallet`, {
        headers: { 'X-Api-Key': LNBITS_KEY },
        timeout: 10000
      }, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve({ name: data.name, balance_sats: Math.floor((data.balance || 0) / 1000) });
          } catch { resolve({ error: 'parse error' }); }
        });
      });
      req.on('error', (e) => resolve({ error: e.message }));
    });
  } catch (e) {
    return Promise.resolve({ error: e.message });
  }
}

module.exports = function(ctx) {
  return {
    routes: {
      'GET /lnbits': async (req, res) => {
        return await lnbitsBalance();
      },
      'GET /lnmarkets/account': (req, res) => {
        return lnmCmd('account');
      },
      'GET /lnmarkets/running': (req, res) => {
        return lnmCmd('isolated-running');
      },
      'GET /lnmarkets/closed': (req, res, { query }) => {
        const limit = query.limit || '10';
        return lnmCmd(`isolated-closed --limit ${limit}`);
      },
      'GET /bot-status': (req, res) => {
        const fs = require('fs');
        const tradeHistoryPath = path.join(process.env.HOME || os.homedir(), 'clawd/skills/perp-trader/trade_history.jsonl');
        let trades = [];
        try {
          const content = fs.readFileSync(tradeHistoryPath, 'utf-8').trim();
          if (content) trades = content.split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
        } catch {}
        // Auto-detect strategy from cron payload (falls back to trade history)
        let activeStrategy = 'bb_squeeze_v5';
        try {
          const cronJobsPath = path.join(process.env.HOME || os.homedir(), '.openclaw/cron/jobs.json');
          const cronData = JSON.parse(fs.readFileSync(cronJobsPath, 'utf-8'));
          const btcJob = (cronData.jobs || []).find(j => j.name === 'LN Markets BTC Trader');
          if (btcJob) {
            const match = (btcJob.payload?.message || '').match(/--strategy\s+(\S+)/);
            if (match) activeStrategy = match[1];
          }
        } catch {}
        const strategies = [
          { pair: 'BTC', strategy: activeStrategy, timeframe: '1h', cronName: 'LN Markets BTC Trader' }
        ];
        return strategies.map(s => {
          // Match trades by strategy OR show all if no strategy-tagged trades exist
          const stratTrades = trades.filter(t => (t.strategy || '') === s.strategy || (t.strategy || '') === '');
          const lastTrade = stratTrades.length ? stratTrades[stratTrades.length - 1] : null;
          const wins = stratTrades.filter(t => t.status === 'closed' && (t.pl_sats || 0) > 0).length;
          const losses = stratTrades.filter(t => t.status === 'closed' && (t.pl_sats || 0) < 0).length;
          const totalPl = stratTrades.reduce((sum, t) => sum + (t.pl_sats || 0), 0);
          return {
            pair: s.pair,
            strategy: s.strategy,
            timeframe: s.timeframe,
            status: '\u{1F7E2} Active',
            totalTrades: stratTrades.length,
            wins,
            losses,
            totalPl,
            lastRun: lastTrade ? new Date(lastTrade.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'No trades yet'
          };
        });
      }
    }
  };
};
