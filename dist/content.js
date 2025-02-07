"use strict";
let gmailEmulationWidth = null;
let originalHTML = null;
let contentDarkMode = false;
// 設定値
const DARK_MODE_CONFIG = {
    defaultDarkFactor: 0.18,
    maxDarkFactor: 0.25,
    depthDarkFactorIncrement: 0.02,
    interactiveDarkFactor: 0.22,
    cardDarkFactor: 0.20
};
// ダークモードのスタイル定義をOutlook風に変更
const createDarkModeStyles = () => `
  /* 基本背景色の設定 - より深い階層構造を反映 */
  body {
    background-color: #11100f !important;
  }

  /* 最外層のコンテナ */
  body > table {
    background-color: #1d1d1f !important;
  }

  /* メインコンテンツエリア */
  body > table table {
    background-color: #2d2d30 !important;
  }

  /* テーブルの階層による色分け */
  table table table {
    background-color: #333336 !important;
  }

  /* テーブルセルの背景色処理 - 階層に応じた色分け */
  td:not([style*="background"]):not([bgcolor]) {
    background-color: inherit !important;
  }

  /* カード状のコンテンツ */
  [style*="box-shadow"],
  [style*="border-radius"] {
    background-color: #2d2d30 !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
  }

  /* テキストカラーの基本設定 - コントラスト改善 */
  body *:not([style*="color"]):not(a):not(img):not(h1):not(h2):not(h3):not(h4):not(h5):not(h6) {
    color: #f1f1f1 !important;
  }

  /* 見出し要素 */
  h1, h2, h3, h4, h5, h6 {
    color: #ffffff !important;
    font-weight: 500 !important;
  }

  /* 二次的なテキスト */
  .secondary-text,
  small,
  .small,
  time,
  .timestamp,
  .meta-info {
    color: #a0a0a0 !important;
  }

  /* 引用テキスト */
  blockquote,
  .quote {
    color: #b8b8b8 !important;
    border-left: 3px solid #404040 !important;
    padding-left: 10px !important;
  }

  /* リンクの処理 - Outlook風の控えめな強調 */
  a:not([style*="color"]) {
    color: #c8c8c8 !important;
    text-decoration: none !important;
  }
  a:not([style*="color"]):hover {
    color: #ffffff !important;
    background-color: rgba(255, 255, 255, 0.05) !important;
  }

  /* ボタン要素の処理 */
  button,
  input[type="button"],
  input[type="submit"] {
    background-color: #3c3c3c !important;
    color: #f1f1f1 !important;
    border: 1px solid #4a4a4a !important;
  }

  button:hover,
  input[type="button"]:hover,
  input[type="submit"]:hover {
    background-color: #454545 !important;
    border-color: #5a5a5a !important;
  }

  /* フォーム要素の処理 */
  input, textarea, select {
    background-color: #333336 !important;
    color: #f1f1f1 !important;
    border: 1px solid #404040 !important;
  }

  /* ボーダー色の調整 - より明確な区切り */
  [style*="border"] {
    border-color: #404040 !important;
  }

  /* 画像の処理 - より自然な見え方に */
  img:not([src^="data:"]) {
    filter: brightness(0.9) contrast(1.1) saturate(0.95) !important;
  }
`;
// カラー処理ユーティリティ
class ColorUtils {
    static parseRGB(color) {
        const rgb = color.match(/\d+/g);
        if (!rgb || rgb.length !== 3)
            return null;
        return {
            r: Number(rgb[0]),
            g: Number(rgb[1]),
            b: Number(rgb[2])
        };
    }
    static calculateBrightness({ r, g, b }) {
        return (r * 299 + g * 587 + b * 114) / 1000;
    }
    static isLightBackground(color) {
        const rgb = this.parseRGB(color);
        if (!rgb)
            return false;
        return this.calculateBrightness(rgb) > 128;
    }
    static applyDarkFactor({ r, g, b }, darkFactor) {
        const darkR = Math.floor(r * darkFactor);
        const darkG = Math.floor(g * darkFactor);
        const darkB = Math.floor(b * darkFactor);
        return `rgb(${darkR}, ${darkG}, ${darkB})`;
    }
}
// 要素処理ユーティリティ
class ElementUtils {
    static getElementDepth(element) {
        let depth = 0;
        let parent = element.parentElement;
        while (parent) {
            if (parent.tagName === element.tagName)
                depth++;
            parent = parent.parentElement;
        }
        return depth;
    }
    static getDarkFactor(element) {
        if (element.tagName === 'TABLE') {
            const depth = this.getElementDepth(element);
            return Math.min(DARK_MODE_CONFIG.defaultDarkFactor +
                (depth * DARK_MODE_CONFIG.depthDarkFactorIncrement), DARK_MODE_CONFIG.maxDarkFactor);
        }
        if (element.closest('a') || element.tagName === 'BUTTON' || element.tagName === 'INPUT') {
            return DARK_MODE_CONFIG.interactiveDarkFactor;
        }
        if (element.matches('[style*="box-shadow"], [style*="border-radius"]')) {
            return DARK_MODE_CONFIG.cardDarkFactor;
        }
        return DARK_MODE_CONFIG.defaultDarkFactor;
    }
    static adjustTextColor(element) {
        if (element instanceof HTMLAnchorElement)
            return;
        if (element.matches('h1, h2, h3, h4, h5, h6')) {
            element.style.color = '#ffffff';
        }
        else if (element.matches('.secondary-text, small, .small, time, .timestamp, .meta-info')) {
            element.style.color = '#a0a0a0';
        }
        else {
            element.style.color = '#f1f1f1';
        }
    }
}
window.addEventListener('load', () => {
    console.log('コンテンツスクリプトが読み込まれました。');
    originalHTML = document.documentElement.outerHTML;
});
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('content.ts: メッセージを受信しました:', request);
    if (request.action === 'emulateGmail') {
        // 幅のチェックを削除し、常に処理を実行
        if (document.readyState === 'complete') {
            emulateGmailRendering(request.width, request, sendResponse);
        }
        else {
            window.addEventListener('load', () => {
                emulateGmailRendering(request.width, request, sendResponse);
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
        const currentDarkMode = contentDarkMode;
        let html = originalHTML || document.documentElement.outerHTML;
        let needsUpdate = false;
        // スマホビューの状態管理
        if (width) {
            // スマホビュー適用
            html = removeUnsupportedCSS(html);
            html = adjustWidth(html, width);
            needsUpdate = true;
            gmailEmulationWidth = width; // 幅を保存
        }
        else if (gmailEmulationWidth) {
            // スマホビュー解除
            html = originalHTML || html;
            gmailEmulationWidth = null; // 幅をリセット
            needsUpdate = true;
        }
        // ダークモードの状態管理
        if (request.darkMode !== currentDarkMode) {
            if (request.darkMode) {
                html = applyDarkMode(html);
                needsUpdate = true;
            }
            else {
                contentDarkMode = false;
                const darkModeStyle = document.getElementById('gmail-dark-mode-emulation');
                if (darkModeStyle) {
                    darkModeStyle.remove();
                }
            }
        }
        // 変更がある場合のみHTMLを更新
        if (needsUpdate) {
            html = inlineStyles(html);
            document.documentElement.innerHTML = html;
            // ダークモードが有効な場合は再適用
            if (contentDarkMode) {
                applyDarkMode(html);
            }
        }
        sendResponse({
            message: 'エミュレート要求を受信しました。',
            darkMode: contentDarkMode,
            width: gmailEmulationWidth
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
        contentDarkMode = false;
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
    const doc = new DOMParser().parseFromString(html, 'text/html');
    try {
        // スタイルの適用
        const existingDarkMode = doc.getElementById('gmail-dark-mode-emulation');
        if (existingDarkMode) {
            existingDarkMode.remove();
        }
        const style = doc.createElement('style');
        style.id = 'gmail-dark-mode-emulation';
        style.textContent = createDarkModeStyles();
        doc.head.appendChild(style);
        // 背景色を持つ要素の処理
        doc.querySelectorAll('[style*="background"]').forEach(element => {
            const computedStyle = window.getComputedStyle(element);
            const bgColor = computedStyle.backgroundColor;
            if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
                const rgb = ColorUtils.parseRGB(bgColor);
                if (!rgb)
                    return;
                const brightness = ColorUtils.calculateBrightness(rgb);
                if (brightness > 128) {
                    const darkFactor = ElementUtils.getDarkFactor(element);
                    element.style.backgroundColor = ColorUtils.applyDarkFactor(rgb, darkFactor);
                    ElementUtils.adjustTextColor(element);
                }
            }
        });
        // 画像の処理
        doc.querySelectorAll('img').forEach(img => {
            if (img.src.startsWith('data:'))
                return;
            const parent = img.parentElement;
            if (!parent)
                return;
            const parentBg = window.getComputedStyle(parent).backgroundColor;
            const isLightParent = ColorUtils.isLightBackground(parentBg);
            img.style.filter = isLightParent
                ? 'brightness(0.85) contrast(1.1) saturate(0.95)'
                : 'brightness(0.9) contrast(1.05) saturate(0.98)';
        });
        contentDarkMode = true;
        return doc.documentElement.outerHTML;
    }
    catch (error) {
        console.error('ダークモード適用中にエラーが発生:', error);
        throw error;
    }
}
// MutationObserver も同様に更新
function attachDarkModeObserver() {
    const observer = new MutationObserver((mutations) => {
        if (contentDarkMode && !document.getElementById('gmail-dark-mode-emulation')) {
            const style = document.createElement('style');
            style.id = 'gmail-dark-mode-emulation';
            style.textContent = createDarkModeStyles();
            document.head.appendChild(style);
            // 動的に追加された要素に対しても背景色の処理を適用
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node instanceof HTMLElement) {
                        if (node.hasAttribute('style') &&
                            node.getAttribute('style')?.includes('background')) {
                            // 背景色の処理を適用
                            // ... (上記の背景色処理と同じロジック)
                        }
                    }
                });
            });
        }
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
    });
}
