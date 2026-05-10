/**
 * MotoRoutes Backend - Google Apps Script
 * Desplegar como: Aplicación Web
 * Acceso: Cualquier persona (Anyone)
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

/**
 * Maneja peticiones GET (Lectura)
 */
function doGet(e) {
  const path = e.parameter.path;
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(path || 'rutas');
  
  if (!sheet) {
    return createResponse({ success: false, message: 'Hoja no encontrada' });
  }

  const data = getSheetData(sheet);
  return createResponse({ success: true, data: data });
}

/**
 * Maneja peticiones POST (Escritura)
 * Google Apps Script recibe POST como 'text/plain' para evitar preflight CORS.
 */
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const path = e.parameter.path || 'rutas';
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(path);
    
    if (!sheet) {
      return createResponse({ success: false, message: 'Hoja no encontrada' });
    }

    // Mapeo de columnas dinámico según el objeto recibido
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = headers.map(header => postData[header.toLowerCase()] || '');
    
    sheet.appendRow(newRow);
    
    return createResponse({ success: true, message: 'Guardado correctamente' });
  } catch (error) {
    return createResponse({ success: false, message: error.toString() });
  }
}

/**
 * Helper para convertir hoja a array de objetos
 */
function getSheetData(sheet) {
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const data = [];
  
  for (let i = 1; i < rows.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j].toLowerCase()] = rows[i][j];
    }
    data.push(obj);
  }
  return data;
}

/**
 * Helper para devolver JSON con headers CORS
 */
function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Configuración inicial: Ejecutar una vez
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss.getSheetByName('rutas')) {
    ss.insertSheet('rutas').appendRow(['id', 'nombre', 'geojson', 'fecha']);
  }
  
  if (!ss.getSheetByName('pois')) {
    ss.insertSheet('pois').appendRow(['id', 'nombre', 'lat', 'lng', 'tipo']);
  }
}
