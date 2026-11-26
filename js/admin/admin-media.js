// Criterion Admin Portal - Media Library Controller

import { adminFetch } from './admin-api.js';

document.addEventListener('DOMContentLoaded', () => {
  const openMediaBtn = document.getElementById('openMediaLibraryBtn');
  const mediaModal = document.getElementById('mediaLibraryModal');
  const closeMediaBtn = document.getElementById('closeMediaModalBtn');
  const dismissMediaBtn = document.getElementById('dismissMediaModalBtn');
  const uploadForm = document.getElementById('mediaUploadForm');
  const fileInput = document.getElementById('mediaFileInput');
  const uploadBtn = document.getElementById('uploadMediaBtn');
  const mediaGrid = document.getElementById('mediaLibraryGrid');
  const mediaAlert = document.getElementById('mediaModalAlert');

  if (openMediaBtn && mediaModal) {
    openMediaBtn.addEventListener('click', async () => {
      mediaModal.classList.add('open');
      clearAlert();
      await loadMediaGrid();
    });
  }

  const closeModal = () => {
    if (mediaModal) mediaModal.classList.remove('open');
  };

  if (closeMediaBtn) closeMediaBtn.addEventListener('click', closeModal);
  if (dismissMediaBtn) dismissMediaBtn.addEventListener('click', closeModal);

  // Upload handler
  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();

      const file = fileInput.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('alt_text', file.name.replace(/\.[^/.]+$/, ''));

      uploadBtn.disabled = true;
      uploadBtn.textContent = 'Uploading...';

      try {
        const response = await fetch('/api/admin/media', {
          method: 'POST',
          body: formData,
          credentials: 'same-origin',
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        fileInput.value = '';
        showAlert('Image uploaded successfully!', 'info');
        await loadMediaGrid();
      } catch (err) {
        showAlert(err.message, 'danger');
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Image';
      }
    });
  }

  async function loadMediaGrid() {
    if (!mediaGrid) return;
    mediaGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 24px; color: var(--admin-text-muted);">
        Loading media items...
      </div>
    `;

    try {
      const data = await adminFetch('/api/admin/media?limit=50');
      const mediaItems = data.media || [];

      if (mediaItems.length === 0) {
        mediaGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 36px 12px; color: var(--admin-text-muted);">
            No media assets uploaded yet. Upload a JPEG, PNG, or WebP image above.
          </div>
        `;
        return;
      }

      mediaGrid.innerHTML = mediaItems
        .map((item) => {
          return `
            <div class="media-card-item" title="${escapeAttr(item.original_filename)}">
              <img src="${escapeAttr(item.public_url)}" alt="${escapeAttr(item.alt_text || item.original_filename)}" loading="lazy">
              <div style="position: absolute; bottom: 0; inset-inline: 0; background: rgba(0,0,0,0.65); padding: 4px; display: flex; justify-content: space-between;">
                <button type="button" class="btn-copy-url" data-url="${escapeAttr(item.public_url)}" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 0.72rem;" title="Copy Public URL">
                  🔗 Copy
                </button>
                <button type="button" class="btn-delete-media" data-id="${item.id}" data-name="${escapeAttr(item.original_filename)}" style="background: none; border: none; color: #ff8888; cursor: pointer; font-size: 0.72rem;" title="Delete Image">
                  🗑️
                </button>
              </div>
            </div>
          `;
        })
        .join('');

      // Copy URL button handler
      mediaGrid.querySelectorAll('.btn-copy-url').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const url = btn.getAttribute('data-url');
          navigator.clipboard.writeText(window.location.origin + url).then(() => {
            alert('Copied URL to clipboard:\n' + window.location.origin + url);
          });
        });
      });

      // Delete Media button handler (Safeguard 3)
      mediaGrid.querySelectorAll('.btn-delete-media').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          const name = btn.getAttribute('data-name');

          const confirmed = confirm(`Are you sure you want to delete the image "${name}"?`);
          if (!confirmed) return;

          try {
            const res = await fetch(`/api/admin/media/${id}`, {
              method: 'DELETE',
              credentials: 'same-origin',
            });

            const data = await res.json();
            if (!res.ok) {
              if (res.status === 409 && data.referencingArticles) {
                // Safeguard 3: Inform user of referencing articles
                const articleTitles = data.referencingArticles
                  .map((a) => `• "${a.title}" (${a.publication_status})`)
                  .join('\n');
                alert(
                  `Cannot delete image "${name}" because it is currently in use by the following article(s):\n\n${articleTitles}\n\nPlease remove or replace the image in these articles first.`
                );
                return;
              }
              throw new Error(data.error || 'Delete failed');
            }

            showAlert('Image deleted successfully.', 'info');
            await loadMediaGrid();
          } catch (err) {
            showAlert(err.message, 'danger');
          }
        });
      });
    } catch (err) {
      mediaGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; color: var(--admin-danger); padding: 18px;">
          Failed to load media: ${escapeHtml(err.message)}
        </div>
      `;
    }
  }

  function showAlert(msg, type = 'danger') {
    if (!mediaAlert) return;
    mediaAlert.innerHTML = `<div class="alert alert-${type}" style="margin-bottom: 12px;">${escapeHtml(msg)}</div>`;
  }

  function clearAlert() {
    if (mediaAlert) mediaAlert.innerHTML = '';
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
