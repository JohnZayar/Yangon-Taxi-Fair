# 🚕 Yangon Taxi Fare — V9 (ပြန်လည်ပြင်ဆင်ထားသော ဗားရှင်း)

## ဘာတွေ ပြင်ထားလဲ

### 1. GPS ပြင်ဆင်ချက်
- `navigator.geolocation.getCurrentPosition` ကို `enableHighAccuracy`, `timeout`, error-code
  handling အပြည့်နှင့် ပြန်ရေးထားပါသည်။
- Permission ငြင်းပယ်ခံရခြင်း (`PERMISSION_DENIED`), Signal မရခြင်း (`POSITION_UNAVAILABLE`),
  အချိန်ကျော်ခြင်း (`TIMEOUT`) — အခြေအနေတစ်ခုစီအတွက် သီးခြား မြန်မာလို error message ပြပါသည်။
- HTTPS မဟုတ်ပါက (`window.isSecureContext` false ဖြစ်ပါက) ရှင်းလင်းစွာ သတိပေးပါသည်
  (GPS API သည် secure context — https:// — မှသာ အလုပ်လုပ်ပါသည်။ GitHub Pages က https ဖြစ်၍
  ပုံမှန်အားဖြင့် ပြဿနာမရှိသင့်ပါ)။
- တည်နေရာ ရရှိပြီးနောက် Nominatim (OpenStreetMap) reverse-geocoding ဖြင့် လိပ်စာအမည်ပြသပေးပါသည်။
- **Browser မှာ Location permission ကို "Allow" လုပ်ပေးဖို့ လိုအပ်ပါမည်** — Site Settings →
  Location ထဲမှာ စစ်ဆေးနိုင်ပါသည်။

### 2. Design အသစ် — "Taxi Meter" concept
Yangon street-taxi ၏ meter box ကို အခြေခံပြီး design အသစ် ရေးဆွဲထားပါသည်:
- ခေါင်းစီးမှာ taxi roof-light ပုံစံ dark bar၊ အလယ်တွင် **meter display** (LCD/digital
  font ဖြင့် ခန့်မှန်းခ ပြသ)
- Taxi-yellow (`#F5B700`) + charcoal (`#1C1B1A`) + cream (`#F7F3E9`) tone များ
- KM/မိနစ် ကို **slider** ဖြင့် ချိန်ညှိနိုင်ပြီး Route (OSRM) မှ auto-fill လုပ်ပါသည်
- Destination/Start location နှစ်ခုလုံးအတွက် **Smart Autocomplete** (Nominatim search) ပါဝင်ပါသည်
- Settings ကို modal အစား **bottom sheet** (mobile app ပုံစံ) ဖြင့် ပြောင်းထားပါသည်

### 3. Home Screen / PWA တိုးတက်မှု
- `manifest.json` ကို icon (`any` + `maskable`), `standalone` display, theme color အပြည့်နှင့်
  ပြင်ဆင်ထားပါသည်
- iOS အတွက် `apple-touch-icon`, `apple-mobile-web-app-capable` meta tags ထည့်ထားပါသည်
- `service-worker.js` ကို static file များ cache လုပ်ပြီး offline မှာလည်း app ဖွင့်နိုင်အောင်
  ပြင်ဆင်ထားပါသည် (Map tile/GPS/routing API တွေကိုတော့ cache မလုပ်ပါ — အမြဲ fresh data ရအောင်)
- Android Chrome တွင် "Add to Home Screen" banner ကို app ထဲကနေ တိုက်ရိုက် ပြပေးပါသည်
  (`beforeinstallprompt`)
- Icon အသစ် (`icon-192.png`, `icon-512.png`, `icon-180.png` — iOS) ကို taxi meter black/yellow
  theme အတိုင်း ပြန်ဆွဲထားပါသည်

## Repo ထဲကို ဘယ်လို Upload လုပ်မလဲ

1. ဤ folder ထဲက file အားလုံး (`index.html`, `style.css`, `app.js`, `manifest.json`,
   `service-worker.js`, `icon-192.png`, `icon-512.png`, `icon-180.png`) ကို သင့် GitHub repo
   (`Yangon-Taxi-Fair`) ရဲ့ root ထဲကို **အဟောင်းအစား replace** လုပ်ပါ။
2. Commit → Push လုပ်ပါ။
3. GitHub Pages က auto-deploy လုပ်ပါမည် (`https://johnzayar.github.io/Yangon-Taxi-Fair/`)။
4. Deploy ပြီးရင် Browser cache ကြောင့် အဟောင်း version မြင်ရနိုင်လို့ hard-refresh
   (`Ctrl+Shift+R` / mobile Chrome ⋮ → History → Clear browsing data → Cached images) လုပ်ကြည့်ပါ။

## မှတ်ချက်

- GPS/Autocomplete/Route feature တွေက free public API (OpenStreetMap Nominatim + OSRM demo
  server) တွေကို သုံးထားပါတယ်။ Usage များလွန်းရင် (heavy traffic) rate-limit တွေ့နိုင်ပါတယ် —
  production app အနေနဲ့ scale တက်လာရင် သင့်ကိုယ်ပိုင် Nominatim/OSRM server (သို့) Google Maps
  API key သုံးဖို့ အကြံပြုပါတယ်။
- Rate (base fare / per-km / per-minute) များကို Settings ထဲက **browser ရဲ့ localStorage**
  မှာ သိမ်းထားပါတယ် — device တစ်ခုချင်းစီအတွက် သီးခြား ဖြစ်ပါတယ်။
