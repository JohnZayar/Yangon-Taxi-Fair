document.addEventListener('DOMContentLoaded', () => {
    // Default Rates
    let rates = {
        base: 2500,
        km: 1200,
        waiting: 100
    };

    // Load saved settings if available
    const savedRates = localStorage.getItem('taxi_rates');
    if (savedRates) {
        rates = JSON.parse(savedRates);
    }

    // DOM Elements
    const kmInput = document.getElementById('km-input');
    const waitingInput = document.getElementById('waiting-input');
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

    // Calculate Function
    function calculateFare() {
        const km = parseFloat(kmInput.value) || 0;
        const waitingMin = parseFloat(waitingInput.value) || 0;

        const baseFee = rates.base;
        const kmFee = km * rates.km;
        const waitingFee = waitingMin * rates.waiting;

        const total = baseFee + kmFee + waitingFee;

        totalFareEl.textContent = total.toLocaleString();
        breakdownEl.textContent = `စတင်ခ: ${baseFee.toLocaleString()} Ks | KM ဖိုး: ${kmFee.toLocaleString()} Ks | စောင့်ခ: ${waitingFee.toLocaleString()} Ks`;
    }

    // Event Listeners
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculateFare);
    }
    if (kmInput) {
        kmInput.addEventListener('input', calculateFare);
    }
    if (waitingInput) {
        waitingInput.addEventListener('input', calculateFare);
    }

    // Mode Switcher Logic
    modeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            modeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const mode = tab.getAttribute('data-mode');
            const headerTitle = document.querySelector('header h1');
            if (headerTitle) {
                if(mode === 'driver') {
                    headerTitle.textContent = 'Yangon Taxi (Driver)';
                } else {
                    headerTitle.textContent = 'Yangon Taxi Fair';
                }
            }
        });
    });

    // Settings Modal Control
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

            localStorage.setItem('taxi_rates', JSON.stringify(rates));
            settingsModal.style.display = 'none';
            calculateFare();
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    // Initial calculation on load
    calculateFare();
});
