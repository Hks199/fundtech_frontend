import Decimal from 'decimal.js';

type ExportCell = string | number | null;

// Excel supports 15 significant digits. Keep larger values as text to avoid
// silently rounding the backend's decimal amounts and BIGINT quantities.
function numericCell(value: ExportCell): ExportCell {
  if (value === null || value === '') return value;
  const decimal = new Decimal(value);
  const number = decimal.toNumber();
  return decimal.precision() <= 15 && Number.isFinite(number) && new Decimal(number).equals(decimal)
    ? number : String(value);
}

export async function createExcelBuffer(sheetName: string, rows: ExportCell[][], numericColumns: number[]) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Fundtech';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
  for (const [rowIndex, row] of rows.entries()) {
    sheet.addRow(row.map((value, columnIndex) => rowIndex > 0 && numericColumns.includes(columnIndex) ? numericCell(value) : value));
  }
  const header = sheet.getRow(1);
  header.height = 26;
  header.eachCell(cell => {
    cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF237A55' } };
    cell.alignment = { vertical: 'middle' };
  });
  sheet.columns.forEach((column, index) => {
    column.width = rows.reduce((width, row) => Math.min(48, Math.max(width, String(row[index] ?? '').length + 3)), 16);
  });
  if (rows[0]?.length) sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: rows[0].length } };
  return new Uint8Array(await workbook.xlsx.writeBuffer()).buffer;
}

export async function downloadExcel(name: string, sheetName: string, rows: ExportCell[][], numericColumns: number[]) {
  const buffer = await createExcelBuffer(sheetName, rows, numericColumns);
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
