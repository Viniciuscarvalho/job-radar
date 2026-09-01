const escapePdf = value => String(value || '').replace(/[\\()]/g, '\\$&').replace(/[^\x20-\x7E]/g, '?');
const wrap = (value, width = 88) => String(value || '').match(new RegExp(`.{1,${width}}(?:\\s|$)|\\S+?(?:\\s|$)`, 'g')) || [''];

function createPdfBuffer({ title, lines }) {
  const contentLines = [String(title || 'Job Radar'), '', ...(lines || []).flatMap(line => wrap(line))].slice(0, 180);
  const stream = ['BT', '/F1 12 Tf', '72 760 Td', ...contentLines.flatMap((line, index) => index ? [`0 -16 Td (${escapePdf(line)}) Tj`] : [`(${escapePdf(line)}) Tj`]), 'ET'].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let output = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(output)); output += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(output, 'utf8');
}

module.exports = { createPdfBuffer };
