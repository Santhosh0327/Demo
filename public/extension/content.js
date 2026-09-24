// CasinoScores Intelligence Bridge - Content Script
(function () {
  const isCasinoScoresPage =
    window.location.hostname.includes('casino.org') ||
    window.location.hostname.includes('casinoscores.com');

  function extractVisibleNumbers() {
    const extracted = [];

    // 1. Check Next.js state data in script tags
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const code = script.textContent || '';
      const jsonMatches = code.matchAll(/"(?:winningNumber|result|winning_number)"\s*:\s*"(00|0|[1-9]|[12][0-9]|3[0-6])"/g);
      for (const m of jsonMatches) {
        if (m[1]) extracted.push(m[1]);
      }
    }

    if (extracted.length > 0) return extracted;

    // 2. Check DOM elements with data attributes or spin result classes
    const domElems = document.querySelectorAll('[data-number], .spin-result, .winning-pocket, .history-item');
    for (const el of domElems) {
      const val = el.getAttribute('data-number') || el.textContent.trim();
      const clean = val.replace(/[^0-9]/g, '');
      if (clean && (clean === '0' || clean === '00' || (parseInt(clean) >= 1 && parseInt(clean) <= 36))) {
        extracted.push(clean);
      }
    }

    if (extracted.length > 0) return extracted;

    // 3. Fallback: Parse body text tokens with multiplier guard
    const textContent = document.body ? document.body.innerText || '' : '';
    const tokens = textContent.split(/[\s,;|<>]+/);
    for (const token of tokens) {
      const clean = token.replace(/[^0-9]/g, '');
      if (token.toLowerCase().includes('x') || clean.length > 2) continue; // Skip multipliers / round IDs
      if (clean === '0' || clean === '00' || (parseInt(clean) >= 1 && parseInt(clean) <= 36)) {
        extracted.push(clean);
      }
    }

    return extracted;
  }

  if (isCasinoScoresPage) {
    // Running on actual CasinoScores game page -> listen for background extraction requests
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'EXTRACT_PAGE_NUMBERS') {
          const numbers = extractVisibleNumbers();
          sendResponse({
            success: true,
            numbers,
            url: window.location.href,
            timestamp: Date.now(),
          });
        }
        return true;
      });
    }
  } else {
    // Running on Demo web application -> listen to window postMessages and relay to background script
    window.addEventListener('message', (event) => {
      if (!event.data) return;

      if (event.data.type === 'CASINO_SCORES_PING') {
        window.postMessage(
          {
            source: 'CASINO_SCORES_EXTENSION',
            type: 'CASINO_SCORES_PONG',
            version: '1.0.0',
            installed: true,
          },
          '*'
        );
      }

      if (event.data.type === 'CASINO_SCORES_REQUEST_EXTRACT') {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ type: 'GET_LIVE_CASINO_SCORES_RESULTS' }, (response) => {
            if (response && response.success && response.numbers) {
              window.postMessage(
                {
                  source: 'CASINO_SCORES_EXTENSION',
                  type: 'CASINO_SCORES_EXTRACTED_RESULTS',
                  numbers: response.numbers,
                  url: response.url,
                  timestamp: Date.now(),
                },
                '*'
              );
            }
          });
        }
      }
    });

    // Announce presence to web application
    window.postMessage(
      {
        source: 'CASINO_SCORES_EXTENSION',
        type: 'CASINO_SCORES_ANNOUNCE',
        version: '1.0.0',
        installed: true,
      },
      '*'
    );
  }
})();
