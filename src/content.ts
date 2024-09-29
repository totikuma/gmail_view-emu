// content.ts
let gmailEmulationWidth: string | null = null; // widthを受け取る変数を用意

document.addEventListener('DOMContentLoaded', () => {
  console.log('コンテンツスクリプトが読み込まれました。');

  // メッセージ受信時の処理
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('メッセージを受信しました:', request);

    if (request.action === 'emulateGmail') {
      console.log('Gmailレンダリングのエミュレートが開始されました。');
      gmailEmulationWidth = request.width; // widthを変数に保存

      if (document.readyState === 'complete') {
        // DOM構築が完了している場合、すぐに実行
        if (gmailEmulationWidth !== null) {
          emulateGmailRendering(gmailEmulationWidth);
        }
      } else {
        // まだの場合、windowのloadイベントを待つ
        window.addEventListener('load', () => {
          if (gmailEmulationWidth !== null) {
            emulateGmailRendering(gmailEmulationWidth);
          }
        });
      }
      sendResponse({ message: 'エミュレート要求を受信しました。' });
    }
  });
});

function emulateGmailRendering(width: string) {
  // HTMLを取得
  const html = document.documentElement.outerHTML;

  // CSSのサポート制限 (例: position: fixedの削除)
  const cssSupportedHtml = html.replace(/position:\s*fixed;/g, '');

  // <style>タグ内のCSSのインライン化
  const inlineCssHtml = inlineStyles(cssSupportedHtml);

  // JavaScriptの無効化
  const noScriptHtml = inlineCssHtml.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ''
  );

  // 自動幅調整
  const adjustedWidthHtml = adjustWidth(noScriptHtml, width);

  // 画像の遅延読み込み
  const lazyLoadImagesHtml = adjustedWidthHtml.replace(
    /<img\b([^>]*)/gi,
    '<img loading="lazy" $1'
  );

  // エミュレート結果でHTMLを上書き
  document.body.innerHTML = lazyLoadImagesHtml;
}

function inlineStyles(html: string): string {
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

  return soup.documentElement.outerHTML;
}

function adjustWidth(html: string, width: string): string {
  const soup = new DOMParser().parseFromString(html, 'text/html');
  soup.body.style.maxWidth = `${width}px`;
  soup.body.style.margin = '0 auto';
  return soup.documentElement.outerHTML;
}
