import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
  AlignmentType,
} from 'docx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const anchoImg = 200;
const altoImg = 150;

function tipoImagen(name) {
  const ext = (name || '').toLowerCase().split('.').pop();
  if (ext === 'png') return 'png';
  return 'jpeg';
}

export async function generarReporteWord(ubicacion, descripcion, fotos) {
  const hijos = [
    new Paragraph({ text: 'Reporte de Mantenimiento Correctivo', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
    new Paragraph({ text: '' }),
    new Paragraph({ children: [new TextRun({ text: 'Ubicación: ', bold: true }), new TextRun(ubicacion)] }),
    new Paragraph({ text: '' }),
    new Paragraph({ children: [new TextRun({ text: 'Descripción del trabajo realizado:', bold: true })] }),
    new Paragraph({ children: [new TextRun(descripcion)] }),
    new Paragraph({ text: '' }),
    new Paragraph({ children: [new TextRun({ text: 'Evidencia fotográfica', bold: true })] }),
  ];

  for (const f of fotos) {
    hijos.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: f.buffer,
            transformation: { width: anchoImg, height: altoImg },
            type: tipoImagen(f.name),
          }),
        ],
      }),
      new Paragraph({ text: `Foto: ${f.name}` }),
      new Paragraph({ text: '' })
    );
  }

  const doc = new Document({
    sections: [{ children: hijos }],
  });
  return Packer.toBuffer(doc);
}

export async function generarReportePdf(ubicacion, descripcion, fotos) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([595, 842]);
  let y = 800;

  const dibujarTexto = (texto, esBold = false) => {
    const f = esBold ? bold : font;
    const lineas = texto.split('\n');
    for (const linea of lineas) {
      if (y < 80) {
        page = doc.addPage([595, 842]);
        y = 800;
      }
      page.drawText(linea || ' ', { x: 50, y, size: 11, font: f, color: rgb(0, 0, 0) });
      y -= 14;
    }
  };

  dibujarTexto('Reporte de Mantenimiento Correctivo', true);
  y -= 10;
  dibujarTexto(`Ubicación: ${ubicacion}`);
  dibujarTexto('');
  dibujarTexto('Descripción del trabajo realizado:', true);
  dibujarTexto(descripcion);
  dibujarTexto('');
  dibujarTexto('Evidencia fotográfica', true);

  for (const f of fotos) {
    y -= 10;
    if (y < 250) {
      page = doc.addPage([595, 842]);
      y = 800;
    }
    try {
      const esPng = (f.name || '').toLowerCase().endsWith('.png');
      const img = esPng ? await doc.embedPng(f.buffer) : await doc.embedJpg(f.buffer);
      const escala = Math.min(200 / img.width, 150 / img.height);
      page.drawImage(img, { x: 50, y: y - 150, width: img.width * escala, height: img.height * escala });
      page.drawText(f.name, { x: 50, y: y - 160, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
      y -= 170;
    } catch (_) {
      page.drawText(`[Imagen: ${f.name}]`, { x: 50, y, size: 10, font });
      y -= 14;
    }
  }

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
