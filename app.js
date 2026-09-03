document.addEventListener('DOMContentLoaded', () => {
    let rates = {
        base: 2500,
        km: 1200,
        waiting: 100
    };

    const savedRates = localStorage.getItem('taxi_rates_v3');
    if (savedRates) {
        try {
            rates = JSON.parse(savedRates);
        } catch (e) {
            console.error('Error parsing rates:', e);
        }
    }

    const kmInput = document.getElementById('km-input');
    const waitingInput = document.getElementById('waiting-input');
    const calculateBtn = document.getElementById('calculate-btn');
    const totalFareEl = document.getElementById('total-fare');
    const breakdownEl = document.getElementById('fare-breakdown');
    
    const getGpsBtn = document.getElementById('get-gps-btn');
    const startLocationInput = document.getElementById('start-location');
    const endLocationInput = document.getElementById('end-location');
    const mapDiv = document.getElementById('map');

    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModal = document.getElementById('close-modal');
    const saveSettingsBtn = document.getElementById('save-settings');

    const settingBase = document.getElementById('setting-base');
    const settingKm = document.getElementById('setting-km');
    const settingWaiting = document.getElementById('setting-waiting');

    let map, startMarker, endMarker;
    let startCoords = null;

    // Yangon Townships Coordinate Database (Reliable offline fallback & instant search)
    const yangonLocations = {
        "လှိုင်သာယာ": { lat: 16.8533, lng: 96.0678, km: 14.5 },
        "insein": { lat: 16.8931, lng: 96.1119, km: 12.0 },
        "အင်းစိန်": { lat: 16.8931, lng: 96.1119, km: 12.0 },
        "တာမွေ": { lat: 16.8080, lng: 96.1700, km: 4.0 },
        "tamwe": { lat: 16.8080, lng: 96.1700, km: 4.0 },
        "ဗိုလ်တထောင်": { lat: 16.7758, lng: 96.1702, km: 5.5 },
        "sule": { lat: 16.7741, lng: 96.1580, km: 3.5 },
        "စူးလေ": { lat: 16.7741, lng: 96.1580, km: 3.5 },
        "လှိုင်": { lat: 16.8396, lng: 96.1283, km: 6.0 },
        "hlaing": { lat: 16.8396, lng: 96.1283, km: 6.0 },
        "မြောက်ဥက္กระลาป": { lat: 16.9031, lng: 96.1822, km: 13.0 },
        "south okkalapa": { lat: 16.8390, lng: 96.1910, km: 8.0 },
        "သုวัณณ": { lat: 16.8150, lng: 96.1950, km: 7.0 },
        "သန်လျင်": { lat: 16.7600, lng: 96.2400, km: 18.0 },
        "ဒဂုံ": { lat: 16.7950, lng: 96.1450, km: 4.0 },
        "kamaryut": { lat: 16.8280, lng: 96.1350, km: 5.0 },
        "ကမာရွတ်": { lat: 16.8280, lng: 96.1350, km: 5.0 },
        "သန်လျင်": { lat: 16.7600, lng: 96.2400, km: 20.0 }
    };

    function calculateFare() {
        const km = kmInput && kmInput.value ? parseFloat(kmInput.value) : 0;
        const waitingMin = waitingInput && waitingInput.value ? parseFloat(waitingInput.value) : 0;

        const baseFee = rates.base;
        const kmFee = km * rates.km;
        const waitingFee = waitingMin * rates.waiting;
        const total = baseFee + kmFee + waitingFee;

        if (totalFareEl) totalFareEl.textContent = total.toLocaleString();
        if (breakdownEl) {
            breakdownEl.textContent = `စတင်ခ: ${baseFee.toLocaleString()} Ks | KM ဖိုး: ${kmFee.toLocaleString()} Ks | စောင့်ခ: ${waitingFee.toLocaleString()} Ks`;
        }
    }

    function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
        const R = 6371; 
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    function deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    // GPS Fetcher
    if (getGpsBtn) {
        getGpsBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                startLocationInput.value = "GPS ရှာနေသည်...";
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        startCoords = { lat, lng };
                        startLocationInput.value = `လက်ရှိတည်နေရာ (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
                        
                        mapDiv.style.display = 'block';
                        if (!map) {
                            map = L.map('map').setView([lat, lng], 13);
                            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                attribution: '&copy; OpenStreetMap'
                            }).addTo(map);
                            
                            startMarker = L.marker([lat, lng]).addTo(map)
                                .bindPopup('ထွက်ခွာမည့်နေရာ').openPopup();
                        } else {
                            map.setView([lat, lng], 13);
                            startMarker.setLatLng([lat, lng]);
                        }
                    },
                    (error) => {
                        startLocationInput.value = "";
                        alert("GPS ယူ၍မရပါ။ Location ဖွင့်ထားပါ။");
                    },
                    { enableHighAccuracy: true }
                );
            } else {
                alert("သင့်ဘရောက်ဇာတွင် GPS မပါဝင်ပါ။");
            }
        });
    }

    // Instant Smart Township Search as you type
    if (endLocationInput) {
        endLocationInput.addEventListener('input', () => {
            const query = endLocationInput.value.trim().toLowerCase();
            if (!query) return;

            // Check if typed query matches our Yangon database
            let foundLocation = null;
            for (let key in yangonLocations) {
                if (key.includes(query) || query.includes(key)) {
                    foundLocation = yangonLocations[key];
                    break;
                }
            }

            if (foundLocation && kmInput) {
                // If found in local DB, auto-fill KM instantly
                kmInput.value = foundLocation.km;
                calculateFare();

                if (map && startCoords) {
                    mapDiv.style.display = 'block';
                    if (!endMarker) {
                        endMarker = L.marker([foundLocation.lat, foundLocation.lng], {color: 'red'}).addTo(map)
                            .bindPopup('ရောက်ရှိမည့်နေရာ').openPopup();
                    } else {
                        endMarker.setLatLng([foundLocation.lat, foundLocation.lng]);
                    }
                    map.setView([foundLocation.lat, foundLocation.lng], 13);
                }
            }
        });
    }

    if (calculateBtn) calculateBtn.addEventListener('click', calculateFare);
    if (kmInput) kmInput.addEventListener('input', calculateFare);
    if (waitingInput) waitingInput.addEventListener('input', calculateFare);

    // Settings Modal
    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => {
            if(settingBase) settingBase.value = rates.base;
            if(settingKm) settingKm.value = rates.km;
            if(settingWaiting) settingWaiting.value = rates.waiting;
            settingsModal.style.display = 'flex';
        });
    }

    if (closeModal && settingsModal) {
        closeModal.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });
    }

    if (saveSettingsBtn && settingsModal) {
        saveSettingsBtn.addEventListener('click', () => {
            rates.base = parseFloat(settingBase.value) || 2500;
            rates.km = parseFloat(settingKm.value) || 1200;
            rates.waiting = parseFloat(settingWaiting.value) || 100;

            localStorage.setItem('taxi_rates_v3', JSON.stringify(rates));
            settingsModal.style.display = 'none';
            calculateFare();
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.style.display = 'none';
    });

    calculateFare();
});
