document.addEventListener('DOMContentLoaded', () => {
    let rates = {
        base: 2500,
        km: 1200,
        waiting: 100
    };

    const savedRates = localStorage.getItem('taxi_rates_v2');
    if (savedRates) {
        try {
            rates = JSON.parse(savedRates);
        } catch (e) {
            console.error('Error parsing rates:', e);
        }
    }

    // Elements
    const kmInput = document.getElementById('km-input');
    const waitingInput = document.getElementById('waiting-input');
    const driverKmInput = document.getElementById('driver-km-input');
    const driverWaitingInput = document.getElementById('driver-waiting-input');
    
    const calculateBtn = document.getElementById('calculate-btn');
    const totalFareEl = document.getElementById('total-fare');
    const breakdownEl = document.getElementById('fare-breakdown');
    
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModal = document.getElementById('close-modal');
    const saveSettingsBtn = document.getElementById('save-settings');

    const settingBase = document.getElementById('setting-base');
    const settingKm = document.getElementById('setting-km');
    const settingWaiting = document.getElementById('setting-waiting');

    const modeTabs = document.querySelectorAll('.mode-tab');
    const passengerSection = document.getElementById('passenger-section');
    const driverSection = document.getElementById('driver-section');
    const appTitle = document.getElementById('app-title');

    let currentMode = 'passenger';

    function calculateFare() {
        let km = 0;
        let waitingMin = 0;

        if (currentMode === 'driver') {
            km = driverKmInput && driverKmInput.value ? parseFloat(driverKmInput.value) : 0;
            waitingMin = driverWaitingInput && driverWaitingInput.value ? parseFloat(driverWaitingInput.value) : 0;
        } else {
            km = kmInput && kmInput.value ? parseFloat(kmInput.value) : 0;
            waitingMin = waitingInput && waitingInput.value ? parseFloat(waitingInput.value) : 0;
        }

        const baseFee = rates.base;
        const kmFee = km * rates.km;
        const waitingFee = waitingMin * rates.waiting;
        const total = baseFee + kmFee + waitingFee;

        if (totalFareEl) {
            totalFareEl.textContent = total.toLocaleString();
        }
        if (breakdownEl) {
            breakdownEl.textContent = `စတင်ခ: ${baseFee.toLocaleString()} Ks | KM ဖိုး: ${kmFee.toLocaleString()} Ks | စောင့်ခ: ${waitingFee.toLocaleString()} Ks`;
        }
    }

    // Mode Switcher logic
    modeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            modeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            currentMode = tab.getAttribute('data-mode');
            
            if (currentMode === 'driver') {
                if(passengerSection) passengerSection.style.display = 'none';
                if(driverSection) driverSection.style.display = 'block';
                if(appTitle) appTitle.textContent = 'Yangon Taxi (Driver)';
            } else {
                if(passengerSection) passengerSection.style.display = 'block';
                if(driverSection) driverSection.style.display = 'none';
                if(appTitle) appTitle.textContent = 'Yangon Taxi Fair';
            }
            calculateFare();
        });
    });

    // Event Listeners for inputs
    if (calculateBtn) calculateBtn.addEventListener('click', calculateFare);
    if (kmInput) kmInput.addEventListener('input', calculateFare);
    if (waitingInput) waitingInput.addEventListener('input', calculateFare);
    if (driverKmInput) driverKmInput.addEventListener('input', calculateFare);
    if (driverWaitingInput) driverWaitingInput.addEventListener('input', calculateFare);

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

            localStorage.setItem('taxi_rates_v2', JSON.stringify(rates));
            settingsModal.style.display = 'none';
            calculateFare();
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    calculateFare();
});
