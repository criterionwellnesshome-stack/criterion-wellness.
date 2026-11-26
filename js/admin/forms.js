// js/admin/forms.js
// Client logic for Configurable Form Builder

document.addEventListener('DOMContentLoaded', () => {
  let activeSlug = 'consultation';
  let formsData = [];
  let currentFields = [];

  const alertBanner = document.getElementById('alertBanner');
  const formsListContainer = document.getElementById('formsListContainer');
  const currentFormTitle = document.getElementById('currentFormTitle');
  const currentFormVersion = document.getElementById('currentFormVersion');
  const formTitleInput = document.getElementById('formTitleInput');
  const formDescriptionInput = document.getElementById('formDescriptionInput');
  const questionsContainer = document.getElementById('questionsContainer');
  const btnAddQuestion = document.getElementById('btnAddQuestion');
  const btnSaveForm = document.getElementById('btnSaveForm');

  function showAlert(msg, isSuccess = true) {
    alertBanner.textContent = msg;
    alertBanner.style.display = 'block';
    alertBanner.style.background = isSuccess ? 'rgba(79, 138, 91, 0.15)' : 'rgba(201, 59, 43, 0.15)';
    alertBanner.style.color = isSuccess ? '#1f4d3a' : '#c93b2b';
    alertBanner.style.border = `1px solid ${isSuccess ? 'rgba(79, 138, 91, 0.3)' : 'rgba(201, 59, 43, 0.3)'}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function checkAuth() {
    try {
      const res = await fetch('/api/admin/auth/me');
      if (!res.ok) window.location.href = '/admin/login.html';
    } catch {
      window.location.href = '/admin/login.html';
    }
  }

  async function loadForms() {
    try {
      const res = await fetch('/api/admin/forms');
      if (!res.ok) throw new Error('Failed to load form definitions');
      const data = await res.json();
      formsData = data.forms || [];

      renderSidebar();
      selectForm(activeSlug);
    } catch (err) {
      questionsContainer.innerHTML = `<div style="text-align: center; color: var(--admin-danger);">${err.message}</div>`;
    }
  }

  function renderSidebar() {
    // Unique form slugs
    const slugMap = new Map();
    formsData.forEach(f => {
      if (!slugMap.has(f.form_slug) || f.is_active === 1) {
        slugMap.set(f.form_slug, f);
      }
    });

    const slugs = ['consultation', 'course', 'general'];
    formsListContainer.innerHTML = slugs.map(slug => {
      const activeForm = formsData.find(f => f.form_slug === slug && f.is_active === 1) || {
        title: `${slug.toUpperCase()} Form`,
        version_number: 1,
      };

      const isCurrent = slug === activeSlug;
      return `
        <div class="form-item-sidebar ${isCurrent ? 'active' : ''}" data-slug="${slug}">
          <h4>${escapeHtml(activeForm.title)}</h4>
          <p>${slug}.html &bull; <span class="badge badge-product" style="font-size: 0.65rem;">Active v${activeForm.version_number}</span></p>
        </div>
      `;
    }).join('');

    formsListContainer.querySelectorAll('.form-item-sidebar').forEach(item => {
      item.addEventListener('click', () => {
        const slug = item.getAttribute('data-slug');
        selectForm(slug);
      });
    });
  }

  function selectForm(slug) {
    activeSlug = slug;
    renderSidebar();

    const activeDef = formsData.find(f => f.form_slug === slug && f.is_active === 1);
    if (!activeDef) return;

    currentFormTitle.textContent = activeDef.title;
    currentFormVersion.textContent = `Active Version ${activeDef.version_number} (ID: ${activeDef.id})`;
    formTitleInput.value = activeDef.title;
    formDescriptionInput.value = activeDef.description || '';

    try {
      currentFields = typeof activeDef.fields_schema_json === 'string'
        ? JSON.parse(activeDef.fields_schema_json)
        : (activeDef.fields_schema_json || []);
    } catch {
      currentFields = [];
    }

    renderQuestions();
  }

  function renderQuestions() {
    if (currentFields.length === 0) {
      questionsContainer.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--admin-text-muted);">No fields defined yet. Click "+ Add Question" above.</div>`;
      return;
    }

    questionsContainer.innerHTML = currentFields.map((field, idx) => {
      const isCore = ['full_name', 'phone'].includes(field.id);
      const hasOptions = ['select', 'radio', 'checkbox'].includes(field.type);
      const optionsStr = Array.isArray(field.options) ? field.options.join(', ') : '';

      return `
        <div class="field-card" data-index="${idx}">
          <div class="field-card-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="field-card-type">${escapeHtml(field.type)}</span>
              <strong>#${idx + 1} ${escapeHtml(field.label || 'Untitled Question')}</strong>
              ${isCore ? '<span class="badge badge-course" style="font-size: 0.65rem;">Core Field</span>' : ''}
            </div>
            <div class="field-order-actions">
              <button type="button" class="btn-icon-tiny action-move-up" ${idx === 0 ? 'disabled' : ''}>&uarr;</button>
              <button type="button" class="btn-icon-tiny action-move-down" ${idx === currentFields.length - 1 ? 'disabled' : ''}>&darr;</button>
              ${!isCore ? '<button type="button" class="btn-icon-tiny action-remove-field" style="color: var(--admin-danger);">&times;</button>' : ''}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; margin-bottom: 10px;">
            <div>
              <label style="font-size: 0.75rem; color: var(--admin-text-muted);">Question Label</label>
              <input type="text" class="form-control field-label-input" value="${escapeHtml(field.label || '')}" style="font-size: 0.85rem; padding: 6px 10px;">
            </div>

            <div>
              <label style="font-size: 0.75rem; color: var(--admin-text-muted);">Field ID (Key)</label>
              <input type="text" class="form-control field-id-input" value="${escapeHtml(field.id || '')}" ${isCore ? 'readonly' : ''} style="font-size: 0.85rem; padding: 6px 10px;">
            </div>

            <div>
              <label style="font-size: 0.75rem; color: var(--admin-text-muted);">Type</label>
              <select class="form-control field-type-select" ${isCore ? 'disabled' : ''} style="font-size: 0.85rem; padding: 6px 10px;">
                <option value="text" ${field.type === 'text' ? 'selected' : ''}>Short Text</option>
                <option value="textarea" ${field.type === 'textarea' ? 'selected' : ''}>Long Text</option>
                <option value="email" ${field.type === 'email' ? 'selected' : ''}>Email</option>
                <option value="tel" ${field.type === 'tel' ? 'selected' : ''}>Phone</option>
                <option value="select" ${field.type === 'select' ? 'selected' : ''}>Dropdown Select</option>
                <option value="radio" ${field.type === 'radio' ? 'selected' : ''}>Radio Buttons</option>
                <option value="checkbox" ${field.type === 'checkbox' ? 'selected' : ''}>Checkboxes</option>
                <option value="yes_no" ${field.type === 'yes_no' ? 'selected' : ''}>Yes / No</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-bottom: 10px;">
            <div>
              <label style="font-size: 0.75rem; color: var(--admin-text-muted);">Placeholder / Helper Text</label>
              <input type="text" class="form-control field-placeholder-input" value="${escapeHtml(field.placeholder || field.help_text || '')}" style="font-size: 0.85rem; padding: 6px 10px;">
            </div>
            <div style="display: flex; align-items: center; padding-top: 18px;">
              <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; cursor: pointer;">
                <input type="checkbox" class="field-required-checkbox" ${field.required ? 'checked' : ''} ${isCore ? 'disabled' : ''}>
                Required Question
              </label>
            </div>
          </div>

          <div class="field-options-container" style="display: ${hasOptions ? 'block' : 'none'};">
            <label style="font-size: 0.75rem; color: var(--admin-text-muted);">Choices / Options (separated by comma)</label>
            <input type="text" class="form-control field-options-input" value="${escapeHtml(optionsStr)}" placeholder="e.g. Option 1, Option 2, Option 3" style="font-size: 0.85rem; padding: 6px 10px;">
          </div>
        </div>
      `;
    }).join('');

    attachQuestionEventListeners();
  }

  function attachQuestionEventListeners() {
    // Inputs change listeners
    questionsContainer.querySelectorAll('.field-card').forEach(card => {
      const idx = parseInt(card.getAttribute('data-index'), 10);

      card.querySelector('.field-label-input').addEventListener('input', (e) => {
        currentFields[idx].label = e.target.value;
      });

      card.querySelector('.field-id-input').addEventListener('input', (e) => {
        currentFields[idx].id = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      });

      card.querySelector('.field-type-select').addEventListener('change', (e) => {
        const newType = e.target.value;
        currentFields[idx].type = newType;
        const optsContainer = card.querySelector('.field-options-container');
        if (['select', 'radio', 'checkbox'].includes(newType)) {
          optsContainer.style.display = 'block';
          if (!currentFields[idx].options) currentFields[idx].options = ['Option 1', 'Option 2'];
        } else {
          optsContainer.style.display = 'none';
        }
      });

      card.querySelector('.field-placeholder-input').addEventListener('input', (e) => {
        currentFields[idx].placeholder = e.target.value;
      });

      card.querySelector('.field-required-checkbox').addEventListener('change', (e) => {
        currentFields[idx].required = e.target.checked;
      });

      card.querySelector('.field-options-input').addEventListener('input', (e) => {
        currentFields[idx].options = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
      });

      // Move Up
      card.querySelector('.action-move-up')?.addEventListener('click', () => {
        if (idx > 0) {
          const temp = currentFields[idx];
          currentFields[idx] = currentFields[idx - 1];
          currentFields[idx - 1] = temp;
          renderQuestions();
        }
      });

      // Move Down
      card.querySelector('.action-move-down')?.addEventListener('click', () => {
        if (idx < currentFields.length - 1) {
          const temp = currentFields[idx];
          currentFields[idx] = currentFields[idx + 1];
          currentFields[idx + 1] = temp;
          renderQuestions();
        }
      });

      // Delete field
      card.querySelector('.action-remove-field')?.addEventListener('click', () => {
        if (confirm(`Remove the question "${currentFields[idx].label}"?`)) {
          currentFields.splice(idx, 1);
          renderQuestions();
        }
      });
    });
  }

  // Add new question
  btnAddQuestion.addEventListener('click', () => {
    const newIdx = currentFields.length + 1;
    currentFields.push({
      id: `custom_question_${Date.now().toString(36).slice(-4)}`,
      label: `New Question ${newIdx}`,
      type: 'text',
      required: false,
      placeholder: '',
      help_text: '',
    });
    renderQuestions();
  });

  // Save new form version
  btnSaveForm.addEventListener('click', async () => {
    const title = formTitleInput.value.trim();
    if (!title) {
      alert('Please enter a form title.');
      formTitleInput.focus();
      return;
    }

    if (currentFields.length === 0) {
      alert('The form must contain at least one question.');
      return;
    }

    btnSaveForm.disabled = true;
    btnSaveForm.textContent = 'Saving Version...';

    const payload = {
      form_slug: activeSlug,
      title,
      description: formDescriptionInput.value.trim(),
      fields: currentFields,
    };

    try {
      const res = await fetch('/api/admin/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save form version');

      showAlert(`Successfully created and activated Version ${data.version_number} of "${title}"!`, true);
      await loadForms();
    } catch (err) {
      showAlert(err.message, false);
    } finally {
      btnSaveForm.disabled = false;
      btnSaveForm.textContent = 'Save New Version';
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[m]));
  }

  // Init
  checkAuth();
  loadForms();
});
