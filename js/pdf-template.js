/**
 * pdf-template.js — Amazonia SAS — Cotización
 */

// ─── Helpers ───────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function fmtFecha(dateStr) {
  if (!dateStr) return '—';
  try {
    const p = dateStr.split('-');
    return `${parseInt(p[2])}/${parseInt(p[1])}/${p[0]}`;
  } catch { return dateStr; }
}

function fmtUSD(val) {
  if (!val) return '—';
  const n = parseFloat(String(val).replace(/[^0-9.,]/g,'').replace(',','.'));
  if (isNaN(n)) return String(val);
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function numToWords(val) {
  if (!val) return '';
  const n = Math.round(parseFloat(String(val).replace(/[^0-9.,]/g,'').replace(',','.')));
  if (isNaN(n) || n === 0) return '';
  const ones = ['','UN','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE',
    'DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE'];
  const tens = ['','','VEINTE','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
  const hunds = ['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS',
    'SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];
  const small = x => { if(!x)return''; if(x<20)return ones[x]; const t=Math.floor(x/10),u=x%10; return tens[t]+(u?' Y '+ones[u]:''); };
  const triple = x => { const h=Math.floor(x/100),r=x%100; return (h?hunds[h]+(r?' ':' '):'')+(r?small(r):''); };
  if (n>=1000000){ const m=Math.floor(n/1000000),r=n%1000000; return (m===1?'UN MILLÓN':triple(m)+' MILLONES')+(r?' '+numToWords(r):''); }
  if (n>=1000){ const m=Math.floor(n/1000),r=n%1000; return (m===1?'MIL':triple(m)+' MIL')+(r?' '+triple(r):''); }
  return triple(n).trim();
}

// Renderiza inclusiones estructuradas (array de objetos {label, estado, descripcion})
function renderInclusionesStructured(inclusions) {
  if (!inclusions || !inclusions.length) return '';
  return inclusions.map(item => {
    const isIncluye   = item.estado === 'incluye';
    const estadoTxt   = isIncluye ? 'Incluye' : 'No incluye';
    const estadoColor = isIncluye ? '#1B4332' : '#B91C1C';
    const descHtml    = isIncluye && item.descripcion && item.descripcion.trim()
      ? `<span style="font-size:8.5px;font-family:Arial;color:#1A1A1A;line-height:1.55;flex:1;">— ${escHtml(item.descripcion)}</span>`
      : '';
    return `<div style="display:flex;gap:0;margin-bottom:3px;align-items:flex-start;">
      <span style="font-weight:700;min-width:128px;max-width:128px;flex-shrink:0;font-size:8.5px;font-family:Arial;color:#1A1A1A;line-height:1.55;">- ${escHtml(item.label)}:</span>
      <span style="font-size:8.5px;font-family:Arial;color:${estadoColor};font-weight:700;line-height:1.55;white-space:nowrap;margin-right:6px;flex-shrink:0;">${estadoTxt}</span>
      ${descHtml}
    </div>`;
  }).join('');
}

// Renderiza texto libre de inclusiones: líneas "- Label: valor" → columnas bold/normal
function renderListText(rawText) {
  if (!rawText) return '';
  const lines = rawText.split('\n');
  return lines.map(line => {
    const t = line.trim();
    if (!t) return '<div style="height:4px;"></div>';
    // Detectar patrón "- Algo: descripción"
    const m = t.match(/^(-\s*)(([^:]{1,35}):\s*)(.*)$/);
    if (m) {
      return `<div style="display:flex;gap:0;margin-bottom:2px;align-items:flex-start;">
        <span style="font-weight:700;min-width:130px;max-width:130px;flex-shrink:0;font-size:8.5px;font-family:Arial;color:#1A1A1A;line-height:1.55;">- ${escHtml(m[3])}:</span>
        <span style="font-size:8.5px;font-family:Arial;color:#1A1A1A;line-height:1.55;flex:1;">${escHtml(m[4])}</span>
      </div>`;
    }
    return `<div style="font-size:8.5px;font-family:Arial;color:#1A1A1A;line-height:1.55;margin-bottom:2px;">${escHtml(t)}</div>`;
  }).join('');
}

// Renderiza texto libre simple (consideraciones generales, exclusiones)
function renderFreeText(rawText) {
  if (!rawText) return '';
  return rawText.split('\n').map(line => {
    if (!line.trim()) return '<div style="height:4px;"></div>';
    return `<p style="font-size:8.8px;font-family:Arial;color:#1A1A1A;line-height:1.6;margin-bottom:3px;">${escHtml(line.trim())}</p>`;
  }).join('');
}

// ─── CSS base ──────────────────────────────────
const BASE_STYLES = `
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:Arial,Helvetica,sans-serif;background:#fff;}

.pdf-page{
  width:794px;
  min-height:1123px;
  background:#FFFFFF;
  display:flex;
  flex-direction:column;
}

/* ── HEADER ── */
.hdr{
  position:relative;width:794px;height:82px;
  background:white;overflow:hidden;flex-shrink:0;
  border-bottom:1.5px solid #C8D4E4;
}
.hdr-logo{
  position:absolute;left:24px;top:0;bottom:0;
  display:flex;flex-direction:column;justify-content:center;
  gap:3px;
  z-index:2;
}
.amz-mark{
  display:block;
}
.amz-name{
  font-family:Arial,sans-serif;
  font-size:18px;font-weight:900;
  color:#1C3A5C;letter-spacing:5px;line-height:1;
  text-transform:uppercase;
}
.amz-rule{
  width:200px;height:1px;
  background:#1C3A5C;
  margin:1px 0;
}
.amz-sub{
  font-family:Arial,sans-serif;font-size:6.2px;
  color:#1C3A5C;letter-spacing:4.5px;text-transform:uppercase;
  opacity:0.7;
}
.hdr-cot{
  position:absolute;right:14px;top:50%;transform:translateY(-50%);
  font-family:Arial,sans-serif;font-size:17px;font-weight:700;
  color:white;letter-spacing:1px;z-index:3;
}

/* ── BLOQUE CLIENTE ── */
.client-wrap{padding:8px 24px 10px 24px;flex-shrink:0;}
.fecha-line{
  text-align:right;font-family:Arial,sans-serif;
  font-size:8.5px;color:#555;margin-bottom:5px;line-height:1.9;
}
.fecha-line strong{color:#1A1A1A;margin-left:5px;}
.ct{width:100%;border-collapse:collapse;}
.ct .th-row td{
  background:#1C3A5C;color:white;
  font-size:8.5px;font-family:Arial;font-weight:700;
  padding:4px 10px;
}
.ct td{
  font-size:8.5px;font-family:Arial;
  padding:3.5px 10px;color:#1A1A1A;
  border:0.5px solid #D0D8E8;
  vertical-align:middle;
  word-break:break-word;overflow-wrap:break-word;
}
.ct .cl{font-weight:700;color:#1C3A5C;background:#F4F6FA;width:170px;}

/* ── CUERPO ── */
.body{flex:1;padding:12px 24px 8px 24px;display:flex;flex-direction:column;}

/* Título de sección */
.st{
  font-family:Arial,sans-serif;font-size:9.5px;font-weight:700;
  color:#1C3A5C;text-decoration:underline;
  margin:13px 0 6px 0;
  padding-left:9px;
  border-left:2.5px solid #1C3A5C;
  line-height:1.2;
}
.st-sub{
  font-family:Arial,sans-serif;font-size:9px;font-weight:700;
  color:#1A1A1A;margin:8px 0 4px 0;
  padding-left:9px;
  border-left:1.5px solid #8AAEC4;
}

/* Texto cuerpo */
.bp{font-family:Arial;font-size:9px;color:#1A1A1A;line-height:1.62;margin-bottom:4px;}
.bp-b{font-family:Arial;font-size:9px;font-weight:700;color:#1A1A1A;line-height:1.62;margin-bottom:4px;}
.bp-i{font-family:Arial;font-size:8.5px;font-style:italic;color:#444;line-height:1.6;margin-bottom:4px;}
.bp-sm{font-family:Arial;font-size:8px;color:#555;line-height:1.6;margin-bottom:3px;}
.bullet{font-family:Arial;font-size:9px;color:#1A1A1A;line-height:1.6;margin-bottom:2px;padding-left:12px;}

/* ── PRECIO ── */
.precio-box{
  border:1px solid #1C3A5C;padding:10px 16px;
  margin:8px 0;background:#F2F5FA;
}
.precio-titulo{font-family:Arial;font-size:9px;font-weight:700;color:#1C3A5C;text-decoration:underline;margin-bottom:5px;}
.precio-row{display:flex;align-items:baseline;gap:16px;}
.precio-cur{font-family:Arial;font-size:9.5px;font-weight:700;color:#1C3A5C;width:38px;}
.precio-amt{font-family:Georgia,serif;font-size:16px;font-weight:700;color:#1A1A1A;letter-spacing:0.5px;}
.precio-words{font-family:Arial;font-size:7.8px;font-weight:700;color:#444;text-transform:uppercase;margin-top:4px;border-top:1px solid #D0D8E8;padding-top:4px;}

/* ── SUPERFICIE INFO ── */
.sup-grid{
  display:grid;grid-template-columns:1fr 1fr;
  gap:6px;margin:8px 0;
}
.sup-cell{
  background:#F7F9FB;border:0.5px solid #D0D8E8;
  padding:5px 10px;
}
.sup-lbl{font-family:Arial;font-size:7px;color:#8AAEC4;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:2px;}
.sup-val{font-family:Georgia,serif;font-size:13px;font-weight:700;color:#1C3A5C;line-height:1;}
.sup-unit{font-family:Arial;font-size:7.5px;color:#8AAEC4;margin-top:1px;}

/* ── FOOTER ── */
.ftr{
  background:#1C3A5C;
  display:grid;grid-template-columns:1fr 1fr 1fr auto;
  padding:8px 16px;gap:0;flex-shrink:0;
}
.fc{font-family:Arial;font-size:6.8px;color:rgba(255,255,255,0.82);line-height:1.7;}
.fc .ft{font-weight:700;color:white;display:block;margin-bottom:1px;font-size:7px;}
.ftr-end{display:flex;align-items:center;gap:8px;justify-content:flex-end;}
.ftr-circle{
  width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.12);
  border:1px solid rgba(255,255,255,0.25);
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.ftr-pg{font-family:Arial;font-size:9px;color:rgba(255,255,255,0.55);align-self:flex-end;padding-bottom:1px;}

[data-pb]{break-inside:avoid;page-break-inside:avoid;}
`;

// ─── Header ──────────────────────────────────
function renderHeader() {
  return `
  <div class="hdr">
    <svg style="position:absolute;top:0;right:0;" width="310" height="82"
         viewBox="0 0 310 82" xmlns="http://www.w3.org/2000/svg">
      <polygon points="80,0 310,0 310,82 230,82" fill="#D4B896" opacity="0.40"/>
      <polygon points="195,0 310,0 310,82 285,82" fill="#7A9EC0" opacity="0.55"/>
      <polygon points="248,0 310,0 310,62" fill="#1C3A5C"/>
      <polygon points="276,82 310,82 310,64" fill="#2B5280" opacity="0.5"/>
    </svg>
    <div class="hdr-logo">
      <img src="assets/logo-amazonia.png" style="height:72px;width:auto;display:block;object-fit:contain;" crossorigin="anonymous" />
    </div>
    <div class="hdr-cot">Cotización</div>
  </div>`;
}

// ─── Footer ──────────────────────────────────
function renderFooter(n) {
  return `
  <div class="ftr">
    <div class="fc"><span class="ft">Seguinos en nuestras redes:</span>/amazonia_amz<br/>www.amazoníaamz.com</div>
    <div class="fc"><span class="ft">Contáctanos:</span>comercial@amazoniaamz.com<br/>341-521-7974</div>
    <div class="fc"><span class="ft">&nbsp;</span>Av. San Lorenzo 2669,<br/>C. Bermúdez · Santa Fe, Arg.</div>
    <div class="ftr-end">
      <span class="ftr-pg">${n}</span>
    </div>
  </div>`;
}

// ─── Bloque cliente ───────────────────────────
function renderClientBlock(data) {
  return `
  <div class="client-wrap" data-pb>
    <div class="fecha-line">
      Fecha:<strong>${fmtFecha(data.fecha)}</strong>
      &nbsp;&nbsp;&nbsp;
      Número:<strong>${escHtml(data.numeroCotizacion) || '—'}</strong>
    </div>
    <table class="ct">
      <tr class="th-row"><td colspan="2">Cliente:</td></tr>
      <tr><td class="cl">Apellido y Nombre:</td><td>${escHtml(data.apellidoNombre) || ''}</td></tr>
      <tr><td class="cl">Nro. De contacto:</td><td>${escHtml(data.nroContacto) || ''}</td></tr>
      <tr><td class="cl">Email:</td><td>${escHtml(data.email) || ''}</td></tr>
      <tr><td class="cl">Ubicación del terreno de obra:</td><td>${escHtml(data.ubicacion) || ''}</td></tr>
    </table>
  </div>`;
}

// ─── PÁGINA 1 ─────────────────────────────────
function buildPage1(data) {
  const propuesta = data.propuesta && data.propuesta.trim()
    ? escHtml(data.propuesta)
    : 'La presente propuesta se elaboró a partir de los lineamientos funcionales compartidos por el cliente.';

  return `<div class="pdf-page" id="pdf-page-1">
    ${renderHeader()}
    ${renderClientBlock(data)}
    <div class="body">

      <p class="bp" style="margin-top:2px;"><strong>Estimado/a:</strong></p>
      <p class="bp">Nos complace informarle nuestra mejor propuesta para la obra de referencia. Agradecemos la confianza y ponemos a su disposición el detalle técnico, económico y operativo del sistema constructivo AMZ aplicado a este proyecto.</p>

      <p class="st">Breve descripción del Sistema Constructivo AMZ</p>
      <p class="bp-b">El sistema AMZ es una metodología de construcción industrializada desarrollada para combinar la precisión de los procesos de fábrica con la flexibilidad del diseño arquitectónico y el montaje en obra. Esto nos permite ofrecer construcciones con altos estándares de calidad, excelente comportamiento térmico, mayor previsibilidad de ejecución y una obra más limpia, ordenada y eficiente.</p>
      <p class="bp-b">Los muros se fabrican en nuestra planta contemplando las necesidades estructurales, las instalaciones previstas y las características particulares del proyecto, permitiendo lograr:</p>
      <p class="bullet">- mayor control de calidad desde origen;</p>
      <p class="bullet">- excelente aislación termoacústica y confort interior;</p>
      <p class="bullet">- optimización de tiempos de obra;</p>
      <p class="bullet">- reducción de desperdicios y mayor eficiencia constructiva;</p>
      <p class="bullet">- una solución sólida, durable y pensada para el largo plazo.</p>

      <p class="st">Propuesta de proyecto</p>
      <p class="bp" style="white-space:pre-wrap;">${propuesta}</p>

    </div>
    ${renderFooter(1)}
  </div>`;
}

// ─── PÁGINA 2 ─────────────────────────────────
function buildPage2(data, images) {
  const m2 = data.superficie || '—';
  const terreno = data.superficieTerreno;
  const hasImg = images.plano1 || images.plano2 || images.plano3;
  const fit = 'max-width:100%;max-height:100%;object-fit:contain;display:block;';

  // Grid de superficies
  let supGrid = `<div class="sup-grid" data-pb>`;
  supGrid += `<div class="sup-cell"><div class="sup-lbl">Sup. cubierta / total obra</div><div class="sup-val">${escHtml(String(m2))}</div><div class="sup-unit">m²</div></div>`;
  if (terreno) {
    supGrid += `<div class="sup-cell"><div class="sup-lbl">Sup. total del terreno</div><div class="sup-val">${escHtml(String(terreno))}</div><div class="sup-unit">m²</div></div>`;
  }
  supGrid += '</div>';

  // Imágenes
  let imgs = '';
  if (hasImg) {
    const s = 'max-width:100%;max-height:100%;object-fit:contain;display:block;';
    const top = [images.plano1, images.plano2].filter(Boolean);
    if (top.length === 2) {
      imgs += `<div style="display:flex;gap:10px;margin-bottom:10px;">
        <div style="flex:1;border:0.5px solid #C8D4E4;max-height:268px;display:flex;align-items:center;justify-content:center;background:#F9FAFB;overflow:hidden;">
          <img src="${top[0]}" style="${s}" crossorigin="anonymous"/></div>
        <div style="flex:1;border:0.5px solid #C8D4E4;max-height:268px;display:flex;align-items:center;justify-content:center;background:#F9FAFB;overflow:hidden;">
          <img src="${top[1]}" style="${s}" crossorigin="anonymous"/></div>
      </div>`;
    } else if (top.length === 1) {
      imgs += `<div style="border:0.5px solid #C8D4E4;max-height:300px;margin-bottom:10px;display:flex;align-items:center;justify-content:center;background:#F9FAFB;overflow:hidden;">
        <img src="${top[0]}" style="${s}" crossorigin="anonymous"/></div>`;
    }
    if (images.plano3) {
      imgs += `<div style="border:0.5px solid #C8D4E4;max-height:190px;display:flex;align-items:center;justify-content:center;background:#F9FAFB;overflow:hidden;">
        <img src="${images.plano3}" style="${s}" crossorigin="anonymous"/></div>`;
    }
  }

  return `<div class="pdf-page" id="pdf-page-2">
    ${renderHeader()}
    <div class="body">
      <p class="st" style="margin-top:6px;">Superficie considerada para esta propuesta</p>
      <p class="bp"><u>La propuesta preliminar contempla aproximadamente ${escHtml(String(m2))} m² cubiertos y totales.</u></p>
      <p class="bp">En caso de requerir un ajuste más estricto a una superficie objetivo cercana a los ${escHtml(String(m2))} m², la propuesta puede optimizarse en una siguiente instancia de anteproyecto.</p>
      ${supGrid}
      <div style="margin-top:8px;">${imgs}</div>
    </div>
    ${renderFooter(2)}
  </div>`;
}

// ─── PÁGINA 3 ─────────────────────────────────
function buildPage3(data) {
  const gen = data.consideracionesGenerales || '';
  const inc = data.inclusiones;
  const incHtml = Array.isArray(inc)
    ? renderInclusionesStructured(inc)
    : renderListText(inc || '');
  return `<div class="pdf-page" id="pdf-page-3">
    ${renderHeader()}
    <div class="body">
      <p class="st" style="margin-top:6px;">Consideraciones técnicas:</p>
      <p class="st-sub">Generales:</p>
      ${renderFreeText(gen)}
      <p class="st-sub" style="margin-top:10px;">Particulares:</p>
      <p style="font-family:Arial;font-size:9px;font-weight:700;color:#1A1A1A;margin:4px 0 6px 9px;">Inclusiones:</p>
      ${incHtml}
    </div>
    ${renderFooter(3)}
  </div>`;
}

// ─── PÁGINA 4 ─────────────────────────────────
function buildPage4(data) {
  const excl = data.exclusiones || '';
  return `<div class="pdf-page" id="pdf-page-4">
    ${renderHeader()}
    <div class="body">
      <p class="st" style="margin-top:6px;">Exclusiones:</p>
      ${renderFreeText(excl)}
    </div>
    ${renderFooter(4)}
  </div>`;
}

// ─── PÁGINA 5 ─────────────────────────────────
function buildPage5(data) {
  const precioFmt = fmtUSD(data.precioUsd);
  const words     = numToWords(data.precioUsd ? String(data.precioUsd).replace(/[^0-9.,]/g,'') : '');
  const m2        = data.superficie        || '—';
  const terreno   = data.superficieTerreno;
  const valM2     = data.valorM2 ? fmtUSD(data.valorM2) : '—';

  return `<div class="pdf-page" id="pdf-page-5">
    ${renderHeader()}
    <div class="body">

      <p class="st" style="margin-top:6px;">Oferta Comercial:</p>
      <p class="st-sub" style="font-weight:400;">Precio:</p>
      <p class="bp">El siguiente valor corresponde a una propuesta llave en mano estimativa, desarrollada en base al anteproyecto preliminar adjunto y al nivel de terminación considerado para esta instancia.</p>

      <div class="precio-box" data-pb>
        <div class="precio-titulo">Precio sin impuestos:</div>
        <div class="precio-row">
          <span class="precio-cur">USD</span>
          <span class="precio-amt">${precioFmt}</span>
        </div>
        ${words ? `<div class="precio-words">Dólares Estadounidenses ${words}</div>` : ''}
      </div>

      <p class="bp-b" style="margin-top:8px;">Esta cotización se ha realizado tomando como referencia el plano adjunto en este documento.</p>

      <div class="sup-grid" style="margin:6px 0;" data-pb>
        <div class="sup-cell">
          <div class="sup-lbl">Sup. cubierta</div>
          <div class="sup-val">${escHtml(String(m2))}</div>
          <div class="sup-unit">m²</div>
        </div>
        ${terreno ? `<div class="sup-cell">
          <div class="sup-lbl">Sup. total del terreno</div>
          <div class="sup-val">${escHtml(String(terreno))}</div>
          <div class="sup-unit">m²</div>
        </div>` : `<div class="sup-cell">
          <div class="sup-lbl">Superficie total de obra</div>
          <div class="sup-val">${escHtml(String(m2))}</div>
          <div class="sup-unit">m²</div>
        </div>`}
      </div>

      <p class="bp-i">Referencia para el cliente: Valor por m²&nbsp;&nbsp;&nbsp;USD&nbsp;&nbsp;&nbsp;${valM2}</p>
      <p class="bp-sm">Este valor constituye una referencia orientativa para la propuesta presentada y podrá variar según ajustes de diseño, definición final de terminaciones, condiciones del terreno y alcance definitivo de obra.</p>

      <p class="st">Forma de pago:</p>
      <p class="bp">Opción 1: pago contado. Bonificación del 5% sobre el valor final.</p>
      <p class="bp">Opción 2: Anticipo 40%, saldo por avances durante el plazo de ejecución de la obra.</p>
      <p class="bp-i">Opción financiación: consultar condiciones.</p>

      <p class="st">Validez de la oferta:</p>
      <p class="bp">Este presupuesto tiene una válidez de 5 días a partir de la fecha de emisión. La empresa se reserva el derecho de actualizar los precios, condiciones y cualquier particularidad que considere necesario de acuerdo a variaciones del mercado.</p>

      <p class="st">Plazo de ejecución de la obra:</p>
      <p class="bp">El plazo estimado para la ejecución de la obra es de tres (3) meses, contados a partir del ingreso efectivo al terreno, sujeto a la disponibilidad de materiales y proceso de fabricación.</p>

      <p class="st">Condiciones de inicio de obra:</p>
      <p class="bp">Para dar inicio a los trabajos, el cliente debe:</p>
      <p class="bullet">- Abonar el anticipo correspondiente y/o pago total.</p>
      <p class="bullet">- Asegurar el acceso libre y despejado al terreno.</p>
      <p class="bullet">- Disponer de un punto de conexión a servicios esenciales (agua, electricidad, gas, cloacas) o prever una alternativa para el suministro.</p>

      <p class="st">Consideraciones finales:</p>
      <p class="bp">Este documento es una cotización comercial y no implica un compromiso contractual. Las condiciones finales se definirán en el contrato de obra.</p>
      <p class="bp">Los precios indicados en este presupuesto no incluyen impuestos.</p>

      <p class="bp-i" style="margin-top:14px;">Quedamos a su disposición para cualquier consulta.</p>

      <div style="text-align:right;margin-top:18px;padding-right:4px;">
        <p style="font-size:8.5px;font-family:Arial;color:#555;font-style:italic;">Dirección comercial</p>
        <p style="font-size:10px;font-family:Arial;font-weight:700;color:#1C3A5C;margin-top:2px;">Amazonía SAS</p>
      </div>

    </div>
    ${renderFooter(5)}
  </div>`;
}

// ─── buildPDFPreview ──────────────────────────
// pageNum: 1–5 renders single page; 0 or omitted renders all pages
function buildPDFPreview(data, images, pageNum) {
  const wrap = (content) => `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<style>${BASE_STYLES}</style></head><body>${content}</body></html>`;

  if (pageNum && pageNum >= 1 && pageNum <= 5) {
    const builders = [null, buildPage1, buildPage2, buildPage3, buildPage4, buildPage5];
    const fn = builders[pageNum];
    if (fn) return wrap(fn(data, images));
  }

  const sep = (label) => `<div style="height:18px;background:#EAEAEA;display:flex;align-items:center;justify-content:center;border-top:1.5px dashed #C8C8C8;border-bottom:1.5px dashed #C8C8C8;">
    <span style="font-size:8.5px;color:#AAAAAA;font-family:Arial;">— ${label} —</span></div>`;

  return wrap(`
${buildPage1(data)}
${sep('Página 2')}
${buildPage2(data, images)}
${sep('Página 3')}
${buildPage3(data)}
${sep('Página 4')}
${buildPage4(data)}
${sep('Página 5')}
${buildPage5(data)}`);
}

// ─── generateAndDownloadPDF ───────────────────
async function generateAndDownloadPDF(data, images) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  const pages = [
    () => buildPage1(data),
    () => buildPage2(data, images),
    () => buildPage3(data),
    () => buildPage4(data),
    () => buildPage5(data),
  ];

  for (let i = 0; i < pages.length; i++) {
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
      <style>${BASE_STYLES}</style></head><body>${pages[i]()}</body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:794px;height:1123px;border:none;visibility:hidden;z-index:-1;';
    document.body.appendChild(iframe);
    const iDoc = iframe.contentDocument || iframe.contentWindow.document;
    iDoc.open(); iDoc.write(html); iDoc.close();

    await new Promise(resolve => {
      const check = () => {
        const imgs = iDoc.querySelectorAll('img');
        const ok = Array.from(imgs).every(img => img.complete && img.naturalWidth > 0);
        if (!imgs.length || ok) resolve(); else setTimeout(check, 150);
      };
      setTimeout(check, 700);
    });

    try {
      const el = iDoc.querySelector('.pdf-page') || iDoc.body;
      const canvas = await html2canvas(el, {
        scale: 4, useCORS: true, allowTaint: true,
        backgroundColor: '#FFFFFF', width: 794, height: 1123,
        windowWidth: 794, logging: false, imageTimeout: 20000,
      });
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, 210, 297);
    } finally {
      document.body.removeChild(iframe);
    }
  }

  const cliente = (data.apellidoNombre || 'Cliente')
    .replace(/[^a-zA-Z0-9\s\-_áéíóúÁÉÍÓÚñÑ]/g,'').replace(/\s+/g,'_').substring(0,30);
  const num = (data.numeroCotizacion || '').replace(/[\s\/]/g,'');
  pdf.save(`Cotizacion_${cliente}_${num || new Date().toISOString().slice(0,10).replace(/-/g,'')}.pdf`);
  return { success: true };
}
