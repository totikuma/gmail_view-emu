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
emulateButton.textContent = 'スマホビューを適用';
// アンドゥボタンの作成
const undoButton = document.createElement('button');
undoButton.id = 'undo';
undoButton.textContent = 'すべてを元に戻す';
undoButton.style.display = 'none';
// ダークモードトグルボタンの追加
const darkModeToggle = document.createElement('button');
darkModeToggle.id = 'dark-mode';
darkModeToggle.textContent = 'ダークモードを適用';
// 状態管理の変数
let isSmartphoneView = false;
let isDarkMode = false;
// エミュレートボタンのイベントリスナー
emulateButton.addEventListener('click', () => {
    isSmartphoneView = !isSmartphoneView;
    updateUI();
    applyCurrentState();
});
// ダークモードトグルのイベントリスナー
darkModeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    updateUI();
    applyCurrentState();
});
// アンドゥボタンのイベントリスナー
undoButton.addEventListener('click', () => {
    isSmartphoneView = false;
    isDarkMode = false;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab?.id) {
            chrome.tabs.sendMessage(currentTab.id, { action: 'undoGmailEmulation' }, (response) => {
                console.log('アンドゥ完了:', response);
                updateUI();
            });
        }
    });
});
// UIの更新
function updateUI() {
    // ボタンのテキストと状態を更新
    emulateButton.textContent = isSmartphoneView
        ? 'スマホビューを解除'
        : 'スマホビューを適用';
    darkModeToggle.textContent = isDarkMode
        ? 'ダークモードを解除'
        : 'ダークモードを適用';
    darkModeToggle.classList.toggle('active', isDarkMode);
    emulateButton.classList.toggle('active', isSmartphoneView);
    // アンドゥボタンの表示制御
    undoButton.style.display = (isSmartphoneView || isDarkMode) ? 'block' : 'none';
    // 幅選択の有効/無効切り替え
    widthSelect.disabled = !isSmartphoneView;
}
// 現在の状態をコンテンツスクリプトに適用
function applyCurrentState() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab?.id) {
            chrome.tabs.sendMessage(currentTab.id, {
                action: 'emulateGmail',
                width: isSmartphoneView ? widthSelect.value : null,
                darkMode: isDarkMode
            }, (response) => {
                console.log('状態適用完了:', response);
                // レスポンスに基づいてUIを更新
                if (response && !response.error) {
                    updateUI();
                }
            });
        }
    });
}
// content.ts からのメッセージを受信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'undoGmailEmulationCompleted') {
        isSmartphoneView = false;
        isDarkMode = false;
        updateUI();
    }
});
// 要素をポップアップページに追加
document.body.appendChild(widthSelect);
document.body.appendChild(emulateButton);
document.body.appendChild(darkModeToggle);
document.body.appendChild(undoButton);
