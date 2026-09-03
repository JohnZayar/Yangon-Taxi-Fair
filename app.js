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
    let searchTimeout = null;

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

                            // Map click support
                            map.on('click', (e) => {
                                const endLat = e.latlng.lat;
                                const endLng = e.latlng.lng;

                                endLocationInput.value = `(${endLat.toFixed(3)}, ${endLng.toFixed(3)})`;

                                if (!endMarker) {
                                    endMarker = L.marker([endLat, endLng], {color: 'red'}).addTo(map)
                                        .bindPopup('ရောက်ရှိမည့်နေရာ').openPopup();
                                } else {
                                    endMarker.setLatLng([endLat, endLng]);
                                }

                                const distanceKm = getDistanceFromLatLonInKm(startCoords.lat, startCoords.lng, endLat, endLng);
                                const roadKm = distanceKm * 1.25;

                                if (kmInput) {
                                    kmInput.value = roadKm.toFixed(1);
                                    calculateFare();
                                }
                            });
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

    // Instant Search as you type (Auto-search)
    if (endLocationInput) {
        endLocationInput.addEventListener('input', () => {
            const query = endLocationInput.value.trim();
            if (query.length < 2) return; // စာလုံး ၂ လုံးအထက်မှ စရှာမည်
            if (!startCoords) return;

            // Clear previous timeout to avoid too many requests while typing
            clearTimeout(searchTimeout);

            searchTimeout = setTimeout(() => {
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' Yangon')}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data && data.length > 0) {
                            const endLat = parseFloat(data[0].lat);
                            const endLon = parseFloat(data[0].lon);

                            if (!endMarker) {
                                endMarker = L.marker([endLat, endLon], {color: 'red'}).addTo(map)
                                    .bindPopup('ရောက်ရှိမည့်နေရာ: ' + query).openPopup();
                            } else {
                                endMarker.setLatLng([endLat, endLon]);
                            }

                            map.setView([endLat, endLon], 14);

                            const distanceKm = getDistanceFromLatLonInKm(startCoords.lat, startCoords.lng, endLat, endLon);
                            const roadKm = distanceKm * 1.25;

                            if (kmInput) {
                                kmInput.value = roadKm.toFixed(1);
                                calculateFare();
                            }
                        }
                    })
                    .catch(err => console.error(err));
            }, 600); // 0.6 စက္ကန့် စောင့်ပြီးမှ ရှာမည် (Debounce)
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
