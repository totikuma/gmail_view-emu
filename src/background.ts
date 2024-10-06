// background.ts
console.log('バックグラウンドスクリプトが読み込まれました。');

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log(
    'tabs.onUpdated イベントが発生しました。',
    tabId,
    changeInfo,
    tab
  );

  // chrome:// URL を除外
  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    !tab.url.startsWith('chrome://')
  ) {
    console.log('タブの読み込みが完了しました。', tab.url);

    // タブオブジェクトを取得
    chrome.tabs.get(tabId, (tab) => {
      console.log('タブオブジェクトを取得しました。', tab);

      // タブの読み込みが完了していることを確認
      if (tab.status === 'complete') {
        console.log('タブの読み込みが完了しています。');

        // コンテンツスクリプトにメッセージを送信して、ログを出力させる
        chrome.scripting.executeScript(
          {
            target: { tabId: tabId },
            func: () =>
              console.log('新しいタブでコンテンツスクリプトが実行されました。')
          },
          (injectionResults) => {
            console.log('スクリプトの実行結果:', injectionResults);
          }
        );
      } else {
        console.log('タブの読み込みがまだ完了していません。');
      }
    });
  } else {
    console.log(
      'タブの読み込みが完了していません。または chrome:// URL です。'
    );
  }
});
