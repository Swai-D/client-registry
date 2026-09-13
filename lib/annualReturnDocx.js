const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, VerticalAlign, ShadingType,
} = require('docx');

const LINE = '999999';
const FULL_WIDTH = 9350;

function val(value, fallback = '') {
  const str = String(value ?? '').trim();
  return str || fallback;
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function borders() {
  return {
    top: { style: BorderStyle.SINGLE, size: 2, color: LINE },
    bottom: { style: BorderStyle.SINGLE, size: 2, color: LINE },
    left: { style: BorderStyle.SINGLE, size: 2, color: LINE },
    right: { style: BorderStyle.SINGLE, size: 2, color: LINE },
  };
}

function cell(text, width, opts = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    columnSpan: opts.span || undefined,
    shading: opts.shaded ? { type: ShadingType.CLEAR, color: 'auto', fill: 'F2F2F2' } : undefined,
    borders: borders(),
    children: [new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: String(text ?? ''), bold: !!opts.bold, size: 20, italics: !!opts.italics })],
    })],
  });
}

function labelValueRow(label, value, labelWidth = 3200, valueWidth = FULL_WIDTH - 3200) {
  return new TableRow({ children: [cell(label, labelWidth, { shaded: true, bold: true }), cell(val(value), valueWidth)] });
}

function heading(text) {
  return new Paragraph({
    spacing: { before: 260, after: 100 },
    children: [new TextRun({ text, bold: true, size: 21 })],
  });
}

function centerLine(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: opts.after ?? 40 },
    children: [new TextRun({ text, bold: !!opts.bold, size: opts.size || 22 })],
  });
}

/**
 * Build a filled Form 131 (BRELA Annual Return of a Company) docx buffer.
 * @param {object} company - row from company_clients
 * @param {object[]} directors - rows from company_directors, ordered
 * @param {object[]} members - rows from company_members, ordered
 * @param {object} returnRecord - row from company_returns (return_date, status, ...)
 * @param {object} opts - { noChangesInPeriod: boolean, fullListEnclosed: boolean }
 */
async function buildAnnualReturnDocxBuffer(company, directors, members, returnRecord, opts = {}) {
  const noChanges = opts.noChangesInPeriod !== false; // default true
  const fullListEnclosed = opts.fullListEnclosed !== false; // default true

  const children = [
    centerLine('FORM 131', { bold: true, size: 22, after: 120 }),
    centerLine('THE UNITED REPUBLIC OF TANZANIA', { bold: true }),
    centerLine('BUSINESS REGISTRATIONS AND LICENSING AGENCY', { bold: true }),
    centerLine('ANNUAL RETURN OF A COMPANY', { bold: true, after: 160 }),
    new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: 'To the Registrar of Companies', size: 20 })] }),

    new Table({ width: { size: FULL_WIDTH, type: WidthType.DXA }, columnWidths: [3200, FULL_WIDTH - 3200], rows: [
      labelValueRow('Company Number', company.company_number),
      labelValueRow('Company Name (Full Name)', company.company_name),
      labelValueRow('The information in this return is made up to', formatDate(returnRecord.return_date)),
      labelValueRow('Address of registered office of Company', company.registered_office),
      labelValueRow('Company type', company.company_type),
      labelValueRow('Principal business activities', company.principal_activities),
      labelValueRow('Register of members kept at', company.register_of_members_location || 'At Registered Office'),
      labelValueRow('Register of debenture holders kept at', company.register_of_debenture_location || 'N/A'),
    ]}),

    heading('Company Secretary'),
    new Table({ width: { size: FULL_WIDTH, type: WidthType.DXA }, columnWidths: [3200, FULL_WIDTH - 3200], rows: [
      labelValueRow('Name', company.secretary_name),
      labelValueRow('Previous name(s)', company.secretary_previous_name || 'None'),
      labelValueRow('Address', company.secretary_address),
    ]}),

    heading('Directors'),
  ];

  directors.forEach((d, i) => {
    children.push(new Table({
      width: { size: FULL_WIDTH, type: WidthType.DXA },
      columnWidths: [2600, 2075, 2300, 2375],
      rows: [
        new TableRow({ children: [
          cell('Name', 2600, { shaded: true, bold: true }), cell(val(d.full_name), 2075),
          cell('Business occupation', 2300, { shaded: true, bold: true }), cell(val(d.business_occupation), 2375),
        ]}),
        new TableRow({ children: [
          cell('Previous name(s)', 2600, { shaded: true, bold: true }), cell(val(d.previous_name, 'None'), 2075),
          cell('Nationality', 2300, { shaded: true, bold: true }), cell(val(d.nationality, 'Mtanzania'), 2375),
        ]}),
        new TableRow({ children: [
          cell('Address', 2600, { shaded: true, bold: true }), cell(val(d.address), 2075),
          cell('Date of birth', 2300, { shaded: true, bold: true }), cell(val(d.date_of_birth, 'N/A'), 2375),
        ]}),
        new TableRow({ children: [
          cell('Other relevant past or present directorships', 2600, { shaded: true, bold: true, span: 1 }),
          cell(val(d.other_directorships, 'None'), 6750, { span: 3 }),
        ]}),
      ],
    }));
    if (i < directors.length - 1) children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  });

  children.push(
    heading('Issued Share Capital'),
    new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: 'Enter details of all the shares in issue at the date of the return:', size: 20 })] }),
    new Table({ width: { size: FULL_WIDTH, type: WidthType.DXA }, columnWidths: [3117, 3117, 3116], rows: [
      new TableRow({ children: [
        cell('Class', 3117, { shaded: true, bold: true, center: true }),
        cell('Number of shares issued', 3117, { shaded: true, bold: true, center: true }),
        cell('Aggregate nominal value (TZS)', 3116, { shaded: true, bold: true, center: true }),
      ]}),
      new TableRow({ children: [
        cell(company.share_class || '1  Ordinary', 3117, { center: true }),
        cell(company.shares_issued, 3117, { center: true }),
        cell(company.share_nominal_value, 3116, { center: true }),
      ]}),
      new TableRow({ children: [
        cell('Total', 3117, { bold: true, center: true }),
        cell(company.shares_issued, 3117, { bold: true, center: true }),
        cell(company.share_nominal_value, 3116, { bold: true, center: true }),
      ]}),
    ]}),

    heading('List of Past and Present Members'),
    new Paragraph({ spacing: { after: 40 }, children: [new TextRun({
      text: `[${noChanges ? 'X' : ' '}] There were no changes in the period    [${!noChanges ? 'X' : ' '}] A list of changes is enclosed    [${fullListEnclosed ? 'X' : ' '}] A full list of members is enclosed`,
      size: 19,
    })] }),

    new Paragraph({ spacing: { before: 200, after: 200 }, children: [new TextRun({
      text: 'I certify that the information given in this return is true to the best of my knowledge and belief.',
      size: 20,
    })] }),
    new Paragraph({ spacing: { after: 40 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '888888' } }, children: [new TextRun({ text: ' ', size: 22 })] }),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Signed: _______________________________   Date: _______________________   (Director / Secretary)', size: 18, color: '555555' })] }),

    heading('Names and Addresses of Members'),
    new Table({ width: { size: FULL_WIDTH, type: WidthType.DXA }, columnWidths: [700, 8650], rows: [
      new TableRow({ children: [cell('#', 700, { shaded: true, bold: true, center: true }), cell('Name and Address', 8650, { shaded: true, bold: true })] }),
      ...members.map((m, i) => new TableRow({ children: [
        cell(String(i + 1), 700, { center: true }),
        cell(`${val(m.full_name)}${m.address ? ': ' + m.address : ''}`, 8650),
      ]})),
    ]}),

    heading('Shareholding and Transfers'),
    new Table({ width: { size: FULL_WIDTH, type: WidthType.DXA }, columnWidths: [700, 2000, 2100, 2225, 2325], rows: [
      new TableRow({ children: [
        cell('#', 700, { shaded: true, bold: true, center: true }),
        cell('Shares held at date of return', 2000, { shaded: true, bold: true, center: true }),
        cell('Number/amount transferred', 2100, { shaded: true, bold: true, center: true }),
        cell('Date of registration of transfer', 2225, { shaded: true, bold: true, center: true }),
        cell('Remarks', 2325, { shaded: true, bold: true, center: true }),
      ]}),
      ...members.map((m, i) => new TableRow({ children: [
        cell(String(i + 1), 700, { center: true }),
        cell(val(m.shares_held), 2000, { center: true }),
        cell(val(m.shares_transferred, 'Nil'), 2100, { center: true }),
        cell(val(m.transfer_date, 'Nil'), 2225, { center: true }),
        cell(val(m.remarks, 'None'), 2325, { center: true }),
      ]})),
    ]}),
  );

  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } },
      children,
    }],
  });
  return Packer.toBuffer(doc);
}

module.exports = { buildAnnualReturnDocxBuffer, formatDate };
