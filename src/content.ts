let gmailEmulationWidth: string | null = null; // widthを受け取る変数を用意
let originalHTML = ''; // エミュレート前のHTMLを保存する変数

// DOMContentLoaded イベントの代わりに window.onload イベントを使用
window.addEventListener('load', () => {
  console.log('コンテンツスクリプトが読み込まれました。');
  originalHTML = document.body.outerHTML; // 初期HTMLを保存 (document.body に変更)
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('content.ts: メッセージを受信しました:', request, sender);

  if (request.action === 'emulateGmail') {
    console.log('Gmailレンダリングのエミュレートが開始されました。');
    gmailEmulationWidth = request.width; // widthを変数に保存

    if (document.readyState === 'complete') {
      // DOM構築が完了している場合、すぐに実行
      console.log('DOM構築が完了しています。エミュレートを実行します。');
      if (gmailEmulationWidth !== null) {
        emulateGmailRendering(gmailEmulationWidth, sendResponse); // sendResponse を渡す
      }
    } else {
      // まだの場合、windowのloadイベントを待つ
      console.log('DOM構築が完了していません。loadイベントを待ちます。');
      window.addEventListener('load', () => {
        console.log('loadイベントが発生しました。エミュレートを実行します。');
        if (gmailEmulationWidth !== null) {
          emulateGmailRendering(gmailEmulationWidth, sendResponse); // sendResponse を渡す
        }
      });
    }
  } else if (request.action === 'undoGmailEmulation') {
    console.log('Gmailレンダリングのエミュレートを元に戻します。');
    undoGmailEmulation(sendResponse); // sendResponse を渡す
  }

  // メッセージの送信が完了した直後に応答を返す
  // sendResponse({ message: '要求を受信しました。' });
  return true; // 非同期処理を示すために true を返す
});

function emulateGmailRendering(width: string, sendResponse: (response?: any) => void) {
  console.log('emulateGmailRendering が呼び出されました。width:', width);

  try {
    // HTMLの取得
    let html = document.body.outerHTML;
    console.log('HTMLを取得しました。');

    // !important プロパティを削除
    html = html.replace(/!important/g, '');
    console.log('!important プロパティを削除しました。');

    // CSSのサポート制限
    const supportedCSS = removeUnsupportedCSS(html);
    console.log('CSSのサポート制限を行いました。');

    // <style>タグ内のCSSのインライン化
    const inlinedCSS = inlineStyles(supportedCSS);
    console.log('<style>タグ内のCSSのインライン化を行いました。');

    // JavaScriptの無効化
    const disabledJS = disableJavaScript(inlinedCSS);
    console.log('JavaScriptの無効化を行いました。');

    // 自動幅調整
    const adjustedWidth = adjustWidth(disabledJS, width);
    console.log('自動幅調整を行いました。', adjustedWidth);

    // 画像の遅延読み込み
    const lazyLoadedImages = lazyLoadImages(adjustedWidth);
    console.log('画像の遅延読み込みを行いました。');

    // エミュレート結果でHTMLを上書き
    console.log('置き換え前のHTML:', document.body.outerHTML);
    document.body.outerHTML = lazyLoadedImages;
    console.log('エミュレート結果でHTMLを上書きしました。');
    console.log('置き換え後のHTML:', document.body.outerHTML);

    // emulateGmailRendering 関数の実行完了後に sendResponse を呼び出す
    sendResponse({ message: 'エミュレート要求を受信しました。' });
  } catch (error) {
    console.error('emulateGmailRendering でエラーが発生しました:', error);
  }
}

function removeUnsupportedCSS(html: string): string {
  console.log('removeUnsupportedCSS が呼び出されました。');
  // サポートされていないCSSを削除する処理を実装
  return html;
}

function disableJavaScript(html: string): string {
  console.log('disableJavaScript が呼び出されました。');
  // JavaScriptを無効化する処理を実装
  return html;
}

function lazyLoadImages(html: string): string {
  console.log('lazyLoadImages が呼び出されました。');
  // 画像の遅延読み込みを実装
  return html;
}

function inlineStyles(html: string): string {
  console.log('inlineStyles が呼び出されました。');
  const soup = new DOMParser().parseFromString(html, 'text/html');
  const styles = soup.querySelectorAll('style');

  styles.forEach((style) => {
    const cssText = style.textContent;
    soup.querySelectorAll('*[style]').forEach((element) => {
      const inlineStyle = element.getAttribute('style') || '';
      element.setAttribute('style', `${inlineStyle} ${cssText}`);
    });
    style.remove();
  });

  console.log('inlineStyles が完了しました。');
  return soup.documentElement.outerHTML;
}

function adjustWidth(html: string, width: string): string {
  console.log('adjustWidth が呼び出されました。 width:', width);
  const soup = new DOMParser().parseFromString(html, 'text/html');
  const body = soup.querySelector('body');
  if (body) {
    body.style.width = `${width}px`;
    body.style.maxWidth = `${width}px`; // max-widthプロパティを追加
    body.style.margin = '0 auto';
  }
  console.log('adjustWidth が完了しました。');
  return soup.documentElement.outerHTML;
}

function undoGmailEmulation(sendResponse: (response?: any) => void) { // sendResponse を引数に追加
  console.log('undoGmailEmulation が呼び出されました。');

  document.body.outerHTML = originalHTML; // HTMLを元に戻す (document.body に変更)
  console.log('undoGmailEmulation が完了しました。');
  sendResponse({ message: 'アンドゥが完了しました。' });

  // popup.ts にアンドゥが完了したことを通知
  chrome.runtime.sendMessage({ action: 'undoGmailEmulationCompleted' });
}
