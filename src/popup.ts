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

// イベントリスナーの設定
emulateButton.addEventListener('click', () => {
  const selectedWidth = widthSelect.value;

  // 現在のタブを取得
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];

    // 新しいタブを作成
    chrome.tabs.create(
      {
        url: currentTab.url,
        active: true
      },
      (newTab) => {
        // newTab.idがundefinedでないことを確認
        if (newTab.id !== undefined) {
          // コンテンツスクリプトにメッセージを送信
          chrome.tabs.sendMessage(newTab.id, {
            action: 'emulateGmail',
            width: selectedWidth
          });
        } else {
          // エラー処理 (例: コンソールにエラーメッセージを出力)
          console.error('新しいタブのIDが取得できませんでした。');
        }
      }
    );
  });
});

// 要素をポップアップページに追加
document.body.appendChild(widthSelect);
document.body.appendChild(emulateButton);
