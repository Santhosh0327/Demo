// CasinoScores Intelligence Bridge - Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('[CasinoScores Service Worker] Extension installed.');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_LIVE_CASINO_SCORES_RESULTS') {
    // Query open CasinoScores tabs
    chrome.tabs.query(
      {
        url: [
          'https://*.casino.org/casinoscores/*',
          'https://*.casinoscores.com/*',
        ],
      },
      (tabs) => {
        if (!tabs || tabs.length === 0) {
          sendResponse({
            success: false,
            error: 'No active CasinoScores game tab open in Chrome. Please open a game page on casino.org or casinoscores.com.',
            numbers: [],
          });
          return;
        }

        // Send extraction message to the first matching open tab
        const targetTab = tabs[0];
        chrome.tabs.sendMessage(targetTab.id, { type: 'EXTRACT_PAGE_NUMBERS' }, (res) => {
          if (chrome.runtime.lastError || !res) {
            sendResponse({
              success: false,
              error: 'Failed to communicate with open CasinoScores tab.',
              numbers: [],
            });
          } else {
            sendResponse({
              success: true,
              numbers: res.numbers || [],
              url: res.url || targetTab.url,
            });
          }
        });
      }
    );
    return true; // Keep response channel open asynchronously
  }
});
