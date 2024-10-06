"use strict";
// 表示幅の選択肢
const widthOptions = [
    { value: '320', label: '320px (iPhone SE)' },
    { value: '375', label: '375px (iPhone X)' },
    { value: '414', label: '414px (iPhone 14 Pro)' },
    { value: '360', label: '360px (Galaxy S23)' },
    { value: '412', label: '412px (Pixel 7)' }
];
// ドロップダウンリストの作成
const widthSelect = document.createElement('select');
widthSelect.id = 'width';
widthOptions.forEach((option) => {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.text = option.label;
    widthSelect.appendChild(optionElement);
});
// エミュレートボタンの作成
const emulateButton = document.createElement('button');
emulateButton.id = 'emulate';
emulateButton.textContent = 'エミュレート';
// アンドゥボタンの作成
const undoButton = document.createElement('button');
undoButton.id = 'undo';
undoButton.textContent = 'アンドゥ';
undoButton.style.display = 'none'; // 初期状態は非表示
// イベントリスナーの設定 (エミュレートボタン)
emulateButton.addEventListener('click', () => {
    console.log('エミュレートボタンがクリックされました。');
    const selectedWidth = widthSelect.value;
    // 現在のタブを取得
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        // currentTab が undefined かどうかを確認
        if (currentTab && currentTab.id) {
            // タブの読み込みが完了してからメッセージを送信
            chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                func: () => {
                    // function を func に変更
                    // content.ts 内で実行されるコード
                    // ここでメッセージを受け取るように変更
                    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                        if (request.action === 'emulateGmail') {
                            console.log('Gmailレンダリングのエミュレートが開始されました。');
                            const gmailEmulationWidth = request.width; // widthを変数に保存
                            if (document.readyState === 'complete') {
                                // DOM構築が完了している場合、すぐに実行
                                if (gmailEmulationWidth !== null) {
                                    emulateGmailRendering(gmailEmulationWidth);
                                }
                            }
                            else {
                                // まだの場合、windowのloadイベントを待つ
                                window.addEventListener('load', () => {
                                    if (gmailEmulationWidth !== null) {
                                        emulateGmailRendering(gmailEmulationWidth);
                                    }
                                });
                            }
                            sendResponse({ message: 'エミュレート要求を受信しました。' });
                        }
                        else if (request.action === 'undoGmailEmulation') {
                            console.log('Gmailレンダリングのエミュレートをアンドゥします。');
                            undoGmailEmulation();
                            sendResponse({ message: 'アンドゥが完了しました。' });
                        }
                    });
                }
            });
            // content.ts へのメッセージ送信
            chrome.tabs.sendMessage(currentTab.id, // currentTab.id はここで安全に使用できる
            {
                action: 'emulateGmail',
                width: selectedWidth
            }, (response) => {
                console.log('コンテンツスクリプトからのレスポンス (エミュレート):', response);
            });
            console.log('エミュレートメッセージを送信しました:', currentTab.id, {
                action: 'emulateGmail',
                width: selectedWidth
            });
        }
        else {
            console.error('アクティブなタブが見つかりませんでした。');
        }
    });
    // ボタンの表示を切り替え
    emulateButton.style.display = 'none';
    undoButton.style.display = 'block';
});
// イベントリスナーの設定 (アンドゥボタン)
undoButton.addEventListener('click', () => {
    console.log('アンドゥボタンがクリックされました。');
    // 現在のタブを取得
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        // コンテンツスクリプトにメッセージを送信
        if (currentTab && currentTab.id) {
            chrome.tabs.sendMessage(currentTab.id, {
                action: 'undoGmailEmulation'
            }, (response) => {
                console.log('コンテンツスクリプトからのレスポンス (アンドゥ):', response);
            });
            console.log('アンドゥメッセージを送信しました:', currentTab.id);
        }
        else {
            console.error('アクティブなタブが見つかりませんでした。');
        }
    });
    // ボタンの表示を切り替え
    undoButton.style.display = 'none';
    emulateButton.style.display = 'block';
});
// 要素をポップアップページに追加
document.body.appendChild(widthSelect);
document.body.appendChild(emulateButton);
document.body.appendChild(undoButton);
