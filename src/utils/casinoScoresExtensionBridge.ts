import { IntegrationMethod } from '../types/casinoscores';

export interface ExtensionBridgeStatus {
  installed: boolean;
  version?: string;
  activeUrl?: string;
}

type ExtractedResultsCallback = (numbers: string[], url?: string) => void;

let extensionDetected = false;
let extensionVersion: string | undefined = undefined;
let listenersRegistered = false;
const callbacks: Set<ExtractedResultsCallback> = new Set();

export function registerExtensionBridge(onResults: ExtractedResultsCallback) {
  callbacks.add(onResults);

  if (!listenersRegistered && typeof window !== 'undefined') {
    listenersRegistered = true;
    window.addEventListener('message', (event) => {
      if (!event.data || event.data.source !== 'CASINO_SCORES_EXTENSION') return;

      if (event.data.type === 'CASINO_SCORES_PONG' || event.data.type === 'CASINO_SCORES_ANNOUNCE') {
        extensionDetected = true;
        extensionVersion = event.data.version;
      }

      if (event.data.type === 'CASINO_SCORES_EXTRACTED_RESULTS') {
        const numbers = event.data.numbers || [];
        callbacks.forEach((cb) => cb(numbers, event.data.url));
      }
    });

    // Send initial ping to check if extension content script is present on the page
    window.postMessage({ type: 'CASINO_SCORES_PING' }, '*');
  }

  return () => {
    callbacks.delete(onResults);
  };
}

export function pingExtension(): Promise<boolean> {
  return new Promise((resolve) => {
    if (extensionDetected) {
      resolve(true);
      return;
    }

    const handlePong = (event: MessageEvent) => {
      if (
        event.data &&
        event.data.source === 'CASINO_SCORES_EXTENSION' &&
        (event.data.type === 'CASINO_SCORES_PONG' || event.data.type === 'CASINO_SCORES_ANNOUNCE')
      ) {
        extensionDetected = true;
        extensionVersion = event.data.version;
        window.removeEventListener('message', handlePong);
        resolve(true);
      }
    };

    window.addEventListener('message', handlePong);
    window.postMessage({ type: 'CASINO_SCORES_PING' }, '*');

    setTimeout(() => {
      window.removeEventListener('message', handlePong);
      resolve(extensionDetected);
    }, 600);
  });
}

export function requestExtensionExtraction() {
  if (typeof window !== 'undefined') {
    window.postMessage({ type: 'CASINO_SCORES_REQUEST_EXTRACT' }, '*');
  }
}

export function getExtensionStatus(): ExtensionBridgeStatus {
  return {
    installed: extensionDetected,
    version: extensionVersion,
  };
}
