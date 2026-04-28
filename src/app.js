import { importedSeasonData } from "./importedSeason.js";

const STORAGE_KEY = "championship-predictions-state-v1";
const DEFAULT_API_SETTINGS = {
  provider: "football-data.org",
  baseUrl: "https://api.football-data.org/v4",
  competitionCode: "ELC",
  apiKey: "",
  autoSync: true,
  lastSyncAt: null,
  lastSyncStatus: "Not connected"
};

const icon = {
  trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M5 4H3v2a4 4 0 0 0 4 4"/><path d="M19 4h2v2a4 4 0 0 1-4 4"/></svg>`,
  clipboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>`,
  fixture: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/></svg>`,
  history: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/><path d="M12 7v5l3 2"/></svg>`,
  admin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l7 4v6c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
  stats: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V5"/><path d="M9 19V9"/><path d="M14 19v-6"/><path d="M19 19V3"/></svg>`,
  table: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h18"/><path d="M3 12h18"/><path d="M3 17h18"/><path d="M7 3v18"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`,
  sync: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 16v5h5"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 8V3h-5"/></svg>`
};

const teams = ["Leicester City", "Leeds United", "Ipswich Town", "Southampton", "West Brom", "Norwich City", "Hull City", "Coventry City", "Middlesbrough", "Sunderland", "Watford", "Bristol City"];

const state = upgradeState(loadState());
let currentUserId = state.sessionUserId;
let currentView = "leaderboard";
let selectedGameweekId = state.gameweeks.find(g => g.isActive)?.id ?? state.gameweeks[0]?.id;
let leaderboardFilter = "overall";
let modal = null;
let toastTimer = null;
let syncInProgress = false;

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowISO(offsetHours = 0) {
  return new Date(Date.now() + offsetHours * 3600 * 1000).toISOString();
}

function seedState() {
  const users = [
    { id: "u_admin", fullName: "Alex Morgan", email: "admin@league.test", password: "password", isAdmin: true, totalPoints: 0, createdAt: nowISO(-240) },
    { id: "u_1", fullName: "Jamie Carter", email: "jamie@league.test", password: "password", isAdmin: false, totalPoints: 0, createdAt: nowISO(-220) },
    { id: "u_2", fullName: "Priya Shah", email: "priya@league.test", password: "password", isAdmin: false, totalPoints: 0, createdAt: nowISO(-210) },
    { id: "u_3", fullName: "Tom Ellis", email: "tom@league.test", password: "password", isAdmin: false, totalPoints: 0, createdAt: nowISO(-200) }
  ];
  const gameweeks = [
    { id: "gw_1", name: "Gameweek 1", number: 1, season: "2026/27", opensAt: nowISO(-240), closesAt: nowISO(-48), status: "completed", isActive: false, createdAt: nowISO(-260) },
    { id: "gw_2", name: "Gameweek 2", number: 2, season: "2026/27", opensAt: nowISO(-24), closesAt: nowISO(60), status: "open", isActive: true, createdAt: nowISO(-40) },
    { id: "gw_3", name: "Gameweek 3", number: 3, season: "2026/27", opensAt: nowISO(48), closesAt: nowISO(168), status: "open", isActive: false, createdAt: nowISO(-12) }
  ];
  const fixtures = [
    fixture("f_1", "gw_1", teams[0], teams[1], -170, 2, 1, true),
    fixture("f_2", "gw_1", teams[2], teams[3], -168, 1, 1, true),
    fixture("f_3", "gw_1", teams[4], teams[5], -165, 0, 2, true),
    fixture("f_4", "gw_2", teams[6], teams[7], 18, null, null, false),
    fixture("f_5", "gw_2", teams[8], teams[9], 22, null, null, false),
    fixture("f_6", "gw_2", teams[10], teams[11], 46, null, null, false),
    fixture("f_7", "gw_3", teams[0], teams[8], 96, null, null, false),
    fixture("f_8", "gw_3", teams[1], teams[6], 120, null, null, false)
  ];
  const predictions = [
    pred("p_1", "u_admin", "f_1", "gw_1", 2, 1, true),
    pred("p_2", "u_admin", "f_2", "gw_1", 2, 1, true),
    pred("p_3", "u_admin", "f_3", "gw_1", 1, 2, true),
    pred("p_4", "u_1", "f_1", "gw_1", 1, 0, true),
    pred("p_5", "u_1", "f_2", "gw_1", 1, 1, true),
    pred("p_6", "u_1", "f_3", "gw_1", 0, 2, true),
    pred("p_7", "u_2", "f_1", "gw_1", 2, 2, true),
    pred("p_8", "u_2", "f_2", "gw_1", 1, 1, true),
    pred("p_9", "u_2", "f_3", "gw_1", 2, 1, true),
    pred("p_10", "u_3", "f_1", "gw_1", 3, 1, true),
    pred("p_11", "u_3", "f_2", "gw_1", 0, 0, true),
    pred("p_12", "u_3", "f_3", "gw_1", 1, 3, true)
  ];
  const next = { users, gameweeks, fixtures, predictions, pointsLedger: [], championshipTable: sampleChampionshipTable(), apiSettings: { ...DEFAULT_API_SETTINGS }, sessionUserId: "u_admin" };
  recalculateGameweek(next, "gw_1");
  return next;
}

function sampleChampionshipTable() {
  return teams.map((name, index) => ({
    position: index + 1,
    teamName: name,
    crest: "",
    playedGames: Math.max(20 - Math.floor(index / 4), 16),
    won: Math.max(13 - index, 3),
    draw: 5 + (index % 4),
    lost: 3 + Math.floor(index / 3),
    points: Math.max(44 - index * 2, 18),
    goalsFor: Math.max(38 - index, 18),
    goalsAgainst: 18 + index,
    goalDifference: Math.max(20 - index * 2, -10),
    form: ["W", "D", "W", "L", "W"].slice(0, 5).join(",")
  }));
}

function fixture(id, gameweekId, homeTeam, awayTeam, kickoffHours, homeScore, awayScore, resultConfirmed) {
  return { id, gameweekId, homeTeam, awayTeam, kickoffAt: nowISO(kickoffHours), homeScore, awayScore, resultConfirmed, createdAt: nowISO(-300) };
}

function pred(id, userId, fixtureId, gameweekId, home, away, locked) {
  return { id, userId, fixtureId, gameweekId, predictedHomeScore: home, predictedAwayScore: away, isLocked: locked, lockedAt: locked ? nowISO(-120) : null, pointsAwarded: 0, createdAt: nowISO(-130) };
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  const seeded = seedState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function upgradeState(saved) {
  saved.apiSettings = { ...DEFAULT_API_SETTINGS, ...(saved.apiSettings ?? {}) };
  if (saved.apiSettings.apiKey?.trim()) {
    saved.apiSettings.autoSync = true;
  }
  if (importedSeasonData?.version && saved.importVersion !== importedSeasonData.version) {
    saved = {
      ...saved,
      users: importedSeasonData.users,
      gameweeks: importedSeasonData.gameweeks,
      fixtures: importedSeasonData.fixtures,
      predictions: importedSeasonData.predictions,
      pointsLedger: importedSeasonData.pointsLedger,
      importVersion: importedSeasonData.version,
      importedFrom: importedSeasonData.source,
      sessionUserId: importedSeasonData.users.find(user => user.isAdmin)?.id ?? importedSeasonData.users[0]?.id ?? saved.sessionUserId
    };
    saved.apiSettings = { ...DEFAULT_API_SETTINGS, ...(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").apiSettings ?? {}) };
  }
  saved.championshipTable = saved.championshipTable?.length ? saved.championshipTable : sampleChampionshipTable();
  saved.pointsLedger = saved.pointsLedger ?? [];
  saved.fixtures.forEach(fixture => {
    fixture.apiMatchId = fixture.apiMatchId ?? null;
    fixture.status = fixture.status ?? (fixture.resultConfirmed ? "FINISHED" : Date.parse(fixture.kickoffAt) <= Date.now() ? "TIMED" : "SCHEDULED");
  });
  unlockFutureImportedPredictions(saved);
  refreshGameweekStatuses(saved);
  return saved;
}

function unlockFutureImportedPredictions(target) {
  const now = Date.now();
  target.predictions.forEach(prediction => {
    const fixture = target.fixtures.find(item => item.id === prediction.fixtureId);
    if (fixture && !fixture.resultConfirmed && Date.parse(fixture.kickoffAt) > now) {
      prediction.isLocked = false;
      prediction.lockedAt = null;
    }
  });
}

function refreshGameweekStatuses(target) {
  target.gameweeks.forEach(gameweek => {
    const fixtures = target.fixtures.filter(fixture => fixture.gameweekId === gameweek.id);
    if (!fixtures.length) return;
    if (fixtures.every(fixture => fixture.resultConfirmed)) {
      gameweek.status = "completed";
      return;
    }
    const hasFutureFixture = fixtures.some(fixture => Date.parse(fixture.kickoffAt) > Date.now());
    gameweek.status = hasFutureFixture ? "open" : "closed";
  });
}

function persist() {
  lockPastKickoffs(state);
  recalculateTotals(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function outcome(home, away) {
  if (home === away) return "draw";
  return home > away ? "home" : "away";
}

function calculatePoints(prediction, fixture) {
  if (!fixture.resultConfirmed || fixture.homeScore == null || fixture.awayScore == null) return 0;
  if (prediction.predictedHomeScore === fixture.homeScore && prediction.predictedAwayScore === fixture.awayScore) return 4;
  return outcome(prediction.predictedHomeScore, prediction.predictedAwayScore) === outcome(fixture.homeScore, fixture.awayScore) ? 1 : 0;
}

function recalculateGameweek(target, gameweekId) {
  target.pointsLedger = target.pointsLedger.filter(item => item.gameweekId !== gameweekId);
  target.predictions.filter(p => p.gameweekId === gameweekId).forEach(prediction => {
    const fixture = target.fixtures.find(f => f.id === prediction.fixtureId);
    prediction.pointsAwarded = calculatePoints(prediction, fixture);
    if (fixture?.resultConfirmed) {
      target.pointsLedger.push({
        id: uid("ledger"),
        userId: prediction.userId,
        fixtureId: prediction.fixtureId,
        gameweekId,
        points: prediction.pointsAwarded,
        reason: prediction.pointsAwarded === 4 ? "Exact Score" : prediction.pointsAwarded === 1 ? "Correct Result" : "No Points",
        createdAt: new Date().toISOString()
      });
    }
  });
  recalculateTotals(target);
}

function recalculateTotals(target) {
  target.users.forEach(user => {
    user.totalPoints = target.predictions
      .filter(prediction => prediction.userId === user.id)
      .reduce((sum, prediction) => sum + (prediction.pointsAwarded || 0), 0);
  });
}

function lockPastKickoffs(target) {
  const now = Date.now();
  target.predictions.forEach(prediction => {
    const fixture = target.fixtures.find(f => f.id === prediction.fixtureId);
    if (fixture && Date.parse(fixture.kickoffAt) <= now && !prediction.isLocked) {
      prediction.isLocked = true;
      prediction.lockedAt = new Date().toISOString();
    }
  });
}

function canEditPrediction(gameweek, fixture, prediction) {
  if (Date.parse(fixture.kickoffAt) <= Date.now()) return false;
  if (gameweek.status === "completed") return false;
  if (Date.parse(gameweek.closesAt) <= Date.now() && Date.parse(fixture.kickoffAt) <= Date.now()) return false;
  return !prediction?.isLocked;
}

function apiHeaders() {
  return { "X-Auth-Token": state.apiSettings.apiKey.trim() };
}

function isHostedDeployment() {
  return location.protocol === "https:" || location.hostname.endsWith(".vercel.app");
}

function apiConfigured() {
  return Boolean(state.apiSettings.apiKey?.trim()) || isHostedDeployment();
}

function normaliseTeamName(value) {
  const aliases = {
    "prestonne": "preston",
    "prestonnorthend": "preston",
    "qpr": "qpr",
    "queensparkrangers": "qpr",
    "sheffutd": "sheffieldunited",
    "sheffieldutd": "sheffieldunited",
    "sheffwed": "sheffieldwednesday",
    "sheffieldwed": "sheffieldwednesday",
    "oxfordutd": "oxfordunited",
    "westbrom": "westbromwich"
  };
  const compact = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (aliases[compact]) return aliases[compact];
  return value.toLowerCase().replace(/\b(fc|afc|cf|city|town|albion|rovers|wanderers)\b/g, "").replace(/[^a-z0-9]/g, "");
}

function sameFixture(localFixture, apiMatch) {
  if (localFixture.apiMatchId && String(localFixture.apiMatchId) === String(apiMatch.id)) return true;
  const localHome = normaliseTeamName(localFixture.homeTeam);
  const localAway = normaliseTeamName(localFixture.awayTeam);
  const apiHome = normaliseTeamName(apiMatch.homeTeam?.name ?? apiMatch.homeTeam?.shortName ?? "");
  const apiAway = normaliseTeamName(apiMatch.awayTeam?.name ?? apiMatch.awayTeam?.shortName ?? "");
  const daysApart = Math.abs(Date.parse(localFixture.kickoffAt) - Date.parse(apiMatch.utcDate ?? 0)) / 86400000;
  return localHome === apiHome && localAway === apiAway && (daysApart <= 2 || !localFixture.apiMatchId);
}

function matchStatusLabel(status) {
  return {
    SCHEDULED: "Scheduled",
    TIMED: "Scheduled",
    LIVE: "Live",
    IN_PLAY: "Live",
    PAUSED: "Half-time",
    FINISHED: "Full time",
    POSTPONED: "Postponed",
    SUSPENDED: "Suspended",
    CANCELLED: "Cancelled"
  }[status] ?? status ?? "Pending";
}

async function fetchFootballData(path) {
  if (isHostedDeployment()) {
    const response = await fetch(`/api/football-data?path=${encodeURIComponent(path)}`);
    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(`${response.status} ${response.statusText}${message ? `: ${message.slice(0, 120)}` : ""}`);
    }
    return response.json();
  }
  const response = await fetch(`${state.apiSettings.baseUrl}${path}`, { headers: apiHeaders() });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`${response.status} ${response.statusText}${message ? `: ${message.slice(0, 120)}` : ""}`);
  }
  return response.json();
}

function applyApiMatches(matches) {
  let updated = 0;
  matches.forEach(match => {
    const localFixture = state.fixtures.find(fixture => sameFixture(fixture, match));
    if (!localFixture) return;
    localFixture.apiMatchId = match.id;
    localFixture.kickoffAt = match.utcDate ?? localFixture.kickoffAt;
    localFixture.status = match.status;
    const home = match.score?.fullTime?.home ?? match.score?.regularTime?.home;
    const away = match.score?.fullTime?.away ?? match.score?.regularTime?.away;
    if (Number.isInteger(home) && Number.isInteger(away) && ["FINISHED", "IN_PLAY", "PAUSED", "LIVE"].includes(match.status)) {
      localFixture.homeScore = home;
      localFixture.awayScore = away;
      localFixture.resultConfirmed = match.status === "FINISHED";
      updated += 1;
      recalculateGameweek(state, localFixture.gameweekId);
    }
  });
  return updated;
}

function applyApiStandings(standings) {
  const total = standings?.find(item => item.type === "TOTAL") ?? standings?.[0];
  if (!total?.table?.length) return 0;
  state.championshipTable = total.table.map(row => ({
    position: row.position,
    teamName: row.team?.shortName ?? row.team?.name,
    crest: row.team?.crest ?? "",
    playedGames: row.playedGames,
    won: row.won,
    draw: row.draw,
    lost: row.lost,
    points: row.points,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    goalDifference: row.goalDifference,
    form: row.form ?? ""
  }));
  return state.championshipTable.length;
}

async function syncFromApi({ silent = false } = {}) {
  if (!apiConfigured()) {
    state.apiSettings.lastSyncStatus = "Add a football-data.org API key in Admin Panel";
    persist();
    if (!silent) {
      showToast("Add an API key in Admin Panel");
      render();
    }
    return;
  }
  if (syncInProgress) return;
  syncInProgress = true;
  if (!silent) showToast("Syncing Championship data...");
  try {
    const code = encodeURIComponent(state.apiSettings.competitionCode || "ELC");
    const [matchesData, standingsData] = await Promise.all([
      fetchFootballData(`/competitions/${code}/matches`),
      fetchFootballData(`/competitions/${code}/standings`)
    ]);
    const fixturesUpdated = applyApiMatches(matchesData.matches ?? []);
    const tableRows = applyApiStandings(standingsData.standings ?? []);
    refreshGameweekStatuses(state);
    state.apiSettings.lastSyncAt = new Date().toISOString();
    state.apiSettings.lastSyncStatus = `Synced ${fixturesUpdated} fixture score${fixturesUpdated === 1 ? "" : "s"} and ${tableRows} table rows`;
    persist();
    if (!silent) showToast("Live data synced");
    render();
  } catch (error) {
    state.apiSettings.lastSyncStatus = `Sync failed: ${error.message}`;
    persist();
    if (!silent) {
      showToast("Sync failed. Check API settings.");
      render();
    }
  } finally {
    syncInProgress = false;
  }
}

function startAutoSync() {
  if (apiConfigured()) {
    syncFromApi({ silent: true });
  }
  if (state.apiSettings.autoSync && apiConfigured()) {
    setInterval(() => syncFromApi({ silent: true }), 5 * 60 * 1000);
  }
}

function currentUser() {
  return state.users.find(user => user.id === currentUserId);
}

function gameweekName(id) {
  return state.gameweeks.find(g => g.id === id)?.name ?? "Gameweek";
}

function fmtDate(value) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function kickoffCountdown(value) {
  const diff = Date.parse(value) - Date.now();
  if (diff <= 0) return "Locked";
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  return `${hours}h ${minutes}m`;
}

function showToast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.remove(), 2200);
}

function setView(view) {
  currentView = view;
  render();
}

function navItem(view, label, svg) {
  return `<button class="${currentView === view ? "active" : ""}" onclick="setView('${view}')">${svg}<span>${label}</span></button>`;
}

function render() {
  persist();
  const user = currentUser();
  document.getElementById("app").innerHTML = user ? renderShell(user) : renderAuth();
  if (modal) document.getElementById("app").insertAdjacentHTML("beforeend", modal);
}

function renderAuth() {
  return `
    <main class="auth">
      <section class="card auth-panel">
        <div class="brand">
          <div class="brand-mark">CP</div>
          <div>
            <h1>Championship Predictions</h1>
            <p>Private EFL Championship prediction league</p>
          </div>
        </div>
        <div class="tabs" style="margin-bottom: 14px">
          <button class="tab active" id="login-tab" onclick="toggleAuth('login')">Log in</button>
          <button class="tab" id="signup-tab" onclick="toggleAuth('signup')">Sign up</button>
        </div>
        <form class="form" onsubmit="submitAuth(event)" data-mode="login">
          <label class="signup-only" style="display:none">Full name<input name="fullName" autocomplete="name" /></label>
          <label>Email<input name="email" type="email" autocomplete="email" required value="admin@league.test" /></label>
          <label>Password<input name="password" type="password" autocomplete="current-password" required value="password" /></label>
          <button class="primary" type="submit">Continue</button>
          <p class="muted">Demo admin: admin@league.test / password</p>
        </form>
      </section>
    </main>
  `;
}

function renderShell(user) {
  const title = {
    leaderboard: "Leaderboard",
    predictions: "Predictions",
    results: "Results",
    table: "Championship Table",
    history: "My History",
    admin: "Admin Panel"
  }[currentView];

  return `
    <div class="app">
      <div class="shell">
        <aside class="sidebar">
          <div class="brand">
            <div class="brand-mark">CP</div>
            <div>
              <h1>Championship Predictions</h1>
              <p>${state.gameweeks.find(g => g.isActive)?.name ?? "Season"} active</p>
            </div>
          </div>
          <nav class="nav">
            ${navItem("leaderboard", "Leaderboard", icon.trophy)}
            ${navItem("predictions", "Predictions", icon.clipboard)}
            ${navItem("results", "Results", icon.fixture)}
            ${navItem("table", "Table", icon.table)}
            ${navItem("history", "My History", icon.history)}
            ${user.isAdmin ? navItem("admin", "Admin Panel", icon.admin) : ""}
          </nav>
          <div class="account-card">
            <strong>${user.fullName}</strong>
            <p class="muted">${user.email}</p>
            <p><span class="chip good">${user.totalPoints} pts</span> ${user.isAdmin ? `<span class="chip warn">Admin</span>` : ""}</p>
            <button class="ghost" onclick="logout()">Log out</button>
          </div>
        </aside>
        <main class="main">
          <header class="topbar">
            <div>
              <h2>${title}</h2>
              <p class="muted">${state.apiSettings.lastSyncAt ? `Live data last synced ${fmtDate(state.apiSettings.lastSyncAt)}.` : "Scores lock at kickoff. Exact scores earn 4 points, correct outcomes earn 1."}</p>
            </div>
            <div class="actions">
              <button class="secondary" onclick="syncFromApi()">${icon.sync} Sync Scores</button>
              <span class="chip good">${user.totalPoints} points</span>
              <button class="ghost" onclick="logout()">Log out</button>
            </div>
          </header>
          ${renderCurrentView(user)}
        </main>
      </div>
    </div>
  `;
}

function renderCurrentView(user) {
  if (currentView === "leaderboard") return renderLeaderboard();
  if (currentView === "predictions") return renderPredictions(user);
  if (currentView === "results") return renderResults();
  if (currentView === "table") return renderChampionshipTable();
  if (currentView === "history") return renderHistory(user);
  if (currentView === "admin" && user.isAdmin) return renderAdmin();
  return `<section class="card empty">You do not have access to this section.</section>`;
}

function rankedUsers(filter = leaderboardFilter) {
  return [...state.users].map(user => {
    const points = filter === "overall"
      ? user.totalPoints
      : state.predictions.filter(p => p.userId === user.id && p.gameweekId === filter).reduce((sum, p) => sum + p.pointsAwarded, 0);
    return { ...user, filteredPoints: points };
  }).sort((a, b) => b.filteredPoints - a.filteredPoints || a.fullName.localeCompare(b.fullName));
}

function renderLeaderboard() {
  const selectedLabel = leaderboardFilter === "overall" ? "Overall table" : gameweekName(leaderboardFilter);
  const rows = rankedUsers().map((user, index) => `
    <button class="card leader-row top-${index + 1}" onclick="openPlayer('${user.id}')">
      <div class="rank">${index + 1}</div>
      <div>
        <strong>${user.fullName}</strong>
        <p class="muted">${recentForm(user.id)}</p>
      </div>
      <strong>${user.filteredPoints} pts</strong>
    </button>
  `).join("");

  return `
    <section class="section">
      <div class="leaderboard-layout">
        <div class="leaderboard-results">
          <div class="line-row">
            <div><strong>${selectedLabel}</strong><p class="muted">Ranked highest to lowest</p></div>
            <span class="chip good">${rankedUsers()[0]?.filteredPoints ?? 0} top score</span>
          </div>
          <div class="leader-list">${rows}</div>
        </div>
        <aside class="card card-pad gameweek-picker">
          <div>
            <strong>View</strong>
            <p class="muted">${selectedLabel}</p>
          </div>
          <select onchange="setLeaderboardFilter(this.value)">
            <option value="overall" ${leaderboardFilter === "overall" ? "selected" : ""}>Overall</option>
            ${state.gameweeks.map(g => `<option value="${g.id}" ${leaderboardFilter === g.id ? "selected" : ""}>${g.name}</option>`).join("")}
          </select>
          <div class="gameweek-list">
            <button class="${leaderboardFilter === "overall" ? "active" : ""}" onclick="setLeaderboardFilter('overall')">Overall</button>
            ${state.gameweeks.map(g => `<button class="${leaderboardFilter === g.id ? "active" : ""}" onclick="setLeaderboardFilter('${g.id}')"><span>${g.name}</span><small>${gameweekPointsTotal(g.id)} pts</small></button>`).join("")}
          </div>
        </aside>
      </div>
    </section>
  `;
}

function gameweekPointsTotal(gameweekId) {
  return state.predictions.filter(p => p.gameweekId === gameweekId).reduce((sum, p) => sum + p.pointsAwarded, 0);
}

function recentForm(userId) {
  const last = state.predictions.filter(p => p.userId === userId && p.pointsAwarded > 0).slice(-3);
  const exacts = last.filter(p => p.pointsAwarded === 4).length;
  if (!last.length) return "Chasing first points";
  if (exacts) return `${exacts} exact score${exacts > 1 ? "s" : ""} in recent returns`;
  return `${last.length} scoring pick${last.length > 1 ? "s" : ""} recently`;
}

function renderPredictions(user) {
  const selectableGameweeks = state.gameweeks.filter(g => g.status === "open" || g.status === "closed");
  const selected = state.gameweeks.find(g => g.id === selectedGameweekId) ?? selectableGameweeks[0] ?? state.gameweeks[0];
  selectedGameweekId = selected?.id;
  const fixtures = state.fixtures.filter(f => f.gameweekId === selected?.id);
  const hasEditableFixture = fixtures.some(fixture => canEditPrediction(selected, fixture, state.predictions.find(p => p.userId === user.id && p.fixtureId === fixture.id)));
  return `
    <section class="section">
      <div class="toolbar">
        <div class="tabs">
          ${selectableGameweeks.map(g => `<button class="tab ${selectedGameweekId === g.id ? "active" : ""}" onclick="setSelectedGameweek('${g.id}')">${g.name}</button>`).join("")}
        </div>
        <button class="primary" onclick="submitAll('${selectedGameweekId}')" ${hasEditableFixture ? "" : "disabled"}>Submit All</button>
      </div>
      ${fixtures.length ? fixtures.map(f => renderPredictionFixture(user, selected, f)).join("") : `<div class="card empty">No fixtures available yet.</div>`}
    </section>
  `;
}

function renderPredictionFixture(user, gameweek, fixture) {
  const prediction = state.predictions.find(p => p.userId === user.id && p.fixtureId === fixture.id);
  const editable = canEditPrediction(gameweek, fixture, prediction);
  const locked = !editable;
  return `
    <article class="card fixture">
      <div class="teams">
        <strong>${fixture.homeTeam} v ${fixture.awayTeam}</strong>
        <p class="muted">${fmtDate(fixture.kickoffAt)} · ${kickoffCountdown(fixture.kickoffAt)} to kickoff</p>
        <div class="actions">
          <span class="chip ${locked ? "good" : "warn"}">${locked ? icon.lock : ""}${locked ? "Locked" : "Open"}</span>
          <span class="chip">${gameweek.status}</span>
        </div>
      </div>
      <div class="actions">
        <div class="score-inputs">
          <input id="home-${fixture.id}" type="number" min="0" max="20" value="${prediction?.predictedHomeScore ?? ""}" ${editable ? "" : "disabled"} />
          <strong>-</strong>
          <input id="away-${fixture.id}" type="number" min="0" max="20" value="${prediction?.predictedAwayScore ?? ""}" ${editable ? "" : "disabled"} />
        </div>
        <button class="secondary" onclick="savePrediction('${fixture.id}', false)" ${editable ? "" : "disabled"}>Save</button>
        <button class="primary" onclick="savePrediction('${fixture.id}', true)" ${editable ? "" : "disabled"}>Lock In</button>
      </div>
    </article>
  `;
}

function renderResults() {
  const gameweeks = state.gameweeks.filter(g => g.status !== "open" || state.fixtures.some(f => f.gameweekId === g.id && f.resultConfirmed));
  return `
    <section class="section">
      ${gameweeks.map(g => `
        <div class="card card-pad">
          <div class="line-row">
            <div><strong>${g.name}</strong><p class="muted">${g.status}</p></div>
            <span class="chip ${g.status === "completed" ? "good" : "warn"}">${g.status}</span>
          </div>
          ${state.fixtures.filter(f => f.gameweekId === g.id).map(renderResultFixture).join("")}
        </div>
      `).join("") || `<div class="card empty">No results have been confirmed yet.</div>`}
    </section>
  `;
}

function renderResultFixture(fixture) {
  const score = fixture.resultConfirmed ? `${fixture.homeScore} - ${fixture.awayScore}` : "Pending";
  const predictions = state.predictions.filter(p => p.fixtureId === fixture.id);
  return `
    <details class="result-row">
      <summary class="line-row">
        <span>${fixture.homeTeam} v ${fixture.awayTeam}</span>
        <span class="chip ${fixture.resultConfirmed ? "good" : "warn"}">${score} · ${matchStatusLabel(fixture.status)}</span>
      </summary>
      <table class="prediction-table">
        <thead><tr><th>Player</th><th>Prediction</th><th>Points</th></tr></thead>
        <tbody>
          ${predictions.map(p => `
            <tr>
              <td>${state.users.find(u => u.id === p.userId)?.fullName}</td>
              <td>${p.predictedHomeScore} - ${p.predictedAwayScore}</td>
              <td><span class="chip ${p.pointsAwarded === 4 ? "good" : p.pointsAwarded === 1 ? "warn" : "bad"}">${p.pointsAwarded}${p.pointsAwarded === 4 ? " Exact Score" : ""}</span></td>
            </tr>
          `).join("") || `<tr><td colspan="3">No predictions</td></tr>`}
        </tbody>
      </table>
    </details>
  `;
}

function renderChampionshipTable() {
  const rows = [...state.championshipTable].sort((a, b) => a.position - b.position).map(row => `
    <tr>
      <td class="position-cell">${row.position}</td>
      <td>
        <div class="team-cell">
          ${row.crest ? `<img src="${row.crest}" alt="" />` : `<span class="crest-fallback">${row.teamName.slice(0, 2).toUpperCase()}</span>`}
          <strong>${row.teamName}</strong>
        </div>
      </td>
      <td>${row.playedGames}</td>
      <td>${row.won}</td>
      <td>${row.draw}</td>
      <td>${row.lost}</td>
      <td>${row.goalsFor}</td>
      <td>${row.goalsAgainst}</td>
      <td>${row.goalDifference}</td>
      <td><strong>${row.points}</strong></td>
      <td><span class="form-strip">${renderForm(row.form)}</span></td>
    </tr>
  `).join("");

  return `
    <section class="section">
      <div class="card card-pad">
        <div class="line-row">
          <div>
            <strong>EFL Championship Standings</strong>
            <p class="muted">${state.apiSettings.lastSyncStatus}</p>
          </div>
          <button class="primary" onclick="syncFromApi()">${icon.sync} Refresh Table</button>
        </div>
      </div>
      <div class="card table-card">
        <table class="league-table">
          <thead>
            <tr><th>#</th><th>Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th><th>Form</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderForm(form) {
  if (!form) return `<span class="muted">-</span>`;
  return form.split(",").slice(-5).map(item => {
    const value = item.trim().slice(0, 1).toUpperCase();
    const cls = value === "W" ? "good" : value === "D" ? "warn" : "bad";
    return `<span class="form-dot ${cls}">${value}</span>`;
  }).join("");
}

function renderHistory(user) {
  const predictions = state.predictions.filter(p => p.userId === user.id);
  const exacts = predictions.filter(p => p.pointsAwarded === 4).length;
  const correct = predictions.filter(p => p.pointsAwarded === 1).length;
  const playedWeeks = new Set(predictions.map(p => p.gameweekId)).size || 1;
  return `
    <section class="section">
      <div class="grid">
        ${statCard("Total points", user.totalPoints)}
        ${statCard("Exact scores", exacts)}
        ${statCard("Correct results", correct)}
        ${statCard("Avg per gameweek", (user.totalPoints / playedWeeks).toFixed(1))}
      </div>
      ${predictions.length ? predictions.map(p => {
        const f = state.fixtures.find(item => item.id === p.fixtureId);
        return `
          <article class="card history-row">
            <div class="line-row"><strong>${gameweekName(p.gameweekId)}</strong><span class="chip ${p.pointsAwarded === 4 ? "good" : p.pointsAwarded === 1 ? "warn" : "bad"}">${p.pointsAwarded} pts</span></div>
            <div>${f.homeTeam} v ${f.awayTeam}</div>
            <p class="muted">Predicted ${p.predictedHomeScore} - ${p.predictedAwayScore} · Actual ${f.resultConfirmed ? `${f.homeScore} - ${f.awayScore}` : "pending"}</p>
          </article>
        `;
      }).join("") : `<div class="card empty">Your predictions will appear here after you save them.</div>`}
    </section>
  `;
}

function statCard(label, value) {
  return `<div class="card card-pad stat"><span class="muted">${label}</span><strong>${value}</strong></div>`;
}

function fixtureSyncSummary(gameweekId) {
  const fixtures = state.fixtures.filter(f => f.gameweekId === gameweekId);
  const confirmed = fixtures.filter(f => f.resultConfirmed).length;
  const linked = fixtures.filter(f => f.apiMatchId).length;
  return `${confirmed}/${fixtures.length} confirmed · ${linked} API-linked`;
}

function renderAdminFixtureOverride(fixture, gameweekId) {
  return `
    <div class="card card-pad">
      <div class="line-row">
        <div>
          <strong>${fixture.homeTeam} v ${fixture.awayTeam}</strong>
          <p class="muted">${matchStatusLabel(fixture.status)} · ${fixture.resultConfirmed ? `${fixture.homeScore} - ${fixture.awayScore}` : "awaiting API result"}</p>
        </div>
        <span class="chip ${fixture.apiMatchId ? "good" : "warn"}">${fixture.apiMatchId ? "API linked" : "Not linked"}</span>
      </div>
      <details class="manual-overrides">
        <summary>Manual override</summary>
        <div class="actions">
          <input id="rh-${fixture.id}" type="number" min="0" value="${fixture.homeScore ?? ""}" placeholder="Home" />
          <input id="ra-${fixture.id}" type="number" min="0" value="${fixture.awayScore ?? ""}" placeholder="Away" />
          <button class="secondary" onclick="saveResult('${fixture.id}')">Save override</button>
          <button class="ghost" onclick="recalculateGameweekAction('${gameweekId}')">Recalculate</button>
        </div>
      </details>
    </div>
  `;
}

function renderAdmin() {
  return `
    <section class="section">
      <div class="grid">
        ${statCard("Players", state.users.length)}
        ${statCard("Gameweeks", state.gameweeks.length)}
        ${statCard("Fixtures", state.fixtures.length)}
        ${statCard("Predictions", state.predictions.length)}
      </div>
      <div class="card card-pad">
        <div class="line-row">
          <div>
            <strong>Live Data API</strong>
            <p class="muted">${state.apiSettings.provider} · ${state.apiSettings.lastSyncStatus}</p>
          </div>
          <button class="primary" onclick="syncFromApi()">${icon.sync} Sync now</button>
        </div>
        <div class="form api-form">
          <label>API key
            <input id="api-key" type="password" value="${state.apiSettings.apiKey}" placeholder="football-data.org token" autocomplete="off" />
          </label>
          <label>Competition code
            <input id="competition-code" value="${state.apiSettings.competitionCode}" />
          </label>
          <label>Base URL
            <input id="api-base-url" value="${state.apiSettings.baseUrl}" />
          </label>
          <label class="check-row">
            <input id="api-auto-sync" type="checkbox" ${state.apiSettings.autoSync ? "checked" : ""} />
            Auto-sync every 5 minutes while the app is open
          </label>
          <div class="actions">
            <button class="secondary" onclick="saveApiSettings()">Save API settings</button>
            <span class="chip ${apiConfigured() ? "good" : "warn"}">${isHostedDeployment() ? "Vercel proxy" : apiConfigured() ? "Connected" : "Needs API key"}</span>
          </div>
        </div>
      </div>
      <div class="card card-pad">
        <div class="line-row">
          <div>
            <strong>Gameweeks</strong>
            <p class="muted">Results update from the API automatically. Manual score entry is now only an override.</p>
          </div>
          <button class="primary" onclick="addGameweek()">Add gameweek</button>
        </div>
        ${state.gameweeks.map(g => `
          <div class="admin-row">
            <div class="line-row">
              <div><strong>${g.name}</strong><p class="muted">${g.season} · ${fixtureSyncSummary(g.id)}</p></div>
              <div class="actions">
                <select onchange="updateGameweekStatus('${g.id}', this.value)">
                  ${["open", "closed", "completed"].map(s => `<option ${g.status === s ? "selected" : ""}>${s}</option>`).join("")}
                </select>
                <button class="secondary" onclick="setActiveGameweek('${g.id}')">${g.isActive ? "Active" : "Mark Active"}</button>
                <button class="ghost" onclick="addFixture('${g.id}')">Add Fixture</button>
                <button class="danger" onclick="deleteGameweek('${g.id}')">Delete</button>
              </div>
            </div>
            <details class="fixture-overrides">
              <summary>Fixture status and manual overrides</summary>
              ${state.fixtures.filter(f => f.gameweekId === g.id).map(f => renderAdminFixtureOverride(f, g.id)).join("")}
            </details>
          </div>
        `).join("")}
      </div>
      <div class="card card-pad">
        <div class="line-row"><strong>Players</strong><button class="primary" onclick="addPlayer()">Add player</button></div>
        ${state.users.map(u => `
          <div class="admin-row line-row">
            <div><strong>${u.fullName}</strong><p class="muted">${u.email} · ${u.totalPoints} pts</p></div>
            <div class="actions">
              <button class="secondary" onclick="toggleAdmin('${u.id}')">${u.isAdmin ? "Remove Admin" : "Make Admin"}</button>
              <button class="ghost" onclick="seedPoints('${u.id}')">Seed Points</button>
              <button class="danger" onclick="removePlayer('${u.id}')">Remove</button>
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

window.toggleAuth = mode => {
  const form = document.querySelector("form.form");
  form.dataset.mode = mode;
  document.querySelectorAll(".signup-only").forEach(el => el.style.display = mode === "signup" ? "grid" : "none");
  document.getElementById("login-tab").classList.toggle("active", mode === "login");
  document.getElementById("signup-tab").classList.toggle("active", mode === "signup");
};

window.submitAuth = event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const email = data.get("email").trim().toLowerCase();
  const password = data.get("password");
  if (form.dataset.mode === "signup") {
    if (state.users.some(u => u.email.toLowerCase() === email)) return alert("That email is already registered.");
    const user = { id: uid("u"), fullName: data.get("fullName") || email.split("@")[0], email, password, isAdmin: false, totalPoints: 0, createdAt: new Date().toISOString() };
    state.users.push(user);
    currentUserId = user.id;
  } else {
    const user = state.users.find(u => u.email.toLowerCase() === email && u.password === password);
    if (!user) return alert("Email or password is incorrect.");
    currentUserId = user.id;
  }
  state.sessionUserId = currentUserId;
  persist();
  render();
};

window.logout = () => {
  currentUserId = null;
  state.sessionUserId = null;
  persist();
  render();
};

window.setView = setView;
window.setLeaderboardFilter = filter => { leaderboardFilter = filter; render(); };
window.setSelectedGameweek = id => { selectedGameweekId = id; render(); };

window.savePrediction = (fixtureId, lock) => {
  const fixture = state.fixtures.find(f => f.id === fixtureId);
  const gameweek = state.gameweeks.find(g => g.id === fixture.gameweekId);
  let prediction = state.predictions.find(p => p.userId === currentUserId && p.fixtureId === fixtureId);
  if (!canEditPrediction(gameweek, fixture, prediction)) return alert("This fixture is locked.");
  const home = Number(document.getElementById(`home-${fixtureId}`).value);
  const away = Number(document.getElementById(`away-${fixtureId}`).value);
  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) return alert("Enter both scores.");
  if (lock && !confirm("Lock this prediction? You cannot edit it afterwards.")) return;
  if (!prediction) {
    prediction = { id: uid("p"), userId: currentUserId, fixtureId, gameweekId: fixture.gameweekId, predictedHomeScore: home, predictedAwayScore: away, isLocked: false, lockedAt: null, pointsAwarded: 0, createdAt: new Date().toISOString() };
    state.predictions.push(prediction);
  }
  prediction.predictedHomeScore = home;
  prediction.predictedAwayScore = away;
  prediction.isLocked = lock || prediction.isLocked;
  prediction.lockedAt = prediction.isLocked ? new Date().toISOString() : null;
  persist();
  showToast(lock ? "Prediction locked" : "Prediction saved");
  render();
};

window.submitAll = gameweekId => {
  const fixtures = state.fixtures.filter(f => f.gameweekId === gameweekId);
  const ready = fixtures.map(f => {
    const gameweek = state.gameweeks.find(g => g.id === f.gameweekId);
    const prediction = state.predictions.find(p => p.userId === currentUserId && p.fixtureId === f.id);
    const homeEl = document.getElementById(`home-${f.id}`);
    const awayEl = document.getElementById(`away-${f.id}`);
    return { fixture: f, prediction, editable: canEditPrediction(gameweek, f, prediction), home: Number(homeEl?.value), away: Number(awayEl?.value), hasScores: homeEl?.value !== "" && awayEl?.value !== "" };
  }).filter(item => item.editable && item.hasScores && Number.isInteger(item.home) && Number.isInteger(item.away) && item.home >= 0 && item.away >= 0);
  if (!ready.length) return alert("No unlocked completed predictions to submit.");
  if (!confirm("Lock all completed predictions for this gameweek?")) return;
  ready.forEach(item => {
    let prediction = item.prediction;
    if (!prediction) {
      prediction = { id: uid("p"), userId: currentUserId, fixtureId: item.fixture.id, gameweekId: item.fixture.gameweekId, predictedHomeScore: item.home, predictedAwayScore: item.away, isLocked: false, lockedAt: null, pointsAwarded: 0, createdAt: new Date().toISOString() };
      state.predictions.push(prediction);
    }
    prediction.predictedHomeScore = item.home;
    prediction.predictedAwayScore = item.away;
    prediction.isLocked = true;
    prediction.lockedAt = new Date().toISOString();
  });
  persist();
  showToast("Gameweek predictions locked");
  render();
};

window.openPlayer = userId => {
  const user = state.users.find(u => u.id === userId);
  const rows = state.predictions.filter(p => p.userId === userId).map(p => {
    const f = state.fixtures.find(item => item.id === p.fixtureId);
    return `<tr><td>${gameweekName(p.gameweekId)}</td><td>${f.homeTeam} v ${f.awayTeam}</td><td>${p.predictedHomeScore} - ${p.predictedAwayScore}</td><td>${f.resultConfirmed ? `${f.homeScore} - ${f.awayScore}` : "Pending"}</td><td>${p.pointsAwarded}</td></tr>`;
  }).join("");
  const weekly = state.gameweeks.map(g => {
    const pts = state.predictions.filter(p => p.userId === userId && p.gameweekId === g.id).reduce((sum, p) => sum + p.pointsAwarded, 0);
    return `<span class="chip">${g.name}: ${pts} pts</span>`;
  }).join("");
  modal = `
    <div class="modal-backdrop" onclick="closeModal(event)">
      <section class="modal card-pad" onclick="event.stopPropagation()">
        <div class="line-row"><div><h2>${user.fullName}</h2><p class="muted">${user.totalPoints} total points</p></div><button class="ghost" onclick="modal=null;render()">Close</button></div>
        <div class="actions">${weekly}</div>
        <table class="prediction-table"><thead><tr><th>Week</th><th>Fixture</th><th>Prediction</th><th>Actual</th><th>Pts</th></tr></thead><tbody>${rows || `<tr><td colspan="5">No prediction history yet.</td></tr>`}</tbody></table>
      </section>
    </div>`;
  render();
};

window.closeModal = () => { modal = null; render(); };

window.addGameweek = () => {
  const number = state.gameweeks.length + 1;
  state.gameweeks.push({ id: uid("gw"), name: `Gameweek ${number}`, number, season: "2026/27", opensAt: new Date().toISOString(), closesAt: nowISO(168), status: "open", isActive: false, createdAt: new Date().toISOString() });
  persist(); render();
};

window.updateGameweekStatus = (id, status) => {
  const gw = state.gameweeks.find(g => g.id === id);
  gw.status = status;
  if (status === "completed") recalculateGameweek(state, id);
  persist(); render();
};

window.setActiveGameweek = id => {
  state.gameweeks.forEach(g => g.isActive = g.id === id);
  selectedGameweekId = id;
  persist(); render();
};

window.deleteGameweek = id => {
  if (!confirm("Delete this gameweek and its fixtures?")) return;
  state.gameweeks = state.gameweeks.filter(g => g.id !== id);
  state.fixtures = state.fixtures.filter(f => f.gameweekId !== id);
  state.predictions = state.predictions.filter(p => p.gameweekId !== id);
  persist(); render();
};

window.addFixture = gameweekId => {
  const homeTeam = prompt("Home team", "Millwall");
  const awayTeam = prompt("Away team", "Preston North End");
  if (!homeTeam || !awayTeam) return;
  state.fixtures.push({ id: uid("f"), gameweekId, homeTeam, awayTeam, kickoffAt: nowISO(72), homeScore: null, awayScore: null, resultConfirmed: false, createdAt: new Date().toISOString() });
  persist(); render();
};

window.saveResult = fixtureId => {
  const fixture = state.fixtures.find(f => f.id === fixtureId);
  const home = Number(document.getElementById(`rh-${fixtureId}`).value);
  const away = Number(document.getElementById(`ra-${fixtureId}`).value);
  if (!Number.isInteger(home) || !Number.isInteger(away)) return alert("Enter a valid score.");
  fixture.homeScore = home;
  fixture.awayScore = away;
  fixture.resultConfirmed = true;
  recalculateGameweek(state, fixture.gameweekId);
  persist();
  showToast("Result confirmed and points recalculated");
  render();
};

window.recalculateGameweekAction = id => {
  recalculateGameweek(state, id);
  persist();
  showToast("Gameweek recalculated");
  render();
};

window.saveApiSettings = () => {
  state.apiSettings.apiKey = document.getElementById("api-key").value.trim();
  state.apiSettings.competitionCode = document.getElementById("competition-code").value.trim() || "ELC";
  state.apiSettings.baseUrl = document.getElementById("api-base-url").value.trim().replace(/\/$/, "") || DEFAULT_API_SETTINGS.baseUrl;
  state.apiSettings.autoSync = document.getElementById("api-auto-sync").checked;
  state.apiSettings.lastSyncStatus = apiConfigured() ? "API settings saved; automatic result sync is active" : "Add a football-data.org API key in Admin Panel";
  persist();
  showToast("API settings saved");
  if (apiConfigured()) syncFromApi({ silent: true });
  render();
};

window.syncFromApi = syncFromApi;

window.addPlayer = () => {
  const fullName = prompt("Player name");
  const email = prompt("Player email");
  if (!fullName || !email) return;
  state.users.push({ id: uid("u"), fullName, email, password: "password", isAdmin: false, totalPoints: 0, createdAt: new Date().toISOString() });
  persist(); render();
};

window.toggleAdmin = id => {
  const user = state.users.find(u => u.id === id);
  user.isAdmin = !user.isAdmin;
  persist(); render();
};

window.seedPoints = id => {
  const amount = Number(prompt("Historical points to add", "0"));
  if (!Number.isInteger(amount)) return;
  const user = state.users.find(u => u.id === id);
  const fixture = state.fixtures[0];
  state.predictions.push({ id: uid("p_seed"), userId: user.id, fixtureId: fixture.id, gameweekId: fixture.gameweekId, predictedHomeScore: 0, predictedAwayScore: 0, isLocked: true, lockedAt: new Date().toISOString(), pointsAwarded: amount, createdAt: new Date().toISOString(), seeded: true });
  persist(); render();
};

window.removePlayer = id => {
  if (id === currentUserId) return alert("You cannot remove the signed-in account.");
  if (!confirm("Remove this player and their predictions?")) return;
  state.users = state.users.filter(u => u.id !== id);
  state.predictions = state.predictions.filter(p => p.userId !== id);
  persist(); render();
};

startAutoSync();
render();
