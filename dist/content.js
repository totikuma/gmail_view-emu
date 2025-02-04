"use strict";
let gmailEmulationWidth = null;
let originalHTML = null;
let isDarkMode = false; // ダークモード状態を追跡
// DOMContentLoaded イベントの代わりに window.onload イベントを使用
window.addEventListener('load', () => {
    console.log('コンテンツスクリプトが読み込まれました。');
    // 初期HTMLを保存
    originalHTML = document.documentElement.outerHTML;
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
                emulateGmailRendering(gmailEmulationWidth, request, sendResponse); // requestを渡す
            }
        }
        else {
            // まだの場合、windowのloadイベントを待つ
            console.log('DOM構築が完了していません。loadイベントを待ちます。');
            window.addEventListener('load', () => {
                console.log('loadイベントが発生しました。エミュレートを実行します。');
                if (gmailEmulationWidth !== null) {
                    emulateGmailRendering(gmailEmulationWidth, request, sendResponse); // requestを渡す
                }
            });
        }
    }
    else if (request.action === 'undoGmailEmulation') {
        console.log('Gmailレンダリングのエミュレートを元に戻します。');
        undoGmailEmulation(sendResponse); // sendResponse を渡す
    }
    // メッセージの送信が完了した直後に応答を返す
    // sendResponse({ message: '要求を受信しました。' });
    return true; // 非同期処理を示すために true を返す
});
function emulateGmailRendering(width, request, sendResponse) {
    console.log('emulateGmailRendering が呼び出されました。width:', width);
    try {
        // 現在の状態を確認
        const currentDarkMode = isDarkMode;
        // HTMLの取得（初回の場合はoriginalHTMLを使用）
        let html = originalHTML || document.documentElement.outerHTML;
        console.log('HTMLを取得しました。');
        // 処理の実行
        html = html.replace(/!important/g, '');
        html = removeUnsupportedCSS(html);
        html = adjustWidth(html, width);
        // ダークモードの適用（状態が変更される場合のみ）
        if (request.darkMode !== currentDarkMode) {
            if (request.darkMode) {
                html = applyDarkMode(html);
                console.log('ダークモードを適用しました。');
            }
            else {
                // ダークモードを解除する場合は元のHTMLから再処理
                html = originalHTML || html;
                isDarkMode = false;
                console.log('ダークモードを解除しました。');
            }
        }
        html = inlineStyles(html);
        html = disableJavaScript(html);
        html = lazyLoadImages(html);
        // 結果を適用
        document.documentElement.innerHTML = html;
        console.log('エミュレート結果でHTMLを上書きしました。');
        sendResponse({
            message: 'エミュレート要求を受信しました。',
            darkMode: isDarkMode
        });
    }
    catch (error) {
        console.error('emulateGmailRendering でエラーが発生しました:', error);
        // エラーオブジェクトの型を適切に処理
        if (error instanceof Error) {
            sendResponse({ error: error.message });
        }
        else {
            sendResponse({ error: 'Unknown error occurred' });
        }
    }
}
function removeUnsupportedCSS(html) {
    console.log('removeUnsupportedCSS が呼び出されました。');
    // サポートされていないCSSを削除する処理を実装
    // position プロパティの置換
    html = html.replace(/position:\s*(absolute|fixed|sticky)/g, 'position: static');
    // float プロパティの削除
    html = html.replace(/float:\s*[a-z]+;/g, '');
    // display プロパティの置換
    html = html.replace(/display:\s*(flex|grid)/g, 'display: block');
    // z-index プロパティの削除
    html = html.replace(/z-index:\s*[0-9]+;/g, '');
    // overflow プロパティの置換
    html = html.replace(/overflow:\s*(hidden|scroll)/g, 'overflow: visible');
    // background-image プロパティの削除
    html = html.replace(/background-image:\s*url\([^)]+\);/g, '');
    // font-family プロパティの置換
    html = html.replace(/font-family:\s*[^;]+;/g, 'font-family: Arial, Helvetica, sans-serif;');
    // 新しい処理を追加
    html = html.replace(/prefers-color-scheme:\s*light/g, 'prefers-color-scheme: dark');
    html = html.replace(/color-scheme:\s*[a-z]+/g, 'color-scheme: dark');
    return html;
}
function disableJavaScript(html) {
    console.log('disableJavaScript が呼び出されました。');
    // JavaScriptを無効化する処理を実装
    return html;
}
function lazyLoadImages(html) {
    console.log('lazyLoadImages が呼び出されました。');
    // 画像の遅延読み込みを実装
    return html;
}
function inlineStyles(html) {
    console.log('inlineStyles が呼び出されました。');
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    // style要素を収集
    const styles = doc.querySelectorAll('style');
    // 各style要素の内容を処理
    styles.forEach((style) => {
        if (style.id === 'gmail-dark-mode-emulation') {
            // ダークモードのスタイルはスキップ
            return;
        }
        const cssText = style.textContent || '';
        // CSSルールをパースして個別に適用
        const rules = cssText.split('}').filter(rule => rule.trim());
        rules.forEach(rule => {
            try {
                const [selector, styles] = rule.split('{');
                if (selector && styles) {
                    const elements = doc.querySelectorAll(selector.trim());
                    elements.forEach(element => {
                        const currentStyle = element.getAttribute('style') || '';
                        element.setAttribute('style', `${currentStyle} ${styles.trim()}`);
                    });
                }
            }
            catch (e) {
                console.warn('CSSルールの適用に失敗:', rule, e);
            }
        });
        // 処理済みのstyle要素を削除
        if (style.parentNode) {
            style.parentNode.removeChild(style);
        }
    });
    return doc.documentElement.outerHTML;
}
function adjustWidth(html, width) {
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
function undoGmailEmulation(sendResponse) {
    console.log('undoGmailEmulation が呼び出されました。');
    if (originalHTML) {
        // 完全に元の状態に戻す
        document.documentElement.innerHTML = originalHTML;
        // 状態をリセット
        gmailEmulationWidth = null;
        isDarkMode = false;
        // ダークモードのスタイル要素を確実に削除
        const darkModeStyle = document.getElementById('gmail-dark-mode-emulation');
        if (darkModeStyle) {
            darkModeStyle.remove();
        }
        console.log('undoGmailEmulation が完了しました。');
        sendResponse({ message: 'アンドゥが完了しました。' });
        // popup.ts にアンドゥが完了したことを通知
        chrome.runtime.sendMessage({
            action: 'undoGmailEmulationCompleted',
            darkMode: false
        });
    }
    else {
        console.warn('元のHTMLが保存されていません。');
        sendResponse({ message: 'アンドゥに失敗しました。' });
    }
}
function applyDarkMode(html) {
    console.log('applyDarkMode が呼び出されました。');
    // 既存のダークモードスタイルを削除
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const existingDarkMode = doc.getElementById('gmail-dark-mode-emulation');
    if (existingDarkMode) {
        existingDarkMode.remove();
    }
    // Gmailダークモード用のスタイルを定義
    const darkModeStyles = `
    /* 基本的な背景と文字色 */
    body, .view-container, .content-wrapper {
      background-color: #1f1f1f !important;
      color: #e3e3e3 !important;
    }

    /* メールコンテンツ領域 */
    .email-content, .message-body, .message-container {
      background-color: #2d2d2d !important;
      color: #e3e3e3 !important;
      border-color: #404040 !important;
    }

    /* ヘッダー、フッター、サイドバー */
    header, footer, .sidebar, .navigation {
      background-color: #2d2d2d !important;
      border-color: #404040 !important;
    }

    /* リンク */
    a, .link {
      color: #8ab4f8 !important;
    }

    /* ボタン */
    button, .button, input[type="button"], input[type="submit"] {
      background-color: #404040 !important;
      color: #e3e3e3 !important;
      border-color: #505050 !important;
    }

    /* 入力フィールド */
    input[type="text"], input[type="email"], textarea {
      background-color: #2d2d2d !important;
      color: #e3e3e3 !important;
      border-color: #404040 !important;
    }

    /* テーブル */
    table, th, td {
      background-color: #2d2d2d !important;
      color: #e3e3e3 !important;
      border-color: #404040 !important;
    }

    /* 区切り線 */
    hr {
      border-color: #404040 !important;
    }

    /* 画像の色反転（オプション） */
    img:not([src*="data:"]) {
      filter: brightness(0.8) contrast(1.2);
    }

    /* 選択時の背景色 */
    ::selection {
      background-color: #404040 !important;
      color: #ffffff !important;
    }

    /* スクロールバー */
    ::-webkit-scrollbar {
      width: 12px;
      background-color: #1f1f1f;
    }

    ::-webkit-scrollbar-thumb {
      background-color: #404040;
      border-radius: 6px;
    }

    /* メールリスト */
    .email-list-item, .message-list-item {
      background-color: #2d2d2d !important;
      border-bottom: 1px solid #404040 !important;
    }

    .email-list-item:hover, .message-list-item:hover {
      background-color: #353535 !important;
    }
  `;
    // スタイルを適用
    const style = doc.createElement('style');
    style.id = 'gmail-dark-mode-emulation';
    style.textContent = darkModeStyles;
    doc.head.appendChild(style);
    // 状態を更新
    isDarkMode = true;
    return doc.documentElement.outerHTML;
}
