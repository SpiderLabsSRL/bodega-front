import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Venta } from "@/api/VentasApi";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface GenerateVentaPDFParams {
  venta: Venta;
  nombreCliente: string;
  fileName?: string;
}

/**
 * generateVentaPDF
 * - Crea un PDF del detalle de venta que se ve exactamente igual al diálogo de impresión
 * - Retorna una Promise que se resuelve tras descargar el PDF
 * - Utiliza tamaño MEDIA CARTA (Half Letter: 216mm x 139.7mm / 8.5" x 5.5")
 */
export async function generateVentaPDF(params: GenerateVentaPDFParams): Promise<void> {
  const {
    venta,
    nombreCliente,
    fileName = `Venta_${venta.id}_${nombreCliente.replace(/\s+/g, '_')}.pdf`
  } = params;

  // 1) Crear el contenedor offscreen
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-9999px";
  wrapper.style.top = "0";

  wrapper.style.width = "720px";
  wrapper.style.height = "1110px";

  wrapper.style.padding = "20px";
  wrapper.style.boxSizing = "border-box";

  wrapper.style.background = "#ffffff";
  wrapper.style.fontFamily = "Arial, sans-serif";

  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";

  wrapper.id = "venta-pdf-wrapper";

  // 2) Construir HTML idéntico al diálogo de impresión con marca de agua
  const fechaFormateada = format(venta.fecha, "dd/MM/yyyy HH:mm", { locale: es });

  wrapper.innerHTML = `
<style>
  .venta-watermark-container {
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
  .venta-watermark-logo {
    opacity: 0.2;
    width: 50%;
    max-width: 250px;
    height: auto;
    object-fit: contain;
  }
  .venta-content-container {
    position: relative;
    z-index: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
</style>

<div style="position: relative; height: 100%;">
  <div class="venta-watermark-container">
    <img
      src="/lovable-uploads/84af3e7f-9171-4c73-900f-9499a9673234.png"
      class="venta-watermark-logo"
      alt="Watermark"
    />
  </div>

  <div class="venta-content-container">
    <div style="text-align:center;margin-bottom:12px;">
      <img
        src="/lovable-uploads/84af3e7f-9171-4c73-900f-9499a9673234.png"
        alt="NEOLED Logo"
        style="height:70px;display:block;margin:0 auto;"
        onerror="this.src='https://via.placeholder.com/120x50/f3f4f6/000000?text=NEOLED+Logo'"
      />
    </div>

    <div
      style="
        margin-bottom:14px;
        line-height:1.6;
        font-size:13px;
      "
    >
      <p style="margin:0 0 6px 0;">
        <strong>Cliente:</strong> ${escapeHtml(nombreCliente)}
      </p>

      <p style="margin:0 0 6px 0;">
        <strong>Fecha:</strong> ${escapeHtml(fechaFormateada)}
      </p>

      <p style="margin:0 0 6px 0;">
        <strong>Dirección:</strong> Av. Heroinas esq. Hamiraya #316
      </p>

      <p style="margin:0;">
        <strong>Números:</strong> 77950297 - 77918672
      </p>
    </div>

    <div
      style="
        flex:1;
        display:flex;
        flex-direction:column;
        justify-content:space-between;
      "
    >
      <div style="flex:1;">
        <table
          style="
            width:100%;
            border-collapse:collapse;
            font-size:12px;
            background: white;
          "
        >
          <thead>
            <tr style="border-bottom:2px solid #e5e7eb;">
              <th style="padding:10px;text-align:left;background:#f8fafc;">
                Producto
              </th>

              <th style="padding:10px;text-align:right;background:#f8fafc;">
                Precio
              </th>

              <th style="padding:10px;text-align:center;background:#f8fafc;">
                Cantidad
              </th>

              <th style="padding:10px;text-align:right;background:#f8fafc;">
                Total
              </th>
            </tr>
          </thead>

          <tbody>
            ${venta.detalle.map(item => `
              <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:10px;">
                  ${escapeHtml(item.producto)}
                </td>

                <td style="padding:10px;text-align:right;">
                  Bs ${item.precio_unitario.toFixed(2)}
                </td>

                <td style="padding:10px;text-align:center;">
                  ${item.cantidad}
                </td>

                <td style="padding:10px;text-align:right;">
                  Bs ${(item.precio_unitario * item.cantidad).toFixed(2)}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>

      <div
        style="
          width:280px;
          margin-left:auto;
          margin-top:20px;
        "
      >
        <table
          style="
            width:100%;
            border-collapse:collapse;
            font-size:12px;
            background: white;
          "
        >
          <tbody>
            <tr>
              <td style="padding:8px;font-weight:600;">
                Subtotal:
              </td>

              <td style="padding:8px;text-align:right;">
                Bs ${venta.subtotal.toFixed(2)}
              </td>
            </tr>

            <tr>
              <td style="padding:8px;font-weight:600;">
                Descuento:
              </td>

              <td style="padding:8px;text-align:right;">
                Bs ${venta.descuento.toFixed(2)}
              </td>
            </tr>

            <tr style="border-top:2px solid #000;">
              <td
                style="
                  padding:10px;
                  font-weight:700;
                  font-size:14px;
                "
              >
                Total:
              </td>

              <td
                style="
                  padding:10px;
                  text-align:right;
                  font-weight:700;
                  font-size:14px;
                "
              >
                Bs ${venta.total.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      style="
        margin-top:16px;
        padding-top:12px;
        border-top:1px solid #e5e7eb;
        text-align:center;
      "
    >
      <p
        style="
          color:#6b7280;
          font-size:11px;
          margin:0;
        "
      >
        Gracias por su preferencia
      </p>
    </div>
  </div>
</div>
`;

  document.body.appendChild(wrapper);

  try {
    // Renderizar a canvas con html2canvas
    const node = wrapper;
    const scale = 2; // mejora calidad en pdf

    const canvas = await html2canvas(node, {
      scale: scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowWidth: node.scrollWidth,
      windowHeight: node.scrollHeight,
      backgroundColor: "#ffffff"
    });

    // Convertir a PDF
    const imgData = canvas.toDataURL("image/png");

    // Tamaño MEDIA CARTA (Half Letter)
    // En orientación portrait: 139.7mm x 216mm
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [139.7, 216] // Media Carta: ancho 139.7mm, alto 216mm
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();  // 139.7mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 216mm

    // Calcular dimensiones manteniendo ratio
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Calcular la relación de aspecto para que quepa en la página Media Carta
    const ratio = Math.min(
      (pdfWidth - 4) / imgWidth,
      (pdfHeight - 4) / imgHeight
    );

    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 2;

    // Agregar la imagen al PDF
    pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);

    // Guardar el PDF
    pdf.save(fileName);

  } catch (err) {
    console.error("Error generando PDF de venta:", err);
    throw err;
  } finally {
    // Limpiar el wrapper del DOM
    if (wrapper && wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
  }
}

/* ---------- Helper Functions ---------- */

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}