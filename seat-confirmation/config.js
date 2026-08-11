/*
 * 只需要修改 apiUrl。
 * 這個網址是 Google Apps Script Web App 的 /exec 網址；它不是試算表網址。
 * 不要把 Google 試算表匯出成 CSV、JSON 或其他檔案放進網站資料夾。
 */
window.SEAT_APP_CONFIG = Object.freeze({
  siteTitle: "座號與資料確認",
  apiUrl: "https://script.google.com/macros/s/AKfycbxz_MErRO1ZNfDEqOve_awJsZEmRFtzLAGcdz989atOOoY8x6DGdwvu5jxepjVBZPOK/exec",
  requestTimeoutMs: 12000,
});

