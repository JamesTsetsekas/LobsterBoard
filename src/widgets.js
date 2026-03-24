/**
 * LobsterBoard - Widget Definitions
 * Each widget defines its default size, properties, and generated code
 * 
 * @module lobsterboard/widgets
 */

export const WIDGETS = {
  // ─────────────────────────────────────────────
  // SMALL CARDS (KPI style)
  // ─────────────────────────────────────────────
  
  'weather': {
    name: 'Local Weather',
    icon: '🌡️',
    category: 'small',
    description: 'Shows current weather for a single location using Open-Meteo (no API key needed).',
    defaultWidth: 200,
    defaultHeight: 120,
    hasApiKey: false,
    properties: {
      title: 'Local Weather',
      location: 'Atlanta',
      units: 'F',
      refreshInterval: 600
    },
    preview: `<div style="text-align:center;padding:8px;">
      <div style="font-size:24px;">72°F</div>
      <div style="font-size:11px;color:#8b949e;">Atlanta</div>
    </div>`,
    generateHtml: (props) => `
      <div class="dash-card" id="widget-${props.id}" style="height:100%;">
        <div class="dash-card-head">
          <span class="dash-card-title">🌡️ ${props.title || 'Local Weather'}</span>
        </div>
        <div class="dash-card-body" style="display:flex;align-items:center;justify-content:center;gap:10px;">
          <span id="${props.id}-icon" style="font-size:24px;">🌡️</span>
          <div>
            <div class="kpi-value blue" id="${props.id}-value">—</div>
            <div class="kpi-label" id="${props.id}-label">${props.location || 'Location'}</div>
          </div>
        </div>
      </div>`,
    generateJs: (props) => `
      // Weather Widget: ${props.id} (uses free Open-Meteo API - no key needed)
      async function update_${props.id.replace(/-/g, '_')}() {
        try {
          const location = encodeURIComponent('${props.location || 'Atlanta'}');
          // Step 1: Geocode location name to lat/lon
          const geoRes = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + location + '&count=1');
          const geoData = await geoRes.json();
          if (!geoData.results || !geoData.results.length) throw new Error('Location not found');
          const { latitude, longitude, name } = geoData.results[0];
          // Step 2: Get current weather
          const units = '${props.units}' === 'C' ? 'celsius' : 'fahrenheit';
          const wxRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + latitude + '&longitude=' + longitude + '&current=temperature_2m,weather_code&temperature_unit=' + units);
          const wxData = await wxRes.json();
          const current = wxData.current;
          const temp = Math.round(current.temperature_2m);
          const unit = '${props.units}' === 'C' ? '°C' : '°F';
          document.getElementById('${props.id}-value').textContent = temp + unit;
          // WMO weather code to description & icon
          const wmo = current.weather_code;
          const wmoMap = {0:['Clear','☀️'],1:['Mostly Clear','🌤️'],2:['Partly Cloudy','⛅'],3:['Overcast','☁️'],45:['Fog','🌫️'],48:['Fog','🌫️'],51:['Light Drizzle','🌦️'],53:['Drizzle','🌦️'],55:['Heavy Drizzle','🌧️'],61:['Light Rain','🌧️'],63:['Rain','🌧️'],65:['Heavy Rain','🌧️'],71:['Light Snow','🌨️'],73:['Snow','❄️'],75:['Heavy Snow','❄️'],77:['Snow Grains','❄️'],80:['Light Showers','🌦️'],81:['Showers','🌧️'],82:['Heavy Showers','🌧️'],85:['Snow Showers','🌨️'],86:['Heavy Snow Showers','❄️'],95:['Thunderstorm','⛈️'],96:['Thunderstorm w/ Hail','⛈️'],99:['Thunderstorm w/ Hail','⛈️']};
          const [desc, icon] = wmoMap[wmo] || ['Unknown','🌡️'];
          document.getElementById('${props.id}-label').textContent = desc;
          document.getElementById('${props.id}-icon').textContent = icon;
        } catch (e) {
          console.error('Weather widget error:', e);
          document.getElementById('${props.id}-value').textContent = '—';
        }
      }
      update_${props.id.replace(/-/g, '_')}();
      setInterval(update_${props.id.replace(/-/g, '_')}, ${(props.refreshInterval || 600) * 1000});
    `
  },

  'clock': {
    name: 'Clock',
    icon: '🕐',
    category: 'small',
    description: 'Simple digital clock. Supports 12h or 24h format.',
    defaultWidth: 200,
    defaultHeight: 120,
    hasApiKey: false,
    properties: {
      title: 'Clock',
      timezone: 'local',
      format24h: false
    },
    preview: `<div style="text-align:center;padding:8px;">
      <div style="font-size:24px;">3:45 PM</div>
      <div style="font-size:11px;color:#8b949e;">Wed, Feb 5</div>
    </div>`,
    generateHtml: (props) => `
      <div class="dash-card" id="widget-${props.id}" style="height:100%;">
        <div class="dash-card-head">
          <span class="dash-card-title">🕐 ${props.title || 'Clock'}</span>
        </div>
        <div class="dash-card-body" style="display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div class="kpi-value" id="${props.id}-time">—</div>
          <div class="kpi-label" id="${props.id}-date">—</div>
        </div>
      </div>`,
    generateJs: (props) => `
      // Clock Widget: ${props.id}
      function updateClock_${props.id.replace(/-/g, '_')}() {
        const now = new Date();
        const timeEl = document.getElementById('${props.id}-time');
        const dateEl = document.getElementById('${props.id}-date');
        const opts = { hour: 'numeric', minute: '2-digit', hour12: ${!props.format24h} };
        timeEl.textContent = now.toLocaleTimeString('en-US', opts);
        dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      }
      updateClock_${props.id.replace(/-/g, '_')}();
      setInterval(updateClock_${props.id.replace(/-/g, '_')}, 1000);
    `
  },

  'auth-status': {
    name: 'Auth Status',
    icon: '🔐',
    category: 'small',
    description: 'Shows if OpenClaw is using Anthropic Max subscription (green) or API key fallback (yellow).',
    defaultWidth: 180,
    defaultHeight: 100,
    hasApiKey: true,
    apiKeyName: 'OPENCLAW_API',
    properties: {
      title: 'Auth Type',
      endpoint: '/api/status',
      refreshInterval: 30
    },
    preview: `<div style="text-align:center;padding:8px;">
      <div style="width:10px;height:10px;background:#3fb950;border-radius:50%;margin:0 auto 4px;"></div>
      <div style="font-size:13px;">OAuth</div>
      <div style="font-size:11px;color:#8b949e;">Auth</div>
    </div>`,
    generateHtml: (props) => `
      <div class="dash-card" id="widget-${props.id}" style="height:100%;">
        <div class="dash-card-head">
          <span class="dash-card-title">🔐 ${props.title || 'Auth Type'}</span>
        </div>
        <div class="dash-card-body" style="display:flex;align-items:center;justify-content:center;gap:10px;">
          <div class="kpi-indicator" id="${props.id}-dot"></div>
          <div class="kpi-value" id="${props.id}-value">—</div>
        </div>
      </div>`,
    generateJs: (props) => `
      // Auth Status Widget: ${props.id}
      async function update_${props.id.replace(/-/g, '_')}() {
        try {
          const res = await fetch('${props.endpoint || '/api/status'}');
          const json = await res.json();
          const data = json.data || json;
          const dot = document.getElementById('${props.id}-dot');
          const val = document.getElementById('${props.id}-value');
          val.textContent = data.authMode === 'oauth' ? 'Subscription' : 'API';
          dot.className = 'kpi-indicator ' + (data.authMode === 'oauth' ? 'green' : 'yellow');
        } catch (e) {
          console.error('Auth status widget error:', e);
          document.getElementById('${props.id}-value').textContent = '—';
        }
      }
      update_${props.id.replace(/-/g, '_')}();
      setInterval(update_${props.id.replace(/-/g, '_')}, ${(props.refreshInterval || 30) * 1000});
    `
  },

  'session-count': {
    name: 'Active Sessions',
    icon: '💬',
    category: 'small',
    description: 'Shows count of active OpenClaw sessions.',
    defaultWidth: 160,
    defaultHeight: 100,
    hasApiKey: true,
    apiKeyName: 'OPENCLAW_API',
    properties: {
      title: 'Sessions',
      endpoint: '/api/sessions',
      refreshInterval: 30
    },
    preview: `<div style="text-align:center;padding:8px;">
      <div style="font-size:28px;color:#58a6ff;">3</div>
      <div style="font-size:11px;color:#8b949e;">Active</div>
    </div>`,
    generateHtml: (props) => `
      <div class="kpi-card kpi-sm" id="widget-${props.id}">
        <div class="kpi-icon">💬</div>
        <div class="kpi-data">
          <div class="kpi-value blue" id="${props.id}-count">—</div>
          <div class="kpi-label">Active</div>
        </div>
      </div>`,
    generateJs: (props) => `
      // Session Count Widget: ${props.id}
      async function update_${props.id.replace(/-/g, '_')}() {
        try {
          const res = await fetch('${props.endpoint || '/api/sessions'}');
          const json = await res.json();
          const data = json.data || json;
          document.getElementById('${props.id}-count').textContent = data.active || data.length || 0;
        } catch (e) {
          document.getElementById('${props.id}-count').textContent = '—';
        }
      }
      update_${props.id.replace(/-/g, '_')}();
      setInterval(update_${props.id.replace(/-/g, '_')}, ${(props.refreshInterval || 30) * 1000});
    `
  },

  // ─────────────────────────────────────────────
  // LARGE CARDS (Content)
  // ─────────────────────────────────────────────

  'activity-list': {
    name: 'Activity List',
    icon: '📋',
    category: 'large',
    description: 'Shows recent OpenClaw activity from /api/activity endpoint.',
    defaultWidth: 400,
    defaultHeight: 300,
    hasApiKey: true,
    apiKeyName: 'OPENCLAW_API',
    properties: {
      title: 'Today',
      endpoint: '/api/activity',
      maxItems: 10,
      refreshInterval: 60
    },
    preview: `<div style="padding:4px;font-size:11px;color:#8b949e;">
      <div>• Meeting at 2pm</div>
      <div>• Review PR #42</div>
      <div>• Deploy v1.2</div>
    </div>`,
    generateHtml: (props) => `
      <div class="dash-card" id="widget-${props.id}" style="height:100%;">
        <div class="dash-card-head">
          <span class="dash-card-title">📋 ${props.title || 'Today'}</span>
          <span class="dash-card-badge" id="${props.id}-badge">—</span>
        </div>
        <div class="dash-card-body compact-list" id="${props.id}-list">
          <div class="list-item">• Team standup at 10am</div>
          <div class="list-item">• Review PR #42</div>
        </div>
      </div>`,
    generateJs: (props) => `
      // Activity List Widget: ${props.id}
      async function update_${props.id.replace(/-/g, '_')}() {
        try {
          const res = await fetch('${props.endpoint || '/api/activity'}');
          const json = await res.json();
          const data = json.data || json;
          const list = document.getElementById('${props.id}-list');
          const badge = document.getElementById('${props.id}-badge');
          const items = data.items || [];
          list.innerHTML = items.slice(0, ${props.maxItems || 10}).map(item => 
            '<div class="list-item">' + item.text + '</div>'
          ).join('');
          badge.textContent = items.length + ' items';
        } catch (e) {
          console.error('Activity list widget error:', e);
          document.getElementById('${props.id}-list').innerHTML = '<div class="list-item">—</div>';
        }
      }
      update_${props.id.replace(/-/g, '_')}();
      setInterval(update_${props.id.replace(/-/g, '_')}, ${(props.refreshInterval || 60) * 1000});
    `
  },

  'cron-jobs': {
    name: 'Cron Jobs',
    icon: '⏰',
    category: 'large',
    description: 'Lists scheduled cron jobs from OpenClaw /api/cron endpoint.',
    defaultWidth: 400,
    defaultHeight: 250,
    hasApiKey: true,
    apiKeyName: 'OPENCLAW_API',
    properties: {
      title: 'Cron',
      endpoint: '/api/cron',
      refreshInterval: 30
    },
    preview: `<div style="padding:4px;font-size:11px;color:#8b949e;">
      <div>⏰ Daily backup - 2am</div>
      <div>⏰ Sync data - */5 *</div>
    </div>`,
    generateHtml: (props) => `
      <div class="dash-card" id="widget-${props.id}" style="height:100%;">
        <div class="dash-card-head">
          <span class="dash-card-title">⏰ ${props.title || 'Cron'}</span>
          <span class="dash-card-badge" id="${props.id}-badge">—</span>
        </div>
        <div class="dash-card-body" id="${props.id}-list">
          <div class="cron-item"><span class="cron-name">Daily backup</span><span class="cron-next">2:00 AM</span></div>
        </div>
      </div>`,
    generateJs: (props) => `
      // Cron Jobs Widget: ${props.id}
      async function update_${props.id.replace(/-/g, '_')}() {
        try {
          const res = await fetch('${props.endpoint || '/api/cron'}');
          const json = await res.json();
          const data = json.data || json;
          const list = document.getElementById('${props.id}-list');
          const badge = document.getElementById('${props.id}-badge');
          const jobs = data.jobs || [];
          list.innerHTML = jobs.map(job => 
            '<div class="cron-item"><span class="cron-name">' + job.name + '</span><span class="cron-next">' + job.next + '</span></div>'
          ).join('');
          badge.textContent = jobs.length + ' jobs';
        } catch (e) {
          console.error('Cron jobs widget error:', e);
          document.getElementById('${props.id}-list').innerHTML = '<div class="cron-item"><span class="cron-name">—</span></div>';
        }
      }
      update_${props.id.replace(/-/g, '_')}();
      setInterval(update_${props.id.replace(/-/g, '_')}, ${(props.refreshInterval || 30) * 1000});
    `
  },

  'system-log': {
    name: 'System Log',
    icon: '🔧',
    category: 'large',
    description: 'Shows recent system logs from OpenClaw /api/logs endpoint.',
    defaultWidth: 500,
    defaultHeight: 400,
    hasApiKey: true,
    apiKeyName: 'OPENCLAW_API',
    properties: {
      title: 'System Log',
      endpoint: '/api/logs',
      maxLines: 50,
      refreshInterval: 10
    },
    preview: `<div style="padding:4px;font-size:10px;font-family:monospace;color:#8b949e;">
      <div>[INFO] System started</div>
      <div>[DEBUG] Loading config</div>
    </div>`,
    generateHtml: (props) => `
      <div class="dash-card" id="widget-${props.id}" style="height:100%;">
        <div class="dash-card-head">
          <span class="dash-card-title">🔧 ${props.title || 'System Log'}</span>
          <span class="dash-card-badge" id="${props.id}-badge">—</span>
        </div>
        <div class="dash-card-body compact-list syslog-scroll" id="${props.id}-log">
          <div class="log-line">[INFO] System started successfully</div>
        </div>
      </div>`,
    generateJs: (props) => `
      // System Log Widget: ${props.id}
      async function update_${props.id.replace(/-/g, '_')}() {
        try {
          const res = await fetch('${props.endpoint || '/api/logs'}');
          const json = await res.json();
          const data = json.data || json;
          const log = document.getElementById('${props.id}-log');
          const badge = document.getElementById('${props.id}-badge');
          const lines = data.lines || [];
          log.innerHTML = lines.slice(-${props.maxLines || 50}).map(line => 
            '<div class="log-line">' + line + '</div>'
          ).join('');
          badge.textContent = lines.length + ' lines';
          log.scrollTop = log.scrollHeight;
        } catch (e) {
          console.error('System log widget error:', e);
          document.getElementById('${props.id}-log').innerHTML = '<div class="log-line">—</div>';
        }
      }
      update_${props.id.replace(/-/g, '_')}();
      setInterval(update_${props.id.replace(/-/g, '_')}, ${(props.refreshInterval || 10) * 1000});
    `
  },

  // ─────────────────────────────────────────────
  // BARS
  // ─────────────────────────────────────────────

  'pages-menu': {
    name: 'Pages Menu',
    icon: '📑',
    category: 'small',
    description: 'Navigation links to all discovered LobsterBoard pages. Supports vertical or horizontal layout.',
    defaultWidth: 220,
    defaultHeight: 200,
    hasApiKey: false,
    properties: {
      title: 'Pages',
      layout: 'vertical',
      refreshInterval: 60
    },
    preview: `<div style="padding:6px;font-size:11px;color:#8b949e;">
      <div>📝 Notes</div>
      <div>📋 Board</div>
      <div>📅 Calendar</div>
    </div>`,
    generateHtml: (props) => `
      <div class="dash-card" id="widget-${props.id}" style="height:100%;">
        <div class="dash-card-head">
          <span class="dash-card-title">📑 ${props.title || 'Pages'}</span>
        </div>
        <div class="dash-card-body pages-menu ${props.layout === 'horizontal' ? 'pages-menu-horizontal' : 'pages-menu-vertical'}" id="${props.id}-list">
          <span class="pages-menu-item">Loading…</span>
        </div>
      </div>
      <style>
        .pages-menu-vertical { display:flex; flex-direction:column; gap:4px; overflow-y:auto; }
        .pages-menu-horizontal { display:flex; flex-direction:row; flex-wrap:wrap; gap:6px; align-items:center; }
        .pages-menu-item {
          display:inline-flex; align-items:center; gap:6px;
          padding:6px 10px; border-radius:6px;
          background:#21262d; color:#c9d1d9;
          text-decoration:none; font-size:13px;
          transition: background .15s, color .15s;
        }
        .pages-menu-item:hover { background:#30363d; color:#58a6ff; }
        .pages-menu-item .pages-menu-icon { font-size:15px; }
      </style>`,
    generateJs: (props) => `
      // Pages Menu Widget: ${props.id}
      async function update_${props.id.replace(/-/g, '_')}() {
        try {
          const res = await fetch('/api/pages');
          const pages = await res.json();
          const list = document.getElementById('${props.id}-list');
          if (!pages.length) { list.innerHTML = '<span class="pages-menu-item">No pages found</span>'; return; }
          list.innerHTML = pages.map(p =>
            '<a class="pages-menu-item" href="/pages/' + p.id + '" title="' + (p.description || p.title || p.name || '') + '">' +
            '<span class="pages-menu-icon">' + (p.icon || '📄') + '</span>' +
            '<span>' + (p.title || p.name || p.id) + '</span></a>'
          ).join('');
        } catch (e) {
          console.error('Pages menu widget error:', e);
          document.getElementById('${props.id}-list').innerHTML = '<span class="pages-menu-item">Error loading pages</span>';
        }
      }
      update_${props.id.replace(/-/g, '_')}();
      setInterval(update_${props.id.replace(/-/g, '_')}, ${(props.refreshInterval || 60) * 1000});
    `
  },

  'topbar': {
    name: 'Top Nav Bar',
    icon: '🔝',
    category: 'bar',
    description: 'Navigation bar with clock, weather, and system stats.',
    defaultWidth: 1920,
    defaultHeight: 48,
    hasApiKey: false,
    properties: {
      title: 'OpenClaw',
      links: 'Dashboard,Activity,Settings'
    },
    preview: `<div style="background:#161b22;padding:8px;font-size:11px;display:flex;gap:12px;">
      <span>🤖 OpenClaw</span>
      <span style="color:#58a6ff;">Dashboard</span>
    </div>`,
    generateHtml: (props) => `
      <nav class="topbar" id="widget-${props.id}">
        <div class="topbar-left">
          <span class="topbar-brand">🤖 ${props.title || 'OpenClaw'}</span>
          ${(props.links || 'Dashboard').split(',').map((link, i) => 
            `<a href="#" class="topbar-link${i === 0 ? ' active' : ''}">${link.trim()}</a>`
          ).join('')}
        </div>
        <div class="topbar-right">
          <span class="topbar-meta" id="${props.id}-refresh">—</span>
          <button class="topbar-refresh" onclick="location.reload()" title="Refresh">↻</button>
        </div>
      </nav>`,
    generateJs: (props) => `
      // Top Bar Widget: ${props.id}
      document.getElementById('${props.id}-refresh').textContent = 
        new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    `
  },

  'lnmarkets-balance': {
    name: 'LN Markets',
    icon: '📈',
    category: 'small',
    description: 'LN Markets account balance, open positions count, and PnL.',
    defaultWidth: 260,
    defaultHeight: 140,
    hasApiKey: false,
    properties: { title: 'LN Markets', refreshInterval: 60 },
    preview: `<div style="padding:8px;text-align:center;"><div style="font-size:20px;font-weight:700;color:#f7931a;">494,411 sats</div><div style="font-size:10px;color:#8b949e;">LN Markets</div></div>`,
    generateHtml: (props) => `<div class="dash-card" id="widget-${props.id}" style="height:100%;"><div class="dash-card-head"><span class="dash-card-title">📈 ${props.title||'LN Markets'}</span></div><div class="dash-card-body" id="${props.id}-body" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:8px;"><div style="color:#8b949e;">Loading...</div></div></div>`,
    generateJs: (props) => `
      function fmtS_${props.id.replace(/-/g,'_')}(n){return n!=null?Number(n).toLocaleString():'—';}
      async function update_${props.id.replace(/-/g,'_')}(){const body=document.getElementById('${props.id}-body');try{const[a,p]=await Promise.allSettled([fetch('/api/pages/lightning/lnmarkets/account').then(r=>r.json()),fetch('/api/pages/lightning/lnmarkets/running').then(r=>r.json())]);const acct=a.status==='fulfilled'?a.value:null;const pos=p.status==='fulfilled'&&Array.isArray(p.value)?p.value:[];const bal=acct&&acct.balance!=null?Number(acct.balance):null;const pl=pos.reduce((s,x)=>s+(Number(x.pl)||0),0);let h='<div style="font-size:calc(22px * var(--font-scale,1));font-weight:700;color:#f7931a;">'+fmtS_${props.id.replace(/-/g,'_')}(bal)+' sats</div>';h+='<div style="font-size:calc(10px * var(--font-scale,1));color:#8b949e;">';h+=pos.length>0?pos.length+' open · P&L: <span style="color:'+(pl>=0?'#3fb950':'#f85149')+';">'+(pl>=0?'+':'')+fmtS_${props.id.replace(/-/g,'_')}(pl)+'</span>':'No open positions';h+='</div>';body.innerHTML=h;}catch(e){body.innerHTML='<div style="color:#f85149;">Failed</div>';}}
      update_${props.id.replace(/-/g,'_')}();setInterval(update_${props.id.replace(/-/g,'_')},${(props.refreshInterval||60)*1000});
    `
  },

  'lnbits-balance': {
    name: 'LNbits Wallet',
    icon: '🏦',
    category: 'small',
    description: 'LNbits wallet balance.',
    defaultWidth: 200,
    defaultHeight: 140,
    hasApiKey: false,
    properties: { title: 'LNbits', refreshInterval: 60 },
    preview: `<div style="padding:8px;text-align:center;"><div style="font-size:20px;font-weight:700;color:#f7931a;">0 sats</div><div style="font-size:10px;color:#8b949e;">LNbits</div></div>`,
    generateHtml: (props) => `<div class="dash-card" id="widget-${props.id}" style="height:100%;"><div class="dash-card-head"><span class="dash-card-title">🏦 ${props.title||'LNbits'}</span></div><div class="dash-card-body" id="${props.id}-body" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:8px;"><div style="color:#8b949e;">Loading...</div></div></div>`,
    generateJs: (props) => `
      async function update_${props.id.replace(/-/g,'_')}(){const body=document.getElementById('${props.id}-body');try{const res=await fetch('/api/pages/lightning/lnbits');const d=await res.json();const bal=d.balance!=null?Math.floor(d.balance/1000):null;let h='<div style="font-size:calc(22px * var(--font-scale,1));font-weight:700;color:#f7931a;">'+(bal!=null?bal.toLocaleString():'—')+' sats</div>';h+='<div style="font-size:calc(10px * var(--font-scale,1));color:#8b949e;">'+(d.name||'LNbits')+'</div>';body.innerHTML=h;}catch(e){body.innerHTML='<div style="color:#f85149;">Failed</div>';}}
      update_${props.id.replace(/-/g,'_')}();setInterval(update_${props.id.replace(/-/g,'_')},${(props.refreshInterval||60)*1000});
    `
  },

  'claude-usage': {
    name: 'Claude Usage',
    icon: '🤖',
    category: 'large',
    description: 'Real-time Claude Code subscription usage (5h session, 7d weekly, Opus, Sonnet limits).',
    defaultWidth: 380,
    defaultHeight: 260,
    hasApiKey: false,
    properties: {
      title: 'Claude Usage',
      refreshInterval: 120
    },
    preview: `<div style="padding:8px;font-size:11px;">
      <div><b>5h Session</b> 28%</div>
      <div><b>7d Weekly</b> 31%</div>
    </div>`,
    generateHtml: (props) => `
      <div class="dash-card" id="widget-${props.id}" style="height:100%;">
        <div class="dash-card-head">
          <span class="dash-card-title">🤖 ${props.title || 'Claude Usage'}</span>
          <span id="${props.id}-sub" style="font-size:10px;color:#8b949e;margin-left:auto;"></span>
        </div>
        <div class="dash-card-body" id="${props.id}-body" style="padding:8px 12px;overflow-y:auto;">
          <div style="color:#8b949e;text-align:center;">Loading...</div>
        </div>
      </div>`,
    generateJs: (props) => `
      function barColor(pct) { return pct >= 80 ? '#f85149' : pct >= 50 ? '#d29922' : '#3fb950'; }
      function timeLeft(iso) { if (!iso) return ''; const ms = new Date(iso) - Date.now(); if (ms <= 0) return 'now'; const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000); return h > 0 ? h+'h '+m+'m' : m+'m'; }
      function usageBar(label, pct, resetIso) { const p = Math.min(100,Math.max(0,pct||0)), c = barColor(p), reset = resetIso ? '<span style="color:#8b949e;font-size:10px;">resets '+timeLeft(resetIso)+'</span>' : ''; return '<div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;margin-bottom:3px;"><span style="font-weight:600;font-size:12px;">'+label+'</span><span style="font-size:13px;font-weight:700;color:'+c+';">'+p.toFixed(0)+'%</span></div><div style="background:#21262d;border-radius:4px;height:8px;overflow:hidden;"><div style="width:'+p+'%;height:100%;background:'+c+';border-radius:4px;transition:width .5s;"></div></div>'+(reset?'<div style="text-align:right;margin-top:2px;">'+reset+'</div>':'')+'</div>'; }
      async function update_${props.id.replace(/-/g,'_')}() { const body = document.getElementById('${props.id}-body'); const subEl = document.getElementById('${props.id}-sub'); try { const res = await fetch('/api/pages/claude-usage/usage'); const d = await res.json(); if (d.error) { body.innerHTML='<div style="color:#f85149;">'+d.error+'</div>'; return; } if (subEl) { subEl.textContent = {max:'Max (5×)',pro:'Pro',free:'Free'}[d.subscription]||d.subscription||''; } let html=''; if(d.five_hour) html+=usageBar('5h Session',d.five_hour.utilization,d.five_hour.resets_at); if(d.seven_day) html+=usageBar('7d Weekly',d.seven_day.utilization,d.seven_day.resets_at); if(d.seven_day_opus) html+=usageBar('Opus (7d)',d.seven_day_opus.utilization,d.seven_day_opus.resets_at); if(d.seven_day_sonnet&&d.seven_day_sonnet.utilization>0) html+=usageBar('Sonnet (7d)',d.seven_day_sonnet.utilization,d.seven_day_sonnet.resets_at); if(d.extra_usage&&d.extra_usage.is_enabled){const used=(d.extra_usage.used_credits/100).toFixed(2),limit=d.extra_usage.monthly_limit>0?(d.extra_usage.monthly_limit/100).toFixed(2):'∞';html+='<div style="margin-top:4px;padding-top:6px;border-top:1px solid #30363d;"><div style="display:flex;justify-content:space-between;font-size:11px;"><span style="color:#8b949e;">Extra Usage</span><span style="font-weight:600;">$'+used+' / $'+limit+'</span></div></div>';} if(!html) html='<div style="color:#8b949e;">No usage data</div>'; body.innerHTML=html; } catch(e) { console.error('Claude usage error:',e); body.innerHTML='<div style="color:#f85149;">Failed to load</div>'; } }
      update_${props.id.replace(/-/g,'_')}(); setInterval(update_${props.id.replace(/-/g,'_')}, ${(props.refreshInterval||120)*1000});
    `
  }
};

// Helper to get widget categories
export function getWidgetCategories() {
  const categories = {};
  for (const [key, widget] of Object.entries(WIDGETS)) {
    const cat = widget.category || 'other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push({ key, ...widget });
  }
  return categories;
}

// Helper to get widget by type
export function getWidget(type) {
  return WIDGETS[type] || null;
}

// Helper to list all widget types
export function getWidgetTypes() {
  return Object.keys(WIDGETS);
}

export default WIDGETS;
