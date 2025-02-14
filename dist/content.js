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
// ダークモードの色定義
const DARK_MODE_COLORS = {
    background: {
        primary: '#1a1a1a',
        secondary: '#2d2d2d',
        tertiary: '#333333'
    },
    text: {
        primary: '#e8eaed',
        secondary: '#a0a0a0',
        accent: '#8ab4f8'
    }
};
// ダークモードのスタイル定義をOutlook風に変更
function createDarkModeStyles() {
    return `
    /* CSS変数の定義 */
    :root {
      --dm-bg-primary: ${DARK_MODE_COLORS.background.primary};
      --dm-bg-secondary: ${DARK_MODE_COLORS.background.secondary};
      --dm-bg-tertiary: ${DARK_MODE_COLORS.background.tertiary};
      --dm-text-primary: ${DARK_MODE_COLORS.text.primary};
      --dm-text-secondary: ${DARK_MODE_COLORS.text.secondary};
      --dm-text-accent: ${DARK_MODE_COLORS.text.accent};
    }

    /* 基本背景色の設定 */
    body {
      background-color: var(--dm-bg-primary) !important;
    }

    /* ヘッダー部分の背景色修正 */
    body > table:first-of-type,
    body > table:first-of-type td,
    [bgcolor="#FFFFFF"],
    [style*="background-color: #fff"],
    [style*="background-color: rgb(255"] {
      background-color: var(--dm-bg-secondary) !important;
    }

    /* メインコンテンツエリアの背景色 */
    table > tbody > tr > td {
      background-color: var(--dm-bg-tertiary) !important;
    }

    /* テキストカラー */
    body * {
      color: var(--dm-text-primary) !important;
    }

    /* ヘッダーのテキスト色（#283b4a の部分） */
    [style*="color: #283b4a"],
    [style*="color: rgb(40,59,74)"] {
      color: var(--dm-text-accent) !important;
    }

    /* ボタンの処理 */
    [style*="background-color: #03ae00"],
    [style*="background-color: rgb(3,174,0)"] {
      background-color: #03ae00 !important;
      filter: brightness(1.2) !important;
    }

    [style*="background-color: #03ae00"] *,
    [style*="background-color: rgb(3,174,0)"] * {
      color: #ffffff !important;
    }

    /* 二次的なテキスト */
    .secondary-text,
    small,
    .small,
    time,
    .timestamp {
      color: var(--dm-text-secondary) !important;
    }
  `;
}
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
    static parseColor(color) {
        const rgb = color.match(/\d+/g);
        if (!rgb || rgb.length !== 3)
            return null;
        return {
            r: Number(rgb[0]),
            g: Number(rgb[1]),
            b: Number(rgb[2])
        };
    }
    static isBrandColor(color) {
        const brandColors = [
            { r: 3, g: 174, b: 0 }, // #03ae00
            { r: 204, g: 0, b: 51 }, // #cc0033
            { r: 0, g: 67, b: 134 } // #004386
        ];
        return brandColors.some(bc => Math.abs(bc.r - color.r) < 5 &&
            Math.abs(bc.g - color.g) < 5 &&
            Math.abs(bc.b - color.b) < 5);
    }
    static calculateRelativeBrightness(color, parentBrightness) {
        const baseBrightness = this.calculateBrightness(color);
        const delta = parentBrightness - baseBrightness;
        return Math.min(Math.max(baseBrightness + delta * 0.3, 20), 80);
    }
    static getParentBrightness(element) {
        let parent = element.parentElement;
        while (parent) {
            const bgColor = window.getComputedStyle(parent).backgroundColor;
            const parsed = this.parseColor(bgColor);
            if (parsed) {
                return this.calculateBrightness(parsed);
            }
            parent = parent.parentElement;
        }
        return 20; // デフォルト暗めの背景
    }
    static getReadableContrast(textColor, bgColor) {
        const bg = this.parseColor(bgColor) || { r: 32, g: 33, b: 36 };
        const textLuminance = this.calculateLuminance(textColor);
        const bgLuminance = this.calculateLuminance(bg);
        const contrastRatio = (Math.max(textLuminance, bgLuminance) + 0.05) /
            (Math.min(textLuminance, bgLuminance) + 0.05);
        return contrastRatio >= 4.5 ?
            `rgb(${textColor.r},${textColor.g},${textColor.b})` :
            textLuminance > bgLuminance ? '#e8eaed' : '#202124';
    }
    // 輝度計算メソッドの追加
    static calculateLuminance(color) {
        const { r, g, b } = color;
        const [rs, gs, bs] = [r / 255, g / 255, b / 255].map(val => {
            return val <= 0.03928
                ? val / 12.92
                : Math.pow((val + 0.055) / 1.055, 2.4);
        });
        return rs * 0.2126 + gs * 0.7152 + bs * 0.0722;
    }
    // コントラストテキスト取得メソッドの追加
    static getContrastText(color) {
        const luminance = this.calculateLuminance(color);
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }
    // 色調整メソッドの追加
    static adjustColor(color, targetBrightness) {
        const currentBrightness = this.calculateBrightness(color);
        const factor = targetBrightness / currentBrightness;
        return `rgb(${Math.min(Math.round(color.r * factor), 255)}, 
                ${Math.min(Math.round(color.g * factor), 255)}, 
                ${Math.min(Math.round(color.b * factor), 255)})`;
    }
    // 色調整が必要かどうかの判定メソッドの追加
    static needsAdjustment(color) {
        const brightness = this.calculateBrightness(color);
        return brightness > 128; // 明るい色の場合は調整が必要
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
        // 既存のダークモードスタイルを削除
        const existingDarkMode = doc.getElementById('gmail-dark-mode-emulation');
        if (existingDarkMode) {
            existingDarkMode.remove();
        }
        // 新しいスタイルを最優先で適用
        const style = doc.createElement('style');
        style.id = 'gmail-dark-mode-emulation';
        style.textContent = createDarkModeStyles();
        doc.head.insertBefore(style, doc.head.firstChild);
        // インラインスタイルの処理
        doc.querySelectorAll('[style]').forEach(element => {
            const currentStyle = element.getAttribute('style') || '';
            if (currentStyle.includes('background-color') || currentStyle.includes('color')) {
                const computedStyle = window.getComputedStyle(element);
                const bgColor = computedStyle.backgroundColor;
                const textColor = computedStyle.color;
                // 背景色の処理
                if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
                    const parsedColor = ColorUtils.parseColor(bgColor);
                    if (parsedColor && !ColorUtils.isBrandColor(parsedColor)) {
                        element.style.backgroundColor = ColorUtils.adjustColor(parsedColor, ColorUtils.calculateRelativeBrightness(parsedColor, 20));
                    }
                }
                // テキスト色の処理
                if (textColor) {
                    const parsedColor = ColorUtils.parseColor(textColor);
                    if (parsedColor && ColorUtils.needsAdjustment(parsedColor)) {
                        element.style.color = DARK_MODE_COLORS.text.primary;
                    }
                }
            }
        });
        contentDarkMode = true;
        return doc.documentElement.outerHTML;
    }
    catch (error) {
        console.error('ダークモード適用エラー:', error);
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
