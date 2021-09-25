//content.js
console.log('Welcome to content js.');
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	console.log('[Recevived request on contentjs: ', request);
	if (request.list) {
		const { list } = request;

		const textarea = document.getElementById('lobbySetCustomWords');
		textarea.innerHTML = list.formatted_list;
		sendResponse({ result: 'success', data: textarea.innerHTML });
	}
});
