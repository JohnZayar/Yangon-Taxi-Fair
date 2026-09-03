document.addEventListener('DOMContentLoaded', () => {
    let rates = {
        base: 2500,
        km: 1200,
        waiting: 100
    };

    const savedRates = localStorage.getItem('taxi_rates_v8');
    if (savedRates) {
        try {
            rates = JSON.parse(savedRates);
        } catch (e) {
            console.error(e);
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
    const suggestionsBox = document.getElementById('suggestions-box');

    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModal = document.getElementById('close-modal');
    const saveSettingsBtn = document.getElementById('save-settings');

    const settingBase = document.getElementById('setting-base');
    const settingKm = document.getElementById('setting-km');
    const settingWaiting = document.getElementById('setting-waiting');

    let map, startMarker, endMarker;
    let startCoords = { lat: 16.8409, lng: 96.1735 }; // Default Yangon Center

    // Initialize Map
    map = L.map('map').setView([16.8409, 96.1735], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    map.on('click', (e) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        setDestination(lat, lng, `မြေပုံမှရွေးချယ်သောနေရာ (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
    });

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
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    function setDestination(lat, lng, name) {
        endLocationInput.value = name;
        suggestionsBox.innerHTML = ''; // Clear suggestions
        if (!endMarker) {
            endMarker = L.marker([lat, lng], {color: 'red'}).addTo(map)
                .bindPopup(name).openPopup();
        } else {
            endMarker.setLatLng([lat, lng]).bindPopup(name).openPopup();
        }
        map.setView([lat, lng], 14);

        const distanceKm = getDistanceFromLatLonInKm(startCoords.lat, startCoords.lng, lat, lng);
        const roadKm = distanceKm * 1.25;
        if (kmInput) {
            kmInput.value = roadKm.toFixed(1);
            calculateFare();
        }
    }

    // GPS Button
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
                        
                        if (!startMarker) {
                            startMarker = L.marker([lat, lng]).addTo(map)
                                .bindPopup('ထွက်ခွာမည့်နေရာ').openPopup();
                        } else {
                            startMarker.setLatLng([lat, lng]);
                        }
                        map.setView([lat, lng], 14);
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

    // Autocomplete Search as you type
    let searchTimeout;
    if (endLocationInput) {
        endLocationInput.addEventListener('input', () => {
            const query = endLocationInput.value.trim();
            if (query.length < 2) {
                suggestionsBox.innerHTML = '';
                return;
            }

            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' Yangon')}&limit=5`)
                    .then(res => res.json())
                    .then(data => {
                        suggestionsBox.innerHTML = '';
                        if (data && data.length > 0) {
                            data.forEach(item => {
                                const div = document.createElement('div');
                                div.className = 'suggestion-item';
                                div.textContent = item.display_name;
                                div.addEventListener('click', () => {
                                    setDestination(parseFloat(item.lat), parseFloat(item.lon), item.display_name);
                                });
                                suggestionsBox.appendChild(div);
                            });
                        }
                    })
                    .catch(err => console.error(err));
            }, 400);
        });
    }

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!endLocationInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
            suggestionsBox.innerHTML = '';
        }
    });

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

            localStorage.setItem('taxi_rates_v8', JSON.stringify(rates));
            settingsModal.style.display = 'none';
            calculateFare();
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.style.display = 'none';
    });

    calculateFare();
});
