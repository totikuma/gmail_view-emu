"use strict";
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'emulateGmail') {
        console.log('Gmailレンダリングのエミュレートが開始されました。'); // デバッグログ出力
        const width = request.width;
        emulateGmailRendering(width);
    }
});
function emulateGmailRendering(width) {
    // HTMLを取得
    const html = document.documentElement.outerHTML;
    // CSSのサポート制限 (例: position: fixedの削除)
    const cssSupportedHtml = html.replace(/position:\s*fixed;/g, '');
    // <style>タグ内のCSSのインライン化
    const inlineCssHtml = inlineStyles(cssSupportedHtml);
    // JavaScriptの無効化
    const noScriptHtml = inlineCssHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    // 自動幅調整
    const adjustedWidthHtml = adjustWidth(noScriptHtml, width);
    // 画像の遅延読み込み
    const lazyLoadImagesHtml = adjustedWidthHtml.replace(/<img\b([^>]*)/gi, '<img loading="lazy" $1');
    // エミュレート結果でHTMLを上書き
    document.body.innerHTML = lazyLoadImagesHtml;
}
function inlineStyles(html) {
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
function adjustWidth(html, width) {
    const soup = new DOMParser().parseFromString(html, 'text/html');
    soup.body.style.maxWidth = `${width}px`;
    soup.body.style.margin = '0 auto';
    return soup.documentElement.outerHTML;
}
