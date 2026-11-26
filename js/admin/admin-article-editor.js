// Criterion Admin Portal - Article Editor Controller (Word-style Quill Rich-Text)

import { adminFetch } from './admin-api.js';

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get('id');

  const titleInput = document.getElementById('articleTitle');
  const slugInput = document.getElementById('articleSlug');
  const unlockSlugBtn = document.getElementById('unlockSlugBtn');
  const slugWarningBanner = document.getElementById('slugWarningBanner');
  const summaryInput = document.getElementById('articleSummary');
  const categorySelect = document.getElementById('articleCategory');
  const authorInput = document.getElementById('articleAuthor');
  const coverUrlInput = document.getElementById('coverImageUrl');
  const coverAltInput = document.getElementById('coverImageAlt');
  const coverPreview = document.getElementById('coverImagePreview');
  const selectCoverBtn = document.getElementById('selectMediaCoverBtn');
  const removeCoverBtn = document.getElementById('removeCoverBtn');
  const seoTitleInput = document.getElementById('articleSeoTitle');
  const seoDescInput = document.getElementById('articleSeoDesc');

  const saveStatusEl = document.getElementById('saveStatusIndicator');
  const saveDraftBtn = document.getElementById('saveDraftBtn');
  const publishBtn = document.getElementById('publishArticleBtn');
  const previewBtn = document.getElementById('previewArticleBtn');
  const editorAlert = document.getElementById('editorAlert');
  const pageTitleEl = document.getElementById('editorPageTitle');
  const statusBadgeEl = document.getElementById('currentStatusBadge');
  const publishedDateDisplay = document.getElementById('publishedDateDisplay');

  // Preview Modal Elements
  const previewModal = document.getElementById('previewModal');
  const closePreviewBtn = document.getElementById('closePreviewBtn');
  const dismissPreviewBtn = document.getElementById('dismissPreviewBtn');

  // Media Modal Elements
  const editorMediaModal = document.getElementById('editorMediaModal');
  const closeEditorMediaBtn = document.getElementById('closeEditorMediaBtn');
  const dismissEditorMediaBtn = document.getElementById('dismissEditorMediaBtn');
  const editorMediaGrid = document.getElementById('editorMediaGrid');
  const editorMediaUploadForm = document.getElementById('editorMediaUploadForm');
  const editorMediaFileInput = document.getElementById('editorMediaFileInput');
  const editorMediaUploadBtn = document.getElementById('editorMediaUploadBtn');

  let isDirty = false;
  let isSlugLocked = true;
  let existingArticle = null;
  let mediaPickMode = 'cover'; // 'cover' or 'editor'

  // 1. Initialize Word-Style Quill Rich-Text Editor
  const quill = new Quill('#quillEditor', {
    theme: 'snow',
    placeholder: 'Write your comprehensive holistic health article here...',
    modules: {
      toolbar: {
        container: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          ['blockquote'],
          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
          [{ 'align': [] }],
          ['link', 'image'],
          ['clean'],
        ],
        handlers: {
          image: () => {
            mediaPickMode = 'editor';
            openMediaPicker();
          },
        },
      },
    },
  });

  quill.on('text-change', () => {
    markDirty();
  });

  // 2. Load Categories
  await loadCategories();

  // 3. Load Existing Article if editing
  if (articleId) {
    pageTitleEl.textContent = 'Edit Article';
    await loadExistingArticle(articleId);
  } else {
    slugInput.readOnly = true;
  }

  // 4. Dirty tracking
  [titleInput, summaryInput, authorInput, coverAltInput, seoTitleInput, seoDescInput].forEach((el) => {
    if (el) el.addEventListener('input', markDirty);
  });
  if (categorySelect) categorySelect.addEventListener('change', markDirty);

  window.addEventListener('beforeunload', (e) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // 5. Slug auto-generation & unlock toggle
  if (titleInput && !articleId) {
    titleInput.addEventListener('input', () => {
      if (isSlugLocked) {
        slugInput.value = generateSlug(titleInput.value);
      }
    });
  }

  if (unlockSlugBtn) {
    unlockSlugBtn.addEventListener('click', () => {
      isSlugLocked = !isSlugLocked;
      slugInput.readOnly = isSlugLocked;
      unlockSlugBtn.textContent = isSlugLocked ? 'Unlock' : 'Lock';
      if (!isSlugLocked) slugInput.focus();
    });
  }

  if (slugInput) {
    slugInput.addEventListener('input', () => {
      markDirty();
      // Check if editing a published slug
      if (existingArticle && existingArticle.publication_status === 'published') {
        if (slugInput.value.trim() !== existingArticle.slug) {
          slugWarningBanner.style.display = 'block';
        } else {
          slugWarningBanner.style.display = 'none';
        }
      }
    });
  }

  // 6. Cover image handlers
  if (selectCoverBtn) {
    selectCoverBtn.addEventListener('click', () => {
      mediaPickMode = 'cover';
      openMediaPicker();
    });
  }

  if (removeCoverBtn) {
    removeCoverBtn.addEventListener('click', () => {
      coverUrlInput.value = '';
      coverPreview.innerHTML = '<span style="color: var(--admin-text-muted); font-size: 0.85rem;">No cover selected</span>';
      removeCoverBtn.style.display = 'none';
      markDirty();
    });
  }

  // 7. Save Draft
  if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', async () => {
      await saveArticle('draft');
    });
  }

  // 8. Publish / Save Edits
  if (publishBtn) {
    publishBtn.addEventListener('click', async () => {
      const targetStatus = 'published';
      await saveArticle(targetStatus);
    });
  }

  // 9. Preview Modal
  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      openPreview();
    });
  }

  const closePreview = () => {
    if (previewModal) previewModal.classList.remove('open');
  };
  if (closePreviewBtn) closePreviewBtn.addEventListener('click', closePreview);
  if (dismissPreviewBtn) dismissPreviewBtn.addEventListener('click', closePreview);

  // 10. Media Picker Modal
  function openMediaPicker() {
    if (editorMediaModal) editorMediaModal.classList.add('open');
    loadMediaPickerGrid();
  }

  const closeMediaPicker = () => {
    if (editorMediaModal) editorMediaModal.classList.remove('open');
  };
  if (closeEditorMediaBtn) closeEditorMediaBtn.addEventListener('click', closeMediaPicker);
  if (dismissEditorMediaBtn) dismissEditorMediaBtn.addEventListener('click', closeMediaPicker);

  if (editorMediaUploadForm) {
    editorMediaUploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const file = editorMediaFileInput.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('alt_text', file.name.replace(/\.[^/.]+$/, ''));

      editorMediaUploadBtn.disabled = true;
      editorMediaUploadBtn.textContent = 'Uploading...';

      try {
        const res = await fetch('/api/admin/media', {
          method: 'POST',
          body: formData,
          credentials: 'same-origin',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');

        editorMediaFileInput.value = '';
        await loadMediaPickerGrid();
      } catch (err) {
        alert(err.message);
      } finally {
        editorMediaUploadBtn.disabled = false;
        editorMediaUploadBtn.textContent = 'Upload Image';
      }
    });
  }

  async function loadMediaPickerGrid() {
    if (!editorMediaGrid) return;
    try {
      const data = await adminFetch('/api/admin/media?limit=50');
      const items = data.media || [];

      if (items.length === 0) {
        editorMediaGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: var(--admin-text-muted);">
            No media found. Upload an image above.
          </div>
        `;
        return;
      }

      editorMediaGrid.innerHTML = items
        .map((item) => {
          return `
            <div class="media-card-item" data-url="${escapeAttr(item.public_url)}" data-alt="${escapeAttr(item.alt_text || item.original_filename)}">
              <img src="${escapeAttr(item.public_url)}" alt="${escapeAttr(item.alt_text || item.original_filename)}">
            </div>
          `;
        })
        .join('');

      editorMediaGrid.querySelectorAll('.media-card-item').forEach((card) => {
        card.addEventListener('click', () => {
          const url = card.getAttribute('data-url');
          const alt = card.getAttribute('data-alt');

          if (mediaPickMode === 'cover') {
            coverUrlInput.value = url;
            coverAltInput.value = alt || titleInput.value;
            coverPreview.innerHTML = `<img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}">`;
            removeCoverBtn.style.display = 'inline-block';
            markDirty();
          } else {
            // Insert into Quill at current selection
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', url);
            quill.setSelection(range.index + 1);
            markDirty();
          }

          closeMediaPicker();
        });
      });
    } catch (err) {
      console.error('Failed to load media grid:', err);
    }
  }

  async function loadCategories() {
    if (!categorySelect) return;
    try {
      const data = await adminFetch('/api/admin/categories');
      const cats = data.categories || [];
      let html = '<option value="">Select Category...</option>';
      cats.forEach((c) => {
        html += `<option value="${c.id}">${escapeHtml(c.name)}</option>`;
      });
      categorySelect.innerHTML = html;
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }

  async function loadExistingArticle(id) {
    try {
      const data = await adminFetch(`/api/admin/articles/${id}`);
      const art = data.article;
      if (!art) throw new Error('Article not found');

      existingArticle = art;

      titleInput.value = art.title || '';
      slugInput.value = art.slug || '';
      slugInput.readOnly = true;
      summaryInput.value = art.summary || '';
      categorySelect.value = art.category_id || '';
      authorInput.value = art.author_name || 'Criterion Holistic Wellness Home';
      seoTitleInput.value = art.seo_title || '';
      seoDescInput.value = art.seo_description || '';

      if (art.content) {
        quill.root.innerHTML = art.content;
      }

      if (art.cover_image_url) {
        coverUrlInput.value = art.cover_image_url;
        coverAltInput.value = art.image_alt_text || '';
        coverPreview.innerHTML = `<img src="${escapeAttr(art.cover_image_url)}" alt="${escapeAttr(art.image_alt_text || art.title)}">`;
        removeCoverBtn.style.display = 'inline-block';
      }

      updateStatusUI(art.publication_status, art.published_at);
      isDirty = false;
      saveStatusEl.textContent = 'All changes saved';
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  }

  function updateStatusUI(status, publishedAt) {
    let badgeHtml = '<span class="badge status-pill-draft">Draft</span>';
    if (status === 'published') {
      badgeHtml = '<span class="badge status-pill-published">Published</span>';
      publishBtn.textContent = 'Save Edits';
    } else if (status === 'unpublished') {
      badgeHtml = '<span class="badge status-pill-unpublished">Unpublished</span>';
      publishBtn.textContent = 'Publish Article';
    } else {
      publishBtn.textContent = 'Publish Article';
    }
    statusBadgeEl.innerHTML = badgeHtml;

    if (publishedAt) {
      const dt = new Date(publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      publishedDateDisplay.textContent = `Published on ${dt}`;
    } else {
      publishedDateDisplay.textContent = 'Not yet published';
    }
  }

  async function saveArticle(targetStatus) {
    clearAlert();

    const title = titleInput.value.trim();
    if (!title) {
      showAlert('Article title is required.', 'danger');
      titleInput.focus();
      return;
    }

    const slug = slugInput.value.trim();
    if (!slug) {
      showAlert('URL slug is required.', 'danger');
      slugInput.focus();
      return;
    }

    const content = quill.root.innerHTML;
    const summary = summaryInput.value.trim();
    const category_id = categorySelect.value || null;
    const author_name = authorInput.value.trim() || 'Criterion Holistic Wellness Home';
    const cover_image_url = coverUrlInput.value.trim() || null;
    const image_alt_text = coverAltInput.value.trim() || null;
    const seo_title = seoTitleInput.value.trim() || null;
    const seo_description = seoDescInput.value.trim() || null;

    saveStatusEl.textContent = 'Saving...';
    saveDraftBtn.disabled = true;
    publishBtn.disabled = true;

    const payload = {
      title,
      slug,
      summary,
      content,
      category_id,
      author_name,
      cover_image_url,
      image_alt_text,
      seo_title,
      seo_description,
      publication_status: targetStatus,
    };

    try {
      let res;
      if (articleId) {
        res = await adminFetch(`/api/admin/articles/${articleId}`, {
          method: 'PUT',
          body: payload,
        });
      } else {
        res = await adminFetch('/api/admin/articles', {
          method: 'POST',
          body: payload,
        });
      }

      isDirty = false;
      saveStatusEl.textContent = 'All changes saved';
      showAlert(`Article successfully ${targetStatus === 'published' ? 'published' : 'saved'}!`, 'info');

      if (!articleId && res?.article?.id) {
        // Redirect to edit mode for newly created article
        setTimeout(() => {
          window.location.href = `/admin/article-editor.html?id=${res.article.id}`;
        }, 300);
      } else if (res?.article) {
        existingArticle = res.article;
        updateStatusUI(res.article.publication_status, res.article.published_at);
        slugWarningBanner.style.display = 'none';
      }
    } catch (err) {
      saveStatusEl.textContent = 'Save failed';
      showAlert(err.message || 'Failed to save article.', 'danger');
    } finally {
      saveDraftBtn.disabled = false;
      publishBtn.disabled = false;
    }
  }

  function openPreview() {
    const title = titleInput.value.trim() || 'Untitled Article';
    const selectedCategoryName = categorySelect.options[categorySelect.selectedIndex]?.text || 'Wellness';
    const author = authorInput.value.trim() || 'Criterion Holistic Wellness Home';
    const cover = coverUrlInput.value.trim();
    const content = quill.root.innerHTML;

    // Calculate reading time
    const textOnly = quill.getText();
    const wordCount = textOnly.trim().split(/\s+/).length || 0;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    document.getElementById('previewTitle').textContent = title;
    document.getElementById('previewCategoryBadge').textContent = selectedCategoryName;
    document.getElementById('previewAuthor').textContent = author;
    document.getElementById('previewReadingTime').textContent = `${readingTime} min read`;

    const coverWrap = document.getElementById('previewCoverWrap');
    const coverImg = document.getElementById('previewCoverImg');
    if (cover) {
      coverImg.src = cover;
      coverWrap.style.display = 'block';
    } else {
      coverWrap.style.display = 'none';
    }

    document.getElementById('previewContent').innerHTML = content;
    if (previewModal) previewModal.classList.add('open');
  }

  function markDirty() {
    isDirty = true;
    saveStatusEl.textContent = 'Unsaved changes';
  }

  function generateSlug(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function showAlert(msg, type = 'danger') {
    if (!editorAlert) return;
    editorAlert.innerHTML = `<div class="alert alert-${type}" style="margin-bottom: 20px;">${escapeHtml(msg)}</div>`;
  }

  function clearAlert() {
    if (editorAlert) editorAlert.innerHTML = '';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
});
