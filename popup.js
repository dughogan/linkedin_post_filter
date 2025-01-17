document.addEventListener('DOMContentLoaded', () => {
    // Load saved settings
    chrome.storage.sync.get(['country', 'showRemote'], (result) => {
      if (result.country) {
        document.getElementById('country').value = result.country;
      }
      if (result.showRemote !== undefined) {
        document.getElementById('showRemote').checked = result.showRemote;
      }
    });
  
    // Save settings when changed
    document.getElementById('country').addEventListener('change', saveSettings);
    document.getElementById('showRemote').addEventListener('change', saveSettings);
  });
  
  function saveSettings() {
    const country = document.getElementById('country').value;
    const showRemote = document.getElementById('showRemote').checked;
  
    chrome.storage.sync.set({
      country: country,
      showRemote: showRemote
    }, () => {
      // Show saved message
      const status = document.getElementById('status');
      status.style.display = 'block';
      setTimeout(() => {
        status.style.display = 'none';
      }, 2000);
  
      // Notify content script of changes
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'settingsUpdated',
            settings: { country, showRemote }
          });
        }
      });
    });
  }