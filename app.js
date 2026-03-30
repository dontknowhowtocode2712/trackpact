// ============================================================
// TRACKPACT — app.js
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyBAoI6SANqUcMjPPYgSKQaZutmUeQPkxzo",
  authDomain: "trackpact-3ca1f.firebaseapp.com",
  projectId: "trackpact-3ca1f",
  storageBucket: "trackpact-3ca1f.firebasestorage.app",
  messagingSenderId: "620640866887",
  appId: "1:620640866887:web:63dd25ba66cef9b3319762"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ============================================================
// CONSTANTS
// ============================================================

const PLAYERS = ['Arun', 'Shivik', 'Krutik'];
const ADMIN_PASSWORD = 'trackpact2026';
const STAKE = 10;

const AVATAR_CLASSES = { Arun: 'av-a', Shivik: 'av-s', Krutik: 'av-k' };
const AVATAR_INITIALS = { Arun: 'AR', Shivik: 'SH', Krutik: 'KR' };

const DEFAULT_TASKS = {
  Fitness: ['Stretching', 'Gym / Run / Swimming / Padel / Physical activity'],
  Work: ['Deep work > 2 hours', 'New learning'],
  Habits: ['6–7+ hours of timely sleep', 'Eat clean and no drinking'],
  'Good for life': ['Read > 30 mins', 'Cold shower', 'Meditate 10 mins', 'Mindful reflection']
};

const CATEGORY_ICONS = {
  Fitness: '💪',
  Work: '💼',
  Habits: '🌱',
  'Good for life': '✨'
};

const CATEGORY_ICON_CLASSES = {
  Fitness: 'ci-fitness',
  Work: 'ci-work',
  Habits: 'ci-habits',
  'Good for life': 'ci-good'
};

// ============================================================
// STATE
// ============================================================

let currentUser = null;
let currentDayIndex = 0;
let selectedDayIndex = 0;
let weekData = {};
let taskList = {};
let weekHistory = [];
let pledgeChecked = false;
let pinComplete = false;
let nameSelected = false;
let unsubscribers = [];

// ============================================================
// GST TIME HELPERS
// ============================================================

function getGSTNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
}

function getGSTDateString(date) {
  const d = date || getGSTNow();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function getWeekStart(date) {
  const d = date || getGSTNow();
  const day = d.getDay();
  const diff = (day === 0) ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function getWeekDates() {
  const mon = getWeekStart();
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function getWeekNumber(date) {
  const d = date || getGSTNow();
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - start) / 86400000 + 1) / 7);
}

function formatDateLong(date) {
  const day = date.getDate();
  const suffix = [11,12,13].includes(day) ? 'th' :
    ['st','nd','rd'][((day % 10) - 1)] || 'th';
  const months = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  return `${day}${suffix} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateShort(date) {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const day = date.getDate();
  const suffix = [11,12,13].includes(day) ? 'th' :
    ['st','nd','rd'][((day % 10) - 1)] || 'th';
  return `${days[date.getDay()]}, ${day}${suffix}`;
}

function isEditable(date) {
  const now = getGSTNow();
  const todayStr = getGSTDateString(now);
  const dateStr = getGSTDateString(date);
  if (dateStr === todayStr) return true;
  const diff = now - date;
  return diff > 0 && diff < 86400000 * 2;
}

function isFuture(date) {
  const todayStr = getGSTDateString(getGSTNow());
  const dateStr = getGSTDateString(date);
  return dateStr > todayStr;
}

function isPast(date) {
  const todayStr = getGSTDateString(getGSTNow());
  const dateStr = getGSTDateString(date);
  return dateStr < todayStr;
}

function isToday(date) {
  return getGSTDateString(date) === getGSTDateString(getGSTNow());
}

function getWeekId() {
  const mon = getWeekStart();
  return getGSTDateString(mon);
}

// ============================================================
// INTEGRITY GATE
// ============================================================

function selectName(el) {
  document.querySelectorAll('.name-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  nameSelected = true;
  const name = el.dataset.name;
  document.getElementById('pledge-name').textContent = name;
  document.getElementById('pin-error').textContent = '';
  ['p1','p2','p3','p4'].forEach(id => document.getElementById(id).value = '');
  pinComplete = false;
  updateEnterBtn();
}

function movePin(el, nextId) {
  el.value = el.value.replace(/[^0-9]/g, '');
  if (el.value.length === 1) {
    const next = document.getElementById(nextId);
    if (next) next.focus();
  }
  checkPin();
}

function checkPin() {
  const vals = ['p1','p2','p3','p4'].map(id => document.getElementById(id).value);
  pinComplete = vals.every(v => v.length === 1);
  updateEnterBtn();
}

function toggleCheck() {
  pledgeChecked = !pledgeChecked;
  document.getElementById('checkbox').classList.toggle('checked', pledgeChecked);
  document.getElementById('checkbox').textContent = pledgeChecked ? '✓' : '';
  document.getElementById('check-row').classList.toggle('checked', pledgeChecked);
  updateEnterBtn();
}

function updateEnterBtn() {
  const btn = document.getElementById('enter-btn');
  const ready = nameSelected && pinComplete && pledgeChecked;
  btn.classList.toggle('ready', ready);
  btn.disabled = !ready;
  if (!nameSelected) btn.textContent = '🔒 Select your name to continue';
  else if (!pinComplete) btn.textContent = '🔒 Enter your 4-digit PIN';
  else if (!pledgeChecked) btn.textContent = '🔒 Agree to the pledge to continue';
  else btn.textContent = 'Enter TrackPact';
}

async function enterApp() {
  if (!nameSelected || !pinComplete || !pledgeChecked) return;
  const name = document.querySelector('.name-btn.selected').dataset.name;
  const pin = ['p1','p2','p3','p4'].map(id => document.getElementById(id).value).join('');
  const errorEl = document.getElementById('pin-error');
  errorEl.textContent = '';

  try {
    const userDoc = await db.collection('users').doc(name).get();
    if (userDoc.exists) {
      const stored = userDoc.data().pin;
      if (stored !== pin) {
        errorEl.textContent = 'Incorrect PIN. Please try again.';
        return;
      }
    } else {
      await db.collection('users').doc(name).set({ pin, joinedAt: new Date().toISOString() });
    }
    currentUser = name;
    localStorage.setItem('trackpact_user', name);
    await initApp();
  } catch (e) {
    errorEl.textContent = 'Connection error. Please try again.';
    console.error(e);
  }
}

// ============================================================
// APP INIT
// ============================================================

async function initApp() {
  document.getElementById('screen-gate').classList.remove('active');
  document.getElementById('screen-tracker').classList.add('active');
  await loadTaskList();
  await checkWeeklyReset();
  setupDateUI();
  setupRealtimeListeners();
  updateAllDates();
}

async function loadTaskList() {
  const doc = await db.collection('config').doc('tasks').get();
  if (doc.exists) {
    taskList = doc.data().tasks;
  } else {
    taskList = DEFAULT_TASKS;
    await db.collection('config').doc('tasks').set({ tasks: DEFAULT_TASKS });
  }
}

async function checkWeeklyReset() {
  const weekId = getWeekId();
  const resetDoc = await db.collection('meta').doc('weekReset').get();
  if (!resetDoc.exists || resetDoc.data().lastWeekId !== weekId) {
    if (resetDoc.exists) {
      await finalizeLastWeek(resetDoc.data().lastWeekId);
    }
    await db.collection('meta').doc('weekReset').set({ lastWeekId: weekId, resetAt: new Date().toISOString() });
  }
}

async function finalizeLastWeek(lastWeekId) {
  if (!lastWeekId) return;
  const scores = {};
  for (const player of PLAYERS) {
    const snap = await db.collection('weeks').doc(lastWeekId).collection('players').doc(player).get();
    scores[player] = snap.exists ? (snap.data().totalPoints || 0) : 0;
  }
  const maxScore = Math.max(...Object.values(scores));
  const winners = PLAYERS.filter(p => scores[p] === maxScore);
  const pot = PLAYERS.length * STAKE;
  const payouts = {};
  if (winners.length === PLAYERS.length) {
    PLAYERS.forEach(p => payouts[p] = 0);
  } else if (winners.length > 1) {
    const winnerShare = Math.round((pot / winners.length) - STAKE);
    PLAYERS.forEach(p => {
      payouts[p] = winners.includes(p) ? winnerShare : -STAKE;
    });
  } else {
    PLAYERS.forEach(p => {
      payouts[p] = winners.includes(p) ? (pot - STAKE) : -STAKE;
    });
  }
  for (const player of PLAYERS) {
    const plRef = db.collection('players').doc(player);
    const plDoc = await plRef.get();
    const current = plDoc.exists ? (plDoc.data().seasonPL || 0) : 0;
    await plRef.set({ seasonPL: current + payouts[player] }, { merge: true });
  }
  const histRef = db.collection('history').doc(lastWeekId);
  await histRef.set({
    weekId: lastWeekId,
    winners,
    scores,
    payouts,
    pot,
    createdAt: new Date().toISOString()
  });
}

// ============================================================
// DATE UI
// ============================================================

function setupDateUI() {
  const now = getGSTNow();
  const dates = getWeekDates();
  const todayStr = getGSTDateString(now);
  currentDayIndex = dates.findIndex(d => getGSTDateString(d) === todayStr);
  if (currentDayIndex === -1) currentDayIndex = 0;
  selectedDayIndex = currentDayIndex;
  renderDayPills(dates);
}

function renderDayPills(dates) {
  const container = document.getElementById('day-pills');
  const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  container.innerHTML = '';
  dates.forEach((date, i) => {
    const pill = document.createElement('button');
    pill.className = 'day-pill';
    pill.textContent = dayNames[i];
    if (i === selectedDayIndex) pill.classList.add('active');
    else if (isFuture(date)) pill.classList.add('future');
    else if (isEditable(date) && !isToday(date)) pill.classList.add('editable');
    else pill.classList.add('past');
    if (!isFuture(date)) {
      pill.onclick = () => selectDay(i, dates);
    }
    container.appendChild(pill);
  });
  document.getElementById('tracker-day-pill').textContent = formatDateShort(dates[selectedDayIndex]);
}

function selectDay(index, dates) {
  selectedDayIndex = index;
  renderDayPills(dates);
  renderTrackerColumns();
}

function updateAllDates() {
  const now = getGSTNow();
  const wk = getWeekNumber(now);
  const dateStr = `Week ${wk} — ${formatDateLong(now)}`;
  ['tracker-date','leaderboard-date','tasklist-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = dateStr;
  });
}

// ============================================================
// REALTIME LISTENERS
// ============================================================

function setupRealtimeListeners() {
  unsubscribers.forEach(u => u());
  unsubscribers = [];
  const weekId = getWeekId();
  const unsub = db.collection('weeks').doc(weekId).collection('players')
    .onSnapshot(snap => {
      snap.forEach(doc => { weekData[doc.id] = doc.data(); });
      renderTrackerColumns();
      renderLeaderboard();
    });
  unsubscribers.push(unsub);

  const unsubHistory = db.collection('history').orderBy('createdAt', 'desc').limit(10)
    .onSnapshot(snap => {
      weekHistory = snap.docs.map(d => d.data());
      renderLeaderboard();
    });
  unsubscribers.push(unsubHistory);
}

// ============================================================
// TRACKER
// ============================================================

function renderTrackerColumns() {
  const container = document.getElementById('tracker-columns');
  if (!container) return;
  const dates = getWeekDates();
  const date = dates[selectedDayIndex];
  const dateStr = getGSTDateString(date);
  const editable = isEditable(date);
  const future = isFuture(date);
  container.innerHTML = '';

  PLAYERS.forEach(player => {
    const isMe = player === currentUser;
    const data = weekData[player] || {};
    const dayData = (data.days || {})[dateStr] || {};
    const allTasks = getAllTasks();
    const total = allTasks.length;
    const done = Object.values(dayData).filter(v => v === true).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const scoreClass = isMe ? (pct > 50 ? 'score-green' : 'score-red') : 'score-blue';

    const col = document.createElement('div');
    col.className = 'col-card';

    let headerHTML = `
      <div class="col-header ${isMe ? 'you' : ''}">
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="col-av av ${AVATAR_CLASSES[player]}">${AVATAR_INITIALS[player]}</div>
          <div>
            <div class="col-name">${player}${isMe ? '<span class="you-tag">you</span>' : ''}</div>
            <div class="col-sub">${done} / ${total} tasks</div>
          </div>
        </div>
        <div class="col-score">
          <div class="score-val ${scoreClass}">${done}</div>
          <div class="score-pct ${scoreClass}">${pct}%</div>
        </div>
      </div>`;

    let tasksHTML = '<div class="col-tasks">';
    Object.entries(taskList).forEach(([cat, tasks]) => {
      tasksHTML += `<div class="cat-label">${CATEGORY_ICONS[cat] || ''} ${cat}</div>`;
      tasks.forEach(task => {
        const taskKey = task.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
        const completed = dayData[taskKey] === true;
        const missed = !future && !isToday(date) && !completed && !editable;
        const wasChecked = dayData[taskKey] === true;
        const autoRed = isPast(date) && !editable && !wasChecked;

        let tickHTML = '';
        if (wasChecked) {
          tickHTML = `<div class="tick tick-green">✓</div>`;
        } else if (autoRed) {
          tickHTML = `<div class="tick tick-red">✕</div>`;
        } else if (future) {
          tickHTML = `<div class="tick tick-empty"></div>`;
        } else if (isMe && editable) {
          tickHTML = `<div class="tick tick-empty" onclick="toggleTask('${player}','${dateStr}','${taskKey}',this)"></div>`;
        } else {
          tickHTML = `<div class="tick tick-empty"></div>`;
        }

        tasksHTML += `
          <div class="task-row">
            ${tickHTML}
            <span class="task-txt ${wasChecked ? 'done' : ''}">${task}</span>
          </div>`;
      });
    });
    tasksHTML += '</div>';

    let lockedHTML = '';
    if (!isMe) {
      lockedHTML = `<div class="locked-bar">View only — ${player}'s tasks</div>`;
    }

    col.innerHTML = headerHTML + tasksHTML + lockedHTML;
    container.appendChild(col);
  });
}

async function toggleTask(player, dateStr, taskKey, el) {
  if (player !== currentUser) return;
  const weekId = getWeekId();
  const ref = db.collection('weeks').doc(weekId).collection('players').doc(player);
  const doc = await ref.get();
  const data = doc.exists ? doc.data() : { days: {}, totalPoints: 0 };
  const days = data.days || {};
  const day = days[dateStr] || {};
  const current = day[taskKey] === true;
  day[taskKey] = !current;
  days[dateStr] = day;

  const allPoints = Object.values(days).reduce((sum, d) => {
    return sum + Object.values(d).filter(v => v === true).length;
  }, 0);

  await ref.set({ days, totalPoints: allPoints }, { merge: true });
}

function getAllTasks() {
  return Object.values(taskList).flat();
}

// ============================================================
// LEADERBOARD
// ============================================================

async function renderLeaderboard() {
  const container = document.getElementById('leaderboard-body');
  if (!container) return;
  const weekId = getWeekId();
  const dates = getWeekDates();
  const now = getGSTNow();

  const scores = {};
  const daysPlayed = {};
  PLAYERS.forEach(p => {
    const data = weekData[p] || {};
    const days = data.days || {};
    let pts = 0;
    let played = 0;
    dates.forEach(date => {
      if (!isFuture(date)) {
        const dateStr = getGSTDateString(date);
        const dayData = days[dateStr] || {};
        const done = Object.values(dayData).filter(v => v === true).length;
        pts += done;
        played++;
      }
    });
    scores[p] = pts;
    daysPlayed[p] = played;
  });

  const maxPossible = {};
  PLAYERS.forEach(p => { maxPossible[p] = daysPlayed[p] * getAllTasks().length; });

  const weeklyPct = {};
  PLAYERS.forEach(p => {
    weeklyPct[p] = maxPossible[p] > 0 ? Math.round((scores[p] / maxPossible[p]) * 100) : 0;
  });

  const avgCompletion = {};
  PLAYERS.forEach(p => {
    avgCompletion[p] = daysPlayed[p] > 0 ? Math.round((scores[p] / daysPlayed[p] / getAllTasks().length) * 100) : 0;
  });

  const ranked = [...PLAYERS].sort((a, b) => scores[b] - scores[a]);
  const maxScore = scores[ranked[0]];
  const leaders = ranked.filter(p => scores[p] === maxScore);

  const seasonPL = {};
  for (const player of PLAYERS) {
    const doc = await db.collection('players').doc(player).get();
    seasonPL[player] = doc.exists ? (doc.data().seasonPL || 0) : 0;
  }

  const pot = PLAYERS.length * STAKE;

  let html = '';

  // Weekly standings
  html += `<div class="lb-card"><div class="lb-card-title">This week — live standings</div>`;
  ranked.forEach((player, i) => {
    const isLeader = leaders.includes(player);
    html += `
      <div class="lb-row ${i === 0 ? 'first' : ''}">
        <div class="lb-rank">${i + 1}</div>
        <div class="col-av av ${AVATAR_CLASSES[player]}">${AVATAR_INITIALS[player]}</div>
        <div class="lb-info">
          <div class="lb-name">${player}${isLeader ? ' 👑' : ''}</div>
          <div class="lb-sub">Avg: ${avgCompletion[player]}% · ${daysPlayed[player]} days logged</div>
        </div>
        <div>
          <div class="lb-pts ${player === currentUser ? (weeklyPct[player] > 50 ? 'score-green' : 'score-red') : 'score-blue'}">${scores[player]}</div>
          <div class="lb-pct">${weeklyPct[player]}%</div>
        </div>
      </div>`;
  });
  html += `</div>`;

  // Bet tracker
  html += `<div class="lb-card"><div class="lb-card-title">Bet tracker — this week</div>`;
  ranked.forEach(player => {
    const isLeading = leaders.includes(player) && leaders.length < PLAYERS.length;
    html += `
      <div class="bet-row">
        <div class="col-av av ${AVATAR_CLASSES[player]}">${AVATAR_INITIALS[player]}</div>
        <div class="bet-name">${player}</div>
        <div class="bet-tag ${isLeading ? 'bet-winning' : 'bet-risk'}">${isLeading ? `On track +${pot - STAKE} AED` : `At risk −${STAKE} AED`}</div>
      </div>`;
  });
  html += `<div class="pot-row"><div class="pot-label">Total pot this week</div><div class="pot-amt">${pot} AED</div></div>`;
  html += `</div>`;

  // Season P/L
  html += `<div class="lb-card full"><div class="lb-card-title">Season profit / loss — ${now.getFullYear()}</div><div class="pl-grid">`;
  PLAYERS.forEach(player => {
    const pl = seasonPL[player] || 0;
    const wins = weekHistory.filter(w => w.winners && w.winners.includes(player)).length;
    html += `
      <div class="pl-cell">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <div class="col-av av ${AVATAR_CLASSES[player]}">${AVATAR_INITIALS[player]}</div>
          <div>
            <div style="font-size:13px;font-weight:600;">${player}</div>
            <div style="font-size:10px;color:var(--text-mid);">${wins} win${wins !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div class="pl-val ${pl >= 0 ? 'pl-positive' : 'pl-negative'}">${pl >= 0 ? '+' : ''}${pl} AED</div>
      </div>`;
  });
  html += `</div></div>`;

  // Previous winner
  if (weekHistory.length > 0) {
    const last = weekHistory[0];
    const winnerNames = last.winners.join(' & ');
    const winnerPayout = last.payouts[last.winners[0]];
    html += `
      <div class="prev-winner-card">
        <div style="font-size:22px;">🏆</div>
        <div>
          <div style="font-size:10px;font-weight:600;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">Last week's winner</div>
          <div style="font-size:14px;font-weight:600;color:#78350f;">${winnerNames} — +${winnerPayout} AED</div>
        </div>
        <div class="prev-right">
          <div style="font-size:11px;color:#b45309;">Week of ${last.weekId}</div>
          <div style="font-size:10px;color:#b45309;">Final scores locked</div>
        </div>
      </div>`;
  }

  // History log
  if (weekHistory.length > 0) {
    html += `<div class="history-card lb-card full"><div class="lb-card-title">Week-by-week history</div>`;
    weekHistory.forEach(week => {
      const winnerNames = week.winners.join(' & ');
      const payout = week.payouts[week.winners[0]];
      html += `
        <div class="history-row">
          <span class="history-week">Week of ${week.weekId}</span>
          <span class="history-winner">👑 ${winnerNames}</span>
          <span class="history-amt">+${payout} AED</span>
        </div>`;
    });
    html += `</div>`;
  }

  container.innerHTML = html;
}

// ============================================================
// TASK LIST
// ============================================================

function renderTaskList() {
  const container = document.getElementById('tasklist-body');
  if (!container) return;
  const total = getAllTasks().length;
  document.getElementById('task-count-badge').textContent = `${total} tasks`;
  container.innerHTML = '';

  Object.entries(taskList).forEach(([cat, tasks]) => {
    const card = document.createElement('div');
    card.className = 'cat-card';
    let html = `
      <div class="cat-header">
        <div style="display:flex;align-items:center;">
          <div class="cat-icon ${CATEGORY_ICON_CLASSES[cat]}">${CATEGORY_ICONS[cat]}</div>
          <div class="cat-name">${cat}</div>
        </div>
        <div class="cat-badge">${tasks.length} task${tasks.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="tl-task-list">`;
    tasks.forEach((task, i) => {
      html += `
        <div class="tl-task-item">
          <span class="tl-task-name">${task}</span>
          <button class="tl-remove" onclick="removeTask('${cat}',${i})">✕</button>
        </div>`;
    });
    html += `</div>
      <div class="tl-add-row">
        <input class="tl-add-input" id="add-input-${cat.replace(/\s/g,'_')}" placeholder="Add ${cat.toLowerCase()} task..." />
        <button class="tl-add-btn" onclick="addTask('${cat}')">+ Add</button>
      </div>`;
    card.innerHTML = html;
    container.appendChild(card);
  });
}

async function addTask(cat) {
  const inputId = `add-input-${cat.replace(/\s/g,'_')}`;
  const input = document.getElementById(inputId);
  const val = input.value.trim();
  if (!val) return;
  taskList[cat] = [...(taskList[cat] || []), val];
  input.value = '';
  await db.collection('config').doc('tasks').set({ tasks: taskList });
  renderTaskList();
}

async function removeTask(cat, index) {
  if (!confirm(`Remove "${taskList[cat][index]}" from ${cat}?`)) return;
  taskList[cat].splice(index, 1);
  await db.collection('config').doc('tasks').set({ tasks: taskList });
  renderTaskList();
}

// ============================================================
// PAGE NAVIGATION
// ============================================================

function showPage(page) {
  const pages = ['tracker', 'leaderboard', 'tasklist'];
  pages.forEach(p => {
    document.getElementById(`screen-${p}`).classList.remove('active');
  });
  document.getElementById(`screen-${page}`).classList.add('active');

  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll(`[onclick="showPage('${page}')"]`).forEach(t => t.classList.add('active'));

  if (page === 'tracker') renderTrackerColumns();
  if (page === 'leaderboard') renderLeaderboard();
  if (page === 'tasklist') renderTaskList();
  updateAllDates();
}

// ============================================================
// RULES POPUP
// ============================================================

function openRules() {
  document.getElementById('rules-overlay').classList.add('open');
}

function closeRules() {
  document.getElementById('rules-overlay').classList.remove('open');
}

function closeRulesOutside(e) {
  if (e.target === document.getElementById('rules-overlay')) closeRules();
}

function showRulesTab(tab, el) {
  document.querySelectorAll('.rules-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.rules-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`rpanel-${tab}`).classList.add('active');
  el.classList.add('active');
}

// ============================================================
// ON LOAD
// ============================================================

window.addEventListener('load', async () => {
  updateEnterBtn();
  const savedUser = localStorage.getItem('trackpact_user');
  if (savedUser && PLAYERS.includes(savedUser)) {
    currentUser = savedUser;
    await initApp();
  }
});
