const CONFIG_PROPERTY = 'PORTAL_CONFIG_JSON';
const ROOT_FOLDER_PROPERTY = 'PORTAL_ROOT_FOLDER_ID';
const SHEET_PROPERTY = 'PORTAL_SHEET_ID';
const DEFAULT_ROOT_FOLDER_NAME = 'portal-upload-store';
const DEFAULT_SHEET_NAME = 'portal-submissions';
const SHEET_HEADERS = [
  'timestamp',
  'entryId',
  'formType',
  'fieldsJson',
  'fileNames',
  'folderUrl',
];

function bootstrapWorkspace(configJson) {
  const root = DriveApp.createFolder(DEFAULT_ROOT_FOLDER_NAME);
  const spreadsheet = SpreadsheetApp.create(DEFAULT_SHEET_NAME);
  const sheet = spreadsheet.getSheets()[0];
  sheet.setName('submissions');
  sheet.getRange(1, 1, 1, SHEET_HEADERS.length).setValues([SHEET_HEADERS]);
  sheet.setFrozenRows(1);

  const properties = PropertiesService.getScriptProperties();
  properties.setProperty(CONFIG_PROPERTY, configJson);
  properties.setProperty(ROOT_FOLDER_PROPERTY, root.getId());
  properties.setProperty(SHEET_PROPERTY, spreadsheet.getId());

  SpreadsheetApp.flush();
  return {
    rootFolderId: root.getId(),
    rootFolderUrl: root.getUrl(),
    spreadsheetId: spreadsheet.getId(),
    spreadsheetUrl: spreadsheet.getUrl(),
  };
}

function setPortalConfig(configJson) {
  JSON.parse(configJson);
  PropertiesService.getScriptProperties().setProperty(CONFIG_PROPERTY, configJson);
  return { ok: true };
}

function doGet() {
  const configJson = PropertiesService.getScriptProperties().getProperty(CONFIG_PROPERTY) || '{}';
  const config = JSON.parse(configJson);
  const serviceUrl = ScriptApp.getService().getUrl();
  config.api = {
    ...(config.api || {}),
    configScriptUrl: serviceUrl,
    submitEndpoint: serviceUrl,
  };
  return ContentService.createTextOutput(`window.PORTAL_CONFIG=${JSON.stringify(config)};`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || '{}');
    if (payload.action === 'bootstrap') {
      return jsonOutput(handleBootstrap(payload));
    }
    const entryId = payload.fields.entryId || createEntryId(payload.formType);
    const folder = getOrCreateEntryFolder(entryId, payload);

    (payload.files || []).forEach((file) => saveFile(folder, file));
    appendSheetRow(entryId, payload, folder.getUrl());

    return jsonOutput({ ok: true, entryId });
  } catch (error) {
    return jsonOutput({ ok: false, message: error.message });
  }
}

function handleBootstrap(payload) {
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty(CONFIG_PROPERTY)) {
    throw new Error('Workspace is already bootstrapped.');
  }
  return {
    ok: true,
    ...bootstrapWorkspace(payload.configJson),
  };
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
  // 寫入台北時間字串,確保不論試算表本身時區設定為何都顯示台灣標準時間
  const taipeiNow = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
  sheet.appendRow([
    taipeiNow,
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
