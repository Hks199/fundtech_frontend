import ExcelJS from 'exceljs';
import { expect, it } from 'vitest';
import { createExcelBuffer } from '../src/excel';

it('creates a readable Excel workbook with numeric cells and literal text', async () => {
  const buffer = await createExcelBuffer('Inventory', [
    ['Product', 'Quantity', 'Value'], ['testing_product', '70', '8550.1234'], ['=1+1', '0', null],
  ], [1, 2]);
  expect(Array.from(new Uint8Array(buffer).slice(0, 2))).toEqual([80, 75]);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet('Inventory')!;
  expect(sheet.getCell('A2').value).toBe('testing_product');
  expect(sheet.getCell('B2').value).toBe(70);
  expect(sheet.getCell('C2').value).toBe(8550.1234);
  expect(sheet.getCell('A3').value).toBe('=1+1');
  expect(sheet.getCell('A3').type).toBe(ExcelJS.ValueType.String);
  expect(sheet.getCell('C3').value).toBeNull();
  expect(sheet.getRow(1).getCell(1).font.bold).toBe(true);
  expect(sheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
});

it('preserves high-precision backend quantities and costs as text', async () => {
  const buffer = await createExcelBuffer('Inventory', [
    ['Quantity', 'Value'], ['9007199254740993', '123456789012345.6789'],
  ], [0, 1]);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  expect(workbook.worksheets[0].getCell('A2').value).toBe('9007199254740993');
  expect(workbook.worksheets[0].getCell('B2').value).toBe('123456789012345.6789');
});
