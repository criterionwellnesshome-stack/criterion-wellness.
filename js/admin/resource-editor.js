// js/admin/resource-editor.js
// Client logic for creating and editing resources

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const resourceId = urlParams.get('id');
  let isEditMode = !!resourceId;
  let isSlugLocked = true;
  let selectedMediaUrl = '';
  let selectedMediaId = '';

  const pageHeading = document.getElementById('pageHeading');
  const alertBanner = document.getElementById('alertBanner');
  const typeSelectorCards = document.getElementById('typeSelectorCards');
  const selectedTypeInput = document.getElementById('selectedType');
  const resourceTitle = document.getElementById('resourceTitle');
  const resourceSlug = document.getElementById('resourceSlug');
  const toggleSlugLock = document.getElementById('toggleSlugLock');
  const shortDescription = document.getElementById('shortDescription');
  const fullDescription = document.getElementById('fullDescription');
  const resourceCategory = document.getElementById('resourceCategory');
  const publicationStatus = document.getElementById('publicationStatus');
  const displayOrder = document.getElementById('displayOrder');

  // Product fields
  const productPrice = document.getElementById('productPrice');
  const packageSize = document.getElementById('packageSize');
  const availabilityStatus = document.getElementById('availabilityStatus');

  // Course fields
  const courseDuration = document.getElementById('courseDuration');
  const courseLevel = document.getElementById('courseLevel');
  const courseFormat = document.getElementById('courseFormat');
  const enrollmentStatus = document.getElementById('enrollmentStatus');
  const startDate = document.getElementById('startDate');
  const courseLink = document.getElementById('courseLink');

  // Educational material fields
  const materialFormat = document.getElementById('materialFormat');
  const fileUploadInput = document.getElementById('fileUploadInput');
  const uploadProgress = document.getElementById('uploadProgress');
  const downloadUrl = document.getElementById('downloadUrl');
  const fileR2Key = document.getElementById('fileR2Key');
  const fileSizeBytes = document.getElementById('fileSizeBytes');

  // Cover image elements
  const coverImagePreview = document.getElementById('coverImagePreview');
  const noCoverPlaceholder = document.getElementById('noCoverPlaceholder');
  const coverImageUrl = document.getElementById('coverImageUrl');
  const imageAltText = document.getElementById('imageAltText');
  const btnOpenMediaModal = document.getElementById('btnOpenMediaModal');
  const btnRemoveCover = document.getElementById('btnRemoveCover');

  // Media modal elements
  const mediaModal = document.getElementById('mediaModal');
  const btnCloseMediaModal = document.getElementById('btnCloseMediaModal');
  const btnCancelMedia = document.getElementById('btnCancelMedia');
  const btnConfirmMedia = document.getElementById('btnConfirmMedia');
  const modalMediaGrid = document.getElementById('modalMediaGrid');
  const mediaSearchInput = document.getElementById('mediaSearchInput');
  const modalImageUpload = document.getElementById('modalImageUpload');

  // Action buttons
  const btnSaveDraft = document.getElementById('btnSaveDraft');
  const btnPublish = document.getElementById('btnPublish');
  const dangerZoneCard = document.getElementById('dangerZoneCard');
  const btnDeleteResource = document.getElementById('btnDeleteResource');

  function showAlert(msg, isSuccess = true) {
    alertBanner.textContent = msg;
    alertBanner.style.display = 'block';
    alertBanner.style.background = isSuccess ? 'rgba(79, 138, 91, 0.15)' : 'rgba(201, 59, 43, 0.15)';
    alertBanner.style.color = isSuccess ? '#1f4d3a' : '#c93b2b';
    alertBanner.style.border = `1px solid ${isSuccess ? 'rgba(79, 138, 91, 0.3)' : 'rgba(201, 59, 43, 0.3)'}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function slugify(text) {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function setType(type) {
    selectedTypeInput.value = type;
    typeSelectorCards.querySelectorAll('.type-card-option').forEach(card => {
      if (card.getAttribute('data-type') === type) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });

    document.getElementById('sectionProduct').style.display = type === 'product' ? 'block' : 'none';
    document.getElementById('sectionCourse').style.display = type === 'course' ? 'block' : 'none';
    document.getElementById('sectionMaterial').style.display = type === 'educational_material' ? 'block' : 'none';
  }

  typeSelectorCards.addEventListener('click', (e) => {
    const card = e.target.closest('.type-card-option');
    if (card) {
      setType(card.getAttribute('data-type'));
    }
  });

  // Slug lock toggle
  toggleSlugLock.addEventListener('click', () => {
    isSlugLocked = !isSlugLocked;
    if (isSlugLocked) {
      resourceSlug.setAttribute('readonly', 'true');
      toggleSlugLock.textContent = '🔒 Auto-generated (Click to edit)';
      if (resourceTitle.value.trim()) {
        resourceSlug.value = slugify(resourceTitle.value);
      }
    } else {
      resourceSlug.removeAttribute('readonly');
      toggleSlugLock.textContent = '🔓 Manual Editing Active';
      resourceSlug.focus();
    }
  });

  resourceTitle.addEventListener('input', () => {
    if (isSlugLocked && !isEditMode) {
      resourceSlug.value = slugify(resourceTitle.value);
    }
  });

  // Verify auth session
  async function checkAuth() {
    try {
      const res = await fetch('/api/admin/auth/me');
      if (!res.ok) {
        window.location.href = '/admin/login.html';
      }
    } catch {
      window.location.href = '/admin/login.html';
    }
  }

  // Load categories
  async function loadCategories() {
    try {
      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const data = await res.json();
        const cats = data.categories || [];
        resourceCategory.innerHTML = '<option value="">No Category</option>' +
          cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  }

  // Load existing resource in edit mode
  async function loadResourceData() {
    if (!isEditMode) return;
    try {
      const res = await fetch(`/api/admin/resources/${resourceId}`);
      if (!res.ok) {
        showAlert('Resource not found', false);
        return;
      }
      const r = await res.json();

      document.getElementById('resourceId').value = r.id;
      pageHeading.textContent = `Edit: ${r.title}`;
      document.title = `Edit: ${r.title} | Criterion CMS`;

      setType(r.type || 'product');
      resourceTitle.value = r.title || '';
      resourceSlug.value = r.slug || '';
      shortDescription.value = r.short_description || '';
      fullDescription.value = r.full_description || '';
      publicationStatus.value = r.publication_status || 'draft';
      resourceCategory.value = r.category_id || '';
      displayOrder.value = r.display_order || 0;

      // Type attributes
      if (r.price_kobo != null) {
        productPrice.value = r.price_kobo / 100;
      }
      packageSize.value = r.package_size || '';
      availabilityStatus.value = r.availability_status || 'available';

      courseDuration.value = r.course_duration || '';
      courseLevel.value = r.course_level || 'All Levels';
      courseFormat.value = r.course_format || '';
      enrollmentStatus.value = r.enrollment_status || 'open';
      startDate.value = r.start_date || '';
      courseLink.value = r.external_link || '';

      materialFormat.value = r.material_format || '';
      downloadUrl.value = r.download_url || '';
      fileR2Key.value = r.file_r2_key || '';
      fileSizeBytes.value = r.file_size_bytes || '';

      // Cover image
      if (r.cover_image_url) {
        setCoverImage(r.cover_image_url, r.image_alt_text);
      }

      dangerZoneCard.style.display = 'block';
    } catch (err) {
      showAlert('Failed to load resource data', false);
    }
  }

  function setCoverImage(url, alt) {
    coverImageUrl.value = url;
    coverImagePreview.src = url;
    coverImagePreview.style.display = 'block';
    noCoverPlaceholder.style.display = 'none';
    btnRemoveCover.style.display = 'inline-block';
    if (alt) imageAltText.value = alt;
  }

  btnRemoveCover.addEventListener('click', () => {
    coverImageUrl.value = '';
    coverImagePreview.src = '';
    coverImagePreview.style.display = 'none';
    noCoverPlaceholder.style.display = 'block';
    btnRemoveCover.style.display = 'none';
  });

  // Direct PDF document upload
  fileUploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Please select a valid PDF file.');
      fileUploadInput.value = '';
      return;
    }

    uploadProgress.style.display = 'block';
    uploadProgress.textContent = `Uploading "${file.name}" (${Math.round(file.size / 1024)} KB)...`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('alt_text', file.name);

    try {
      const res = await fetch('/api/admin/media', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to upload PDF');
      }

      const media = await res.json();
      downloadUrl.value = media.public_url;
      fileR2Key.value = media.r2_key;
      fileSizeBytes.value = media.file_size_bytes;
      if (!materialFormat.value) {
        materialFormat.value = 'PDF Document';
      }

      uploadProgress.textContent = 'PDF uploaded successfully!';
      setTimeout(() => {
        uploadProgress.style.display = 'none';
      }, 3000);
    } catch (err) {
      alert(`Upload error: ${err.message}`);
      uploadProgress.style.display = 'none';
    }
  });

  // Media Library Modal handling
  btnOpenMediaModal.addEventListener('click', () => {
    mediaModal.style.display = 'flex';
    loadMediaItems();
  });

  btnCloseMediaModal.addEventListener('click', () => {
    mediaModal.style.display = 'none';
  });
  btnCancelMedia.addEventListener('click', () => {
    mediaModal.style.display = 'none';
  });

  async function loadMediaItems(query = '') {
    modalMediaGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 24px; color: var(--admin-text-muted);">Loading media...</div>';
    selectedMediaUrl = '';
    btnConfirmMedia.disabled = true;

    try {
      const url = query ? `/api/admin/media?q=${encodeURIComponent(query)}&limit=30` : '/api/admin/media?limit=30';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load media');
      const data = await res.json();
      const items = data.media || [];

      if (items.length === 0) {
        modalMediaGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 24px; color: var(--admin-text-muted);">No media items found.</div>';
        return;
      }

      modalMediaGrid.innerHTML = items.map(m => `
        <div class="media-lib-card" data-url="${m.public_url}" data-alt="${escapeHtml(m.alt_text || m.original_filename)}">
          <img src="${m.public_url}" alt="${escapeHtml(m.alt_text || '')}" loading="lazy">
        </div>
      `).join('');

      modalMediaGrid.querySelectorAll('.media-lib-card').forEach(card => {
        card.addEventListener('click', () => {
          modalMediaGrid.querySelectorAll('.media-lib-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          selectedMediaUrl = card.getAttribute('data-url');
          btnConfirmMedia.disabled = false;
        });
      });
    } catch (err) {
      modalMediaGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 24px; color: var(--admin-danger);">${err.message}</div>`;
    }
  }

  btnConfirmMedia.addEventListener('click', () => {
    if (selectedMediaUrl) {
      setCoverImage(selectedMediaUrl, imageAltText.value);
      mediaModal.style.display = 'none';
    }
  });

  // Modal new upload
  modalImageUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/media', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const item = await res.json();
        loadMediaItems();
        setCoverImage(item.public_url, item.alt_text);
        mediaModal.style.display = 'none';
      } else {
        const err = await res.json();
        alert(err.error || 'Upload failed');
      }
    } catch (err) {
      alert('Error uploading file');
    }
  });

  // Save handler
  async function saveResource(statusToSet) {
    const type = selectedTypeInput.value;
    const title = resourceTitle.value.trim();
    if (!title) {
      alert('Please enter a title for this resource.');
      resourceTitle.focus();
      return;
    }

    const payload = {
      type,
      title,
      slug: resourceSlug.value.trim() || slugify(title),
      short_description: shortDescription.value.trim(),
      full_description: fullDescription.value.trim(),
      category_id: resourceCategory.value || null,
      publication_status: statusToSet,
      display_order: parseInt(displayOrder.value, 10) || 0,
      cover_image_url: coverImageUrl.value.trim() || null,
      image_alt_text: imageAltText.value.trim() || null,
    };

    if (type === 'product') {
      const priceNaira = parseFloat(productPrice.value);
      payload.price_kobo = !isNaN(priceNaira) ? Math.round(priceNaira * 100) : null;
      payload.package_size = packageSize.value.trim() || null;
      payload.availability_status = availabilityStatus.value;
    } else if (type === 'course') {
      payload.course_duration = courseDuration.value.trim() || null;
      payload.course_level = courseLevel.value;
      payload.course_format = courseFormat.value.trim() || null;
      payload.enrollment_status = enrollmentStatus.value;
      payload.start_date = startDate.value || null;
      payload.external_link = courseLink.value.trim() || null;
    } else if (type === 'educational_material') {
      payload.material_format = materialFormat.value.trim() || null;
      payload.download_url = downloadUrl.value.trim() || null;
      payload.file_r2_key = fileR2Key.value.trim() || null;
      payload.file_size_bytes = parseInt(fileSizeBytes.value, 10) || null;
    }

    const endpoint = isEditMode ? `/api/admin/resources/${resourceId}` : '/api/admin/resources';
    const method = isEditMode ? 'PUT' : 'POST';

    btnSaveDraft.disabled = true;
    btnPublish.disabled = true;

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save resource');
      }

      showAlert(`Resource successfully ${statusToSet === 'published' ? 'published' : 'saved as draft'}!`, true);

      if (!isEditMode && data.id) {
        setTimeout(() => {
          window.location.href = `/admin/resource-editor.html?id=${data.id}`;
        }, 800);
      } else {
        btnSaveDraft.disabled = false;
        btnPublish.disabled = false;
      }
    } catch (err) {
      showAlert(err.message, false);
      btnSaveDraft.disabled = false;
      btnPublish.disabled = false;
    }
  }

  btnSaveDraft.addEventListener('click', () => saveResource('draft'));
  btnPublish.addEventListener('click', () => saveResource('published'));

  // Delete resource
  btnDeleteResource?.addEventListener('click', async () => {
    if (!isEditMode) return;
    if (confirm(`Are you certain you want to delete "${resourceTitle.value}"? This action cannot be reversed.`)) {
      try {
        const res = await fetch(`/api/admin/resources/${resourceId}`, { method: 'DELETE' });
        if (res.ok) {
          window.location.href = '/admin/resources.html';
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to delete resource');
        }
      } catch {
        alert('Server communication error');
      }
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
  loadCategories().then(() => {
    loadResourceData();
  });
});
