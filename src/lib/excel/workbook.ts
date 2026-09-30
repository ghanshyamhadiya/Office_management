import * as XLSX from "xlsx";

export function createWorkbookSheet<T extends Record<string, unknown>>(sheetName: string, rows: T[], totalLabel: string, totalValue?: number) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);

  if (rows.length) {
    worksheet["!autofilter"] = {
      ref: `A1:${String.fromCharCode(64 + Object.keys(rows[0]).length)}${rows.length + 1}`
    };
  }

  const lastRow = rows.length + 2;
  worksheet[`A${lastRow}`] = { t: "s", v: totalLabel };
  if (typeof totalValue === "number") {
    worksheet[`B${lastRow}`] = { t: "n", v: totalValue };
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}
