import * as XLSX from 'xlsx'

interface ExportOptions {
  fileName?: string
  sheetName?: string
}

/**
 * Exports JSON data array directly to Excel (.xlsx) file with RTL column order
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions = {}
) {
  if (!data || data.length === 0) return

  const { fileName = 'تقرير_المكتب_القانوني', sheetName = 'البيانات' } = options

  // Create workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(data)
  
  // Set sheet direction to RTL
  if (!worksheet['!views']) worksheet['!views'] = []
  worksheet['!views'].push({ rightToLeft: true })

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // Write file and trigger download
  const cleanFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`
  XLSX.writeFile(workbook, cleanFileName)
}
