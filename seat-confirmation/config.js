/*
 * 只需要修改 apiUrl；考試網址由試算表的「網站設定」分頁提供。
 * 這個網址是 Google Apps Script Web App 的 /exec 網址；它不是試算表網址。
 * 不要把 Google 試算表匯出成 CSV、JSON 或其他檔案放進網站資料夾。
 */
window.SEAT_APP_CONFIG = Object.freeze({
  siteTitle: "個人座號查詢",
  apiUrl: "https://script.google.com/macros/s/AKfycbzNHw2_eS2oNcIWlgpOLRKlBH59TGQOIFowKsYTAXwHJITS461vGa6IuMW9hEcNsZM/exec",
  requestTimeoutMs: 12000,
});
