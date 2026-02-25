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

const anchoImg = 220;
const altoImg = 165;

function tipoImagen(name) {
  return (name || '').toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
}

export async function generarActaWord(ubicacion, fotos) {
  const hijos = [
    new Paragraph({ text: 'Acta / Evidencia Fotográfica', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
    new Paragraph({ text: '' }),
    new Paragraph({ children: [new TextRun({ text: 'Ubicación del mantenimiento: ', bold: true }), new TextRun(ubicacion)] }),
    new Paragraph({ text: '' }),
    new Paragraph({ children: [new TextRun({ text: 'Registro de evidencias (antes / después)', bold: true })] }),
    new Paragraph({ text: '' }),
  ];

  fotos.forEach((f, i) => {
    hijos.push(
      new Paragraph({ children: [new TextRun({ text: `Evidencia ${i + 1}: ${f.name}`, bold: true })] }),
      new Paragraph({
        children: [
          new ImageRun({
            data: f.buffer,
            transformation: { width: anchoImg, height: altoImg },
            type: tipoImagen(f.name),
          }),
        ],
      }),
      new Paragraph({ text: '' })
    );
  });

  const doc = new Document({ sections: [{ children: hijos }] });
  return Packer.toBuffer(doc);
}

export async function generarActaPdf(ubicacion, fotos) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([595, 842]);
  let y = 800;

  page.drawText('Acta / Evidencia Fotográfica', { x: 150, y, size: 16, font: bold, color: rgb(0, 0, 0) });
  y -= 30;
  page.drawText(`Ubicación del mantenimiento: ${ubicacion}`, { x: 50, y, size: 11, font });
  y -= 25;
  page.drawText('Registro de evidencias (antes / después)', { x: 50, y, size: 12, font: bold });
  y -= 25;

  for (const f of fotos) {
    if (y < 220) {
      page = doc.addPage([595, 842]);
      y = 800;
    }
    page.drawText(`Evidencia: ${f.name}`, { x: 50, y, size: 10, font: bold });
    y -= 12;
    try {
      const esPng = (f.name || '').toLowerCase().endsWith('.png');
      const img = esPng ? await doc.embedPng(f.buffer) : await doc.embedJpg(f.buffer);
      const escala = Math.min(220 / img.width, 165 / img.height);
      page.drawImage(img, { x: 50, y: y - 165, width: img.width * escala, height: img.height * escala });
      y -= 185;
    } catch (_) {
      page.drawText(`[Imagen no válida: ${f.name}]`, { x: 50, y: y - 10, size: 9, font });
      y -= 25;
    }
  }

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
