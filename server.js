const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

function defaultState() {
  return {
    teams: {
      a: { abbr: 'LOC', name: 'Local', color: '#1B2A6B', points: 0, fouls: 0, timeouts: 5 },
      b: { abbr: 'VIS', name: 'Visitante', color: '#F07A1A', points: 0, fouls: 0, timeouts: 5 }
    },
    quarter: 1,
    quarterSeconds: 600,
    clockRunning: false,
    possession: null,
    visibility: { scorebug: true },
    ticker: { text: '', active: false },
    sponsorBanner: { active: false, src: '', duration: 8 },
    timeoutOverlay: { active: false, team: null },
    introOverlay: { active: false },
    halftimeOverlay: { active: false },
    countdownOverlay: { active: false, seconds: 600 },
    config: { competitionName: 'Liga Nacional de Baloncesto ICN', quarterDuration: 600 }
  };
}

let state = defaultState();

app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/api/state', (req, res) => res.json(state));

app.post('/api/action', (req, res) => {
  const msg = req.body;
  switch (msg.type) {

    case 'point':
      if (msg.team && state.teams[msg.team])
        state.teams[msg.team].points = Math.max(0, (state.teams[msg.team].points || 0) + (msg.delta || 0));
      break;

    case 'foul':
      if (msg.team && state.teams[msg.team])
        state.teams[msg.team].fouls = Math.max(0, (state.teams[msg.team].fouls || 0) + (msg.delta || 0));
      break;

    case 'timeout':
      if (msg.team && state.teams[msg.team]) {
        state.teams[msg.team].timeouts = Math.max(0, (state.teams[msg.team].timeouts || 0) - 1);
        state.timeoutOverlay = { active: !!msg.active, team: msg.team || null };
      } else {
        state.timeoutOverlay = { active: !!msg.active, team: msg.team || null };
      }
      break;

    case 'nextQuarter':
      if (state.quarter < 4) {
        state.quarter += 1;
        state.teams.a.fouls = 0;
        state.teams.b.fouls = 0;
        state.quarterSeconds = state.config.quarterDuration || 600;
        state.clockRunning = false;
      }
      break;

    case 'setQuarter':
      state.quarter = msg.quarter || 1;
      break;

    case 'clock':
      if (msg.seconds !== undefined) state.quarterSeconds = msg.seconds;
      if (msg.running !== undefined) state.clockRunning = msg.running;
      break;

    case 'possession':
      state.possession = msg.team || null;
      break;

    case 'team':
      if (msg.team && state.teams[msg.team])
        Object.assign(state.teams[msg.team], msg.data || {});
      break;

    case 'toggle':
      if (msg.element) state.visibility[msg.element] = msg.value;
      break;

    case 'ticker':
      state.ticker = { text: msg.text || '', active: !!msg.active };
      break;

    case 'sponsorBanner':
      state.sponsorBanner = msg.active
        ? { active: true, src: msg.src || '', duration: msg.duration || 8 }
        : { active: false, src: '', duration: 8 };
      break;

    case 'introOverlay':
      state.introOverlay = { active: !!msg.active };
      break;

    case 'halftimeOverlay':
      state.halftimeOverlay = { active: !!msg.active };
      break;

    case 'countdownOverlay':
      state.countdownOverlay = { active: !!msg.active, seconds: msg.seconds || 600 };
      break;

    case 'config':
      Object.assign(state.config, msg.data || {});
      break;

    case 'reset':
      state = defaultState();
      break;
  }
  res.json(state);
});

const assetsDir = path.join(__dirname, 'assets');
['logos', 'sponsors', 'backgrounds', 'teams'].forEach(d =>
  fs.mkdirSync(path.join(assetsDir, d), { recursive: true })
);

app.use('/assets', express.static(assetsDir));
app.use(express.static(__dirname));
app.get('/', (req, res) => res.redirect('/dock.html'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🏀 LNB-ICN Overlays — puerto ${PORT}\n`);
});
