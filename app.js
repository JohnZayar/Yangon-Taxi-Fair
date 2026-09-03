const BASE_FARE = 2500;
const PER_KM = 1200;
const WAIT_PER_MIN = 100;

const distanceInput = document.getElementById("distance");
const waitingInput = document.getElementById("waiting");
const result = document.getElementById("result");
const fareOut = document.getElementById("fare");
const rangeOut = document.getElementById("range");
const distanceOut = document.getElementById("distanceOut");
const waitingOut = document.getElementById("waitingOut");

document.getElementById("calculate").addEventListener("click", () => {
  const km = parseFloat(distanceInput.value);
  const wait = parseInt(waitingInput.value || "0", 10);

  if (!Number.isFinite(km) || km <= 0) {
    alert("ခရီးအကွာအဝေး (km) ကို ထည့်ပေးပါ။");
    distanceInput.focus();
    return;
  }

  const safeWait = Math.max(0, wait);
  const fare = Math.round(BASE_FARE + (km * PER_KM) + (safeWait * WAIT_PER_MIN));

  // V1 range: approximately ±10%, rounded to nearest 500 Ks.
  const low = Math.max(0, Math.round((fare * 0.90) / 500) * 500);
  const high = Math.round((fare * 1.10) / 500) * 500;

  fareOut.textContent = fare.toLocaleString("en-US") + " Ks";
  rangeOut.textContent = `သင့်တင့်သောခ ${low.toLocaleString("en-US")}–${high.toLocaleString("en-US")} Ks`;
  distanceOut.textContent = km.toFixed(1) + " km";
  waitingOut.textContent = safeWait + " မိနစ်";
  result.classList.remove("hidden");
  result.scrollIntoView({ behavior: "smooth", block: "center" });
});

document.querySelectorAll(".mode").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mode").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js"));
}
