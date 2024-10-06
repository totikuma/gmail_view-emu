"use strict";
// background.ts
console.log('バックグラウンドスクリプトが読み込まれました。');
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        // タブオブジェクトを取得
        chrome.tabs.get(tabId, (tab) => {
            // タブの読み込みが完了していることを確認
            if (tab.status === 'complete') {
                // コンテンツスクリプトにメッセージを送信して、ログを出力させる
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: () => console.log('新しいタブでコンテンツスクリプトが実行されました。')
                });
            }
        });
    }
});
