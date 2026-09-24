document.getElementById('extractBtn').addEventListener('click', async () => {
  const status = document.getElementById('statusMsg');
  status.textContent = 'Extracting...';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    status.textContent = 'No active tab found.';
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: 'CASINO_SCORES_REQUEST_EXTRACT' }, (response) => {
    if (chrome.runtime.lastError) {
      status.textContent = 'Please open a CasinoScores game page.';
    } else {
      status.textContent = 'Extraction sent to Demo App!';
    }
  });
});
