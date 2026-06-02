let config = window.PORTAL_CONFIG || {};
const maxFileSize = 20 * 1024 * 1024;
const allowedExtensions = ['pdf', 'ppt', 'pptx', 'doc', 'docx'];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function getPathValue(path) {
  return path.split('.').reduce((value, key) => value?.[key], config);
}

function applyTextBindings() {
  $$('[data-config]').forEach((node) => {
    const value = getPathValue(node.dataset.config);
    if (value) node.textContent = value;
  });
  document.title = config.site?.title || 'Portal Shell';
}

function renderHighlights() {
  const root = $('[data-highlights]');
  if (!root) return;
  root.innerHTML = (config.highlights || [])
    .map(
      (item) => `
        <div class="metric">
          <strong>${item.value}</strong>
          <span>${item.label}</span>
        </div>
      `,
    )
    .join('');
}

function renderTimeline() {
  const root = $('[data-timeline]');
  if (!root) return;
  root.innerHTML = (config.timeline || [])
    .map(
      (item) => `
        <li>
          <time datetime="${item.date}">${item.date}</time>
          <h3>${item.title}</h3>
          <p>${item.detail}</p>
        </li>
      `,
    )
    .join('');
}

function renderSubjects() {
  const summaryRoot = $('[data-subject-summary]');
  const selects = $$('[data-subject-select]');
  const groups = config.subjectGroups || [];

  if (summaryRoot) {
    summaryRoot.innerHTML = groups
      .map(
        (group) => `
          <article class="subject-card">
            <h3>${group.name}</h3>
            <ul>
              ${group.subjects.map((subject) => `<li>${subject}</li>`).join('')}
            </ul>
          </article>
        `,
      )
      .join('');
  }

  selects.forEach((select) => {
    const emptyLabel = select.required ? '請選擇科目' : '不選擇第二門';
    select.innerHTML = `<option value="">${emptyLabel}</option>`;
    groups.forEach((group) => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = group.name;
      group.subjects.forEach((subject) => {
        const option = document.createElement('option');
        option.value = `${group.name}｜${subject}`;
        option.textContent = `${group.name}｜${subject}`;
        optgroup.append(option);
      });
      select.append(optgroup);
    });
  });
}

function renderContact() {
  const root = $('[data-contact]');
  if (!root) return;
  root.innerHTML = (config.contact || [])
    .map(
      (item) => `
        <div class="contact-item">
          <span>${item.label}</span>
          <strong>${item.value}</strong>
        </div>
      `,
    )
    .join('');
}

function updateCountdown() {
  const deadline = config.site?.deadline ? new Date(config.site.deadline) : null;
  $('[data-deadline-label]').textContent = config.site?.deadlineLabel || '--';
  if (!deadline || Number.isNaN(deadline.getTime())) return;

  const diff = Math.max(0, deadline.getTime() - Date.now());
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  $('[data-countdown-days]').textContent = days;
  $('[data-countdown-hours]').textContent = hours;
  $('[data-countdown-minutes]').textContent = minutes;
}

function setView() {
  const view = window.location.hash.replace('#', '') || 'home';
  const normalizedView = ['home', 'register', 'supplement', 'success'].includes(view) ? view : 'home';
  $$('[data-view]').forEach((node) => {
    node.classList.toggle('is-active', node.dataset.view === normalizedView);
  });
}

function fileToPayload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: reader.result,
      });
    });
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function validateFile(file) {
  if (!file) return null;
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    return `「${file.name}」格式不符合規定。`;
  }
  if (file.size > maxFileSize) {
    return `「${file.name}」超過 20MB。`;
  }
  return null;
}

async function collectFormPayload(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const files = [];

  for (const input of $$('input[type="file"]', form)) {
    const file = input.files[0];
    const error = validateFile(file);
    if (error) throw new Error(error);
    if (file) {
      files.push({
        field: input.name,
        ...(await fileToPayload(file)),
      });
    }
  }

  if (form.dataset.form === 'initial' && data.subjectOne && data.subjectOne === data.subjectTwo) {
    throw new Error('科目 1 與科目 2 不能重複。');
  }

  if (form.dataset.form === 'supplement' && files.length === 0) {
    throw new Error('請至少上傳一個補件檔案。');
  }

  return {
    formType: form.dataset.form,
    submittedAt: new Date().toISOString(),
    fields: data,
    files,
  };
}

async function submitPayload(payload) {
  if (!config.api?.submitEndpoint) {
    return {
      ok: true,
      entryId: `LOCAL-${Date.now().toString().slice(-6)}`,
      localOnly: true,
    };
  }

  const response = await fetch(config.api.submitEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { ok: response.ok, message: text };
  }
}

function bindForms() {
  $$('form[data-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const status = $(`[data-status="${form.dataset.form}"]`);
      const button = $('button[type="submit"]', form);
      status.textContent = '資料處理中，請稍候...';
      button.disabled = true;

      try {
        const payload = await collectFormPayload(form);
        const result = await submitPayload(payload);
        if (!result.ok) throw new Error(result.message || '送出失敗，請稍後再試。');
        $('[data-success-message]').textContent = result.localOnly
          ? `本機預覽已完成驗證，示範編號：${result.entryId}`
          : `已收到資料，報名編號：${result.entryId || '系統已建立'}`;
        form.reset();
        window.location.hash = 'success';
      } catch (error) {
        status.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
  });
}

function loadConfigScript(url) {
  if (!url) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.addEventListener('load', () => {
      config = window.PORTAL_CONFIG || config;
      resolve();
    });
    script.addEventListener('error', () => reject(new Error('設定資料載入失敗，請稍後再試。')));
    document.head.append(script);
  });
}

async function loadRuntimeConfig() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('localConfig') === '1') {
    await loadConfigScript('./runtime-config.local.js');
    return;
  }
  await loadConfigScript(config.api?.configScriptUrl);
}

async function init() {
  try {
    await loadRuntimeConfig();
  } catch (error) {
    console.warn(error.message);
  }
  applyTextBindings();
  renderHighlights();
  renderTimeline();
  renderSubjects();
  renderContact();
  updateCountdown();
  setView();
  bindForms();
  window.addEventListener('hashchange', setView);
  window.setInterval(updateCountdown, 60_000);
}

init();
