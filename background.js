// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Check if the message is the one we want
    if (message.action === "open_note_editor") {
        // Use the URL from the message to create a new tab
        chrome.tabs.create({ url: message.url });
    }
});