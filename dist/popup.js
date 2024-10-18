"use strict";
// 表示幅の選択肢
const widthOptions = [
    { value: '375', label: '375px (iPhone SE)' },
    { value: '390', label: '390px (iPhone 14 Pro)' },
    { value: '384', label: '384px (Galaxy S23)' },
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
            // content.ts へのメッセージ送信
            chrome.tabs.sendMessage(currentTab.id, {
                action: 'emulateGmail',
                width: selectedWidth
            }, (response) => {
                console.log('コンテンツスクリプトからのレスポンス (エミュレート):', response);
                // ボタンの表示を切り替え
                if (response && response.message === 'エミュレート要求を受信しました。') {
                    emulateButton.style.display = 'none';
                    undoButton.style.display = 'block';
                }
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
                // ボタンの表示を切り替え
                // if (response && response.message === 'アンドゥが完了しました。') {
                //   undoButton.style.display = 'none';
                //   emulateButton.style.display = 'block';
                // }
            });
            console.log('アンドゥメッセージを送信しました:', currentTab.id);
        }
        else {
            console.error('アクティブなタブが見つかりませんでした。');
        }
    });
});
// content.ts からのメッセージを受信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'undoGmailEmulationCompleted') {
        // ボタンの表示を切り替え
        undoButton.style.display = 'none';
        emulateButton.style.display = 'block';
    }
});
// 要素をポップアップページに追加
document.body.appendChild(widthSelect);
document.body.appendChild(emulateButton);
document.body.appendChild(undoButton);
