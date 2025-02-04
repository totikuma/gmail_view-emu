"use strict";
let gmailEmulationWidth = null;
let originalHTML = null;
let isDarkMode = false;
window.addEventListener('load', () => {
    console.log('コンテンツスクリプトが読み込まれました。');
    originalHTML = document.documentElement.outerHTML;
});
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('content.ts: メッセージを受信しました:', request);
    if (request.action === 'emulateGmail') {
        gmailEmulationWidth = request.width;
        if (!gmailEmulationWidth) {
            console.error('幅が指定されていません。');
            sendResponse({ error: '幅が指定されていません。' });
            return true;
        }
        if (document.readyState === 'complete') {
            emulateGmailRendering(gmailEmulationWidth, request, sendResponse);
        }
        else {
            window.addEventListener('load', () => {
                if (gmailEmulationWidth) {
                    emulateGmailRendering(gmailEmulationWidth, request, sendResponse);
                }
                else {
                    console.error('幅が無効になっています。');
                    sendResponse({ error: '幅が無効になっています。' });
                }
            });
        }
    }
    else if (request.action === 'undoGmailEmulation') {
        undoGmailEmulation(sendResponse);
    }
    return true;
});
function emulateGmailRendering(width, request, sendResponse) {
    try {
        const currentDarkMode = isDarkMode;
        let html = originalHTML || document.documentElement.outerHTML;
        html = removeUnsupportedCSS(html);
        html = adjustWidth(html, width);
        if (request.darkMode !== currentDarkMode) {
            if (request.darkMode) {
                html = applyDarkMode(html);
            }
            else {
                html = originalHTML || html;
                isDarkMode = false;
            }
        }
        html = inlineStyles(html);
        document.documentElement.innerHTML = html;
        sendResponse({
            message: 'エミュレート要求を受信しました。',
            darkMode: isDarkMode
        });
    }
    catch (error) {
        console.error('エミュレート処理でエラーが発生:', error);
        if (error instanceof Error) {
            sendResponse({ error: error.message });
        }
        else {
            sendResponse({ error: 'Unknown error occurred' });
        }
    }
}
function removeUnsupportedCSS(html) {
    const cssReplacements = [
        { from: /position:\s*(absolute|fixed|sticky)/g, to: 'position: static' },
        { from: /float:\s*[a-z]+;/g, to: '' },
        { from: /display:\s*(flex|grid)/g, to: 'display: block' },
        { from: /z-index:\s*[0-9]+;/g, to: '' },
        { from: /overflow:\s*(hidden|scroll)/g, to: 'overflow: visible' },
        { from: /background-image:\s*url\([^)]+\);/g, to: '' },
        { from: /font-family:\s*[^;]+;/g, to: 'font-family: Arial, Helvetica, sans-serif;' },
        { from: /!important/g, to: '' }
    ];
    return cssReplacements.reduce((result, { from, to }) => result.replace(from, to), html);
}
function inlineStyles(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    doc.querySelectorAll('style').forEach((style) => {
        if (style.id === 'gmail-dark-mode-emulation')
            return;
        const rules = (style.textContent || '').split('}')
            .filter(rule => rule.trim());
        rules.forEach(rule => {
            try {
                const [selector, styles] = rule.split('{');
                if (selector && styles) {
                    const hasColorProperty = styles.includes('color:');
                    doc.querySelectorAll(selector.trim()).forEach(element => {
                        // 現在のスタイルを解析
                        const currentStyles = new Map();
                        const currentStyle = element.getAttribute('style') || '';
                        currentStyle.split(';').forEach(style => {
                            const [prop, value] = style.split(':').map(s => s.trim());
                            if (prop && value) {
                                currentStyles.set(prop, value);
                            }
                        });
                        // 新しいスタイルを解析して追加/更新
                        const newStyles = styles.trim().split(';').forEach(style => {
                            const [prop, value] = style.split(':').map(s => s.trim());
                            if (prop && value) {
                                // リンクの色は特別処理
                                if (prop === 'color' && element instanceof HTMLAnchorElement) {
                                    if (!currentStyles.has('color')) {
                                        currentStyles.set(prop, value);
                                    }
                                }
                                else {
                                    currentStyles.set(prop, value);
                                }
                            }
                        });
                        // スタイルを文字列に戻す
                        const combinedStyles = Array.from(currentStyles.entries())
                            .map(([prop, value]) => `${prop}: ${value}`)
                            .join('; ');
                        element.setAttribute('style', combinedStyles);
                    });
                }
            }
            catch (e) {
                console.warn('CSSルール適用エラー:', rule);
            }
        });
        style.remove();
    });
    return doc.documentElement.outerHTML;
}
function adjustWidth(html, width) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const body = doc.querySelector('body');
    if (body) {
        body.style.width = `${width}px`;
        body.style.maxWidth = `${width}px`;
        body.style.margin = '0 auto';
    }
    return doc.documentElement.outerHTML;
}
function undoGmailEmulation(sendResponse) {
    if (originalHTML) {
        document.documentElement.innerHTML = originalHTML;
        gmailEmulationWidth = null;
        isDarkMode = false;
        const darkModeStyle = document.getElementById('gmail-dark-mode-emulation');
        darkModeStyle?.remove();
        sendResponse({ message: 'アンドゥが完了しました。' });
        chrome.runtime.sendMessage({
            action: 'undoGmailEmulationCompleted',
            darkMode: false
        });
    }
    else {
        sendResponse({ message: 'アンドゥに失敗しました。' });
    }
}
function applyDarkMode(html) {
    console.log('applyDarkMode が呼び出されました。');
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

    /* リンク - デフォルトカラーのみ上書き */
    a:not([style*="color"]), .link:not([style*="color"]) {
      color: #8ab4f8 !important;
    }

    /* カスタムカラーのリンクは明度のみ調整 */
    a[style*="color"], .link[style*="color"] {
      filter: brightness(1.2);
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
    // リンクの色を処理
    doc.querySelectorAll('a[style*="color"]').forEach(link => {
        const computedColor = link.style.color;
        if (computedColor) {
            // 明度を計算
            const rgb = computedColor.match(/\d+/g);
            if (rgb) {
                const brightness = (parseInt(rgb[0]) * 299 +
                    parseInt(rgb[1]) * 587 +
                    parseInt(rgb[2]) * 114) / 1000;
                // 暗すぎる色は明るく調整
                if (brightness < 128) {
                    const hsl = rgbToHsl(parseInt(rgb[0]), parseInt(rgb[1]), parseInt(rgb[2]));
                    const adjustedColor = hslToRgb(hsl.h, hsl.s, Math.min(0.8, hsl.l * 1.5));
                    link.style.color = `rgb(${adjustedColor.r}, ${adjustedColor.g}, ${adjustedColor.b}) !important`;
                }
            }
        }
    });
    isDarkMode = true;
    return doc.documentElement.outerHTML;
}
// RGB to HSL変換ヘルパー関数
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0;
    }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }
    return { h, s, l };
}
// HSL to RGB変換ヘルパー関数
function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    }
    else {
        const hue2rgb = (p, q, t) => {
            if (t < 0)
                t += 1;
            if (t > 1)
                t -= 1;
            if (t < 1 / 6)
                return p + (q - p) * 6 * t;
            if (t < 1 / 2)
                return q;
            if (t < 2 / 3)
                return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}
