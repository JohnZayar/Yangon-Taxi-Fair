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
    const mapDiv = document.getElementById('map');

    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModal = document.getElementById('close-modal');
    const saveSettingsBtn = document.getElementById('save-settings');

    const settingBase = document.getElementById('setting-base');
    const settingKm = document.getElementById('setting-km');
    const settingWaiting = document.getElementById('setting-waiting');

    let map, marker;

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

    // GPS Location Fetcher
    if (getGpsBtn) {
        getGpsBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                startLocationInput.value = "GPS ရယူနေပါသည်...";
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        startLocationInput.value = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
                        
                        // Show Map
                        mapDiv.style.display = 'block';
                        if (!map) {
                            map = L.map('map').setView([lat, lng], 15);
                            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                attribution: '&copy; OpenStreetMap contributors'
                            }).addTo(map);
                            marker = L.marker([lat, lng]).addTo(map)
                                .bindPopup('သင်ရှိရာ နေရာ').openPopup();
                        } else {
                            map.setView([lat, lng], 15);
                            marker.setLatLng([lat, lng]);
                        }
                    },
                    (error) => {
                        startLocationInput.value = "GPS ရယူ၍မရပါ။ Location ဖွင့်ထားပါ။";
                        alert("GPS Error: " + error.message);
                    },
                    { enableHighAccuracy: true }
                );
            } else {
                alert("သင့်ဘရောက်ဇာသည် GPS ကို မပံ့ပိုးပါ။");
            }
        });
    }

    // Event Listeners
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
