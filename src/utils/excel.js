import * as XLSX from 'xlsx';

const APP_NAME = 'MyCadCam Lab';

// Применяет ширину колонок по содержимому
function autoWidth(ws, data) {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const widths = keys.map(k => {
        const maxLen = Math.max(k.length, ...data.map(r => String(r[k] ?? '').length));
        return { wch: Math.min(maxLen + 2, 40) };
    });
    ws['!cols'] = widths;
}

// Добавляет строку-заголовок отчёта перед данными
function addReportHeader(ws, title, subtitle, startRow = 0) {
    XLSX.utils.sheet_add_aoa(ws, [
        [APP_NAME],
        [title],
        [subtitle],
        [`Дата выгрузки: ${new Date().toLocaleString('ru-RU')}`],
        []
    ], { origin: { r: startRow, c: 0 } });
}

/**
 * Экспортирует один лист с шапкой
 * @param {string} filename
 * @param {string} sheetTitle - название листа
 * @param {string} reportTitle - заголовок отчёта
 * @param {string} subtitle
 * @param {Array} data - массив объектов
 */
export function exportSingleSheet(filename, sheetTitle, reportTitle, subtitle, data) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);

    addReportHeader(ws, reportTitle, subtitle);

    XLSX.utils.sheet_add_json(ws, data, { origin: 5, skipHeader: false });
    autoWidth(ws, data);

    XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
    XLSX.writeFile(wb, filename);
}

/**
 * Экспортирует несколько листов
 * @param {string} filename
 * @param {string} reportTitle
 * @param {string} subtitle
 * @param {Array<{name: string, data: Array}>} sheets
 */
export function exportMultiSheet(filename, reportTitle, subtitle, sheets) {
    const wb = XLSX.utils.book_new();

    // Первый лист — сводная шапка
    const coverWs = XLSX.utils.aoa_to_sheet([
        [APP_NAME],
        [reportTitle],
        [subtitle],
        [`Дата выгрузки: ${new Date().toLocaleString('ru-RU')}`],
        [],
        ['Листы в этом файле:'],
        ...sheets.map((s, i) => [`${i + 1}. ${s.name} — ${s.data.length} записей`])
    ]);
    coverWs['!cols'] = [{ wch: 50 }];
    XLSX.utils.book_append_sheet(wb, coverWs, 'Содержание');

    // Остальные листы
    sheets.forEach(sheet => {
        const ws = XLSX.utils.aoa_to_sheet([]);
        addReportHeader(ws, reportTitle, sheet.name);
        if (sheet.data.length > 0) {
            XLSX.utils.sheet_add_json(ws, sheet.data, { origin: 5 });
            autoWidth(ws, sheet.data);
        } else {
            XLSX.utils.sheet_add_aoa(ws, [['Нет данных']], { origin: 5 });
        }
        XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
    });

    XLSX.writeFile(wb, filename);
}
