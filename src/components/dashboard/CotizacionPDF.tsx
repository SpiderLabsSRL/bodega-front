// CotizacionPDF.tsx
// Generador de PDF para la cotización — usa html2canvas + jsPDF

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface CotizacionItemPDF {
  id: string | number;
  name: string;
  category?: string;
  stock?: number;
  price: number;
  cantidad: number;
  imagen?: string;
}

export interface DatosClientePDF {
  nombre: string;
  telefono: string;
  direccion?: string;
  tipoPago?: "contra-entrega" | "pago-adelantado" | "mitad-adelanto" | "";
  vigencia?: number;
  descuento?: number;
}

export interface GeneratePDFParams {
  datosCliente: DatosClientePDF;
  items: CotizacionItemPDF[];
  subtotal: number;
  descuentoTotal: number;
  totalFinal: number;
  fecha?: string;
  logoUrl?: string;
  fileName?: string;
}

/**
 * SVG del icono de WhatsApp
 */
const WhatsappIconSVG = ({ className = "whatsapp-svg", color = "#25D366" }) => `
  <svg class="${className}" viewBox="0 0 24 24" fill="${color}" style="display: block; flex-shrink: 0;">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893c0-3.189-1.248-6.189-3.515-8.464"/>
  </svg>
`;

/**
 * generateCotizacionPDF
 */
export async function generateCotizacionPDF(params: GeneratePDFParams): Promise<void> {
  const {
    datosCliente,
    items,
    subtotal,
    descuentoTotal,
    totalFinal,
    fecha = new Date().toLocaleDateString("es-BO"),
    logoUrl = "/lovable-uploads/84af3e7f-9171-4c73-900f-9499a9673234.png",
    fileName = "cotizacion.pdf"
  } = params;

  const esContraEntrega = datosCliente.tipoPago === "contra-entrega";
  const abono = 0;
  const saldo = totalFinal;

const wrapper = document.createElement("div");
wrapper.style.position = "fixed";
wrapper.style.left = "-9999px";
wrapper.style.top = "0";

wrapper.style.width = "780px";
wrapper.style.height = "1110px";

wrapper.style.padding = "12px";
wrapper.style.boxSizing = "border-box";

wrapper.style.backgroundColor = "#ffffff";
wrapper.style.fontFamily = "Inter, Helvetica Neue, Arial, sans-serif";

wrapper.style.display = "flex";
wrapper.style.flexDirection = "column";

wrapper.id = "cotizacion-pdf-wrapper";

  const style = document.createElement("style");
  style.textContent = `
    .pdf-container-media-carta {
      width: 100%;
      max-width: 100%;
      height: 100%;
      margin: 0 auto;
      background: white;
      position: relative;
      display: flex;
      flex-direction: column;
    }
    .watermark-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
    }
    .watermark-logo {
      opacity: 0.2;
      width: 50%;
      max-width: 250px;
      height: auto;
      object-fit: contain;
    }
    .cabecera-cotizacion-media {
      text-align: right;
      margin-bottom: 8px;
      position: relative;
      z-index: 1;
    }
    .logo-cabecera-media {
      height: 75px;
      object-fit: contain;
      display: block;
      margin-left: auto;
      margin-bottom: 8px;
    }
    .info-contacto-media {
      text-align: right;
    }
    .direccion-media {
      font-size: 11px;
      color: #000;
      font-weight: 500;
      margin: 0 0 4px 0;
    }
    .whatsapp-info-media {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
    }
    .whatsapp-svg-media {
      width: 14px;
      height: 14px;
    }
    .telefonos-media {
      font-size: 11px;
      color: #000;
      font-weight: 500;
    }
    .titulo-productos-media {
      font-size: 20px;
      font-weight: 700;
      color: #0f5560;
      margin: 0 0 12px 0;
      position: relative;
      z-index: 1;
    }
    .card-media {
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      overflow: hidden;
      margin-bottom: 8px;
      position: relative;
      z-index: 1;
      background: white;
    }
    .table-media {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      color: #0f3b43;
      background: white;
    }
    .table-media th,
    .table-media td {
      padding: 10px 12px;
      border-bottom: 1px solid #e6edf0;
      vertical-align: middle;
      background: inherit;
    }
    .table-media thead th {
      background: #f9fafb;
      font-weight: 700;
      text-align: left;
      color: #0f5560;
    }
    .items-table-media .qty {
      text-align: center;
      width: 70px;
    }
    .items-table-media .unit,
    .items-table-media .total {
      text-align: right;
      width: 110px;
    }
    .product-image-media {
      width: 55px;
      height: 55px;
      object-fit: cover;
      border-radius: 4px;
    }
    .product-name-media {
      font-weight: 600;
      color: #0f3b43;
      margin: 0;
      font-size: 13px;
    }
    .content-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .resumen-container {
      display: flex;
      justify-content: flex-end;
      margin-top: auto;
      margin-bottom: 0;
      position: relative;
      z-index: 1;
    }
    .resumen-card {
      width: 280px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      overflow: hidden;
      background: white;
    }
    .resumen-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .resumen-table td {
      padding: 8px 12px;
    }
    .resumen-label {
      font-weight: 600;
      color: #0f5560;
    }
    .resumen-value {
      text-align: right;
      color: #0f3b43;
    }
    .resumen-total {
      border-top: 2px solid #000;
    }
    .resumen-total td {
      padding: 10px 12px;
      font-weight: 700;
      font-size: 14px;
      color: #0f5560;
    }
    .resumen-total .resumen-value {
      font-weight: 700;
      color: #0f3b43;
    }
    .descuento-row .resumen-label,
    .descuento-row .resumen-value {
      color: #dc2626;
    }
    .abono-row .resumen-label,
    .abono-row .resumen-value {
      color: #137f46;
    }
    .saldo-row .resumen-label,
    .saldo-row .resumen-value {
      color: #c84b00;
    }
    .small-media {
      font-size: 10px;
    }
  `;

  // Construir filas de productos
  const productRows = items.map(item => {
    const total = (item.price || 0) * (item.cantidad || 0);
    const imagenSrc = item.imagen || "";
    
    return `
      <tr>
        <td style="width: 55px;">
          ${imagenSrc ? `
            <img src="${imagenSrc}" class="product-image-media" alt="${escapeHtml(item.name)}" 
                 onerror="this.src='https://via.placeholder.com/40x40/f3f4f6/000000?text=No+img'" />
          ` : `
            <div style="width: 40px; height: 40px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 9px; color: #9ca3af;">Sin img</span>
            </div>
          `}
        </td>
        <td colspan="2">
          <p class="product-name-media">${escapeHtml(item.name)}</p>
        </td>
        <td class="qty">${escapeHtml(String(item.cantidad))}</td>
        <td class="unit">Bs ${formatNumber(item.price)}</td>
        <td class="total">Bs ${formatNumber(total)}</td>
      </tr>
    `;
  }).join("");

  // Construir resumen
  let resumenTableHTML = `
    <table class="resumen-table">
      <tbody>
        <tr>
          <td class="resumen-label">Subtotal:</td>
          <td class="resumen-value">Bs ${formatNumber(subtotal)}</td>
        </tr>
  `;

  if (descuentoTotal > 0) {
    resumenTableHTML += `
        <tr class="descuento-row">
          <td class="resumen-label">Descuento:</td>
          <td class="resumen-value">-Bs ${formatNumber(descuentoTotal)}</td>
        </tr>
    `;
  }

  resumenTableHTML += `
        <tr class="resumen-total">
          <td class="resumen-label">Total:</td>
          <td class="resumen-value">Bs ${formatNumber(totalFinal)}</td>
        </tr>
  `;

  if (!esContraEntrega) {
    resumenTableHTML += `
        <tr class="abono-row">
          <td class="resumen-label">Abono:</td>
          <td class="resumen-value">Bs ${formatNumber(abono)}</td>
        </tr>
        <tr class="saldo-row">
          <td class="resumen-label">Saldo:</td>
          <td class="resumen-value">Bs ${formatNumber(saldo)}</td>
        </tr>
    `;
  }

  resumenTableHTML += `
      </tbody>
    </table>
  `;

  const tablaDatosCliente = `
    <div class="card-media">
      <table class="table-media">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Teléfono</th>
            <th>Dirección</th>
            <th>Tipo de Pago</th>
            <th>Vigencia</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="small-media">${escapeHtml(fecha)}</td>
            <td class="small-media">${escapeHtml(datosCliente.nombre || "")}</td>
            <td class="small-media">${escapeHtml(datosCliente.telefono || "")}</td>
            <td class="small-media">${escapeHtml(datosCliente.direccion || "")}</td>
            <td class="small-media">${formatTipoPago(datosCliente.tipoPago)}</td>
            <td class="small-media">${(datosCliente.vigencia ?? 0)} días</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  const tablaProductos = `
    <div class="card-media">
      <table class="table-media items-table-media">
        <thead>
          <tr>
            <th style="width: 55px;">Imagen</th>
            <th colspan="2">Producto</th>
            <th class="qty">Cantidad</th>
            <th class="unit">Valor Unitario</th>
            <th class="total">Valor Total</th>
          </tr>
        </thead>
        <tbody>
          ${productRows}
        </tbody>
      </table>
    </div>
  `;

  const resumenHTML = `
    <div class="resumen-container">
      <div class="resumen-card">
        ${resumenTableHTML}
      </div>
    </div>
  `;

  const cabeceraHTML = `
    <div class="cabecera-cotizacion-media">
      <img src="${logoUrl}" class="logo-cabecera-media" alt="NEOLED Logo" 
           onerror="this.src='https://via.placeholder.com/120x55/f3f4f6/000000?text=NEOLED'" />
      <div class="info-contacto-media">
        <p class="direccion-media">Av. Heroinas esq. Hamiraya #316</p>
        <div class="whatsapp-info-media">
          ${WhatsappIconSVG({ className: "whatsapp-svg-media", color: "#25D366" })}
          <span class="telefonos-media">77918672 - 77950297</span>
        </div>
      </div>
    </div>
  `;

  const watermarkHTML = `
    <div class="watermark-container">
      <img src="${logoUrl}" class="watermark-logo" alt="Watermark" />
    </div>
  `;

  wrapper.appendChild(style);
  const contentDiv = document.createElement("div");
  contentDiv.className = "pdf-container-media-carta";
  contentDiv.innerHTML = `
    ${watermarkHTML}
    <div class="content-wrapper">
      ${cabeceraHTML}
      <h2 class="titulo-productos-media">Productos Cotizados</h2>
      ${tablaDatosCliente}
      ${tablaProductos}
      ${resumenHTML}
    </div>
  `;
  wrapper.appendChild(contentDiv);

  document.body.appendChild(wrapper);

  try {
    const node = wrapper;
    const canvas = await html2canvas(node, {
      scale: 3,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: "#ffffff"
    });

    const imgData = canvas.toDataURL("image/png");
    
    // Tamaño media carta: 216mm x 139.7mm
    // En puntos: ancho 396, alto 612
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: [396, 612]
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
  const ratio = Math.min(
  (pdfWidth - 4) / imgWidth,
  (pdfHeight - 4) / imgHeight
);

const finalWidth = imgWidth * ratio;
const finalHeight = imgHeight * ratio;

const x = (pdfWidth - finalWidth) / 2;
const y = 2;

pdf.addImage(
  imgData,
  "PNG",
  x,
  y,
  finalWidth,
  finalHeight,
  undefined,
  "FAST"
);
    pdf.save(fileName);
  } catch (err) {
    console.error("Error generando PDF:", err);
    throw err;
  } finally {
    if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
  }
}

/* Helpers */
function formatNumber(v: number) {
  const x = Math.abs(v) < 0.005 ? 0 : v;
  return x.toFixed(2);
}

function escapeHtml(str?: string) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatTipoPago(tp?: string) {
  if (!tp) return "";
  if (tp === "contra-entrega") return "Contra Entrega";
  if (tp === "pago-adelantado") return "Pago por Adelantado";
  if (tp === "mitad-adelanto") return "Mitad de Adelanto";
  return tp;
}