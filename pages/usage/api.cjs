module.exports = function createUsageApi() {
  return {
    routes: {
      'GET /usage': async () => {
        try {
          const fs = require('fs');
          const auth = JSON.parse(fs.readFileSync('/home/openclaw/.codex/auth.json', 'utf8'));
          const token = auth.tokens.access_token;
          const whamResp = await fetch('https://chatgpt.com/backend-api/wham/usage', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });
          const wham = await whamResp.json();
          if (!whamResp.ok) return { error: wham.error || 'Failed to fetch Codex limits' };

          const costResp = await fetch('http://127.0.0.1:60012/api/usage');
          const costData = await costResp.json().catch(() => ({}));
          const totalCost = costData.totalCost || 0;
          const byModel = costData.byModel || costData.models || {};
          const codexEntries = Object.entries(byModel).filter(([name]) => name.includes('openai-codex/') || name.includes('gpt-5.4') || name.toLowerCase().includes('codex'));
          const codexCost = codexEntries.reduce((sum, [, info]) => sum + (info.cost || 0), 0);

          const topModels = Object.entries(byModel)
            .map(([name, info]) => ({ name, cost: info.cost || 0 }))
            .sort((a, b) => b.cost - a.cost)
            .slice(0, 5);

          const primary = wham.rate_limit?.primary_window || null;
          const secondary = wham.rate_limit?.secondary_window || null;
          const spark = (wham.additional_rate_limits || []).find(x => (x.limit_name || '').includes('GPT-5.3-Codex-Spark')) || null;

          return {
            email: wham.email,
            planType: wham.plan_type,
            session: primary,
            weekly: secondary,
            sparkSession: spark?.rate_limit?.primary_window || null,
            sparkWeekly: spark?.rate_limit?.secondary_window || null,
            credits: wham.credits || null,
            totalCost,
            codexCost,
            topModels,
            weekProgressNote: 'Week Progress is a separate pacing tracker, not the Codex weekly limit.'
          };
        } catch (error) {
          return { error: error.message };
        }
      }
    }
  };
};
