/* Yangon Taxi Fare — V9
   GPS + Leaflet map + Nominatim autocomplete + OSRM route distance + fare meter
*/

const YANGON_CENTER = [16.8409, 96.1735];
const YANGON_BOUNDS = { minLon: 95.9, minLat: 16.6, maxLon: 96.4, maxLat: 17.05 };

const RATES_KEY = "ytf_rates_v1";
const INSTALL_DISMISS_KEY = "ytf_install_dismissed_v1";

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

waitSlider.addEventListener("input", () => {
  waitValue.textContent = Math.round(parseFloat(waitSlider.value));
  updateSliderFill(waitSlider);
  calculateFare();
});

calcBtn.addEventListener("click", () => {
  calculateFare();
  fareValue.style.color = "#ffffff";
  setTimeout(() => (fareValue.style.color = ""), 180);
});

// ---------- settings bottom sheet ----------
function openSheet() {
  baseRateInput.value = rates.base;
  kmRateInput.value = rates.perKm;
  waitRateInput.value = rates.perMin;
  overlay.classList.add("show");
  settingsSheet.classList.add("show");
}

function closeSheet() {
  overlay.classList.remove("show");
  settingsSheet.classList.remove("show");
}

settingsBtn.addEventListener("click", openSheet);
overlay.addEventListener("click", closeSheet);

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
    const minutes = route.duration / 60;

    kmSlider.value = Math.min(40, Math.max(0, Math.round(km * 2) / 2));
    kmValue.textContent = formatKm(parseFloat(kmSlider.value));
    updateSliderFill(kmSlider);

    // Suggest a wait time only as a light nudge; drivers/passengers can still override.
    calculateFare();

    if (routeLine) map.removeLayer(routeLine);
    const coords = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
    routeLine = L.polyline(coords, { color: "#e8571e", weight: 4, opacity: 0.85 }).addTo(map);
    map.fitBounds(routeLine.getBounds(), { padding: [24, 24] });
  } catch (err) {
    // Fall back silently to straight-line distance if OSRM is unreachable.
    const km = haversineKm(startCoord, destCoord);
    kmSlider.value = Math.min(40, Math.max(0, Math.round(km * 2) / 2));
    kmValue.textContent = formatKm(parseFloat(kmSlider.value));
    updateSliderFill(kmSlider);
    calculateFare();
  }
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

function wireAutocomplete(inputEl, suggestionsEl, onPick) {
  const search = debounce(async (q) => {
    if (!q || q.trim().length < 2) {
      suggestionsEl.classList.remove("show");
      suggestionsEl.innerHTML = "";
      return;
    }
    try {
      const viewbox = `${YANGON_BOUNDS.minLon},${YANGON_BOUNDS.maxLat},${YANGON_BOUNDS.maxLon},${YANGON_BOUNDS.minLat}`;
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        q
      )}&viewbox=${viewbox}&bounded=1&limit=6&accept-language=my`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const results = await res.json();

      suggestionsEl.innerHTML = "";
      if (!results.length) {
        const div = document.createElement("div");
        div.className = "suggestion-empty";
        div.textContent = "ရလဒ်မတွေ့ပါ — မြေပုံပေါ်တွင် နေရာရွေးချယ်ပါ";
        suggestionsEl.appendChild(div);
        suggestionsEl.classList.add("show");
        return;
      }

      results.forEach((r) => {
        const div = document.createElement("div");
        div.className = "suggestion-item";
        div.textContent = r.display_name;
        div.addEventListener("click", () => {
          inputEl.value = r.display_name;
          suggestionsEl.classList.remove("show");
          onPick(parseFloat(r.lat), parseFloat(r.lon));
        });
        suggestionsEl.appendChild(div);
      });
      suggestionsEl.classList.add("show");
    } catch {
      suggestionsEl.classList.remove("show");
    }
  }, 400);

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

// ---------- init ----------
updateSliderFill(kmSlider);
updateSliderFill(waitSlider);
calculateFare();
