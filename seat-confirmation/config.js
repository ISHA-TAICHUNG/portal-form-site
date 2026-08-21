/*
 * 只需要修改 apiUrl。
 * 這個網址是 Google Apps Script Web App 的 /exec 網址；它不是試算表網址。
 * 不要把 Google 試算表匯出成 CSV、JSON 或其他檔案放進網站資料夾。
 */
window.SEAT_APP_CONFIG = Object.freeze({
  siteTitle: "個人座號查詢",
  apiUrl: "https://script.google.com/macros/s/AKfycbzzwCzzAgFJOuRRw1SjYpAn8wfaAw1txInqzq6JBxm06ddlme3qPzASy4Ilft9g3fK2/exec",
  requestTimeoutMs: 12000,
  quizUrl: "https://oshcard.osha.gov.tw/onlineQuiz/Login?trId=RqRwbi6APiTP9wg8ODMAYQ%3D%3D",
  quizTimeZone: "Asia/Taipei",
  quizAvailableHour: 15,
});
