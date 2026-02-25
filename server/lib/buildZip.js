import archiver from 'archiver';
import { generarReporteWord, generarReportePdf } from './reporte.js';
import { generarActaWord, generarActaPdf } from './acta.js';

export async function buildZipBuffer(ubicacion, descripcion, fotos) {
  const [reporteDocx, reportePdf, actaDocx, actaPdf] = await Promise.all([
    generarReporteWord(ubicacion, descripcion, fotos),
    generarReportePdf(ubicacion, descripcion, fotos),
    generarActaWord(ubicacion, fotos),
    generarActaPdf(ubicacion, fotos),
  ]);

  return new Promise((resolve, reject) => {
    const chunks = [];
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
    archive.append(reporteDocx, { name: 'Reporte_Mantenimiento.docx' });
    archive.append(reportePdf, { name: 'Reporte_Mantenimiento.pdf' });
    archive.append(actaDocx, { name: 'Acta_Evidencia_Fotografica.docx' });
    archive.append(actaPdf, { name: 'Acta_Evidencia_Fotografica.pdf' });
    archive.finalize();
  });
}
