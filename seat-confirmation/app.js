(function () {
  "use strict";

  var config = window.SEAT_APP_CONFIG || {};
  var lookupForm = document.getElementById("lookup-form");
  var lookupInput = document.getElementById("identity-code");
  var lookupButton = document.getElementById("lookup-button");
  var lookupStatus = document.getElementById("lookup-status");
  var inputShell = document.querySelector(".input-shell");
  var resultSection = document.getElementById("result-section");
  var successSection = document.getElementById("success-section");
  var seatNumber = document.getElementById("seat-number");
  var successSeatNumber = document.getElementById("success-seat-number");
  var checkinSheetNumber = document.getElementById("checkin-sheet-number");
  var successSheetNumber = document.getElementById("success-sheet-number");
  var personName = document.getElementById("person-name");
  var birthDate = document.getElementById("birth-date");
  var identityMasked = document.getElementById("identity-masked");
  var identityFull = document.getElementById("identity-full");
  var revealIdentity = document.getElementById("reveal-identity");
  var confirmationForm = document.getElementById("confirmation-form");
  var confirmDetails = document.getElementById("confirm-details");
  var confirmButton = document.getElementById("confirm-button");
  var reportButton = document.getElementById("report-button");
  var confirmationStatus = document.getElementById("confirmation-status");
  var reportHelp = document.getElementById("report-help");
  var newQueryButton = document.getElementById("new-query-button");
  var state = { record: null, confirmationToken: "", identityRevealed: false };
  var sessionToken = makeSessionToken();

  if (config.siteTitle) {
    document.title = String(config.siteTitle);
  }

  function makeSessionToken() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return String(Date.now()) + "-" + Math.random().toString(36).slice(2);
  }

  function normaliseIdentity(value) {
    return String(value || "")
      .replace(/[\s\u3000]+/g, "")
      .toUpperCase();
  }

  function isPlausibleIdentity(value) {
    return /^[A-Z0-9-]{6,20}$/.test(value);
  }

  function maskIdentity(value) {
    if (!value) return "—";
    if (value.length <= 4) return "•".repeat(value.length);
    return value.charAt(0) + "•".repeat(Math.max(4, value.length - 3)) + value.slice(-2);
  }

  function formatCheckinSheet(value) {
    var text = String(value || "").trim();
    if (!text) return "尚未設定";
    if (/^\d+$/.test(text)) return "第 " + text + " 張";
    return text;
  }

  function setStatus(message, type) {
    lookupStatus.textContent = message || "";
    lookupStatus.className = "status-message" + (type ? " is-" + type : "");
  }

  function setLoading(isLoading) {
    lookupButton.disabled = isLoading;
    lookupButton.classList.toggle("is-loading", isLoading);
    lookupInput.disabled = isLoading;
  }

  function showInputError(message) {
    inputShell.classList.add("is-invalid");
    lookupInput.setAttribute("aria-invalid", "true");
    setStatus(message, "error");
  }

  function clearInputError() {
    inputShell.classList.remove("is-invalid");
    lookupInput.removeAttribute("aria-invalid");
  }

  function showResult(record, confirmationToken) {
    state.record = record;
    state.confirmationToken = confirmationToken;
    state.identityRevealed = false;
    seatNumber.textContent = record.seatNo || "—";
    successSeatNumber.textContent = record.seatNo || "—";
    checkinSheetNumber.textContent = formatCheckinSheet(record.checkInSheet);
    successSheetNumber.textContent = formatCheckinSheet(record.checkInSheet);
    personName.textContent = record.name || "—";
    birthDate.textContent = record.birthDate || "—";
    identityMasked.textContent = maskIdentity(record.id);
    identityFull.textContent = record.id || "—";
    identityMasked.hidden = false;
    identityFull.hidden = true;
    revealIdentity.textContent = "顯示完整字號";
    revealIdentity.setAttribute("aria-pressed", "false");
    confirmDetails.checked = false;
    confirmButton.disabled = true;
    confirmButton.textContent = "確認資料";
    confirmDetails.disabled = false;
    reportButton.disabled = false;
    confirmationStatus.textContent = "";
    reportHelp.hidden = true;
    resultSection.hidden = false;
    successSection.hidden = true;
    lookupInput.value = "";
    setStatus("已找到資料，請向下核對。", "success");
    window.setTimeout(function () {
      resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function clearPersonalDataFromPage() {
    state.record = null;
    state.confirmationToken = "";
    state.identityRevealed = false;
    personName.textContent = "—";
    birthDate.textContent = "—";
    identityMasked.textContent = "—";
    identityFull.textContent = "—";
    seatNumber.textContent = "—";
    checkinSheetNumber.textContent = "尚未設定";
    lookupInput.value = "";
  }

  function clearPreviousResult() {
    resultSection.hidden = true;
    successSection.hidden = true;
    confirmationStatus.textContent = "";
    reportHelp.hidden = true;
    confirmDetails.checked = false;
    clearPersonalDataFromPage();
  }

  function showSuccess() {
    var seat = state.record ? state.record.seatNo || "—" : "—";
    var sheet = state.record ? formatCheckinSheet(state.record.checkInSheet) : "尚未設定";
    successSeatNumber.textContent = seat;
    successSheetNumber.textContent = sheet;
    resultSection.hidden = true;
    successSection.hidden = false;
    clearPersonalDataFromPage();
    successSeatNumber.textContent = seat;
    successSheetNumber.textContent = sheet;
    window.setTimeout(function () {
      successSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function requestWithJsonp(params) {
    var endpoint = String(config.apiUrl || "").trim();
    if (!endpoint || endpoint.indexOf("REPLACE_WITH") !== -1) {
      return Promise.reject(new Error("MISSING_API_URL"));
    }

    var callbackName = "__seatLookup_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    var timeoutMs = Number(config.requestTimeoutMs) || 12000;
    var script = document.createElement("script");
    var url;

    try {
      url = new URL(endpoint);
    } catch (error) {
      return Promise.reject(new Error("INVALID_API_URL"));
    }

    Object.keys(params).forEach(function (key) {
      url.searchParams.set(key, params[key]);
    });
    url.searchParams.set("clientToken", sessionToken);
    url.searchParams.set("callback", callbackName);
    url.searchParams.set("_", String(Date.now()));

    return new Promise(function (resolve, reject) {
      var finished = false;
      var timer = window.setTimeout(function () {
        finish(new Error("TIMEOUT"));
      }, timeoutMs);

      function cleanup() {
        window.clearTimeout(timer);
        script.remove();
        try {
          delete window[callbackName];
        } catch (error) {
          window[callbackName] = undefined;
        }
      }

      function finish(error, payload) {
        if (finished) return;
        finished = true;
        cleanup();
        if (error) {
          reject(error);
        } else {
          resolve(payload);
        }
      }

      window[callbackName] = function (payload) {
        finish(null, payload);
      };
      script.async = true;
      script.src = url.toString();
      script.referrerPolicy = "no-referrer";
      script.onerror = function () {
        finish(new Error("NETWORK"));
      };
      document.body.appendChild(script);
    });
  }

  function lookupWithJsonp(identity) {
    return requestWithJsonp({ action: "lookup", id: identity });
  }

  function confirmWithJsonp(identity, confirmationToken) {
    return requestWithJsonp({
      action: "confirm",
      id: identity,
      confirmationToken: confirmationToken,
    });
  }

  function payloadError(payload) {
    var error = new Error("SERVICE_ERROR");
    error.code = payload && payload.error ? String(payload.error) : "service_unavailable";
    return error;
  }

  function friendlyError(error) {
    if (error && error.message === "MISSING_API_URL") {
      return "查詢服務尚未設定，請先在 config.js 填入 Apps Script /exec 網址。";
    }
    if (error && error.message === "INVALID_API_URL") {
      return "查詢服務網址格式不正確，請檢查 config.js。";
    }
    if (error && error.message === "TIMEOUT") {
      return "查詢逾時，請稍後再試。";
    }
    if (error && error.code === "rate_limited") {
      return "操作次數過多，請稍候一分鐘再試。";
    }
    return "查詢服務暫時無法使用，請稍後再試。";
  }

  function friendlyConfirmationError(error) {
    if (error && error.code === "confirmation_expired") {
      return "確認連結已逾時，請重新查詢後再確認。";
    }
    if (error && error.code === "duplicate_identity") {
      return "同一身分碼有重複資料，請聯絡承辦單位處理。";
    }
    if (error && error.code === "rate_limited") {
      return "操作次數過多，請稍候一分鐘再試。";
    }
    if (error && error.message === "TIMEOUT") {
      return "確認回傳逾時；請先重新查詢，確認試算表狀態後再操作。";
    }
    return "確認暫時無法回傳，資料尚保留在畫面上，請稍後再試。";
  }

  function setConfirmationLoading(isLoading) {
    confirmButton.disabled = isLoading || !confirmDetails.checked;
    confirmButton.textContent = isLoading ? "正在回傳…" : "確認資料";
    confirmDetails.disabled = isLoading;
    reportButton.disabled = isLoading;
  }

  lookupInput.addEventListener("input", function () {
    clearInputError();
    if (lookupStatus.classList.contains("is-error")) {
      setStatus("");
    }
  });

  lookupForm.addEventListener("submit", function (event) {
    event.preventDefault();
    clearInputError();
    var identity = normaliseIdentity(lookupInput.value);

    if (!isPlausibleIdentity(identity)) {
      showInputError("請輸入完整身分碼（至少 6 碼，僅限英文字母、數字或連字號）。");
      lookupInput.focus();
      return;
    }

    clearPreviousResult();
    setLoading(true);
    setStatus("正在查詢，請稍候…");

    lookupWithJsonp(identity)
      .then(function (payload) {
        if (!payload || payload.ok !== true) {
          throw payloadError(payload);
        }
        if (payload.found !== true || !payload.record) {
          setStatus("查無符合資料，請確認已輸入完整身分碼。", "error");
          return;
        }
        if (!payload.confirmationToken) {
          throw payloadError({ error: "service_unavailable" });
        }
        showResult(payload.record, payload.confirmationToken);
      })
      .catch(function (error) {
        setStatus(friendlyError(error), "error");
      })
      .finally(function () {
        setLoading(false);
      });
  });

  revealIdentity.addEventListener("click", function () {
    if (!state.record) return;
    state.identityRevealed = !state.identityRevealed;
    identityMasked.hidden = state.identityRevealed;
    identityFull.hidden = !state.identityRevealed;
    revealIdentity.textContent = state.identityRevealed ? "隱藏字號" : "顯示完整字號";
    revealIdentity.setAttribute("aria-pressed", String(state.identityRevealed));
  });

  confirmDetails.addEventListener("change", function () {
    confirmButton.disabled = !confirmDetails.checked;
  });

  confirmationForm.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!confirmDetails.checked || !state.record || !state.confirmationToken) return;

    var identity = state.record.id;
    var confirmationToken = state.confirmationToken;
    confirmationStatus.textContent = "正在將確認結果回傳至試算表…";
    setConfirmationLoading(true);

    confirmWithJsonp(identity, confirmationToken)
      .then(function (payload) {
        if (!payload || payload.ok !== true || payload.confirmed !== true) {
          throw payloadError(payload);
        }
        confirmationStatus.textContent = "";
        showSuccess();
      })
      .catch(function (error) {
        confirmationStatus.textContent = friendlyConfirmationError(error);
      })
      .finally(function () {
        if (state.record) setConfirmationLoading(false);
      });
  });

  reportButton.addEventListener("click", function () {
    reportHelp.hidden = !reportHelp.hidden;
    if (!reportHelp.hidden) {
      reportHelp.focus({ preventScroll: true });
    }
  });

  newQueryButton.addEventListener("click", function () {
    successSection.hidden = true;
    resultSection.hidden = true;
    setStatus("");
    clearInputError();
    lookupInput.disabled = false;
    lookupInput.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();
