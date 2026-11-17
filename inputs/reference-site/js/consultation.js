// The Criterion Holistic Wellness Home — Clinical Consultation Flow Controller

const CONSULT_CONCERNS = [
    {
        id: 'fertility',
        title: 'Fertility & Conception',
        desc: 'Sperm count, motility, ovulation regularity, hormonal balance, or couple preconception care.',
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>'
    },
    {
        id: 'mens-health',
        title: "Men's Reproductive Health",
        desc: 'Vitality, stamina, testicular microcirculation, and male hormonal support.',
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="14" r="5"/><line x1="19" y1="5" x2="13.6" y2="10.4"/><polyline points="19 10 19 5 14 5"/></svg>'
    },
    {
        id: 'womens-health',
        title: "Women's Hormonal Wellness",
        desc: 'Menstrual rhythm, PCOS, pelvic discomfort, fibroid support, and cycle balance.',
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="5"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/></svg>'
    },
    {
        id: 'general-wellness',
        title: 'General Wellness & Detox',
        desc: 'Hepatic cleanse, microbial defense, metabolic energy, and systemic restoration.',
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zm0 4v6l4 2"/></svg>'
    },
    {
        id: 'product-guidance',
        title: 'Formulation Guidance',
        desc: 'Unsure which Criterion botanical remedy or clinical protocol suits your condition.',
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>'
    },
    {
        id: 'something-else',
        title: 'Other Health Inquiries',
        desc: 'Customized wellness assessment for other health challenges or questions.',
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    }
];

// Consultation State
const consultState = {
    step: 1,
    concern: 'fertility',
    fullName: '',
    phone: '',
    email: '',
    message: '',
    hasDocument: 'no',
    documentFile: null,
    documentMeta: null,
    method: 'online'
};

function initConsultationFlow() {
    const root = document.getElementById('consult-flow-root');
    if (!root) return;

    // Check URL query parameters for pre-selected concern
    const params = new URLSearchParams(window.location.search);
    const paramConcern = params.get('concern');
    if (paramConcern && CONSULT_CONCERNS.some(c => c.id === paramConcern)) {
        consultState.concern = paramConcern;
    }

    renderCurrentStep();
}

function updateStepperUI(currentStep) {
    const nodes = document.querySelectorAll('.consult-step-node');
    const lines = document.querySelectorAll('.consult-step-line');

    nodes.forEach(node => {
        const stepNum = parseInt(node.getAttribute('data-step'), 10);
        node.classList.remove('current', 'completed');
        if (stepNum < currentStep) {
            node.classList.add('completed');
            node.querySelector('.step-num').innerHTML = '&#10003;';
        } else if (stepNum === currentStep) {
            node.classList.add('current');
            node.querySelector('.step-num').textContent = stepNum;
        } else {
            node.querySelector('.step-num').textContent = stepNum;
        }
    });

    lines.forEach(line => {
        const lineNum = parseInt(line.getAttribute('data-line'), 10);
        if (lineNum < currentStep) {
            line.classList.add('active');
        } else {
            line.classList.remove('active');
        }
    });
}

function renderCurrentStep() {
    const root = document.getElementById('consult-flow-root');
    if (!root) return;

    updateStepperUI(consultState.step);

    switch (consultState.step) {
        case 1:
            renderStep1(root);
            break;
        case 2:
            renderStep2(root);
            break;
        case 3:
            renderStep3(root);
            break;
        case 4:
            renderStep4(root);
            break;
        case 5:
            renderStep5(root);
            break;
        case 6:
            renderConfirmation(root);
            break;
        default:
            renderStep1(root);
    }

    // Scroll to container top smoothly
    window.scrollTo({ top: 220, behavior: 'smooth' });
}

// ----------------------------------------------------
// STEP 1: CONCERN SELECTION
// ----------------------------------------------------
function renderStep1(root) {
    const optionsHTML = CONSULT_CONCERNS.map(c => `
        <label class="concern-option-card ${consultState.concern === c.id ? 'active' : ''}" for="concern-${c.id}">
            <input type="radio" id="concern-${c.id}" name="concern" value="${c.id}" ${consultState.concern === c.id ? 'checked' : ''}>
            <div class="concern-icon">${c.icon}</div>
            <div class="concern-body">
                <h3>${c.title}</h3>
                <p>${c.desc}</p>
            </div>
        </label>
    `).join('');

    root.innerHTML = `
        <div class="consult-step-card">
            <div class="consult-step-intro">
                <span class="step-counter">Step 1 of 5</span>
                <h2>What Would You Like to Talk About?</h2>
                <p>Select the health focus that best describes your current wellness goals or symptoms.</p>
            </div>

            <div class="concern-grid">
                ${optionsHTML}
            </div>

            <div class="consult-step-actions">
                <div></div>
                <button type="button" class="btn btn-primary" id="btn-step1-next">Continue to Personal Details &rarr;</button>
            </div>
        </div>
    `;

    // Radio change listeners
    document.querySelectorAll('input[name="concern"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            consultState.concern = e.target.value;
            document.querySelectorAll('.concern-option-card').forEach(card => card.classList.remove('active'));
            const parentCard = e.target.closest('.concern-option-card');
            if (parentCard) parentCard.classList.add('active');
        });
    });

    const nextBtn = document.getElementById('btn-step1-next');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            consultState.step = 2;
            renderCurrentStep();
        });
    }
}

// ----------------------------------------------------
// STEP 2: PERSONAL DETAILS
// ----------------------------------------------------
function renderStep2(root) {
    root.innerHTML = `
        <div class="consult-step-card">
            <div class="consult-step-intro">
                <span class="step-counter">Step 2 of 5</span>
                <h2>Personal Details</h2>
                <p>Tell us who you are and share a brief note about what you are experiencing so our clinical team can prepare for your inquiry.</p>
            </div>

            <form id="consult-details-form" novalidate>
                <div class="form-group">
                    <label for="consult-name">Full Name <span class="required-star">*</span></label>
                    <input type="text" id="consult-name" class="form-control" placeholder="e.g. Bisi Adeyemi" value="${consultState.fullName || ''}" required>
                    <span class="form-error" id="err-c-name"></span>
                </div>

                <div class="form-row">
                    <div class="form-group flex-1">
                        <label for="consult-phone">Phone Number <span class="required-star">*</span></label>
                        <input type="tel" id="consult-phone" class="form-control" placeholder="e.g. 0802 345 6789" value="${consultState.phone || ''}" required>
                        <span class="form-hint">Direct line for consultation coordination</span>
                        <span class="form-error" id="err-c-phone"></span>
                    </div>
                    <div class="form-group flex-1">
                        <label for="consult-email">Email Address <span class="optional-tag">(Optional)</span></label>
                        <input type="email" id="consult-email" class="form-control" placeholder="e.g. bisi@example.com" value="${consultState.email || ''}">
                        <span class="form-hint">For appointment details & notes</span>
                        <span class="form-error" id="err-c-email"></span>
                    </div>
                </div>

                <div class="form-group">
                    <label for="consult-message">Brief Message or Health Background <span class="required-star">*</span></label>
                    <textarea id="consult-message" class="form-control" rows="4" placeholder="Briefly describe what you are seeking help with, relevant history, or key questions for the herbal practitioner..." required>${consultState.message || ''}</textarea>
                    <span class="form-hint">Keep it simple. You do not need to provide a complete medical record here.</span>
                    <span class="form-error" id="err-c-message"></span>
                </div>

                <div class="consult-step-actions">
                    <button type="button" class="btn btn-outline" id="btn-step2-back">&larr; Back</button>
                    <button type="submit" class="btn btn-primary">Continue to Document Upload &rarr;</button>
                </div>
            </form>
        </div>
    `;

    // Back button
    document.getElementById('btn-step2-back').addEventListener('click', () => {
        consultState.step = 1;
        renderCurrentStep();
    });

    // Form submit
    document.getElementById('consult-details-form').addEventListener('submit', (e) => {
        e.preventDefault();

        // Clear errors
        document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
        document.querySelectorAll('.form-control').forEach(el => el.classList.remove('is-invalid'));

        let isValid = true;
        const nameVal = document.getElementById('consult-name').value.trim();
        const phoneVal = document.getElementById('consult-phone').value.trim();
        const emailVal = document.getElementById('consult-email').value.trim();
        const messageVal = document.getElementById('consult-message').value.trim();

        if (!nameVal || nameVal.length < 3) {
            isValid = false;
            document.getElementById('err-c-name').textContent = 'Please enter your full name (minimum 3 characters).';
            document.getElementById('consult-name').classList.add('is-invalid');
        }

        const phoneRegex = /^[0-9+\s\-()]{10,16}$/;
        if (!phoneVal || !phoneRegex.test(phoneVal)) {
            isValid = false;
            document.getElementById('err-c-phone').textContent = 'Please enter a valid phone number (10 to 14 digits).';
            document.getElementById('consult-phone').classList.add('is-invalid');
        }

        if (emailVal) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailVal)) {
                isValid = false;
                document.getElementById('err-c-email').textContent = 'Please enter a valid email address.';
                document.getElementById('consult-email').classList.add('is-invalid');
            }
        }

        if (!messageVal || messageVal.length < 8) {
            isValid = false;
            document.getElementById('err-c-message').textContent = 'Please provide a brief sentence describing your wellness inquiry.';
            document.getElementById('consult-message').classList.add('is-invalid');
        }

        if (!isValid) return;

        consultState.fullName = nameVal;
        consultState.phone = phoneVal;
        consultState.email = emailVal;
        consultState.message = messageVal;

        consultState.step = 3;
        renderCurrentStep();
    });
}

// ----------------------------------------------------
// STEP 3: OPTIONAL DOCUMENT UPLOAD
// ----------------------------------------------------
function renderStep3(root) {
    const isYes = consultState.hasDocument === 'yes';

    root.innerHTML = `
        <div class="consult-step-card">
            <div class="consult-step-intro">
                <span class="step-counter">Step 3 of 5</span>
                <h2>Optional Test / Document Upload</h2>
                <p>Do you have recent lab test results, hormone profiles, pelvic scans, or semen analysis that you would like to provide for clinical context?</p>
            </div>

            <div class="doc-choice-row">
                <label class="doc-choice-pill ${isYes ? 'active' : ''}">
                    <input type="radio" name="has_doc" value="yes" ${isYes ? 'checked' : ''}>
                    <span>Yes, I have documents to upload</span>
                </label>
                <label class="doc-choice-pill ${!isYes ? 'active' : ''}">
                    <input type="radio" name="has_doc" value="no" ${!isYes ? 'checked' : ''}>
                    <span>No, not at this time</span>
                </label>
            </div>

            <!-- Upload Area (shown if yes) -->
            <div id="upload-box-wrapper" style="display: ${isYes ? 'block' : 'none'}; margin-top: 24px;">
                <div class="file-dropzone" id="file-dropzone">
                    <input type="file" id="consult-file-input" accept=".pdf,.jpg,.jpeg,.png" style="display: none;">
                    <div class="dropzone-content">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <p class="dropzone-title">Click to select a document or image</p>
                        <p class="dropzone-sub">Supported formats: PDF, JPG, PNG (Max 5MB)</p>
                    </div>
                </div>

                <div id="selected-file-display" style="margin-top: 14px; display: ${consultState.documentMeta ? 'block' : 'none'};">
                    ${consultState.documentMeta ? `
                        <div class="selected-file-badge">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                            <span class="file-name">${consultState.documentMeta.name}</span>
                            <span class="file-size">(${consultState.documentMeta.sizeFormatted})</span>
                            <button type="button" class="btn-remove-file" id="btn-remove-file" aria-label="Remove document">&times;</button>
                        </div>
                    ` : ''}
                </div>
                <span class="form-error" id="err-c-file" style="margin-top: 8px;"></span>

                <div class="privacy-notice-box" style="margin-top: 18px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <span><strong>Privacy Protection:</strong> Documents are reviewed confidentially by qualified Criterion practitioners. In this local preview, files remain strictly inside your browser.</span>
                </div>
            </div>

            <div class="consult-step-actions">
                <button type="button" class="btn btn-outline" id="btn-step3-back">&larr; Back</button>
                <button type="button" class="btn btn-primary" id="btn-step3-next">Continue to Consultation Method &rarr;</button>
            </div>
        </div>
    `;

    // Choice pill toggle
    document.querySelectorAll('input[name="has_doc"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            consultState.hasDocument = e.target.value;
            const uploadWrapper = document.getElementById('upload-box-wrapper');
            document.querySelectorAll('.doc-choice-pill').forEach(p => p.classList.remove('active'));
            e.target.closest('.doc-choice-pill').classList.add('active');

            if (e.target.value === 'yes') {
                uploadWrapper.style.display = 'block';
            } else {
                uploadWrapper.style.display = 'none';
                consultState.documentFile = null;
                consultState.documentMeta = null;
                const fileDisp = document.getElementById('selected-file-display');
                if (fileDisp) fileDisp.style.display = 'none';
            }
        });
    });

    // File input trigger
    const dropzone = document.getElementById('file-dropzone');
    const fileInput = document.getElementById('consult-file-input');
    if (dropzone && fileInput) {
        dropzone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const errEl = document.getElementById('err-c-file');
            if (errEl) errEl.textContent = '';

            if (!file) return;

            // Validate format
            const validExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
            const ext = file.name.split('.').pop().toLowerCase();
            if (!validExtensions.includes(ext)) {
                if (errEl) errEl.textContent = 'Invalid file format. Please upload a PDF, JPG, or PNG document.';
                fileInput.value = '';
                return;
            }

            // Validate size (max 5MB)
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                if (errEl) errEl.textContent = 'File exceeds maximum limit of 5MB. Please select a smaller file.';
                fileInput.value = '';
                return;
            }

            // Save in state
            const sizeKB = Math.round(file.size / 1024);
            const sizeFormatted = sizeKB > 1024 ? (sizeKB / 1024).toFixed(1) + ' MB' : sizeKB + ' KB';

            consultState.documentFile = file;
            consultState.documentMeta = {
                name: file.name,
                sizeFormatted: sizeFormatted
            };

            const fileDisp = document.getElementById('selected-file-display');
            if (fileDisp) {
                fileDisp.innerHTML = `
                    <div class="selected-file-badge">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">(${sizeFormatted})</span>
                        <button type="button" class="btn-remove-file" id="btn-remove-file" aria-label="Remove document">&times;</button>
                    </div>
                `;
                fileDisp.style.display = 'block';

                document.getElementById('btn-remove-file').addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    consultState.documentFile = null;
                    consultState.documentMeta = null;
                    fileInput.value = '';
                    fileDisp.style.display = 'none';
                });
            }
        });
    }

    // Remove existing file button if present
    const existingRemoveBtn = document.getElementById('btn-remove-file');
    if (existingRemoveBtn) {
        existingRemoveBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            consultState.documentFile = null;
            consultState.documentMeta = null;
            const fileDisp = document.getElementById('selected-file-display');
            if (fileDisp) fileDisp.style.display = 'none';
        });
    }

    // Step 3 Actions
    document.getElementById('btn-step3-back').addEventListener('click', () => {
        consultState.step = 2;
        renderCurrentStep();
    });

    document.getElementById('btn-step3-next').addEventListener('click', () => {
        consultState.step = 4;
        renderCurrentStep();
    });
}

// ----------------------------------------------------
// STEP 4: CONSULTATION METHOD
// ----------------------------------------------------
function renderStep4(root) {
    const isOnline = consultState.method === 'online';

    root.innerHTML = `
        <div class="consult-step-card">
            <div class="consult-step-intro">
                <span class="step-counter">Step 4 of 5</span>
                <h2>Preferred Consultation Method</h2>
                <p>Choose whether you would like to connect with our clinical team remotely or visit our wellness home in Ilorin.</p>
            </div>

            <div class="method-options-grid">
                <label class="method-card ${isOnline ? 'active' : ''}" for="method-online">
                    <input type="radio" id="method-online" name="method" value="online" ${isOnline ? 'checked' : ''}>
                    <div class="method-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                    </div>
                    <div class="method-info">
                        <h3>Online Consultation</h3>
                        <p>Detailed consultation via phone call, WhatsApp voice/video, or telehealth audio session from anywhere in Nigeria or internationally.</p>
                        <span class="method-tag">Recommended for Distant Clients</span>
                    </div>
                </label>

                <label class="method-card ${!isOnline ? 'active' : ''}" for="method-inperson">
                    <input type="radio" id="method-inperson" name="method" value="inperson" ${!isOnline ? 'checked' : ''}>
                    <div class="method-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                    </div>
                    <div class="method-info">
                        <h3>In-Person Consultation</h3>
                        <p>Physical clinical assessment at The Criterion Holistic Wellness Home, 18, Reservation Road, GRA, Ilorin, Kwara State.</p>
                        <span class="method-tag">Clinic Visit</span>
                    </div>
                </label>
            </div>

            <div class="schedule-notice-box" style="margin-top: 24px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <div>
                    <strong>Appointment Scheduling:</strong> Once your request is received, our care coordinator will reach out directly to align on a specific date and time slot that fits your schedule.
                </div>
            </div>

            <div class="consult-step-actions">
                <button type="button" class="btn btn-outline" id="btn-step4-back">&larr; Back</button>
                <button type="button" class="btn btn-primary" id="btn-step4-next">Review Request Summary &rarr;</button>
            </div>
        </div>
    `;

    document.querySelectorAll('input[name="method"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            consultState.method = e.target.value;
            document.querySelectorAll('.method-card').forEach(c => c.classList.remove('active'));
            e.target.closest('.method-card').classList.add('active');
        });
    });

    document.getElementById('btn-step4-back').addEventListener('click', () => {
        consultState.step = 3;
        renderCurrentStep();
    });

    document.getElementById('btn-step4-next').addEventListener('click', () => {
        consultState.step = 5;
        renderCurrentStep();
    });
}

// ----------------------------------------------------
// STEP 5: SUMMARY & SUBMISSION
// ----------------------------------------------------
function renderStep5(root) {
    const concernObj = CONSULT_CONCERNS.find(c => c.id === consultState.concern) || CONSULT_CONCERNS[0];

    root.innerHTML = `
        <div class="consult-step-card">
            <div class="consult-step-intro">
                <span class="step-counter">Step 5 of 5</span>
                <h2>Review Your Consultation Request</h2>
                <p>Please review your information below before submitting. You can edit any section if you need to make changes.</p>
            </div>

            <div class="consult-summary-table">
                <div class="summary-row">
                    <span class="row-label">Primary Concern</span>
                    <span class="row-value"><strong>${concernObj.title}</strong></span>
                </div>
                <div class="summary-row">
                    <span class="row-label">Full Name</span>
                    <span class="row-value">${consultState.fullName}</span>
                </div>
                <div class="summary-row">
                    <span class="row-label">Phone Number</span>
                    <span class="row-value">${consultState.phone}</span>
                </div>
                ${consultState.email ? `
                    <div class="summary-row">
                        <span class="row-label">Email Address</span>
                        <span class="row-value">${consultState.email}</span>
                    </div>
                ` : ''}
                <div class="summary-row">
                    <span class="row-label">Message / Goal</span>
                    <span class="row-value">${consultState.message}</span>
                </div>
                <div class="summary-row">
                    <span class="row-label">Documents Attached</span>
                    <span class="row-value">
                        ${consultState.documentMeta ? `
                            <span class="doc-pill">&#128206; ${consultState.documentMeta.name} (${consultState.documentMeta.sizeFormatted})</span>
                        ` : '<span style="color: var(--color-text-muted);">None attached (Optional)</span>'}
                    </span>
                </div>
                <div class="summary-row">
                    <span class="row-label">Consultation Method</span>
                    <span class="row-value"><strong>${consultState.method === 'online' ? 'Online Consultation' : 'In-Person (Ilorin Clinic)'}</strong></span>
                </div>
            </div>

            <div class="consult-submit-disclaimer">
                🌿 Sincere holistic assessment. Submitting this request allows our clinical team to review your inquiry and contact you to establish an appointment. No automatic diagnoses are generated.
            </div>

            <div class="consult-step-actions">
                <button type="button" class="btn btn-outline" id="btn-step5-edit">Edit Details</button>
                <button type="button" class="btn btn-primary btn-submit-consult" id="btn-submit-consult">
                    Submit Consultation Request &rarr;
                </button>
            </div>
        </div>
    `;

    document.getElementById('btn-step5-edit').addEventListener('click', () => {
        consultState.step = 2; // Jump back to details to edit
        renderCurrentStep();
    });

    document.getElementById('btn-submit-consult').addEventListener('click', () => {
        // Compile Consultation Representation Object
        const consultSubmission = {
            requestId: 'CRIT-CNS-' + Math.floor(100000 + Math.random() * 900000),
            concern: concernObj.title,
            client: {
                fullName: consultState.fullName,
                phone: consultState.phone,
                email: consultState.email || null
            },
            message: consultState.message,
            document: consultState.documentMeta ? {
                attached: true,
                fileName: consultState.documentMeta.name,
                fileSize: consultState.documentMeta.sizeFormatted
            } : { attached: false },
            consultationMethod: consultState.method === 'online' ? 'Online' : 'In-Person',
            status: 'REQUEST_RECEIVED',
            createdAt: new Date().toISOString()
        };

        // Transition to confirmation state
        consultState.step = 6;
        consultState.submission = consultSubmission;
        renderCurrentStep();
    });
}

// ----------------------------------------------------
// STEP 6: CONFIRMATION
// ----------------------------------------------------
function renderConfirmation(root) {
    const sub = consultState.submission || {
        requestId: 'CRIT-CNS-982143',
        client: { fullName: consultState.fullName, phone: consultState.phone },
        concern: 'Fertility & Conception',
        consultationMethod: 'Online'
    };

    // Update stepper to all completed
    const stepper = document.getElementById('consult-stepper');
    if (stepper) {
        stepper.querySelectorAll('.consult-step-node').forEach(node => {
            node.classList.remove('current');
            node.classList.add('completed');
            node.querySelector('.step-num').innerHTML = '&#10003;';
        });
        stepper.querySelectorAll('.consult-step-line').forEach(line => line.classList.add('active'));
    }

    root.innerHTML = `
        <div class="confirmation-panel">
            <div class="confirmation-icon-circle">
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            </div>

            <span class="section-tag" style="margin-bottom: 8px;">Request Received</span>
            <h2 class="confirmation-title">We've Received Your Request, ${sub.client.fullName}</h2>
            <p class="confirmation-subtitle">
                Thank you for reaching out to The Criterion Holistic Wellness Home. Your consultation request has been received by our clinic intake workflow.
            </p>

            <div class="order-ref-card">
                <div class="order-ref-label">Consultation Request Reference</div>
                <div class="order-ref-value">${sub.requestId}</div>
            </div>

            <div class="confirmation-notice-box">
                <h4>What Happens Next?</h4>
                <p>
                    A Criterion clinical care coordinator will review your health background (Focus: <strong>${sub.concern}</strong>) and contact you at <strong>${sub.client.phone}</strong> within <strong>24 to 48 business hours</strong> to coordinate your preferred <strong>${sub.consultationMethod}</strong> appointment schedule.
                </p>
            </div>

            <div class="confirmation-details-grid">
                <div class="conf-card">
                    <h3>Consultation Details</h3>
                    <p><strong>Primary Concern:</strong> ${sub.concern}</p>
                    <p><strong>Method:</strong> ${sub.consultationMethod}</p>
                    <p><strong>Documents:</strong> ${sub.document && sub.document.attached ? sub.document.fileName : 'None attached'}</p>
                </div>

                <div class="conf-card">
                    <h3>Contact Information</h3>
                    <p><strong>Client:</strong> ${sub.client.fullName}</p>
                    <p><strong>Phone:</strong> ${sub.client.phone}</p>
                    ${sub.client.email ? `<p><strong>Email:</strong> ${sub.client.email}</p>` : ''}
                </div>
            </div>

            <div class="confirmation-actions">
                <a href="products.html" class="btn btn-primary">Explore Herbal Formulations</a>
                <a href="index.html" class="btn btn-outline">Return to Homepage</a>
            </div>
        </div>
    `;

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
    initConsultationFlow();
});
