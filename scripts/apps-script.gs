const CONFIG_PROPERTY = 'PORTAL_CONFIG_JSON';
const ROOT_FOLDER_PROPERTY = 'PORTAL_ROOT_FOLDER_ID';
const SHEET_PROPERTY = 'PORTAL_SHEET_ID';

function doGet() {
  const config = PropertiesService.getScriptProperties().getProperty(CONFIG_PROPERTY) || '{}';
  return ContentService.createTextOutput(`window.PORTAL_CONFIG=${config};`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || '{}');
    const entryId = payload.fields.entryId || createEntryId(payload.formType);
    const folder = getOrCreateEntryFolder(entryId, payload);

    (payload.files || []).forEach((file) => saveFile(folder, file));
    appendSheetRow(entryId, payload, folder.getUrl());

    return jsonOutput({ ok: true, entryId });
  } catch (error) {
    return jsonOutput({ ok: false, message: error.message });
  }
}

function createEntryId(formType) {
  const prefix = formType === 'supplement' ? 'M' : 'R';
  const timestamp = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmssSSS');
  const randomSuffix = Utilities.getUuid().slice(0, 4).toUpperCase();
  return `${prefix}${timestamp}-${randomSuffix}`;
}

function getOrCreateEntryFolder(entryId, payload) {
  const rootId = PropertiesService.getScriptProperties().getProperty(ROOT_FOLDER_PROPERTY);
  const root = DriveApp.getFolderById(rootId);
  const stage = payload.formType === 'supplement' ? 'materials' : 'initial';
  const stageFolder = getOrCreateChildFolder(root, stage);
  return getOrCreateChildFolder(stageFolder, entryId);
}

function getOrCreateChildFolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

function saveFile(folder, file) {
  const base64 = String(file.dataUrl || '').split(',')[1];
  const blob = Utilities.newBlob(
    Utilities.base64Decode(base64),
    file.type || MimeType.PLAIN_TEXT,
    file.name,
  );
  folder.createFile(blob);
}

function appendSheetRow(entryId, payload, folderUrl) {
  const sheetId = PropertiesService.getScriptProperties().getProperty(SHEET_PROPERTY);
  const sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
  sheet.appendRow([
    new Date(),
    entryId,
    payload.formType,
    JSON.stringify(payload.fields || {}),
    (payload.files || []).map((file) => file.name).join(', '),
    folderUrl,
  ]);
}

function jsonOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.TEXT);
}
