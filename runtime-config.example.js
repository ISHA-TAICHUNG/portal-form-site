window.PORTAL_CONFIG = window.PORTAL_CONFIG || {
  api: {
    configScriptUrl:
      'https://script.google.com/macros/s/AKfycbwS4BFYqyaZsaVHzxLMWVV4bOh3O6j8bwwox-pLxl2kd2Uq43tsNFVtdwflbDuGXmku/exec',
    submitEndpoint:
      'https://script.google.com/macros/s/AKfycbwS4BFYqyaZsaVHzxLMWVV4bOh3O6j8bwwox-pLxl2kd2Uq43tsNFVtdwflbDuGXmku/exec',
  },
  site: {
    yearLabel: 'Year',
    shortTitle: 'Portal',
    title: 'Portal Title',
    summary: 'Configuration is not connected yet.',
    deadline: '2099-12-31T15:59:59+08:00',
    deadlineLabel: '2099-12-31 23:59:59',
    deadlineNote: 'Please connect a runtime config source.',
  },
  highlights: [
    { value: '2', label: 'Selectable items' },
    { value: '20MB', label: 'Single file limit' },
    { value: '500', label: 'Fee after review' },
  ],
  contact: [],
  timeline: [],
  subjectGroups: [],
  forms: {
    initialIntro: 'Please fill in the form and upload review documents.',
    supplementIntro: 'Please provide your entry ID and upload requested materials.',
    fileRule: 'Accepted formats: PDF, PPT, PPTX, DOC, DOCX. Single file limit: 20MB.',
  },
};
