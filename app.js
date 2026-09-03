document.addEventListener('DOMContentLoaded', () => {
    let rates = {
        base: 2500,
        km: 1200,
        waiting: 100
    };

    // Load saved rates from localStorage safely
    const savedRates = localStorage.getItem('taxi_rates');
    if (savedRates) {
        try {
            rates = JSON.parse(savedRates);
        } catch (e) {
            console.error('Failed to parse saved rates', e);
        }
    }

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

    function calculateFare() {
        const km = parseFloat(kmInput.value) || 0;
        const waitingMin = parseFloat(waitingInput.value) || 0;

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

    // Event Listeners for Calculation
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculateFare);
    }
    if (kmInput) {
        kmInput.addEventListener('input', calculateFare);
    }
    if (waitingInput) {
        waitingInput.addEventListener('input', calculateFare);
    }

    // Mode Switching Logic
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
                    headerTitle.textContent = 'Yangon Yangon Taxi Fair';
                }
            }
        });
    });

    // Settings Modal Open/Close Logic
    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => {
            if(settingBase) settingBase.value = rates.base;
            if(settingKm) settingKm.value = rates.km;
            if(settingWaiting) settingWaiting.value = rates.waiting;
            settingsModal.style.display = 'flex'; // Modal ကို ပေါ်လာစေရန်
        });
    }

    if (closeModal && settingsModal) {
        closeModal.addEventListener('click', () => {
            settingsModal.style.display = 'none'; // Modal ကို ပိတ်ရန်
        });
    }

    // Save Settings Logic
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

    // Close Modal when clicking outside content
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    // Initial calculation call
    calculateFare();
});
