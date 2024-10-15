"use strict";
// background.ts
console.log('バックグラウンドスクリプトが読み込まれました。');
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    console.log('tabs.onUpdated イベントが発生しました。', tabId, changeInfo, tab);
    // chrome:// URL を除外
    if (changeInfo.status === 'complete' &&
        tab.url &&
        !tab.url.startsWith('chrome://')) {
        console.log('タブの読み込みが完了しました。', tab.url);
        // コンテンツスクリプトにメッセージを送信して、ログを出力させる
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => console.log('新しいタブでコンテンツスクリプトが実行されました。')
        }, (injectionResults) => {
            if (chrome.runtime.lastError) {
                console.error('コンテンツスクリプトの実行エラー:', chrome.runtime.lastError.message);
            }
            else {
                console.log('スクリプトの実行結果:', injectionResults);
            }
        });
    }
    else if (changeInfo.status === 'loading') {
        // 読み込み中は処理をスキップ
        console.log('タブの読み込み中です。');
    }
    else {
        console.log('タブの読み込みが完了していません。または chrome:// URL です。');
    }
});
