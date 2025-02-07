let gmailEmulationWidth: string | null = null;
let originalHTML: string | null = null;
let contentDarkMode = false;

// ダークモードのスタイル定義をグローバルスコープに移動
const darkModeStyles = `
  /* 基本背景色の設定 - より深い階層構造を反映 */
  body {
    background-color: #202124 !important;
  }

  /* コンテンツエリアの背景 */
  body > table {
    background-color: #292a2d !important;
  }

  /* テーブルセルの背景色処理 */
  td:not([style*="background"]):not([bgcolor]) {
    background-color: inherit !important;
  }

  /* テキストカラーの基本設定 */
  body *:not([style*="color"]):not(a):not(img) {
    color: #e8eaed !important;
  }

  /* リンクの処理 - Gmail風の青色 */
  a:not([style*="color"]) {
    color: #8ab4f8 !important;
  }
  a:not([style*="color"]):hover {
    color: #aecbfa !important;
  }

  /* 明るい背景を持つ要素の特別処理 */
  [style*="background-color: #fff"],
  [style*="background-color: rgb(255"],
  [style*="background: #fff"],
  [style*="background: rgb(255"] {
    background-color: #35363a !important;
    color: #e8eaed !important;
  }

  /* ボーダー色の調整 - より自然な暗色 */
  [style*="border"] {
    border-color: #3c4043 !important;
  }

  /* 画像の処理 - より洗練された調整 */
  img:not([src^="data:"]) {
    filter: brightness(0.9) contrast(1.1) !important;
  }

  /* フォーム要素の処理 */
  input, textarea, select {
    background-color: #35363a !important;
    color: #e8eaed !important;
    border-color: #3c4043 !important;
  }

  /* ボタン要素の処理 */
  button,
  input[type="button"],
  input[type="submit"] {
    background-color: #35363a !important;
    color: #e8eaed !important;
    border-color: #5f6368 !important;
  }
`;

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
    } else {
      window.addEventListener('load', () => {
        emulateGmailRendering(request.width, request, sendResponse);
      });
    }
  } else if (request.action === 'undoGmailEmulation') {
    undoGmailEmulation(sendResponse);
  }

  return true;
});

function emulateGmailRendering(
  width: string | null,
  request: { darkMode?: boolean },
  sendResponse: (response?: any) => void
) {
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
      gmailEmulationWidth = width;  // 幅を保存
    } else if (gmailEmulationWidth) {
      // スマホビュー解除
      html = originalHTML || html;
      gmailEmulationWidth = null;  // 幅をリセット
      needsUpdate = true;
    }

    // ダークモードの状態管理
    if (request.darkMode !== currentDarkMode) {
      if (request.darkMode) {
        html = applyDarkMode(html);
        needsUpdate = true;
      } else {
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
  } catch (error) {
    console.error('エミュレート処理でエラーが発生:', error);
    if (error instanceof Error) {
      sendResponse({ error: error.message });
    } else {
      sendResponse({ error: 'Unknown error occurred' });
    }
  }
}

function removeUnsupportedCSS(html: string): string {
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

  return cssReplacements.reduce((result, { from, to }) => 
    result.replace(from, to), html);
}

function inlineStyles(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  doc.querySelectorAll('style').forEach((style) => {
    if (style.id === 'gmail-dark-mode-emulation') return;
    
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
                } else {
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
      } catch (e) {
        console.warn('CSSルール適用エラー:', rule);
      }
    });
    
    style.remove();
  });

  return doc.documentElement.outerHTML;
}

function adjustWidth(html: string, width: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.querySelector('body');
  if (body) {
    body.style.width = `${width}px`;
    body.style.maxWidth = `${width}px`;
    body.style.margin = '0 auto';
  }
  return doc.documentElement.outerHTML;
}

function undoGmailEmulation(sendResponse: (response?: any) => void) {
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
  } else {
    sendResponse({ message: 'アンドゥに失敗しました。' });
  }
}

function applyDarkMode(html: string): string {
  console.log('applyDarkMode が呼び出されました。');
  
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const existingDarkMode = doc.getElementById('gmail-dark-mode-emulation');
  if (existingDarkMode) {
    existingDarkMode.remove();
  }

  const style = doc.createElement('style');
  style.id = 'gmail-dark-mode-emulation';
  style.textContent = darkModeStyles;
  doc.head.appendChild(style);

  // 背景色を持つ要素の高度な処理
  doc.querySelectorAll<HTMLElement>('[style*="background"]').forEach(element => {
    const computedStyle = window.getComputedStyle(element);
    const bgColor = computedStyle.backgroundColor;
    
    if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
      const rgb = bgColor.match(/\d+/g);
      if (rgb) {
        const [r, g, b] = rgb.map(Number);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        if (brightness > 128) {
          // 明るい背景色の場合、暗めに変換
          const darkR = Math.floor(r * 0.15);
          const darkG = Math.floor(g * 0.15);
          const darkB = Math.floor(b * 0.15);
          element.style.backgroundColor = `rgb(${darkR}, ${darkG}, ${darkB})`;
          
          // テキストの可読性を確保
          if (!(element instanceof HTMLAnchorElement)) {
            element.style.color = '#e8eaed';
          }
        } else {
          // すでに暗い背景色の場合は、テキストの可読性のみ確保
          const textBrightness = computedStyle.color.match(/\d+/g);
          if (textBrightness) {
            const [tr, tg, tb] = textBrightness.map(Number);
            const textBright = (tr * 299 + tg * 587 + tb * 114) / 1000;
            if (textBright < 128) {
              element.style.color = '#e8eaed';
            }
          }
        }
      }
    }
  });

  // テーブル構造の階層に基づく背景色の微調整
  doc.querySelectorAll('table').forEach((table, index) => {
    const depth = getElementDepth(table);
    if (depth > 1) {
      const darkenAmount = Math.min(depth * 2, 10);
      table.style.backgroundColor = `rgba(41, 42, 45, ${darkenAmount}%)`;
    }
  });

  contentDarkMode = true;
  return doc.documentElement.outerHTML;
}

// 要素の階層の深さを取得するヘルパー関数
function getElementDepth(element: Element): number {
  let depth = 0;
  let parent = element.parentElement;
  while (parent) {
    if (parent.tagName === 'TABLE') {
      depth++;
    }
    parent = parent.parentElement;
  }
  return depth;
}

// MutationObserver も同様に更新
function attachDarkModeObserver(): void {
  const observer = new MutationObserver((mutations) => {
    if (contentDarkMode && !document.getElementById('gmail-dark-mode-emulation')) {
      const style = document.createElement('style');
      style.id = 'gmail-dark-mode-emulation';
      style.textContent = darkModeStyles;
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
