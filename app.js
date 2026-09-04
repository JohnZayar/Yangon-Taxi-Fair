/* Yangon Taxi Fare — V9
   GPS + Leaflet map + Nominatim autocomplete + OSRM route distance + fare meter
*/

const YANGON_CENTER = [16.8409, 96.1735];
const YANGON_BOUNDS = { minLon: 95.9, minLat: 16.6, maxLon: 96.4, maxLat: 17.05 };

const RATES_KEY = "ytf_rates_v1";
const INSTALL_DISMISS_KEY = "ytf_install_dismissed_v1";
const PIN_HASH_KEY = "ytf_pin_hash_v1";
const YBS_CACHE_KEY = "ytf_ybs_cache_v1";
const YBS_CACHE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

const defaultRates = { base: 2500, perKm: 300, perMin: 100 };

function loadRates() {
  try {
    const raw = localStorage.getItem(RATES_KEY);
    if (!raw) return { ...defaultRates };
    const parsed = JSON.parse(raw);
    return {
      base: Number(parsed.base) || defaultRates.base,
      perKm: Number(parsed.perKm) || defaultRates.perKm,
      perMin: Number(parsed.perMin) || defaultRates.perMin,
    };
  } catch {
    return { ...defaultRates };
  }
}

function saveRates(rates) {
  localStorage.setItem(RATES_KEY, JSON.stringify(rates));
}

let rates = loadRates();

// ---------- DOM refs ----------
const el = (id) => document.getElementById(id);

const fareValue = el("fareValue");
const baseChip = el("baseChip");
const kmChip = el("kmChip");
const waitChip = el("waitChip");

const startInput = el("startInput");
const destInput = el("destInput");
const startSuggestions = el("startSuggestions");
const destSuggestions = el("destSuggestions");

const gpsBtn = el("gpsBtn");
const gpsStatus = el("gpsStatus");

const kmSlider = el("kmSlider");
const kmValue = el("kmValue");
const waitSlider = el("waitSlider");
const waitValue = el("waitValue");
const waitBadge = el("waitBadge");
const waitAutoBtn = el("waitAutoBtn");
const calcBtn = el("calcBtn");

const settingsBtn = el("settingsBtn");
const settingsSheet = el("settingsSheet");
const overlay = el("overlay");
const baseRateInput = el("baseRateInput");
const kmRateInput = el("kmRateInput");
const waitRateInput = el("waitRateInput");
const saveRatesBtn = el("saveRatesBtn");
const saveToast = el("saveToast");

// ---------- number formatting ----------
const fmt = (n) => Math.round(n).toLocaleString("en-US");

function formatKm(x) {
  return Number.isInteger(x) ? String(x) : x.toFixed(1);
}

// ---------- fare calculation ----------
function calculateFare() {
  const km = parseFloat(kmSlider.value) || 0;
  const wait = parseFloat(waitSlider.value) || 0;

  const baseFee = rates.base;
  const kmFee = km * rates.perKm;
  const waitFee = wait * rates.perMin;
  const total = baseFee + kmFee + waitFee;

  fareValue.textContent = fmt(total);
  baseChip.textContent = `${fmt(baseFee)} Ks`;
  kmChip.textContent = `${fmt(kmFee)} Ks`;
  waitChip.textContent = `${fmt(waitFee)} Ks`;
}

function updateSliderFill(slider) {
  const min = parseFloat(slider.min);
  const max = parseFloat(slider.max);
  const val = parseFloat(slider.value);
  const pct = ((val - min) / (max - min)) * 100;
  slider.style.setProperty("--fill", `${pct}%`);
}

kmSlider.addEventListener("input", () => {
  kmValue.textContent = formatKm(parseFloat(kmSlider.value));
  updateSliderFill(kmSlider);
  calculateFare();
});

// ---------- wait-time: auto (traffic-based) vs manual ----------
let waitManuallySet = false;
let lastSuggestedWait = null; // remembers the last traffic-based suggestion so "Auto" can restore it

function setWaitBadge(mode) {
  if (mode === "auto") {
    waitBadge.textContent = "🚦 Traffic ခန့်မှန်းချက်";
    waitBadge.classList.add("auto");
    waitAutoBtn.style.display = "none";
  } else {
    waitBadge.textContent = "✋ ကိုယ်တိုင်ချိန်ညှိ";
    waitBadge.classList.remove("auto");
    waitAutoBtn.style.display = lastSuggestedWait !== null ? "inline-block" : "none";
  }
}

function applyWaitMinutes(minutes, mode) {
  const clamped = Math.min(60, Math.max(0, Math.round(minutes)));
  waitSlider.value = clamped;
  waitValue.textContent = clamped;
  updateSliderFill(waitSlider);
  setWaitBadge(mode);
  calculateFare();
}

waitSlider.addEventListener("input", () => {
  waitValue.textContent = Math.round(parseFloat(waitSlider.value));
  updateSliderFill(waitSlider);
  waitManuallySet = true;
  setWaitBadge("manual");
  calculateFare();
});

waitAutoBtn.addEventListener("click", () => {
  if (lastSuggestedWait === null) return;
  waitManuallySet = false;
  applyWaitMinutes(lastSuggestedWait, "auto");
});

calcBtn.addEventListener("click", () => {
  calculateFare();
  fareValue.style.color = "#ffffff";
  setTimeout(() => (fareValue.style.color = ""), 180);
});

// ---------- settings bottom sheet (PIN-protected) ----------
const pinLockView = el("pinLockView");
const pinCreateView = el("pinCreateView");
const ratesView = el("ratesView");
const pinLockInput = el("pinLockInput");
const pinLockError = el("pinLockError");
const pinUnlockBtn = el("pinUnlockBtn");
const pinCreateInput = el("pinCreateInput");
const pinConfirmInput = el("pinConfirmInput");
const pinCreateError = el("pinCreateError");
const pinSaveBtn = el("pinSaveBtn");
const changePinBtn = el("changePinBtn");

async function hashPin(pin) {
  const data = new TextEncoder().encode("ytf-salt-" + pin);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function showSheetView(view) {
  pinLockView.style.display = view === "lock" ? "block" : "none";
  pinCreateView.style.display = view === "create" ? "block" : "none";
  ratesView.style.display = view === "rates" ? "block" : "none";
}

function openRatesView() {
  baseRateInput.value = rates.base;
  kmRateInput.value = rates.perKm;
  waitRateInput.value = rates.perMin;
  showSheetView("rates");
}

function openSheet() {
  overlay.classList.add("show");
  settingsSheet.classList.add("show");
  const storedHash = localStorage.getItem(PIN_HASH_KEY);
  if (!storedHash) {
    pinCreateInput.value = "";
    pinConfirmInput.value = "";
    pinCreateError.textContent = "";
    showSheetView("create");
  } else {
    pinLockInput.value = "";
    pinLockError.textContent = "";
    showSheetView("lock");
  }
}

function closeSheet() {
  overlay.classList.remove("show");
  settingsSheet.classList.remove("show");
}

settingsBtn.addEventListener("click", openSheet);
overlay.addEventListener("click", closeSheet);

pinUnlockBtn.addEventListener("click", async () => {
  const entered = pinLockInput.value.trim();
  if (!/^\d{4}$/.test(entered)) {
    pinLockError.textContent = "ဂဏန်း ၄ လုံး ရိုက်ထည့်ပါ";
    return;
  }
  const storedHash = localStorage.getItem(PIN_HASH_KEY);
  const enteredHash = await hashPin(entered);
  if (enteredHash === storedHash) {
    openRatesView();
  } else {
    pinLockError.textContent = "PIN မှားနေပါသည်";
    pinLockInput.value = "";
    pinLockInput.focus();
  }
});

pinLockInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") pinUnlockBtn.click();
});

pinSaveBtn.addEventListener("click", async () => {
  const a = pinCreateInput.value.trim();
  const b = pinConfirmInput.value.trim();
  if (!/^\d{4}$/.test(a)) {
    pinCreateError.textContent = "ဂဏန်း ၄ လုံး ရိုက်ထည့်ပါ";
    return;
  }
  if (a !== b) {
    pinCreateError.textContent = "PIN နှစ်ခု မတူပါ";
    return;
  }
  localStorage.setItem(PIN_HASH_KEY, await hashPin(a));
  openRatesView();
  showToast("✅ PIN သတ်မှတ်ပြီးပါပြီ");
});

changePinBtn.addEventListener("click", () => {
  pinCreateInput.value = "";
  pinConfirmInput.value = "";
  pinCreateError.textContent = "";
  showSheetView("create");
});

function showToast(msg) {
  saveToast.textContent = msg;
  saveToast.classList.add("show");
  setTimeout(() => saveToast.classList.remove("show"), 1800);
}

saveRatesBtn.addEventListener("click", () => {
  rates = {
    base: Math.max(0, Number(baseRateInput.value) || 0),
    perKm: Math.max(0, Number(kmRateInput.value) || 0),
    perMin: Math.max(0, Number(waitRateInput.value) || 0),
  };
  saveRates(rates);
  calculateFare();
  closeSheet();
  showToast("✅ နှုန်းထားများ သိမ်းဆည်းပြီးပါပြီ");
});

// ---------- map ----------
const map = L.map("map", { zoomControl: true, attributionControl: true }).setView(
  YANGON_CENTER,
  12
);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

const startIcon = L.divIcon({
  className: "",
  html: '<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:#e8571e;border:3px solid #fff;transform:rotate(-45deg);box-shadow:0 3px 8px rgba(0,0,0,.35)"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

const destIcon = L.divIcon({
  className: "",
  html: '<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:#1c1b1a;border:3px solid #f5b700;transform:rotate(-45deg);box-shadow:0 3px 8px rgba(0,0,0,.35)"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

let startMarker = null;
let destMarker = null;
let routeLine = null;
let startCoord = null; // {lat, lon}
let destCoord = null;
let nextTapSets = "start"; // toggles between "start" and "dest" on map taps

function setStartMarker(lat, lon, panTo = true) {
  startCoord = { lat, lon };
  if (startMarker) {
    startMarker.setLatLng([lat, lon]);
  } else {
    startMarker = L.marker([lat, lon], { icon: startIcon, draggable: true }).addTo(map);
    startMarker.on("dragend", () => {
      const p = startMarker.getLatLng();
      startCoord = { lat: p.lat, lon: p.lng };
      reverseGeocodeInto(startInput, p.lat, p.lng);
      tryRoute();
    });
  }
  if (panTo) map.panTo([lat, lon]);
  tryRoute();
}

function setDestMarker(lat, lon, panTo = true) {
  destCoord = { lat, lon };
  if (destMarker) {
    destMarker.setLatLng([lat, lon]);
  } else {
    destMarker = L.marker([lat, lon], { icon: destIcon, draggable: true }).addTo(map);
    destMarker.on("dragend", () => {
      const p = destMarker.getLatLng();
      destCoord = { lat: p.lat, lon: p.lng };
      reverseGeocodeInto(destInput, p.lat, p.lng);
      tryRoute();
    });
  }
  if (panTo) map.panTo([lat, lon]);
  tryRoute();
}

map.on("click", (e) => {
  const { lat, lng } = e.latlng;
  if (nextTapSets === "start") {
    setStartMarker(lat, lng);
    reverseGeocodeInto(startInput, lat, lng);
    nextTapSets = "dest";
  } else {
    setDestMarker(lat, lng);
    reverseGeocodeInto(destInput, lat, lng);
    nextTapSets = "start";
  }
});

// ---------- traffic heuristic (free, no API key) ----------
// Yangon peak-hour congestion pattern, in local Yangon time (Asia/Yangon).
// Multiplier applied to OSRM's free-flow duration to approximate real travel time.
function getPeakMultiplier() {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Yangon",
    }).format(new Date())
  );

  if (hour >= 7 && hour < 9.5) return 1.6; // morning rush
  if (hour >= 16 && hour < 19) return 1.7; // evening rush — usually the worst
  if (hour >= 11.5 && hour < 13) return 1.25; // lunch traffic
  if (hour >= 19 && hour < 21) return 1.15; // light evening traffic
  return 1.05; // off-peak
}

// Free, keyless weather check — rain makes Yangon traffic noticeably worse.
async function getRainBoost(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=precipitation`;
    const res = await fetch(url);
    if (!res.ok) return 0;
    const data = await res.json();
    const precip = data?.current?.precipitation ?? 0;
    if (precip > 2) return 0.3; // heavy rain
    if (precip > 0) return 0.15; // light rain
    return 0;
  } catch {
    return 0; // weather check is a bonus, never block the estimate on it
  }
}

// ---------- routing (OSRM demo server) ----------
async function tryRoute() {
  if (!startCoord || !destCoord) return;
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startCoord.lon},${startCoord.lat};${destCoord.lon},${destCoord.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("route fetch failed");
    const data = await res.json();
    if (!data.routes || !data.routes.length) throw new Error("no route");

    const route = data.routes[0];
    const km = route.distance / 1000;
    const freeFlowMinutes = route.duration / 60;

    kmSlider.value = Math.min(40, Math.max(0, Math.round(km * 2) / 2));
    kmValue.textContent = formatKm(parseFloat(kmSlider.value));
    updateSliderFill(kmSlider);

    if (routeLine) map.removeLayer(routeLine);
    const coords = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
    routeLine = L.polyline(coords, { color: "#e8571e", weight: 4, opacity: 0.85 }).addTo(map);
    map.fitBounds(routeLine.getBounds(), { padding: [24, 24] });

    // Traffic-based wait-time suggestion: peak-hour multiplier + optional rain boost.
    const rainBoost = await getRainBoost(startCoord.lat, startCoord.lon);
    const multiplier = getPeakMultiplier() + rainBoost;
    const extraMinutes = freeFlowMinutes * (multiplier - 1);
    lastSuggestedWait = Math.min(60, Math.max(0, Math.round(extraMinutes)));

    if (!waitManuallySet) {
      applyWaitMinutes(lastSuggestedWait, "auto");
    } else {
      waitAutoBtn.style.display = "inline-block";
      calculateFare();
    }
  } catch (err) {
    // Fall back silently to straight-line distance if OSRM is unreachable.
    const km = haversineKm(startCoord, destCoord);
    kmSlider.value = Math.min(40, Math.max(0, Math.round(km * 2) / 2));
    kmValue.textContent = formatKm(parseFloat(kmSlider.value));
    updateSliderFill(kmSlider);
    calculateFare();
  }

  showNearbyYbsStops();
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ---------- Nominatim geocoding ----------
async function reverseGeocodeInto(inputEl, lat, lon) {
  inputEl.value = "…ရှာနေသည်";
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=my`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const data = await res.json();
    inputEl.value = data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  } catch {
    inputEl.value = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function formatPhotonLabel(props) {
  // Build a natural "Street, Township, City" style label from Photon's GeoJSON properties.
  const parts = [];
  const streetPart = [props.housenumber, props.street].filter(Boolean).join(" ");
  const nameLine = props.name && props.name !== streetPart ? props.name : null;
  if (nameLine) parts.push(nameLine);
  if (streetPart) parts.push(streetPart);
  if (props.district && props.district !== nameLine) parts.push(props.district);
  else if (props.suburb && props.suburb !== nameLine) parts.push(props.suburb);
  if (props.city && !parts.includes(props.city)) parts.push(props.city);
  return parts.length ? parts.join(", ") : props.name || "Unnamed location";
}

async function searchPhoton(q) {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${YANGON_CENTER[0]}&lon=${YANGON_CENTER[1]}&limit=7&lang=en&bbox=${YANGON_BOUNDS.minLon},${YANGON_BOUNDS.minLat},${YANGON_BOUNDS.maxLon},${YANGON_BOUNDS.maxLat}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("photon failed");
  const data = await res.json();
  return (data.features || [])
    .filter((f) => f.geometry && f.geometry.coordinates)
    .map((f) => ({
      label: formatPhotonLabel(f.properties || {}),
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
    }));
}

async function searchNominatim(q) {
  const viewbox = `${YANGON_BOUNDS.minLon},${YANGON_BOUNDS.maxLat},${YANGON_BOUNDS.maxLon},${YANGON_BOUNDS.minLat}`;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
    q
  )}&viewbox=${viewbox}&bounded=1&limit=7&accept-language=my`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("nominatim failed");
  const results = await res.json();
  return results.map((r) => ({ label: r.display_name, lat: parseFloat(r.lat), lon: parseFloat(r.lon) }));
}

function wireAutocomplete(inputEl, suggestionsEl, onPick) {
  const search = debounce(async (q) => {
    if (!q || q.trim().length < 2) {
      suggestionsEl.classList.remove("show");
      suggestionsEl.innerHTML = "";
      return;
    }

    let items = [];
    try {
      items = await searchPhoton(q);
    } catch {
      // Photon unreachable — fall back to Nominatim so search still works.
    }
    if (!items.length) {
      try {
        items = await searchNominatim(q);
      } catch {
        // both sources failed — show the "not found" state below
      }
    }

    suggestionsEl.innerHTML = "";
    if (!items.length) {
      const div = document.createElement("div");
      div.className = "suggestion-empty";
      div.textContent = "ရလဒ်မတွေ့ပါ — မြေပုံပေါ်တွင် နေရာရွေးချယ်ပါ";
      suggestionsEl.appendChild(div);
      suggestionsEl.classList.add("show");
      return;
    }

    items.forEach((item) => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.textContent = item.label;
      div.addEventListener("click", () => {
        inputEl.value = item.label;
        suggestionsEl.classList.remove("show");
        onPick(item.lat, item.lon);
      });
      suggestionsEl.appendChild(div);
    });
    suggestionsEl.classList.add("show");
  }, 300);

  inputEl.addEventListener("input", () => search(inputEl.value));
  inputEl.addEventListener("focus", () => {
    if (suggestionsEl.innerHTML) suggestionsEl.classList.add("show");
  });
  document.addEventListener("click", (e) => {
    if (!suggestionsEl.contains(e.target) && e.target !== inputEl) {
      suggestionsEl.classList.remove("show");
    }
  });
}

wireAutocomplete(startInput, startSuggestions, (lat, lon) => {
  setStartMarker(lat, lon);
  nextTapSets = "dest";
});
wireAutocomplete(destInput, destSuggestions, (lat, lon) => {
  setDestMarker(lat, lon);
  nextTapSets = "start";
});

// ---------- GPS ----------
function setGpsStatus(msg, kind) {
  gpsStatus.textContent = msg;
  gpsStatus.className = "gps-status show" + (kind ? ` ${kind}` : "");
}

gpsBtn.addEventListener("click", () => {
  if (!("geolocation" in navigator)) {
    setGpsStatus("⚠️ ဤ browser တွင် GPS ကို မထောက်ပံ့ပါ။", "error");
    return;
  }

  // Geolocation requires a secure context (HTTPS) — github.io pages already are,
  // but warn clearly if someone opens this over plain http:// (e.g. a local file).
  if (!window.isSecureContext) {
    setGpsStatus(
      "⚠️ GPS အလုပ်လုပ်ရန် HTTPS လိုအပ်ပါသည်။ https:// link ဖြင့် ဖွင့်ပါ။",
      "error"
    );
    return;
  }

  gpsBtn.classList.add("is-loading");
  gpsBtn.textContent = "🛰️ ရှာနေသည်...";
  setGpsStatus("📡 တည်နေရာ ရှာနေသည်...", "");

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      setStartMarker(latitude, longitude);
      map.setView([latitude, longitude], 15);
      await reverseGeocodeInto(startInput, latitude, longitude);
      nextTapSets = "dest";
      gpsBtn.classList.remove("is-loading");
      gpsBtn.textContent = "🛰️ GPS";
      setGpsStatus(
        `✅ တည်နေရာ တွေ့ပါပြီ (တိကျမှု ~${Math.round(accuracy)}m)`,
        "ok"
      );
    },
    (err) => {
      gpsBtn.classList.remove("is-loading");
      gpsBtn.textContent = "🛰️ GPS";
      let msg = "⚠️ တည်နေရာ ရှာ၍မရပါ။";
      if (err.code === err.PERMISSION_DENIED) {
        msg =
          "⚠️ Location ခွင့်ပြုချက် ငြင်းပယ်ခံရပါသည်။ Browser Settings → Site Settings → Location မှ ခွင့်ပြုပေးပါ။";
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        msg = "⚠️ တည်နေရာ အချက်အလက် မရရှိပါ။ GPS/Wi-Fi ကို စစ်ဆေးပါ။";
      } else if (err.code === err.TIMEOUT) {
        msg = "⚠️ တည်နေရာ ရှာရန် အချိန်ကျော်သွားပါသည်။ ထပ်စမ်းကြည့်ပါ။";
      }
      setGpsStatus(msg, "error");
    },
    {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    }
  );
});

// ---------- PWA install prompt ----------
let deferredPrompt = null;
const installBanner = el("installBanner");
const installBtn = el("installBtn");
const installDismiss = el("installDismiss");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!localStorage.getItem(INSTALL_DISMISS_KEY)) {
    installBanner.classList.add("show");
  }
});

installBtn.addEventListener("click", async () => {
  installBanner.classList.remove("show");
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
});

installDismiss.addEventListener("click", () => {
  installBanner.classList.remove("show");
  localStorage.setItem(INSTALL_DISMISS_KEY, "1");
});

// ---------- service worker ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

// ---------- YBS bus stop lookup (official YRTA open data) ----------
// Source: Yangon Bus Service Public Data, Yangon Regional Transport Authority (YRTA),
// via Open Development Mekong. Licensed CC-BY — attribution shown in the UI below.
// Data snapshot dated 2017 (last updated 2021) — routes may have changed since.
// Several regional mirror domains serve the same CKAN dataset; not all of them send
// CORS headers that allow a browser on a different origin (e.g. github.io) to read the
// response, so we try each in turn and only give up if all of them fail.
const YBS_RESOURCE_ID = "ce59387c-2020-40c3-aa3d-e9aac55fca3a";
const YBS_DATA_URLS = [
  `https://data.opendevelopmentmekong.net/lo/datastore/dump/${YBS_RESOURCE_ID}?bom=True`,
  `https://data.opendevelopmentmyanmar.net/lo/datastore/dump/${YBS_RESOURCE_ID}?bom=True`,
  `https://data.laos.opendevelopmentmekong.net/lo/datastore/dump/${YBS_RESOURCE_ID}?bom=True`,
  `https://data.opendevelopmentcambodia.net/lo/datastore/dump/${YBS_RESOURCE_ID}?bom=True`,
];

const ybsCard = el("ybsCard");
const ybsStartEl = el("ybsStart");
const ybsDestEl = el("ybsDest");

let ybsStopsPromise = null;

function parseYbsCsv(text) {
  const lines = text.split("\n").filter((l) => l.trim().length);
  const stopsById = new Map();

  // header: _id,service_name,sequence,bus_stop_id,name_en,name_mm,road_en,road_mm,township_en,township_mm,lat,lng
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 12) continue;
    const [, service_name, , bus_stop_id, name_en, name_mm, , road_mm, , , lat, lng] = cols;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) continue;

    if (!stopsById.has(bus_stop_id)) {
      stopsById.set(bus_stop_id, {
        id: bus_stop_id,
        name: /[\u1000-\u109F]/.test(name_mm) ? name_mm : name_en, // fall back if name_mm looks malformed
        road: road_mm,
        lat: latNum,
        lng: lngNum,
        services: new Set(),
      });
    }
    stopsById.get(bus_stop_id).services.add(service_name);
  }

  return Array.from(stopsById.values());
}

async function fetchYbsCsvFromAnyMirror() {
  const errors = [];
  for (const url of YBS_DATA_URLS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!text || text.length < 100) throw new Error("empty response");
      return text;
    } catch (err) {
      errors.push(`${url} → ${err.message || err}`);
    }
  }
  throw new Error("All YBS data mirrors failed:\n" + errors.join("\n"));
}

async function loadYbsStops() {
  if (ybsStopsPromise) return ybsStopsPromise;

  ybsStopsPromise = (async () => {
    try {
      const cachedRaw = localStorage.getItem(YBS_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (Date.now() - cached.savedAt < YBS_CACHE_MAX_AGE_MS && Array.isArray(cached.stops)) {
          return cached.stops.map((s) => ({ ...s, services: new Set(s.services) }));
        }
      }
    } catch {
      // ignore corrupt cache, fall through to network
    }

    const text = await fetchYbsCsvFromAnyMirror();
    const stops = parseYbsCsv(text);
    if (!stops.length) throw new Error("parsed 0 stops — unexpected data format");

    try {
      localStorage.setItem(
        YBS_CACHE_KEY,
        JSON.stringify({
          savedAt: Date.now(),
          stops: stops.map((s) => ({ ...s, services: Array.from(s.services) })),
        })
      );
    } catch {
      // localStorage full or unavailable — non-fatal, just skip caching
    }

    return stops;
  })().catch((err) => {
    ybsStopsPromise = null; // allow retry on next call instead of caching the failure
    throw err;
  });

  return ybsStopsPromise;
}

function nearestYbsStops(coord, stops, maxKm = 0.6, limit = 3) {
  return stops
    .map((s) => ({ ...s, distKm: haversineKm(coord, { lat: s.lat, lon: s.lng }) }))
    .filter((s) => s.distKm <= maxKm)
    .sort((a, b) => a.distKm - b.distKm)
    .slice(0, limit);
}

function sortServiceNames(names) {
  return Array.from(names).sort((a, b) => {
    const na = parseFloat(a);
    const nb = parseFloat(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return String(a).localeCompare(String(b));
  });
}

function renderYbsBlock(container, title, stops) {
  if (!stops.length) {
    container.innerHTML = `<div class="ybs-block-title">${title}</div><p class="ybs-empty">အနီးအနားတွင် YBS Bus Stop မတွေ့ပါ (~600m အတွင်း)</p>`;
    return;
  }
  const items = stops
    .map((s) => {
      const pills = sortServiceNames(s.services)
        .map((n) => `<span class="ybs-route-pill">${n}</span>`)
        .join("");
      return `
        <div class="ybs-stop">
          <div class="ybs-stop-name">${s.name}</div>
          <div class="ybs-stop-meta">${s.road} · ${Math.round(s.distKm * 1000)}m</div>
          <div class="ybs-routes">${pills}</div>
        </div>`;
    })
    .join("");
  container.innerHTML = `<div class="ybs-block-title">${title}</div>${items}`;
}

function renderYbsError(err) {
  console.error("YBS data load failed:", err);
  ybsDestEl.innerHTML = "";
  ybsStartEl.innerHTML = `
    <p class="ybs-empty">
      ⚠️ Bus stop data ကို ဆွဲယူလို့ မရပါ (network/CORS ပြဿနာ ဖြစ်နိုင်ပါသည်)။
      <a href="https://data.opendevelopmentmekong.net/dataset/yangon-bus-service-public-data" target="_blank" rel="noopener">Data source ကို တိုက်ရိုက်ကြည့်ရန်</a>.
      အသေးစိတ်ကို browser ရဲ့ Console (F12) မှာ စစ်ကြည့်နိုင်ပါသည်။
    </p>`;
}

async function showNearbyYbsStops() {
  if (!startCoord || !destCoord) {
    ybsCard.style.display = "none";
    return;
  }
  ybsCard.style.display = "block";
  ybsStartEl.innerHTML = `<div class="ybs-block-title">📍 Start အနီးရှိ Bus Stop</div><p class="ybs-empty">ရှာနေသည်...</p>`;
  ybsDestEl.innerHTML = `<div class="ybs-block-title">🏁 Destination အနီးရှိ Bus Stop</div><p class="ybs-empty">ရှာနေသည်...</p>`;

  try {
    const stops = await loadYbsStops();
    renderYbsBlock(ybsStartEl, "📍 Start အနီးရှိ Bus Stop", nearestYbsStops(startCoord, stops));
    renderYbsBlock(
      ybsDestEl,
      "🏁 Destination အနီးရှိ Bus Stop",
      nearestYbsStops({ lat: destCoord.lat, lon: destCoord.lon }, stops)
    );
  } catch (err) {
    renderYbsError(err);
  }
}

// ---------- init ----------
updateSliderFill(kmSlider);
updateSliderFill(waitSlider);
setWaitBadge("manual");
calculateFare();
