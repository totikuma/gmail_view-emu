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

    // 必ず sendResponse を呼び出す
    // console.log('content.ts: エミュレート要求を受信しました。');
    // sendResponse({ message: 'エミュレート要求を受信しました。' });
  } else if (request.action === 'undoGmailEmulation') {
    console.log('Gmailレンダリングのエミュレートをアンドゥします。');
    undoGmailEmulation(sendResponse); // sendResponse を引数として渡す

  } else {
    console.log('content.ts: 不明なアクションです。', request.action);
    sendResponse({ message: '不明なアクションです。' })
  }

  // 非同期処理を行う場合は、true を返す
  return true;
});



function emulateGmailRendering(width: string, sendResponse: (response?: any) => void) { // sendResponse を引数に追加
  console.log('emulateGmailRendering が呼び出されました。 width:', width);
  // HTMLを取得
  const parser = new DOMParser();
  const soup = parser.parseFromString(document.documentElement.outerHTML, 'text/html');

  // CSSのサポート制限 (例: position: fixedの削除)
  soup.querySelectorAll('*[style]').forEach((element) => {
    const style = element.getAttribute('style') || '';
    element.setAttribute('style', style.replace(/position:\s*fixed;/g, ''));
  });

  // <style>タグ内のCSSのインライン化
  const styles = soup.querySelectorAll('style');
  styles.forEach((style) => {
    const cssText = style.textContent;
    soup.querySelectorAll('*[style]').forEach((element) => {
      const inlineStyle = element.getAttribute('style') || '';
      element.setAttribute('style', `${inlineStyle} ${cssText}`);
    });
    style.remove();
  });

  // JavaScriptの無効化
  soup.querySelectorAll('script').forEach((script) => {
    script.remove();
  });

  // 自動幅調整
  soup.body.style.maxWidth = `${width}px`;
  soup.body.style.margin = '0 auto';

  // 画像の遅延読み込み
  soup.querySelectorAll('img').forEach((img) => {
    img.setAttribute('loading', 'lazy');
  });

  // エミュレート結果でHTMLを上書き
  document.body.innerHTML = soup.documentElement.outerHTML;
  console.log('emulateGmailRendering が完了しました。');

  // DOM操作が完了した後に sendResponse を呼び出す
  sendResponse({ message: 'エミュレート要求を受信しました。' });
  console.log('エミュレート結果:', document.body.outerHTML); // デバッグログを追加
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
  soup.body.style.maxWidth = `${width}px`;
  soup.body.style.margin = '0 auto';
  console.log('adjustWidth が完了しました。');
  return soup.documentElement.outerHTML;
}

function undoGmailEmulation(sendResponse: (response?: any) => void) { // sendResponse を引数に追加
  console.log('undoGmailEmulation が呼び出されました。');

  // DOM操作を非同期で実行し、完了後に sendResponse を呼び出す
  // sendResponse({ message: 'アンドゥが完了しました。' }); // DOM操作の前に sendResponse を呼び出す

  requestAnimationFrame(() => {
    document.body.outerHTML = originalHTML; // HTMLを元に戻す (document.body に変更)
    console.log('undoGmailEmulation が完了しました。');
    sendResponse({ message: 'アンドゥが完了しました。' });

    // popup.ts にアンドゥが完了したことを通知
    chrome.runtime.sendMessage({ action: 'undoGmailEmulationCompleted' });
  });
}
