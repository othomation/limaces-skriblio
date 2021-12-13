// chrome.storage.sync.clear();
chrome.runtime.onInstalled.addListener(function () {
	chrome.storage.sync.get(['words_lists'], ({ words_lists }) => {
		if (!words_lists) {
			chrome.storage.sync.set({ words_lists: [] });
		}
	});
	chrome.storage.sync.get(['words_lists'], ({ words_lists }) => {
		console.log('Initialized with :\n', words_lists);
	});
});
