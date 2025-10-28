chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && tab.url.includes("youtube.com/watch")) {
    console.log("Detected YouTube video:", tab.url);
    // Optional: Set a badge or notify if needed (e.g., chrome.action.setBadgeText({text: 'AI'}));
  }
});