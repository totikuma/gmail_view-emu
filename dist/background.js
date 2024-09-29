"use strict";
// background.ts
console.log('バックグラウンドスクリプトが読み込まれました。');
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // changeInfo.status が complete (ページの読み込み完了)
    // かつ、tab.url が存在する場合（新しいタブでURLが設定された場合）に実行
    if (changeInfo.status === 'complete' && tab.url) {
        // コンテンツスクリプトにメッセージを送信して、ログを出力させる
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            // 実行したいコードを文字列としてfuncプロパティに渡す
            func: () => console.log('新しいタブでコンテンツスクリプトが実行されました。')
        });
    }
});
