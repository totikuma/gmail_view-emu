"use strict";
let gmailEmulationWidth = null; // widthを受け取る変数を用意
let originalHTML = ''; // エミュレート前のHTMLを保存する変数
document.addEventListener('DOMContentLoaded', () => {
    console.log('コンテンツスクリプトが読み込まれました。');
    originalHTML = document.documentElement.outerHTML; // 初期HTMLを保存
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
                emulateGmailRendering(gmailEmulationWidth);
            }
        }
        else {
            // まだの場合、windowのloadイベントを待つ
            console.log('DOM構築が完了していません。loadイベントを待ちます。');
            window.addEventListener('load', () => {
                console.log('loadイベントが発生しました。エミュレートを実行します。');
                if (gmailEmulationWidth !== null) {
                    emulateGmailRendering(gmailEmulationWidth);
                }
            });
        }
        // 必ず sendResponse を呼び出す
        console.log('content.ts: エミュレート要求を受信しました。');
        sendResponse({ message: 'エミュレート要求を受信しました。' });
    }
    else if (request.action === 'undoGmailEmulation') {
        console.log('Gmailレンダリングのエミュレートをアンドゥします。');
        undoGmailEmulation();
        // 必ず sendResponse を呼び出す
        console.log('content.ts: アンドゥが完了しました。');
        sendResponse({ message: 'アンドゥが完了しました。' });
    }
    else {
        console.log('content.ts: 不明なアクションです。', request.action);
        sendResponse({ message: '不明なアクションです。' });
    }
});
function emulateGmailRendering(width) {
    console.log('emulateGmailRendering が呼び出されました。 width:', width);
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
    console.log('emulateGmailRendering が完了しました。');
}
function inlineStyles(html) {
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
function adjustWidth(html, width) {
    console.log('adjustWidth が呼び出されました。 width:', width);
    const soup = new DOMParser().parseFromString(html, 'text/html');
    soup.body.style.maxWidth = `${width}px`;
    soup.body.style.margin = '0 auto';
    console.log('adjustWidth が完了しました。');
    return soup.documentElement.outerHTML;
}
function undoGmailEmulation() {
    console.log('undoGmailEmulation が呼び出されました。');
    document.documentElement.outerHTML = originalHTML; // HTMLを元に戻す
    console.log('undoGmailEmulation が完了しました。');
}
