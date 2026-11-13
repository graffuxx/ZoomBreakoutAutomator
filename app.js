import { buildAssignment, parseParticipantNames } from "./pro-core.js";

const STORAGE_KEY = "zoom-breakout-automator:v1";

const REQUIRED_CAPABILITIES = [
  "config",
  "getSupportedJsApis",
  "getUserContext",
  "getMeetingParticipants",
  "getBreakoutRoomList",
  "createBreakoutRooms",
  "configureBreakoutRooms",
  "openBreakoutRooms",
  "closeBreakoutRooms",
  "renameBreakoutRoom",
  "assignParticipantToBreakoutRoom",
  "onMeetingConfigChanged"
];

const DEFAULT_STATE = {
  activePresetId: "seminar",
  presets: [
    {
      id: "seminar",
      name: "Seminar",
      rooms: ["Gruppe 1", "Gruppe 2", "Gruppe 3", "Gruppe 4"]
    }
  ],
  options: {
    allowParticipantsChooseRoom: true,
    automaticallyMoveParticipantsIntoRooms: true,
    countDown: 60
  },
  pro: {
    rotationIndex: 0
  }
};

const storage = (() => {
  let fallback = "";
  try {
    const testKey = `${STORAGE_KEY}:test`;
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return {
      persistent: true,
      get: () => window.localStorage.getItem(STORAGE_KEY),
      set: (value) => window.localStorage.setItem(STORAGE_KEY, value)
    };
  } catch {
    return {
      persistent: false,
      get: () => fallback,
      set: (value) => {
        fallback = value;
      }
    };
  }
})();

const els = {
  connectionBadge: document.querySelector("#connectionBadge"),
  planBadge: document.querySelector("#planBadge"),
  proLockBadge: document.querySelector("#proLockBadge"),
  activePresetLabel: document.querySelector("#activePresetLabel"),
  roomCountLabel: document.querySelector("#roomCountLabel"),
  zoomStateLabel: document.querySelector("#zoomStateLabel"),
  presetSelect: document.querySelector("#presetSelect"),
  newPresetBtn: document.querySelector("#newPresetBtn"),
  presetNameInput: document.querySelector("#presetNameInput"),
  addRoomBtn: document.querySelector("#addRoomBtn"),
  roomsList: document.querySelector("#roomsList"),
  syncBtn: document.querySelector("#syncBtn"),
  renameBtn: document.querySelector("#renameBtn"),
  openBtn: document.querySelector("#openBtn"),
  closeBtn: document.querySelector("#closeBtn"),
  chooseRoomToggle: document.querySelector("#chooseRoomToggle"),
  autoMoveToggle: document.querySelector("#autoMoveToggle"),
  countdownInput: document.querySelector("#countdownInput"),
  loadParticipantsBtn: document.querySelector("#loadParticipantsBtn"),
  assignmentModeSelect: document.querySelector("#assignmentModeSelect"),
  participantsInput: document.querySelector("#participantsInput"),
  previewAssignmentBtn: document.querySelector("#previewAssignmentBtn"),
  applyAssignmentBtn: document.querySelector("#applyAssignmentBtn"),
  assignmentPreview: document.querySelector("#assignmentPreview"),
  assignmentRoomTemplate: document.querySelector("#assignmentRoomTemplate"),
  upgradeCard: document.querySelector("#upgradeCard"),
  upgradeBtn: document.querySelector("#upgradeBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  importInput: document.querySelector("#importInput"),
  messageTitle: document.querySelector("#messageTitle"),
  messageText: document.querySelector("#messageText"),
  roomRowTemplate: document.querySelector("#roomRowTemplate")
};

let state = loadState();
let zoom = {
  sdk: window.zoomSdk || null,
  ready: false,
  supportedApis: [],
  rooms: [],
  roomState: "unknown",
  user: null,
  participants: []
};

let entitlement = {
  plan: "free",
  active: false,
  checkoutAvailable: false,
  provider: "pending"
};

let currentAssignment = [];

function fallbackUuid() {
  return `preset-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeUuid() {
  return window.crypto?.randomUUID ? window.crypto.randomUUID() : fallbackUuid();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  try {
    const raw = storage.get();
    if (!raw) return clone(DEFAULT_STATE);
    return normalizeState(JSON.parse(raw));
  } catch {
    return clone(DEFAULT_STATE);
  }
}

function normalizeState(nextState) {
  const normalized = {
    ...clone(DEFAULT_STATE),
    ...nextState
  };

  if (!Array.isArray(normalized.presets) || normalized.presets.length === 0) {
    normalized.presets = clone(DEFAULT_STATE.presets);
  }

  normalized.presets = normalized.presets.map((preset, index) => ({
    id: preset.id || makeUuid(),
    name: String(preset.name || `Preset ${index + 1}`),
    rooms: sanitizeRooms(preset.rooms)
  }));

  if (!normalized.presets.some((preset) => preset.id === normalized.activePresetId)) {
    normalized.activePresetId = normalized.presets[0].id;
  }

  normalized.options = {
    ...clone(DEFAULT_STATE.options),
    ...(normalized.options || {})
  };

  normalized.pro = {
    ...clone(DEFAULT_STATE.pro),
    ...(normalized.pro || {})
  };

  return normalized;
}

function saveState() {
  try {
    storage.set(JSON.stringify(state));
  } catch {
    setMessage("Nicht gespeichert", "Der Browser blockiert lokale Speicherung. Die App funktioniert, aber Presets bleiben nur fuer diese Sitzung.");
  }
}

function activePreset() {
  return state.presets.find((preset) => preset.id === state.activePresetId) || state.presets[0];
}

function sanitizeRooms(rooms) {
  return (Array.isArray(rooms) ? rooms : [])
    .map((room) => String(room).trim())
    .filter(Boolean);
}

function setMessage(title, text) {
  els.messageTitle.textContent = title;
  els.messageText.textContent = text;
}

function setBusy(button, isBusy, label) {
  button.disabled = isBusy;
  if (isBusy) {
    button.dataset.originalLabel = button.textContent;
    button.textContent = label || "Laeuft...";
  } else if (button.dataset.originalLabel) {
    button.textContent = button.dataset.originalLabel;
    delete button.dataset.originalLabel;
  }
}

function hasPro() {
  return entitlement.active && entitlement.plan === "pro";
}

function assertPro() {
  if (!hasPro()) {
    throw new Error("Diese Funktion gehoert zu Pro. Die Bezahlfunktion wird nach Freigabe durch Zoom aktiviert.");
  }
}

function hasApi(apiName) {
  return zoom.supportedApis.includes(apiName);
}

function assertZoomApi(apiName) {
  if (!zoom.ready) {
    throw new Error("Die App laeuft gerade im Demo-Modus. In Zoom als Zoom App oeffnen, dann funktioniert diese Aktion.");
  }
  if (!hasApi(apiName)) {
    throw new Error(`Zoom erlaubt '${apiName}' fuer diesen Nutzer oder dieses Meeting gerade nicht.`);
  }
}

function render() {
  const preset = activePreset();

  els.activePresetLabel.textContent = preset.name;
  els.roomCountLabel.textContent = String(sanitizeRooms(preset.rooms).length);
  els.zoomStateLabel.textContent = zoom.ready ? zoom.roomState : "Demo";

  els.connectionBadge.textContent = zoom.ready ? "Zoom verbunden" : "Demo";
  els.connectionBadge.className = zoom.ready ? "badge badge-ok" : "badge badge-warn";
  els.planBadge.textContent = hasPro() ? "Pro" : "Free";
  els.planBadge.className = hasPro() ? "badge badge-pro active" : "badge badge-pro";
  els.proLockBadge.textContent = hasPro() ? "Aktiv" : "Gesperrt";
  els.proLockBadge.className = hasPro() ? "mini-badge active" : "mini-badge";
  els.upgradeCard.hidden = hasPro();

  [
    els.loadParticipantsBtn,
    els.assignmentModeSelect,
    els.participantsInput,
    els.previewAssignmentBtn,
    els.applyAssignmentBtn,
    els.exportBtn,
    els.importInput
  ].forEach((element) => {
    element.disabled = !hasPro();
  });

  els.presetSelect.innerHTML = "";
  state.presets.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    option.selected = item.id === state.activePresetId;
    els.presetSelect.append(option);
  });

  els.presetNameInput.value = preset.name;
  els.chooseRoomToggle.checked = state.options.allowParticipantsChooseRoom;
  els.autoMoveToggle.checked = state.options.automaticallyMoveParticipantsIntoRooms;
  els.countdownInput.value = state.options.countDown;

  renderRooms(preset);
}

async function initEntitlement() {
  const params = new URLSearchParams(window.location.search);
  const isLocalPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname) && params.get("pro") === "preview";

  if (isLocalPreview) {
    entitlement = {
      plan: "pro",
      active: true,
      checkoutAvailable: false,
      provider: "local-preview"
    };
    render();
    return;
  }

  try {
    const response = await fetch("/api/billing/status", {
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    });
    if (!response.ok) return;
    const next = await response.json();
    entitlement = {
      ...entitlement,
      ...next,
      active: next?.plan === "pro" && next?.active === true
    };
  } catch {
    // Free remains the safe default when billing is not configured.
  }

  render();
}

function renderRooms(preset) {
  els.roomsList.innerHTML = "";
  preset.rooms.forEach((roomName, index) => {
    const row = els.roomRowTemplate.content.firstElementChild.cloneNode(true);
    const input = row.querySelector(".room-input");
    const removeBtn = row.querySelector(".remove-room");

    input.value = roomName;
    input.placeholder = `Raum ${index + 1}`;
    input.addEventListener("input", () => {
      preset.rooms[index] = input.value;
      saveState();
      updateCountsOnly();
    });

    removeBtn.addEventListener("click", () => {
      preset.rooms.splice(index, 1);
      if (preset.rooms.length === 0) preset.rooms.push("Neuer Raum");
      saveState();
      render();
    });

    els.roomsList.append(row);
  });
}

function updateCountsOnly() {
  const preset = activePreset();
  els.roomCountLabel.textContent = String(sanitizeRooms(preset.rooms).length);
  els.activePresetLabel.textContent = preset.name;
}

function createPreset() {
  const id = makeUuid();
  state.presets.push({
    id,
    name: "Neues Preset",
    rooms: ["Raum 1", "Raum 2", "Raum 3"]
  });
  state.activePresetId = id;
  saveState();
  render();
  els.presetNameInput.focus();
  els.presetNameInput.select();
}

async function initZoom() {
  if (!zoom.sdk) {
    const storageText = storage.persistent ? "Presets werden lokal gespeichert." : "Speicherung ist in diesem Browser nur fuer diese Sitzung aktiv.";
    setMessage("Demo-Modus", `Die Oberflaeche funktioniert lokal. ${storageText}`);
    render();
    return;
  }

  try {
    await zoom.sdk.config({
      version: "0.16",
      popoutSize: { width: 420, height: 720 },
      capabilities: REQUIRED_CAPABILITIES
    });

    zoom.ready = true;
    const supported = await zoom.sdk.getSupportedJsApis();
    zoom.supportedApis = Array.isArray(supported?.supportedApis) ? supported.supportedApis : [];

    try {
      zoom.user = await zoom.sdk.getUserContext();
    } catch {
      zoom.user = null;
    }

    if (typeof zoom.sdk.onMeetingConfigChanged === "function") {
      zoom.sdk.onMeetingConfigChanged(() => refreshZoomRooms());
    }

    await refreshZoomRooms();
    setMessage("Zoom verbunden", "Raeume koennen jetzt direkt ueber Zoom verwaltet werden.");
  } catch (error) {
    zoom.ready = false;
    setMessage("Demo-Modus", cleanError(error));
  }

  render();
}

async function refreshZoomRooms() {
  if (!zoom.ready || !hasApi("getBreakoutRoomList")) return;

  try {
    const response = await zoom.sdk.getBreakoutRoomList();
    zoom.rooms = Array.isArray(response?.rooms) ? response.rooms : [];
    zoom.roomState = response?.state || "bereit";
  } catch (error) {
    zoom.rooms = [];
    zoom.roomState = "nicht bereit";
    setMessage("Zoom-Raeume nicht lesbar", cleanError(error));
  }

  render();
}

function renderAssignment() {
  els.assignmentPreview.innerHTML = "";
  if (currentAssignment.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Noch keine Verteilung erstellt.";
    els.assignmentPreview.append(empty);
    return;
  }

  currentAssignment.forEach((group) => {
    const card = els.assignmentRoomTemplate.content.firstElementChild.cloneNode(true);
    card.querySelector(".assignment-room-name").textContent = `${group.roomName} (${group.members.length})`;
    const list = card.querySelector(".assignment-members");
    group.members.forEach((member) => {
      const item = document.createElement("li");
      item.textContent = member.name;
      list.append(item);
    });
    els.assignmentPreview.append(card);
  });
}

async function loadParticipantsFromZoom() {
  assertPro();
  assertZoomApi("getMeetingParticipants");
  const response = await zoom.sdk.getMeetingParticipants();
  zoom.participants = (Array.isArray(response?.participants) ? response.participants : [])
    .filter((participant) => !["host", "coHost", "co-host"].includes(participant.role));
  els.participantsInput.value = zoom.participants.map((participant) => participant.screenName).join("\n");
  setMessage("Teilnehmende geladen", `${zoom.participants.length} Personen wurden aus dem Meeting uebernommen.`);
}

function createAssignmentPreview() {
  assertPro();
  const names = parseParticipantNames(els.participantsInput.value);
  const roomNames = sanitizeRooms(activePreset().rooms);
  const result = buildAssignment(names, roomNames, els.assignmentModeSelect.value, state.pro.rotationIndex);
  currentAssignment = result.groups;
  state.pro.rotationIndex = result.nextRotationIndex;
  saveState();
  renderAssignment();
  setMessage("Verteilung bereit", `${names.length} Personen wurden auf ${roomNames.length} Raeume verteilt.`);
}

async function applyAssignmentToZoom() {
  assertPro();
  assertZoomApi("getMeetingParticipants");
  assertZoomApi("getBreakoutRoomList");
  assertZoomApi("assignParticipantToBreakoutRoom");

  if (currentAssignment.length === 0) createAssignmentPreview();
  await refreshZoomRooms();
  if (zoom.rooms.length === 0) {
    await createRoomsInZoom();
    await refreshZoomRooms();
  }

  const participantResponse = await zoom.sdk.getMeetingParticipants();
  const liveParticipants = (participantResponse?.participants || [])
    .filter((participant) => !["host", "coHost", "co-host"].includes(participant.role));
  const byName = new Map();
  liveParticipants.forEach((participant) => {
    const key = participant.screenName.trim().toLocaleLowerCase();
    const bucket = byName.get(key) || [];
    bucket.push(participant);
    byName.set(key, bucket);
  });

  let assigned = 0;
  const missing = [];
  for (let roomIndex = 0; roomIndex < currentAssignment.length; roomIndex += 1) {
    const room = zoom.rooms[roomIndex];
    if (!room) continue;
    for (const member of currentAssignment[roomIndex].members) {
      const key = member.name.trim().toLocaleLowerCase();
      const participant = byName.get(key)?.shift();
      if (!participant?.participantUUID) {
        missing.push(member.name);
        continue;
      }
      await zoom.sdk.assignParticipantToBreakoutRoom({
        uuid: room.breakoutRoomId,
        participantUUID: participant.participantUUID
      });
      assigned += 1;
    }
  }

  const suffix = missing.length ? ` ${missing.length} Namen wurden im Meeting nicht eindeutig gefunden.` : "";
  setMessage("Zuweisung abgeschlossen", `${assigned} Personen wurden Zoom-Raeumen zugewiesen.${suffix}`);
}

function exportPresets() {
  assertPro();
  const payload = {
    format: "breakout-room-manager-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    state
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `breakout-room-presets-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  setMessage("Backup erstellt", "Die Presets wurden als JSON-Datei exportiert.");
}

async function importPresets(file) {
  assertPro();
  if (!file) return;
  const payload = JSON.parse(await file.text());
  if (payload?.format !== "breakout-room-manager-backup" || !payload?.state) {
    throw new Error("Die Datei ist kein gueltiges Breakout-Room-Manager-Backup.");
  }
  state = normalizeState(payload.state);
  saveState();
  currentAssignment = [];
  renderAssignment();
  render();
  setMessage("Backup importiert", `${state.presets.length} Presets wurden wiederhergestellt.`);
}

async function createRoomsInZoom() {
  const preset = activePreset();
  const names = sanitizeRooms(preset.rooms);
  if (names.length === 0) {
    setMessage("Keine Raeume", "Lege mindestens einen Raumnamen an.");
    return;
  }

  assertZoomApi("createBreakoutRooms");
  assertZoomApi("configureBreakoutRooms");

  await zoom.sdk.createBreakoutRooms({
    numberOfRooms: names.length,
    assign: state.options.allowParticipantsChooseRoom ? "participantsChoose" : "manually",
    names
  });

  await zoom.sdk.configureBreakoutRooms({
    allowParticipantsChooseRoom: state.options.allowParticipantsChooseRoom,
    allowParticipantsReturnToMainSession: true,
    automaticallyMoveParticipantsIntoRooms: state.options.automaticallyMoveParticipantsIntoRooms,
    automaticallyMoveParticipantsIntoMainRoom: true,
    countDown: Number(state.options.countDown) || 0
  });

  await refreshZoomRooms();
  setMessage("Raeume angelegt", `${names.length} Raeume wurden an Zoom gesendet.`);
}

async function renameRoomsInZoom() {
  const preset = activePreset();
  const names = sanitizeRooms(preset.rooms);
  assertZoomApi("getBreakoutRoomList");
  assertZoomApi("renameBreakoutRoom");

  await refreshZoomRooms();
  const pairs = zoom.rooms.slice(0, names.length).map((room, index) => ({
    uuid: room.breakoutRoomId,
    name: names[index]
  }));

  if (pairs.length === 0) {
    setMessage("Keine Zoom-Raeume", "Lege die Raeume zuerst in Zoom an.");
    return;
  }

  await Promise.all(pairs.map((room) => zoom.sdk.renameBreakoutRoom(room)));
  await refreshZoomRooms();
  setMessage("Namen aktualisiert", `${pairs.length} Zoom-Raeume wurden umbenannt.`);
}

async function openRooms() {
  assertZoomApi("getBreakoutRoomList");
  assertZoomApi("openBreakoutRooms");

  await refreshZoomRooms();
  if (zoom.rooms.length === 0) {
    await createRoomsInZoom();
    await refreshZoomRooms();
  }

  await zoom.sdk.openBreakoutRooms();
  await refreshZoomRooms();
  setMessage("Raeume geoeffnet", "Zoom hat die Breakout Rooms geoeffnet.");
}

async function closeRooms() {
  assertZoomApi("closeBreakoutRooms");
  await zoom.sdk.closeBreakoutRooms();
  await refreshZoomRooms();
  setMessage("Raeume geschlossen", "Zoom hat die Breakout Rooms geschlossen.");
}

function cleanError(error) {
  if (!error) return "Unbekannter Fehler.";
  if (typeof error === "string") return error;
  return error.message || error.reason || JSON.stringify(error);
}

async function runAction(button, busyLabel, action) {
  setBusy(button, true, busyLabel);
  try {
    await action();
  } catch (error) {
    setMessage("Aktion nicht moeglich", cleanError(error));
  } finally {
    setBusy(button, false);
    render();
  }
}

els.presetSelect.addEventListener("change", () => {
  state.activePresetId = els.presetSelect.value;
  saveState();
  render();
});

els.newPresetBtn.addEventListener("click", createPreset);

els.presetNameInput.addEventListener("input", () => {
  const preset = activePreset();
  preset.name = els.presetNameInput.value.trim() || "Ohne Namen";
  saveState();
  render();
});

els.addRoomBtn.addEventListener("click", () => {
  const preset = activePreset();
  preset.rooms.push(`Raum ${preset.rooms.length + 1}`);
  saveState();
  render();
});

els.chooseRoomToggle.addEventListener("change", () => {
  state.options.allowParticipantsChooseRoom = els.chooseRoomToggle.checked;
  saveState();
});

els.autoMoveToggle.addEventListener("change", () => {
  state.options.automaticallyMoveParticipantsIntoRooms = els.autoMoveToggle.checked;
  saveState();
});

els.countdownInput.addEventListener("input", () => {
  state.options.countDown = Number(els.countdownInput.value) || 0;
  saveState();
});

els.syncBtn.addEventListener("click", () => runAction(els.syncBtn, "Sende...", createRoomsInZoom));
els.renameBtn.addEventListener("click", () => runAction(els.renameBtn, "Aktualisiere...", renameRoomsInZoom));
els.openBtn.addEventListener("click", () => runAction(els.openBtn, "Oeffne...", openRooms));
els.closeBtn.addEventListener("click", () => runAction(els.closeBtn, "Schliesse...", closeRooms));

els.loadParticipantsBtn.addEventListener("click", () => runAction(els.loadParticipantsBtn, "Lade...", loadParticipantsFromZoom));
els.previewAssignmentBtn.addEventListener("click", () => runAction(els.previewAssignmentBtn, "Verteile...", async () => createAssignmentPreview()));
els.applyAssignmentBtn.addEventListener("click", () => runAction(els.applyAssignmentBtn, "Weise zu...", applyAssignmentToZoom));
els.exportBtn.addEventListener("click", () => runAction(els.exportBtn, "Exportiere...", async () => exportPresets()));
els.importInput.addEventListener("change", () => runAction(els.exportBtn, "Importiere...", async () => {
  await importPresets(els.importInput.files?.[0]);
  els.importInput.value = "";
}));
els.upgradeBtn.addEventListener("click", () => {
  setMessage("Pro in Vorbereitung", "Die Funktionen sind fertig vorbereitet. Der Kauf wird aktiviert, sobald Zoom den Abrechnungsweg bestaetigt hat.");
});

render();
renderAssignment();
initEntitlement();
initZoom();
