const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, ShadingType, AlignmentType, BorderStyle, VerticalAlign,
} = require('docx');

const GREEN = '1B5E20';
const GREY = '555555';
const LINE = 'B0B0B0';

const OWNERSHIP_LABELS = {
  mwenyewe: 'Mmiliki Mwenyewe wa Eneo',
  pango: 'Amepanga (Mkataba wa Pango)',
};

function val(value, fallback = '_______________') {
  const str = String(value ?? '').trim();
  return str || fallback;
}

function normalizeNida(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function cellText(label, width, opts = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    shading: opts.shaded ? { type: ShadingType.CLEAR, color: 'auto', fill: 'F2F2F2' } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: LINE },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: LINE },
      left: { style: BorderStyle.SINGLE, size: 2, color: LINE },
      right: { style: BorderStyle.SINGLE, size: 2, color: LINE },
    },
    children: [
      new Paragraph({
        children: [new TextRun({ text: label, bold: !!opts.bold, size: 20, color: opts.color || '222222' })],
      }),
    ],
  });
}

function fieldRow(label, value, labelWidth, valueWidth) {
  return new TableRow({
    children: [
      cellText(label, labelWidth, { shaded: true, bold: true }),
      cellText(value, valueWidth),
    ],
  });
}

function sectionHeading(text) {
  return new Paragraph({
    spacing: { before: 320, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GREEN } },
    children: [new TextRun({ text, bold: true, size: 22, color: GREEN, allCaps: true })],
  });
}

function sigLine(label) {
  return [
    new Paragraph({
      spacing: { before: 480 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '888888' } },
      children: [new TextRun({ text: ' ', size: 22 })],
    }),
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: label, size: 18, color: GREY })] }),
  ];
}

async function buildPremiseDocxBuffer(client) {
  const ownership = client.premise_ownership || '';
  const isLease = ownership === 'pango';
  const letterhead = client.premise_ward
    ? `OFISI YA MTENDAJI WA KATA YA ${String(client.premise_ward).toUpperCase()}`
    : '[JINA LA OFISI / SERIKALI YA MTAA AU KIJIJI]';
  const letterheadSub = client.premise_district
    ? `Halmashauri ya ${val(client.premise_district)}, Mkoa wa ${val(client.premise_region, '[Mkoa]')}`
    : '[Anuani ya Ofisi — S.L.P, Mtaa, Kata, Wilaya, Mkoa]';

  const children = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: letterhead, bold: true, size: 26 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: letterheadSub, size: 18, color: GREY })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: '[Simu: 0XXX XXX XXX   |   Barua pepe: ofisi@mfano.go.tz]', size: 18, color: GREY })] }),
    new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: GREEN } }, spacing: { after: 200 }, children: [new TextRun({ text: ' ', size: 4 })] }),
    new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Kumb. Na: ', bold: true, size: 20 }), new TextRun({ text: '[Namba ya Kumbukumbu]', size: 20, color: GREY })] }),
    new Paragraph({ spacing: { after: 260 }, children: [new TextRun({ text: 'Tarehe: ', bold: true, size: 20 }), new TextRun({ text: new Date().toLocaleDateString('sw-TZ', { year: 'numeric', month: 'long', day: 'numeric' }), size: 20 })] }),
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'Kwa Wanaohusika,', size: 20 })] }),
    new Paragraph({ spacing: { after: 260 }, children: [new TextRun({ text: '[Mfano: Wakala wa Usajili wa Biashara na Leseni (BRELA) / Ofisi ya Leseni — Halmashauri]', size: 18, color: GREY, italics: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: 'YAH: UTHIBITISHO WA MAHALI/ENEO LA KUFANYIA BIASHARA', bold: true, underline: {}, size: 22 })] }),
    new Paragraph({ spacing: { after: 200 }, alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: 'Husika na kichwa cha habari hapo juu, Ofisi hii inathibitisha kuwa mhusika aliyetajwa hapa chini anamiliki/anafanya biashara katika eneo lililoainishwa, kama inavyoonekana kwenye taarifa zifuatazo:', size: 20 })] }),
    sectionHeading('A. Taarifa za Mfanyabiashara'),
    new Table({ width: { size: 9350, type: WidthType.DXA }, columnWidths: [3000, 6350], rows: [
      fieldRow('Jina Kamili la Mfanyabiashara', val(client.full_name), 3000, 6350),
      fieldRow('Namba ya Kitambulisho (NIDA)', val(normalizeNida(client.nida_number)), 3000, 6350),
      fieldRow('Namba ya Simu', val(client.phone_number), 3000, 6350),
      fieldRow('Aina ya Biashara', val(client.business_type), 3000, 6350),
    ]}),
    sectionHeading('B. Maelezo ya Eneo/Mahali pa Biashara'),
    new Table({ width: { size: 9350, type: WidthType.DXA }, columnWidths: [3000, 6350], rows: [
      fieldRow('Mkoa', val(client.premise_region), 3000, 6350),
      fieldRow('Wilaya / Halmashauri', val(client.premise_district), 3000, 6350),
      fieldRow('Kata', val(client.premise_ward), 3000, 6350),
      fieldRow('Mtaa / Kijiji', val(client.premise_street), 3000, 6350),
      fieldRow('Namba ya Kiwanja / Jengo', val(client.premise_plot_number, '-'), 3000, 6350),
      fieldRow('Umiliki wa Eneo', val(OWNERSHIP_LABELS[ownership], '[Mmiliki mwenyewe / Amepanga]'), 3000, 6350),
    ]}),
  ];

  if (isLease) {
    children.push(sectionHeading('C. Taarifa za Mmiliki wa Jengo/Eneo (Pango)'), new Table({
      width: { size: 9350, type: WidthType.DXA }, columnWidths: [3000, 6350], rows: [
        fieldRow('Jina la Mmiliki wa Jengo', val(client.landlord_name), 3000, 6350),
        fieldRow('Namba ya Simu ya Mmiliki', val(client.landlord_phone), 3000, 6350),
        fieldRow('Muda wa Mkataba wa Pango', val(client.lease_period), 3000, 6350),
      ],
    }));
  }

  children.push(
    new Paragraph({ spacing: { before: 260 }, alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: 'Uthibitisho huu umetolewa kwa madhumuni ya usajili/uhuishaji wa Leseni ya Biashara na taratibu nyingine za kisheria zinazohusiana na biashara husika. Endapo taarifa zilizoainishwa hapo juu zitabainika kuwa si sahihi, Ofisi hii haitawajibika na matokeo yatokanayo na hilo.', size: 20 })] }),
    sectionHeading('Uthibitisho na Sahihi'),
    ...sigLine(isLease ? 'Sahihi ya Mmiliki wa Jengo/Eneo — Jina, Tarehe' : 'Sahihi ya Mfanyabiashara — Jina, Tarehe'),
    ...sigLine('Sahihi ya Afisa Mtendaji wa Mtaa/Kijiji — Jina, Wadhifa, Tarehe'),
    ...sigLine('Muhuri Rasmi wa Ofisi'),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '— Mwisho wa Hati —', italics: true, size: 16, color: GREY })] }),
  );

  const doc = new Document({ sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 900, bottom: 900, left: 1100, right: 1100 } } }, children }] });
  return Packer.toBuffer(doc);
}

module.exports = { buildPremiseDocxBuffer };
