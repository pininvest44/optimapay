// API Base URL
const API_BASE = '/api/payments';

// DOM Elements
const form = document.getElementById('paymentForm');
const phoneNumbersInput = document.getElementById('phoneNumbers');
const amountInput = document.getElementById('amount');
const referenceInput = document.getElementById('reference');
const descriptionInput = document.getElementById('description');
const submitBtn = document.getElementById('submitBtn');
const resetBtn = document.getElementById('resetBtn');
const phoneCounter = document.getElementById('phoneCounter');
const resultsSection = document.getElementById('resultsSection');
const resultsContent = document.getElementById('resultsContent');
const batchesList = document.getElementById('batchesList');
const refreshBatchesBtn = document.getElementById('refreshBatchesBtn');
const statusBadge = document.getElementById('statusBadge');

// Update phone counter
phoneNumbersInput.addEventListener('input', () => {
    const numbers = getPhoneNumbers();
    phoneCounter.textContent = `${numbers.length} number${numbers.length !== 1 ? 's' : ''}`;
});

// Get phone numbers from textarea
function getPhoneNumbers() {
    return phoneNumbersInput.value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

// Show toast notification
function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Update status badge
function updateStatus(status, message) {
    const dot = statusBadge.querySelector('.status-dot');
    const text = statusBadge.querySelector('span:last-child');
    
    dot.className = 'status-dot';
    if (status === 'loading') {
        dot.classList.add('loading');
        text.textContent = 'Processing...';
    } else if (status === 'success') {
        dot.style.background = 'var(--success-color)';
        text.textContent = message || 'Ready';
    } else if (status === 'error') {
        dot.style.background = 'var(--danger-color)';
        text.textContent = message || 'Error';
    } else {
        dot.style.background = 'var(--success-color)';
        text.textContent = message || 'Ready';
    }
}

// Submit form
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const phoneNumbers = getPhoneNumbers();
    if (phoneNumbers.length === 0) {
        showToast('Please enter at least one phone number', 'error');
        return;
    }
    
    const amount = parseFloat(amountInput.value);
    if (!amount || amount < 1) {
        showToast('Please enter a valid amount (minimum 1 KES)', 'error');
        return;
    }
    
    // Validate phone numbers format
    const phoneRegex = /^254[0-9]{9}$/;
    const invalidPhones = phoneNumbers.filter(p => !phoneRegex.test(p));
    if (invalidPhones.length > 0) {
        showToast(`Invalid phone number format: ${invalidPhones[0]}. Use format: 254712345678`, 'error');
        return;
    }
    
    // Prepare data
    const data = {
        phoneNumbers: phoneNumbers,
        amount: amount,
        reference: referenceInput.value.trim() || null,
        description: descriptionInput.value.trim() || null
    };
    
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Sending...';
    updateStatus('loading', 'Processing payments...');
    
    try {
        const response = await fetch(`${API_BASE}/bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Request failed');
        }
        
        // Show results
        displayResults(result);
        showToast(`✅ ${result.summary.successful} payments successful, ${result.summary.failed} failed`, 
            result.summary.failed === 0 ? 'success' : 'info');
        updateStatus('success', 'Completed');
        
        // Refresh batches
        loadBatches();
        
    } catch (error) {
        console.error('Error:', error);
        showToast(`❌ Error: ${error.message}`, 'error');
        updateStatus('error', 'Error occurred');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="btn-icon">🚀</span> Send Payments';
    }
});

// Display results
function displayResults(result) {
    resultsSection.style.display = 'block';
    
    let html = `
        <div class="result-summary">
            <div class="summary-item total">
                <div class="number">${result.summary.total}</div>
                <div class="label">Total</div>
            </div>
            <div class="summary-item success">
                <div class="number">${result.summary.successful}</div>
                <div class="label">Successful</div>
            </div>
            <div class="summary-item failed">
                <div class="number">${result.summary.failed}</div>
                <div class="label">Failed</div>
            </div>
        </div>
        <div class="result-details">
            ${result.results.map(r => `
                <div class="result-item">
                    <span class="phone">${r.phoneNumber}</span>
                    <span class="status-badge ${r.success ? 'success' : 'failed'}">
                        ${r.success ? '✅ Success' : '❌ Failed'}
                    </span>
                    <span style="font-size:0.8rem;color:var(--gray-500)">${r.message}</span>
                </div>
            `).join('')}
        </div>
    `;
    
    resultsContent.innerHTML = html;
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Load batches
async function loadBatches() {
    try {
        const response = await fetch(`${API_BASE}/batches?limit=10`);
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message);
        }
        
        const batches = result.data.batches || [];
        
        if (batches.length === 0) {
            batchesList.innerHTML = '<p class="empty-message">No batches processed yet</p>';
            return;
        }
        
        let html = '';
        batches.forEach(batch => {
            html += `
                <div class="batch-item">
                    <div class="batch-info">
                        <span class="batch-id">${batch.id}</span>
                        <span class="batch-meta">
                            ${new Date(batch.createdAt).toLocaleString()} • 
                            ${batch.total} transactions • 
                            KES ${batch.amount}
                        </span>
                    </div>
                    <div class="batch-stats">
                        <span class="stat">
                            <span class="stat-icon">✅</span> ${batch.successful}
                        </span>
                        <span class="stat">
                            <span class="stat-icon">❌</span> ${batch.failed}
                        </span>
                        <span class="stat" style="color:var(--gray-500)">
                            ${batch.status === 'completed' ? '✓ Completed' : '⏳ Processing'}
                        </span>
                    </div>
                </div>
            `;
        });
        
        batchesList.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading batches:', error);
        batchesList.innerHTML = '<p class="empty-message">Error loading batches</p>';
    }
}

// Reset form
resetBtn.addEventListener('click', () => {
    form.reset();
    phoneCounter.textContent = '0 numbers';
    resultsSection.style.display = 'none';
});

// Refresh batches
refreshBatchesBtn.addEventListener('click', loadBatches);

// Load initial batches
loadBatches();

// Auto-refresh batches every 30 seconds
setInterval(loadBatches, 30000);

// Set current date as default reference
const now = new Date();
const dateStr = now.getFullYear().toString().slice(2) + 
    String(now.getMonth() + 1).padStart(2, '0') + 
    String(now.getDate()).padStart(2, '0');
referenceInput.placeholder = `BULK_${dateStr}_001`;
