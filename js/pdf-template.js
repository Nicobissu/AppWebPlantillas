/**
 * pdf-template.js
 * Amazonia Construcción — Ficha Técnica PDF Template
 * Estilo: minimalista, sobrio, líneas finas, fondo blanco
 *
 * buildPDFPreview(data, images) → HTML string A4
 * generateAndDownloadPDF(data, images) → descarga PDF
 */

// ─────────────────────────────────────────────
//  Logo Amazonia (versión horizontal minimalista)
// ─────────────────────────────────────────────
const AMAZONIA_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 28" width="144" height="22">
  <polygon points="14,3 24,22 4,22" fill="none" stroke="#1B4332" stroke-width="1.6" stroke-linejoin="round"/>
  <line x1="8" y1="16" x2="20" y2="16" stroke="#1B4332" stroke-width="1.2" stroke-linecap="round"/>
  <polygon points="14,1 17.5,8 10.5,8" fill="#1B4332"/>
  <rect x="12.5" y="7.5" width="3" height="3" fill="#1B4332" rx="0.3"/>
  <rect x="10" y="17.5" width="3" height="3" fill="#D4A017" rx="0.3"/>
  <rect x="15" y="17.5" width="3" height="3" fill="#D4A017" rx="0.3"/>
  <text x="30" y="17" font-family="Georgia,'Times New Roman',serif" font-size="14" font-weight="700" letter-spacing="3" fill="#1B4332">AMAZONIA</text>
  <line x1="30" y1="21" x2="178" y2="21" stroke="#D4A017" stroke-width="0.8"/>
  <text x="30" y="27" font-family="Arial,Helvetica,sans-serif" font-size="6.5" font-weight="400" letter-spacing="4" fill="#40916C">ARQUITECTURA · DISEÑO · PROYECTO</text>
</svg>`;

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function formatCOP(value) {
  if (!value && value !== 0) return '—';
  const num = typeof value === 'string'
    ? parseFloat(value.replace(/\./g, '').replace(',', '.'))
    : Number(value);
  if (isNaN(num)) return '—';
  return '$ ' + num.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' COP';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const [y, m] = dateStr.split('-');
    const months = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
    return `${months[parseInt(m)-1]} ${y}`;
  } catch { return dateStr; }
}

function formatNum(val, unit = '') {
  if (!val && val !== 0) return '—';
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  const fmt = n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return unit ? `${fmt} ${unit}` : fmt;
}

function getDocNumber(data) {
  if (data.numDocumento && data.numDocumento.trim()) return data.numDocumento.trim();
  const now = new Date();
  return String(now.getFullYear()).slice(2) + String(now.getMonth()+1).padStart(2,'0');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─────────────────────────────────────────────
//  Fila de dato
// ─────────────────────────────────────────────
function dataField(label, value) {
  return `
    <div style="border-bottom:1px solid #EBEBEB;padding:5px 0;">
      <div style="font-size:7px;font-family:Arial,sans-serif;color:#9CA3AF;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:2px;">${label}</div>
      <div style="font-size:10px;font-family:Arial,sans-serif;color:#1A1A1A;font-weight:500;">${value || '—'}</div>
    </div>`;
}

// ─────────────────────────────────────────────
//  Plano card
// ─────────────────────────────────────────────
function planCard(src, label, height) {
  return `
    <div style="border:1px solid #DCDCDC;overflow:hidden;background:#FAFAFA;">
      <div style="background:#F4F4F2;padding:5px 12px;border-bottom:1px solid #DCDCDC;display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:8px;font-family:Arial,sans-serif;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#1B4332;">${label}</span>
        <div style="width:5px;height:5px;border-radius:50%;background:#D4A017;"></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;height:${height};background:white;">
        <img src="${src}" alt="${label}"
          style="max-width:100%;max-height:100%;object-fit:contain;display:block;padding:8px;"
          crossorigin="anonymous"/>
      </div>
      <div style="background:#F4F4F2;padding:3px 12px;border-top:1px solid #DCDCDC;">
        <span style="font-size:7px;font-family:Arial,sans-serif;color:#9CA3AF;letter-spacing:1px;">ESCALA — SIN ESCALA · AMAZONIA CONSTRUCCIÓN</span>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────
//  Planos layout adaptativo
// ─────────────────────────────────────────────
function renderPlanosSection(images) {
  const planos = [
    { src: images.plano1, label: 'Plano 01' },
    { src: images.plano2, label: 'Plano 02' },
    { src: images.plano3, label: 'Plano 03' },
  ].filter(p => p.src);

  if (planos.length === 0) return '';

  if (planos.length === 1) {
    return `<div data-pb style="margin-top:18px;">${planCard(planos[0].src, planos[0].label, '400px')}</div>`;
  }

  if (planos.length === 2) {
    return `
      <div data-pb style="margin-top:18px;display:flex;gap:10px;">
        <div style="flex:1;">${planCard(planos[0].src, planos[0].label, '340px')}</div>
        <div style="flex:1;">${planCard(planos[1].src, planos[1].label, '340px')}</div>
      </div>`;
  }

  return `
    <div data-pb style="margin-top:18px;">
      ${planCard(planos[0].src, planos[0].label, '310px')}
    </div>
    <div data-pb style="margin-top:10px;display:flex;gap:10px;">
      <div style="flex:1;">${planCard(planos[1].src, planos[1].label, '250px')}</div>
      <div style="flex:1;">${planCard(planos[2].src, planos[2].label, '250px')}</div>
    </div>`;
}

// ─────────────────────────────────────────────
//  Footer canvas — siempre en el fondo absoluto
// ─────────────────────────────────────────────
function drawCanvasFooter(ctx, canvasWidth, canvasHeight, pageNum, docNum, S = 3) {
  const fH  = 44 * S;
  // Siempre pegado al borde inferior absoluto del canvas
  const y   = canvasHeight - fH;
  const pad = 28 * S;

  // Fondo
  ctx.fillStyle = '#FAFAF8';
  ctx.fillRect(0, y, canvasWidth, fH);

  // Línea superior del footer
  ctx.strokeStyle = '#E0E0E0';
  ctx.lineWidth = S;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(canvasWidth, y);
  ctx.stroke();

  // Izquierda — marca
  ctx.fillStyle = '#1B4332';
  ctx.font = `bold ${13 * S}px Georgia`;
  ctx.textAlign = 'left';
  ctx.fillText('AMAZONIA', pad, y + 20 * S);
  ctx.fillStyle = '#9CA3AF';
  ctx.font = `${8 * S}px Arial`;
  ctx.fillText('Arquitectura · Construcción', pad, y + 32 * S);

  // Centro — contacto
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9CA3AF';
  ctx.font = `${8 * S}px Arial`;
  ctx.fillText('contacto@amazonia.com.co  ·  www.amazonia.com.co', canvasWidth / 2, y + 20 * S);
  ctx.fillText('Colombia  ·  Construyendo el futuro con naturaleza', canvasWidth / 2, y + 32 * S);

  // Derecha — página
  ctx.textAlign = 'right';
  ctx.fillStyle = '#9CA3AF';
  ctx.font = `${8 * S}px Arial`;
  ctx.fillText(`Página ${pageNum}`, canvasWidth - pad, y + 20 * S);
  ctx.fillText(`Ref: ${docNum}`, canvasWidth - pad, y + 32 * S);
}

// ─────────────────────────────────────────────
//  MAIN: buildPDFPreview
// ─────────────────────────────────────────────
function buildPDFPreview(data, images) {
  const docNum    = getDocNumber(data);
  const dateShort = formatDate(data.fecha);
  const hasDesc   = data.descripcion && data.descripcion.trim().length > 0;
  const hasEspec  = data.especificaciones && data.especificaciones.trim().length > 0;
  const hasNotas  = data.notas && data.notas.trim().length > 0;
  const hasBudget = data.presupuesto && data.presupuesto !== '0';
  const hasPlanos = images.plano1 || images.plano2 || images.plano3;

  const rawBudget = hasBudget
    ? parseFloat(data.presupuesto.toString().replace(/\./g,'').replace(',','.'))
    : null;
  const costPorConstruido = rawBudget && data.areaConstruida && parseFloat(data.areaConstruida) > 0
    ? formatCOP(rawBudget / parseFloat(data.areaConstruida))
    : null;

  const clientLogoHtml = images.logoCliente
    ? `<img src="${images.logoCliente}" alt="Cliente"
         style="max-width:90px;max-height:55px;object-fit:contain;display:block;"
         crossorigin="anonymous"/>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:Arial,Helvetica,sans-serif;background:#fff;}

  .pdf-page{
    width:794px;
    min-height:1123px;
    background:#FFFFFF;
    display:flex;
    flex-direction:column;
    position:relative;
  }

  .pdf-top-rule{ height:3px; background:#1B4332; }
  .pdf-top-rule-gold{ height:1.5px; background:#D4A017; }

  .pdf-header{
    padding:14px 28px 12px 28px;
    display:flex;align-items:flex-end;justify-content:space-between;
    border-bottom:1px solid #E0E0E0;
  }
  .pdf-header-right{ text-align:right; }
  .pdf-header-right .project-title-sm{
    font-size:9px;font-family:Arial,sans-serif;color:#9CA3AF;
    letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;
  }
  .pdf-header-right .project-name-sm{
    font-size:11px;font-family:Georgia,serif;color:#1A1A1A;font-weight:700;letter-spacing:0.3px;
  }
  .pdf-header-meta{ display:flex;gap:18px;margin-top:6px;justify-content:flex-end; }
  .pdf-header-meta-item{ text-align:center; }
  .pdf-header-meta-label{ font-size:6.5px;font-family:Arial,sans-serif;color:#9CA3AF;letter-spacing:1.5px;text-transform:uppercase; }
  .pdf-header-meta-val{ font-size:9.5px;font-family:Arial,sans-serif;color:#1A1A1A;font-weight:600;letter-spacing:0.5px; }

  .pdf-project-band{
    padding:16px 28px 14px 28px;
    border-bottom:1px solid #E0E0E0;
    display:flex;gap:20px;align-items:flex-start;
  }
  .pdf-project-name-big{ flex:0 0 auto;max-width:200px; }
  .pdf-project-name-big .tipo{
    font-size:8px;font-family:Arial,sans-serif;color:#9CA3AF;
    letter-spacing:2px;text-transform:uppercase;margin-bottom:5px;
  }
  .pdf-project-name-big .nombre-line1{
    font-size:20px;font-weight:300;font-family:Georgia,serif;
    color:#1A1A1A;line-height:1.1;font-style:italic;
  }
  .pdf-project-name-big .nombre-line2{
    font-size:20px;font-weight:700;font-family:Georgia,serif;color:#1A1A1A;line-height:1.1;
  }
  .pdf-project-name-big .ubicacion{
    font-size:9px;font-family:Arial,sans-serif;color:#6B7280;margin-top:7px;letter-spacing:0.3px;
  }

  .pdf-vdivider{ width:1px;background:#E0E0E0;align-self:stretch;flex-shrink:0; }

  .pdf-project-info{ flex:1;min-width:0; }
  .pdf-project-desc{
    font-size:9.5px;font-family:Arial,sans-serif;color:#4B5563;line-height:1.7;margin-bottom:12px;
  }
  .pdf-data-grid{ display:grid;grid-template-columns:repeat(3,1fr);gap:0 16px; }

  /* Bloque m² — SIN border-top en .bh-unit para evitar la línea visual */
  .pdf-budget-highlight{
    flex:0 0 auto;width:110px;border:1px solid #1B4332;
    padding:10px 12px;text-align:center;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:3px;background:#FAFEFA;
  }
  .bh-label{
    font-size:7px;font-family:Arial,sans-serif;
    color:#9CA3AF;letter-spacing:1.5px;text-transform:uppercase;
  }
  .bh-m2{
    font-size:28px;font-family:Georgia,serif;
    font-weight:700;color:#1B4332;line-height:1;
    margin-top:2px;
  }
  .bh-unit{
    /* Sin border-top — era la causa de la línea visual sobre el número */
    font-size:9px;font-family:Arial,sans-serif;
    color:#40916C;letter-spacing:1px;
    padding-top:3px;
    width:100%;text-align:center;
  }
  .bh-price{
    font-size:10px;font-family:Arial,sans-serif;font-weight:700;color:#1A1A1A;
    border-top:1px solid #D1FAE5;
    padding-top:6px;margin-top:4px;width:100%;text-align:center;
  }

  .pdf-client-area{
    flex:0 0 auto;width:100px;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
  }
  .pdf-client-area .cl-label{
    font-size:7px;font-family:Arial,sans-serif;color:#D1D5DB;letter-spacing:1.5px;
    text-transform:uppercase;text-align:center;
  }

  .pdf-body{ flex:1;padding:16px 28px 20px 28px; }

  .pdf-section-label{
    font-size:7.5px;font-family:Arial,sans-serif;color:#1B4332;letter-spacing:2.5px;
    text-transform:uppercase;font-weight:700;margin-bottom:8px;
    display:flex;align-items:center;gap:8px;
  }
  .pdf-section-label::after{ content:'';flex:1;height:1px;background:#E0E0E0; }

  .pdf-free-text{
    font-size:9.5px;font-family:Arial,sans-serif;color:#4B5563;
    line-height:1.75;white-space:pre-wrap;word-break:break-word;
  }
  .pdf-empty-text{
    font-size:9.5px;font-family:Arial,sans-serif;color:#D1D5DB;font-style:italic;
  }

  /* break-inside: avoid en todas las secciones */
  [data-pb]{
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .pdf-budget-table{ width:100%;border-collapse:collapse; }
  .pdf-budget-table th{
    font-size:8px;font-family:Arial,sans-serif;color:#9CA3AF;letter-spacing:1.5px;
    text-transform:uppercase;font-weight:700;padding:6px 0;
    border-bottom:1px solid #E0E0E0;text-align:left;
  }
  .pdf-budget-table th:last-child{ text-align:right; }
  .pdf-budget-table td{
    font-size:9.5px;font-family:Arial,sans-serif;color:#374151;
    padding:6px 0;border-bottom:1px solid #F3F4F6;
  }
  .pdf-budget-table td:last-child{ text-align:right;color:#1B4332;font-weight:600; }
  .pdf-budget-total td{
    font-weight:700;color:#1A1A1A;border-top:1.5px solid #1B4332;
    border-bottom:none;font-size:10px;padding-top:8px;
  }
  .pdf-budget-total td:last-child{ color:#1B4332; }

  .pdf-sign-grid{ display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:18px; }
  .pdf-sign-box{ border-top:1.5px solid #1A1A1A;padding-top:6px; }
  .pdf-sign-name{ font-size:9.5px;font-family:Arial,sans-serif;color:#1A1A1A;font-weight:600;min-height:16px; }
  .pdf-sign-label{ font-size:7.5px;font-family:Arial,sans-serif;color:#9CA3AF;letter-spacing:1px;text-transform:uppercase;margin-top:2px; }

  .pdf-footer{
    border-top:1px solid #E0E0E0;padding:9px 28px;
    display:flex;align-items:center;justify-content:space-between;
    background:#FAFAF8;
  }
  .pdf-footer-brand{ font-size:9px;font-family:Georgia,serif;font-weight:700;color:#1B4332;letter-spacing:2.5px; }
  .pdf-footer-sub{ font-size:6.5px;font-family:Arial,sans-serif;color:#9CA3AF;letter-spacing:2px;text-transform:uppercase;margin-top:1px; }
  .pdf-footer-center{ font-size:8px;font-family:Arial,sans-serif;color:#9CA3AF;text-align:center;line-height:1.7; }
  .pdf-footer-right{ font-size:8px;font-family:Arial,sans-serif;color:#9CA3AF;text-align:right;line-height:1.6; }
</style>
</head>
<body>
<div class="pdf-page" id="pdf-page">

  <div class="pdf-top-rule"></div>
  <div class="pdf-top-rule-gold"></div>

  <!-- ═══ HEADER ═══ -->
  <div class="pdf-header">
    <div>${AMAZONIA_LOGO_SVG}</div>
    <div class="pdf-header-right">
      <div class="project-title-sm">Ficha Técnica de Proyecto</div>
      <div class="project-name-sm">${data.nombreProyecto ? escapeHtml(data.nombreProyecto) : 'Nombre del Proyecto'}</div>
      <div class="pdf-header-meta">
        <div class="pdf-header-meta-item">
          <div class="pdf-header-meta-label">Fecha</div>
          <div class="pdf-header-meta-val">${dateShort}</div>
        </div>
        <div class="pdf-header-meta-item">
          <div class="pdf-header-meta-label">Código</div>
          <div class="pdf-header-meta-val">${docNum}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══ BANDA DEL PROYECTO ═══ -->
  <div class="pdf-project-band" data-pb>
    <div class="pdf-project-name-big">
      <div class="tipo">${data.tipoObra || 'Proyecto'}</div>
      ${(() => {
        const nombre = data.nombreProyecto ? escapeHtml(data.nombreProyecto) : 'Nombre del Proyecto';
        const partes = nombre.split(' ');
        if (partes.length >= 2) {
          return `<div class="nombre-line1">${partes[0]}</div>
                  <div class="nombre-line2">${partes.slice(1).join(' ')}</div>`;
        }
        return `<div class="nombre-line2">${nombre}</div>`;
      })()}
      ${data.ubicacion ? `<div class="ubicacion">${escapeHtml(data.ubicacion)}</div>` : ''}
    </div>

    <div class="pdf-vdivider"></div>

    <div class="pdf-project-info">
      ${hasDesc
        ? `<div class="pdf-project-desc">${escapeHtml(data.descripcion)}</div>`
        : '<div class="pdf-project-desc" style="color:#D1D5DB;font-style:italic;">Sin descripción.</div>'
      }
      <div class="pdf-data-grid">
        ${dataField('Tipología', data.tipoObra)}
        ${dataField('Organización', data.arquitecto ? escapeHtml(data.arquitecto) : null)}
        ${dataField('Encargado', data.arquitecto ? escapeHtml(data.arquitecto) : null)}
        ${dataField('Área Total', data.areaTotal ? formatNum(data.areaTotal,'m²') : null)}
        ${dataField('Área Construida', data.areaConstruida ? formatNum(data.areaConstruida,'m²') : null)}
        ${dataField('Plazo', data.plazo ? formatNum(data.plazo,'días') : null)}
      </div>
    </div>

    <div class="pdf-vdivider"></div>

    <div class="pdf-budget-highlight">
      <div class="bh-label">Área Construida</div>
      <div class="bh-m2">${data.areaConstruida ? formatNum(data.areaConstruida) : '—'}</div>
      <div class="bh-unit">m² ${data.tipoObra ? escapeHtml(data.tipoObra) : ''}</div>
      <div class="bh-price">${hasBudget ? formatCOP(data.presupuesto) : '$ ___________'}</div>
    </div>

    ${images.logoCliente ? `
    <div class="pdf-vdivider"></div>
    <div class="pdf-client-area">
      ${clientLogoHtml}
      <div class="cl-label">Cliente</div>
    </div>` : ''}
  </div>

  <!-- ═══ CUERPO ═══ -->
  <div class="pdf-body">

    ${hasPlanos ? `
    <div data-pb>
      <div class="pdf-section-label">Planos del Proyecto</div>
      ${renderPlanosSection(images)}
    </div>` : ''}

    ${hasEspec ? `
    <div data-pb style="margin-top:18px;">
      <div class="pdf-section-label">Especificaciones Técnicas</div>
      <p class="pdf-free-text">${escapeHtml(data.especificaciones)}</p>
    </div>` : ''}

    ${hasBudget ? `
    <div data-pb style="margin-top:18px;">
      <div class="pdf-section-label">Resumen Presupuestal</div>
      <table class="pdf-budget-table">
        <thead>
          <tr><th>Concepto</th><th>Valor</th></tr>
        </thead>
        <tbody>
          <tr><td>Presupuesto Total de la Obra</td><td>${formatCOP(data.presupuesto)}</td></tr>
          ${data.areaTotal ? `<tr><td>Área Total del Lote</td><td>${formatNum(data.areaTotal,'m²')}</td></tr>` : ''}
          ${data.areaConstruida ? `<tr><td>Área Construida</td><td>${formatNum(data.areaConstruida,'m²')}</td></tr>` : ''}
          ${costPorConstruido ? `<tr><td>Costo por m² Construido</td><td>${costPorConstruido}</td></tr>` : ''}
          ${data.plazo ? `<tr><td>Plazo de Ejecución</td><td>${formatNum(data.plazo,'días')}</td></tr>` : ''}
        </tbody>
        <tfoot>
          <tr class="pdf-budget-total">
            <td>TOTAL APROBADO</td>
            <td>${formatCOP(data.presupuesto)}</td>
          </tr>
        </tfoot>
      </table>
    </div>` : ''}

    ${hasNotas ? `
    <div data-pb style="margin-top:18px;">
      <div class="pdf-section-label">Notas</div>
      <p class="pdf-free-text" style="font-size:8.5px;color:#6B7280;">${escapeHtml(data.notas)}</p>
    </div>` : ''}

    <div data-pb class="pdf-sign-grid">
      <div class="pdf-sign-box">
        <div class="pdf-sign-name">${data.arquitecto ? escapeHtml(data.arquitecto) : ''}</div>
        <div class="pdf-sign-label">Elaborado por</div>
      </div>
      <div class="pdf-sign-box">
        <div class="pdf-sign-name"></div>
        <div class="pdf-sign-label">Revisado por</div>
      </div>
      <div class="pdf-sign-box">
        <div class="pdf-sign-name"></div>
        <div class="pdf-sign-label">Aprobado por</div>
      </div>
    </div>

  </div>

  <!-- ═══ FOOTER ═══ -->
  <div class="pdf-footer">
    <div>
      <div class="pdf-footer-brand">AMAZONIA</div>
      <div class="pdf-footer-sub">Arquitectura · Construcción</div>
    </div>
    <div class="pdf-footer-center">
      contacto@amazonia.com.co · www.amazonia.com.co<br/>
      Colombia · Construyendo el futuro con naturaleza
    </div>
    <div class="pdf-footer-right">
      Documento de Presentación — ${new Date().getFullYear()}<br/>
      Ref: ${docNum}
    </div>
  </div>

</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────
//  generateAndDownloadPDF — páginas A4 exactas
//  · Footer siempre al fondo absoluto
//  · Padding superior en páginas de continuación
// ─────────────────────────────────────────────
async function generateAndDownloadPDF(data, images) {
  const htmlContent = buildPDFPreview(data, images);

  const iframe = document.createElement('iframe');
  iframe.style.cssText = `position:fixed;left:-9999px;top:-9999px;width:794px;height:1123px;border:none;visibility:hidden;z-index:-1;`;
  document.body.appendChild(iframe);

  const iDoc = iframe.contentDocument || iframe.contentWindow.document;
  iDoc.open();
  iDoc.write(htmlContent);
  iDoc.close();

  await new Promise(resolve => {
    const check = () => {
      const imgs = iDoc.querySelectorAll('img');
      const allLoaded = Array.from(imgs).every(img => img.complete && img.naturalWidth > 0);
      if (imgs.length === 0 || allLoaded) resolve();
      else setTimeout(check, 150);
    };
    setTimeout(check, 700);
  });

  try {
    const S         = 3;           // capture scale — 3x para alta resolución
    const PAGE_H_C  = 1123 * S;    // canvas px por página A4
    const FOOTER_H_C = 44 * S;     // altura del footer en canvas px
    const TOP_PAD_C  = 38 * S;     // margen superior en páginas de continuación

    // Espacio de contenido disponible por página
    const AVAIL_P1_C   = PAGE_H_C - FOOTER_H_C;             // página 1
    const AVAIL_CONT_C = PAGE_H_C - FOOTER_H_C - TOP_PAD_C; // páginas 2+

    const pageEl  = iDoc.querySelector('#pdf-page') || iDoc.body;
    const pageRect = pageEl.getBoundingClientRect();

    // Posiciones DOM de secciones (para saltos inteligentes)
    const sectionTopsDom = Array.from(iDoc.querySelectorAll('[data-pb]'))
      .map(el => Math.round(el.getBoundingClientRect().top - pageRect.top))
      .filter(y => y > 50)
      .sort((a, b) => a - b);

    // Posición del footer HTML → el contenido termina aquí
    const htmlFooterEl     = iDoc.querySelector('.pdf-footer');
    const contentEndDom    = htmlFooterEl
      ? Math.round(htmlFooterEl.getBoundingClientRect().top - pageRect.top)
      : null;

    // Capturar canvas completo
    const canvas = await html2canvas(pageEl, {
      scale: S,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#FFFFFF',
      width: 794,
      height: Math.max(1123, pageEl.scrollHeight),
      windowWidth: 794,
      logging: false,
      imageTimeout: 20000,
      onclone: (clonedDoc) => {
        const el = clonedDoc.querySelector('#pdf-page');
        if (el) { el.style.position = 'relative'; el.style.overflow = 'visible'; }
      }
    });

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const docNum = getDocNumber(data);

    // ── Caso simple: todo en una página ──
    if (canvas.height <= PAGE_H_C) {
      pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, 210, 210 * canvas.height / canvas.width);

    } else {
      // ── Multi-página ──
      // El contenido termina antes del footer HTML
      const contentEndCanvas = contentEndDom !== null ? contentEndDom * S : canvas.height;
      const bpCanvas = sectionTopsDom.map(y => y * S);

      // Construir slices
      const slices = [];
      let curStart  = 0;
      let firstPage = true;

      while (curStart < contentEndCanvas) {
        const avail  = firstPage ? AVAIL_P1_C : AVAIL_CONT_C;
        const maxEnd = curStart + avail;

        if (maxEnd >= contentEndCanvas) {
          slices.push({ start: curStart, end: contentEndCanvas, first: firstPage });
          break;
        }

        // Último break point antes de maxEnd
        let bestBreak = maxEnd;
        for (let i = bpCanvas.length - 1; i >= 0; i--) {
          if (bpCanvas[i] > curStart + 80 * S && bpCanvas[i] <= maxEnd) {
            bestBreak = bpCanvas[i];
            break;
          }
        }

        slices.push({ start: curStart, end: bestBreak, first: firstPage });
        curStart  = bestBreak;
        firstPage = false;
      }

      slices.forEach(({ start, end, first }, idx) => {
        const topPad   = first ? 0 : TOP_PAD_C;
        const contentH = end - start;

        // Todas las páginas son exactamente A4 (PAGE_H_C)
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width  = canvas.width;
        sliceCanvas.height = PAGE_H_C;
        const ctx = sliceCanvas.getContext('2d');

        // Fondo blanco
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);

        // Líneas de marca en páginas de continuación (igual que el header del template)
        if (!first) {
          ctx.fillStyle = '#1B4332';
          ctx.fillRect(0, 0, sliceCanvas.width, 3 * S);
          ctx.fillStyle = '#D4A017';
          ctx.fillRect(0, 3 * S, sliceCanvas.width, 1.5 * S);
        }

        // Contenido con padding superior
        ctx.drawImage(canvas,
          0, start,          canvas.width, contentH,  // fuente
          0, topPad,         canvas.width, contentH   // destino
        );

        // Footer siempre al fondo absoluto (PAGE_H_C - FOOTER_H_C)
        drawCanvasFooter(ctx, sliceCanvas.width, sliceCanvas.height, idx + 1, docNum, S);

        if (idx > 0) pdf.addPage();
        // Siempre 210×297mm — A4 exacto
        pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, 210, 297);
      });
    }

    const projName = (data.nombreProyecto || 'Proyecto')
      .replace(/[^a-zA-Z0-9\s\-_áéíóúÁÉÍÓÚñÑ]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 40);
    const dateTag = data.fecha
      ? data.fecha.replace(/-/g, '')
      : new Date().toISOString().slice(0,10).replace(/-/g,'');

    pdf.save(`FichaTecnica_${projName}_${dateTag}.pdf`);
    return { success: true };

  } finally {
    document.body.removeChild(iframe);
  }
}
