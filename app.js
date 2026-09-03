document.addEventListener('DOMContentLoaded', () => {
    let rates = {
        base: 2500,
        km: 1200,
        waiting: 100
    };

    const savedRates = localStorage.getItem('taxi_rates');
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

    function calculateFare() {
        // Input တန်ဖိုးများကို တိုက်ရိုက်ဖမ်းယူခြင်း
        const km = kmInput && kmInput.value ? parseFloat(kmInput.value) : 0;
        const waitingMin = waitingInput && waitingInput.value ? parseFloat(waitingInput.value) : 0;

        const baseFee = rates.base;
        const kmFee = km * rates.km;
        const waitingFee = waitingMin * rates.waiting;
        const total = baseFee + kmFee + waitingFee;

        // UI ပေါ်သို့ တန်ဖိုးများ ထည့်သွင်းခြင်း
        if (totalFareEl) {
            totalFareEl.textContent = total.toLocaleString();
        }
        if (breakdownEl) {
            breakdownEl.textContent = `စတင်ခ: ${baseFee.toLocaleString()} Ks | KM ဖိုး: ${kmFee.toLocaleString()} Ks | စောင့်ခ: ${waitingFee.toLocaleString()} Ks`;
        }
    }

    // Event Listeners များ ချိတ်ဆက်ခြင်း
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculateFare);
    }
    if (kmInput) {
        kmInput.addEventListener('input', calculateFare);
    }
    if (waitingInput) {
        waitingInput.addEventListener('input', calculateFare);
    }

    // စတင်ဖွင့်ချင်း တွက်ချက်ပေးရန်
    calculateFare();
});
