/**
 * app.js
 * Amazonia Construcción — FormManager
 *
 * Manages the Ficha Técnica form, live preview, image handling,
 * PDF generation and form reset.
 */

'use strict';

// ─────────────────────────────────────────────
//  Toast Notification System
// ─────────────────────────────────────────────
const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', duration = 4000) {
    if (!this.container) this.init();

    const icons = {
      success: '✅',
      error:   '❌',
      info:    'ℹ️',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Cerrar">✕</button>
    `;

    this.container.appendChild(toast);

    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
      this._dismiss(toast);
    });

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentNode) this._dismiss(toast);
      }, duration);
    }
  },

  _dismiss(toast) {
    toast.style.animation = 'fadeIn 0.2s ease reverse forwards';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 200);
  },

  success(msg, dur) { this.show(msg, 'success', dur); },
  error(msg, dur)   { this.show(msg, 'error',   dur); },
  info(msg, dur)    { this.show(msg, 'info',     dur); },
};

// ─────────────────────────────────────────────
//  FormManager Class
// ─────────────────────────────────────────────
class FormManager {
  constructor() {
    // Form element
    this.form = document.getElementById('ficha-form');

    // Preview container
    this.previewContainer = document.getElementById('pdf-preview-container');

    // Confirm modal
    this.modal       = document.getElementById('confirm-modal');
    this.modalCancel = document.getElementById('confirm-cancel');
    this.modalAccept = document.getElementById('confirm-accept');

    // Images object: keyed by field name, value = base64 dataURL
    this.images = {
      plano1:      null,
      plano2:      null,
      plano3:      null,
      logoCliente: null,
    };

    // Debounce timer
    this._previewTimer = null;

    // PDF generation in progress flag
    this._generating = false;

    this._init();
  }

  // ── Initialize ──────────────────────────────
  _init() {
    if (!this.form) return;

    // Set today's date as default
    const fechaInput = document.getElementById('fecha');
    if (fechaInput && !fechaInput.value) {
      fechaInput.value = new Date().toISOString().slice(0, 10);
    }

    // Listen to all input/change/textarea events on form
    this.form.addEventListener('input',  () => this._schedulePreviewUpdate());
    this.form.addEventListener('change', () => this._schedulePreviewUpdate());

    // Presupuesto formatting (thousand separators while typing)
    const presupuestoInput = document.getElementById('presupuesto');
    if (presupuestoInput) {
      presupuestoInput.addEventListener('input', (e) => {
        this._formatPresupuestoInput(e.target);
      });
    }

    // Image file inputs
    this._initImageUpload('plano1',      'preview-plano1',      'upload-area-1');
    this._initImageUpload('plano2',      'preview-plano2',      'upload-area-2');
    this._initImageUpload('plano3',      'preview-plano3',      'upload-area-3');
    this._initImageUpload('logo-cliente','preview-logo-cliente','upload-area-logo', true);

    // Buttons
    this._initButtons();

    // Initial preview render
    this._schedulePreviewUpdate(50);
  }

  // ── Button wiring ────────────────────────────
  _initButtons() {
    // Top buttons
    const btnDownload       = document.getElementById('btn-download');
    const btnPreview        = document.getElementById('btn-preview');
    const btnReset          = document.getElementById('btn-reset');
    // Bottom buttons
    const btnDownloadBottom = document.getElementById('btn-download-bottom');
    const btnResetBottom    = document.getElementById('btn-reset-bottom');

    const handleDownload = () => this._handleDownload();
    const handleReset    = () => this._showResetConfirm();
    const handlePreview  = () => {
      this._updatePreview();
      // Scroll preview panel into view on mobile
      const panel = document.getElementById('preview-panel');
      if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (btnDownload)       btnDownload.addEventListener('click',       handleDownload);
    if (btnPreview)        btnPreview.addEventListener('click',        handlePreview);
    if (btnReset)          btnReset.addEventListener('click',          handleReset);
    if (btnDownloadBottom) btnDownloadBottom.addEventListener('click', handleDownload);
    if (btnResetBottom)    btnResetBottom.addEventListener('click',    handleReset);

    // Modal buttons
    if (this.modalCancel) {
      this.modalCancel.addEventListener('click', () => this._hideResetConfirm());
    }
    if (this.modalAccept) {
      this.modalAccept.addEventListener('click', () => {
        this._hideResetConfirm();
        this._resetForm();
      });
    }

    // Close modal on overlay click
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this._hideResetConfirm();
      });
    }

    // Escape key closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && this.modal.style.display !== 'none') {
        this._hideResetConfirm();
      }
    });
  }

  // ── Image upload initialization ──────────────
  _initImageUpload(inputId, previewContainerId, uploadAreaId, isLogo = false) {
    const input         = document.getElementById(inputId);
    const previewDiv    = document.getElementById(previewContainerId);
    const uploadArea    = document.getElementById(uploadAreaId);

    if (!input || !previewDiv) return;

    // Map input id to images key
    const imageKey = inputId === 'logo-cliente' ? 'logoCliente' : inputId;

    input.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      this._loadImageFile(file, imageKey, previewDiv, uploadArea, isLogo);
    });

    // Drag and drop
    if (uploadArea) {
      uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
      });
      uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
      });
      uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
          this._loadImageFile(file, imageKey, previewDiv, uploadArea, isLogo);
        } else if (file) {
          Toast.error('Por favor suba solo archivos de imagen (PNG, JPG, WEBP).');
        }
      });
    }
  }

  // ── Load image via FileReader ─────────────────
  _loadImageFile(file, imageKey, previewDiv, uploadArea, isLogo = false) {
    // Size check (10MB for plans, 5MB for logo)
    const maxMB = isLogo ? 5 : 10;
    if (file.size > maxMB * 1024 * 1024) {
      Toast.error(`El archivo es demasiado grande. Máximo ${maxMB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataURL = ev.target.result;
      this.images[imageKey] = dataURL;
      this._renderImageThumb(dataURL, imageKey, previewDiv, uploadArea, file.name);
      this._schedulePreviewUpdate(100);
    };
    reader.onerror = () => {
      Toast.error('Error al leer el archivo de imagen.');
    };
    reader.readAsDataURL(file);
  }

  // ── Render image thumbnail ────────────────────
  _renderImageThumb(dataURL, imageKey, previewDiv, uploadArea, fileName) {
    // Clear previous preview
    previewDiv.innerHTML = '';

    // Hide the upload area's dashed box area and show thumb
    const thumb = document.createElement('div');
    thumb.className = 'file-preview-thumb';
    thumb.title = fileName;
    thumb.innerHTML = `
      <img src="${dataURL}" alt="Vista previa" />
      <button class="remove-btn" title="Eliminar imagen" type="button" aria-label="Eliminar">✕</button>
    `;

    // Also show file name
    const nameTag = document.createElement('div');
    nameTag.style.cssText = 'font-size:11px; color:#6B7280; margin-left:4px; align-self:center; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
    nameTag.title = fileName;
    nameTag.textContent = fileName;

    previewDiv.appendChild(thumb);
    previewDiv.appendChild(nameTag);

    // Remove button
    thumb.querySelector('.remove-btn').addEventListener('click', () => {
      this.images[imageKey] = null;
      previewDiv.innerHTML = '';
      // Reset file input
      const inputId = imageKey === 'logoCliente' ? 'logo-cliente' : imageKey;
      const input = document.getElementById(inputId);
      if (input) input.value = '';
      this._schedulePreviewUpdate(100);
      Toast.info('Imagen eliminada.');
    });
  }

  // ── Collect form data ─────────────────────────
  _collectData() {
    const val = (id) => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };

    return {
      nombreProyecto:  val('nombre-proyecto'),
      fecha:           val('fecha'),
      ubicacion:       val('ubicacion'),
      tipoObra:        val('tipo-obra'),
      descripcion:     val('descripcion'),
      areaTotal:       val('area-total'),
      areaConstruida:  val('area-construida'),
      presupuesto:     this._getRawPresupuesto(),
      plazo:           val('plazo'),
      arquitecto:      val('arquitecto'),
      especificaciones:val('especificaciones'),
      notas:           val('notas'),
      numDocumento:    val('num-documento'),
    };
  }

  // ── Get raw presupuesto number ────────────────
  _getRawPresupuesto() {
    const el = document.getElementById('presupuesto');
    if (!el || !el.value) return '';
    // Remove dots (thousand separators in Colombian format)
    return el.value.replace(/\./g, '').replace(/[^0-9,]/g, '');
  }

  // ── Format presupuesto input in real-time ─────
  _formatPresupuestoInput(input) {
    // Get only digits
    let raw = input.value.replace(/\D/g, '');
    if (!raw) { input.value = ''; return; }

    // Limit to reasonable amount
    if (raw.length > 15) raw = raw.slice(0, 15);

    // Format with dots as thousands separator (Colombian style)
    const num = parseInt(raw, 10);
    input.value = num.toLocaleString('es-CO');
  }

  // ── Schedule debounced preview update ─────────
  _schedulePreviewUpdate(delay = 200) {
    clearTimeout(this._previewTimer);
    this._previewTimer = setTimeout(() => {
      this._updatePreview();
    }, delay);
  }

  // ── Update live preview ───────────────────────
  _updatePreview() {
    if (!this.previewContainer) return;
    if (typeof buildPDFPreview !== 'function') return;

    const data   = this._collectData();
    const images = { ...this.images };

    try {
      const htmlStr = buildPDFPreview(data, images);

      // Extract just the body content from the full HTML string
      // We'll render it as a srcdoc iframe for isolation
      this._renderPreviewIframe(htmlStr);
    } catch (err) {
      console.error('[Amazonia] Preview error:', err);
    }
  }

  // ── Render preview in an iframe ───────────────
  _renderPreviewIframe(htmlStr) {
    // Reuse existing preview iframe if it exists
    let iframe = this.previewContainer.querySelector('iframe.pdf-preview-iframe');

    if (!iframe) {
      // Clear placeholder
      this.previewContainer.innerHTML = '';
      iframe = document.createElement('iframe');
      iframe.className = 'pdf-preview-iframe';
      iframe.style.cssText = `
        width: 794px;
        min-height: 1123px;
        border: none;
        display: block;
        background: white;
        box-shadow: 0 4px 30px rgba(0,0,0,0.20), 0 1px 8px rgba(0,0,0,0.10);
      `;
      iframe.setAttribute('scrolling', 'no');
      this.previewContainer.appendChild(iframe);
    }

    const iDoc = iframe.contentDocument || iframe.contentWindow.document;
    iDoc.open();
    iDoc.write(htmlStr);
    iDoc.close();

    // Adjust iframe height dynamically after content loads
    const adjustHeight = () => {
      try {
        const body = iDoc.body;
        const page = iDoc.querySelector('#pdf-page');
        const h    = page ? Math.max(1123, page.scrollHeight) : 1123;
        iframe.style.height = h + 'px';
      } catch (_) { /* cross-origin silent fail */ }
    };

    if (iDoc.readyState === 'complete') {
      adjustHeight();
    } else {
      iframe.addEventListener('load', adjustHeight, { once: true });
      setTimeout(adjustHeight, 400);
    }
  }

  // ── Validate required fields ──────────────────
  _validate() {
    let valid = true;

    // Nombre del proyecto
    const nombreInput = document.getElementById('nombre-proyecto');
    const errorNombre = document.getElementById('error-nombre');
    if (nombreInput && !nombreInput.value.trim()) {
      nombreInput.classList.add('error');
      if (errorNombre) errorNombre.style.display = 'flex';
      valid = false;
    } else if (nombreInput) {
      nombreInput.classList.remove('error');
      if (errorNombre) errorNombre.style.display = 'none';
    }

    // Fecha
    const fechaInput = document.getElementById('fecha');
    if (fechaInput && !fechaInput.value) {
      fechaInput.classList.add('error');
      valid = false;
    } else if (fechaInput) {
      fechaInput.classList.remove('error');
    }

    return valid;
  }

  // ── Handle Download PDF ───────────────────────
  async _handleDownload() {
    if (this._generating) {
      Toast.info('Ya se está generando el PDF, por favor espere...');
      return;
    }

    if (!this._validate()) {
      Toast.error('Por favor complete los campos obligatorios marcados con *');
      // Scroll to first error
      const firstError = this.form.querySelector('.error');
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    this._generating = true;

    // Update button state
    const btns = [
      document.getElementById('btn-download'),
      document.getElementById('btn-download-bottom'),
    ].filter(Boolean);

    btns.forEach(btn => {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span> Generando PDF...`;
    });

    Toast.info('Generando el PDF, por favor espere...', 0);

    try {
      const data   = this._collectData();
      const images = { ...this.images };

      const result = await generateAndDownloadPDF(data, images);

      // Dismiss info toast
      const infoToast = document.querySelector('.toast-info');
      if (infoToast) infoToast.remove();

      if (result && result.success) {
        Toast.success(`PDF descargado: <strong>${result.fileName}</strong>`, 6000);
      } else {
        Toast.success('¡PDF generado y descargado exitosamente!', 5000);
      }

    } catch (err) {
      console.error('[Amazonia] PDF generation error:', err);

      // Dismiss info toast
      const infoToast = document.querySelector('.toast-info');
      if (infoToast) infoToast.remove();

      Toast.error(`Error al generar el PDF: ${err.message || 'Error desconocido'}. Por favor intente de nuevo.`, 8000);
    } finally {
      this._generating = false;

      // Restore buttons
      btns.forEach(btn => {
        btn.disabled = false;
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" style="width:20px;height:20px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Descargar PDF`;
      });
    }
  }

  // ── Show / Hide Reset Confirm Modal ──────────
  _showResetConfirm() {
    if (this.modal) {
      this.modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  _hideResetConfirm() {
    if (this.modal) {
      this.modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  // ── Reset Form ────────────────────────────────
  _resetForm() {
    if (!this.form) return;

    // Reset all HTML form inputs
    this.form.reset();

    // Set today's date
    const fechaInput = document.getElementById('fecha');
    if (fechaInput) {
      fechaInput.value = new Date().toISOString().slice(0, 10);
    }

    // Clear all images
    this.images = {
      plano1:      null,
      plano2:      null,
      plano3:      null,
      logoCliente: null,
    };

    // Clear image preview containers
    ['preview-plano1', 'preview-plano2', 'preview-plano3', 'preview-logo-cliente']
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
      });

    // Clear validation errors
    this.form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.field-error').forEach(el => el.style.display = 'none');

    // Reset presupuesto display
    const presupuesto = document.getElementById('presupuesto');
    if (presupuesto) presupuesto.value = '';

    // Reset preview to placeholder
    if (this.previewContainer) {
      this.previewContainer.innerHTML = `
        <div style="width:794px; min-height:1123px; background:white; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:16px; box-shadow: 0 4px 30px rgba(0,0,0,0.2);">
          <div style="font-size:48px;">📄</div>
          <p style="color:#6B7280; font-size:15px; font-family: 'Segoe UI', sans-serif; text-align:center; max-width:320px; line-height:1.6;">
            Complete los campos del formulario para ver la vista previa del PDF
          </p>
          <div style="width:60px; height:3px; background: linear-gradient(90deg, #1B4332, #40916C); border-radius:2px;"></div>
        </div>`;
    }

    Toast.success('Formulario limpiado correctamente.');

    // Scroll to top of form
    this.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ─────────────────────────────────────────────
//  Initialize on DOMContentLoaded
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Toast.init();

  // Only init FormManager on the ficha-tecnica page
  if (document.getElementById('ficha-form')) {
    window.formManager = new FormManager();

    // Log ready
    console.log(
      '%c🌿 Amazonia Construcción%c — Sistema de Gestión Documental v1.0',
      'color:#1B4332; font-weight:700; font-size:14px;',
      'color:#40916C; font-size:12px;'
    );
  }
});
