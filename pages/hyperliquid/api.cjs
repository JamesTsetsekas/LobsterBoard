const os = require('os');
const https = require('https');
const fs = require('fs');
const path = require('path');

const MASTER_WALLET = process.env.HYPERLIQUID_MASTER_WALLET || '';
const TRADING_WALLET = process.env.HYPERLIQUID_WALLET || '';

function hlInfoPost(payload) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    const req = https.request('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 15000
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve({ error: 'parse error', raw: body.slice(0, 200) }); }
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout' }); });
    req.write(data);
    req.end();
  });
}

module.exports = function(ctx) {
  return {
    routes: {
      'GET /account': async (req, res) => {
        const wallet = TRADING_WALLET || MASTER_WALLET;
        if (!wallet) return { error: 'No wallet configured' };
        // Use perps clearinghouse for trading wallet balance
        const data = await hlInfoPost({ type: 'clearinghouseState', user: wallet });
        if (data.error) return data;
        const accountValue = data.marginSummary ? parseFloat(data.marginSummary.accountValue) : 0;
        return {
          balance: accountValue,
          address: wallet
        };
      },
      'GET /positions': async (req, res) => {
        const wallet = TRADING_WALLET || MASTER_WALLET;
        if (!wallet) return { error: 'No wallet configured' };
        const data = await hlInfoPost({ type: 'clearinghouseState', user: wallet });
        if (data.error) return data;
        return (data.assetPositions || []).map(p => ({
          coin: p.position.coin,
          side: parseFloat(p.position.szi) >= 0 ? 'Long' : 'Short',
          sz: Math.abs(parseFloat(p.position.szi)),
          entryPx: parseFloat(p.position.entryPx),
          liqPx: p.position.liquidationPx ? parseFloat(p.position.liquidationPx) : null,
          unrealizedPnl: parseFloat(p.position.unrealizedPnl)
        }));
      },
      'GET /bot-status': async (req, res) => {
        // Auto-detect Hyperliquid strategies from cron jobs (no hardcoded fallback)
        const cronJobsPath = path.join(process.env.HOME || os.homedir(), '.openclaw/cron/jobs.json');
        let strategies = [];
        try {
          const cronData = JSON.parse(fs.readFileSync(cronJobsPath, 'utf-8'));
          const hlJobs = (cronData.jobs || []).filter(j => 
            (j.payload?.message || '').includes('hl_trader.py')
          );
          strategies = hlJobs.map(j => {
            const msg = j.payload?.message || '';
            const stratMatch = msg.match(/--strategy\s+(\S+)/);
            const pairMatch = msg.match(/--pair\s+(\S+)/);
            return {
              pair: pairMatch ? pairMatch[1] : 'UNKNOWN',
              strategy: stratMatch ? stratMatch[1] : 'unknown',
              timeframe: '1h',
              enabled: j.enabled !== false
            };
          });
        } catch {}
        const tradeHistoryPath = path.join(process.env.HOME || os.homedir(), 'clawd/skills/hyperliquid/trade_history.jsonl');
        let trades = [];
        try {
          const content = fs.readFileSync(tradeHistoryPath, 'utf-8').trim();
          if (content) trades = content.split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
        } catch {}
        return strategies.map(s => {
          const pairTrades = trades.filter(t => (t.pair || '').toUpperCase() === s.pair);
          const lastTrade = pairTrades.length ? pairTrades[pairTrades.length - 1] : null;
          const wins = pairTrades.filter(t => t.status === 'closed' && (t.pnl || t.pl || 0) > 0).length;
          const losses = pairTrades.filter(t => t.status === 'closed' && (t.pnl || t.pl || 0) < 0).length;
          const totalPl = pairTrades.reduce((sum, t) => sum + (t.pnl || t.pl || 0), 0);
          return {
            pair: s.pair,
            strategy: s.strategy,
            timeframe: s.timeframe,
            status: s.enabled ? '🟢 Active' : '⏸️ Paused',
            totalTrades: pairTrades.length,
            wins,
            losses,
            totalPl,
            lastRun: lastTrade ? new Date(lastTrade.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'No trades yet'
          };
        });
      },
      'GET /history': async (req, res, { query }) => {
        const wallet = TRADING_WALLET || MASTER_WALLET;
        if (!wallet) return { error: 'No wallet configured' };
        const data = await hlInfoPost({ type: 'userFills', user: wallet });
        if (data.error) return data;
        const fills = Array.isArray(data) ? data : [];
        const limit = parseInt(query.limit) || 15;

        // Use dir field ("Open Long", "Close Long", "Open Short", "Close Short")
        // Pair opens with closes to form round-trip trades
        // Fills come newest-first from API, reverse to process chronologically
        const trades = [];
        const openPositions = {}; // coin -> { side, sz, px, time }
        const chronological = [...fills].reverse();

        for (const f of chronological) {
          const coin = f.coin;
          const dir = (f.dir || '').toLowerCase();
          const sz = parseFloat(f.sz);
          const px = parseFloat(f.px);
          const closedPnl = parseFloat(f.closedPnl || '0');

          if (dir.startsWith('open')) {
            const side = dir.includes('long') ? 'LONG' : 'SHORT';
            if (openPositions[coin]) {
              // Adding to existing position — average in
              const open = openPositions[coin];
              const totalSz = open.sz + sz;
              open.px = (open.px * open.sz + px * sz) / totalSz;
              open.sz = totalSz;
            } else {
              openPositions[coin] = { side, sz, px, time: f.time };
            }
          } else if (dir.startsWith('close')) {
            const open = openPositions[coin];
            if (open) {
              trades.push({
                coin,
                side: open.side,
                sz,
                entryPx: open.px,
                exitPx: px,
                pnl: Math.round(closedPnl * 100) / 100,
                openTime: open.time,
                closeTime: f.time
              });
              const remaining = open.sz - sz;
              if (remaining > 0.0001) {
                openPositions[coin].sz = remaining;
              } else {
                delete openPositions[coin];
              }
            }
          }
        }

        // Get leverage info from clearinghouse state for context
        let defaultLeverage = null;
        try {
          const state = await hlInfoPost({ type: 'clearinghouseState', user: wallet });
          if (state && state.assetPositions) {
            // If there are active positions, grab leverage from them
            for (const t of trades) {
              const pos = (state.assetPositions || []).find(p => p.position.coin === t.coin);
              if (pos) t.leverage = Math.round(parseFloat(pos.position.leverage?.value || '0'));
            }
          }
        } catch {}

        return trades.slice(-limit).reverse();
      }
    }
  };
};
