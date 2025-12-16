// ==UserScript==
// @name         控制台日志导出
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  使用window.logHook进行插桩，点击导出日志即可导出.log格式文件
// @author       buluo
// @match        *://*/*
// @grant        unsafeWindow
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        maxLogs: 5000,
        buttonText: '导出日志',
        clearText: '清空',
    };

    let logStorage = [];

    // window.logHook 全局挂载
    const targetWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // 辅助函数：安全序列化
    function safeStringify(obj) {
        const cache = new Set();
        try {
            return JSON.stringify(obj, (key, value) => {
                if (typeof value === 'object' && value !== null) {
                    if (cache.has(value)) return '[Circular]';
                    cache.add(value);
                }
                return value;
            });
        } catch (e) {
            return String(obj);
        }
    }

    // 在日志断点中使用 window.logHook(变量)
    targetWindow.logHook = function(...args) {
        // 1. 依然打印到控制台，方便调试
        console.log(...args);

        // 2. 存入我们的缓存
        try {
            const timestamp = new Date().toLocaleTimeString();
            const message = args.map(arg => {
                if (typeof arg === 'object') return safeStringify(arg);
                return String(arg);
            }).join(' ');

            logStorage.push(`[${timestamp}] ${message}`);

            if (logStorage.length > CONFIG.maxLogs) logStorage.shift();
            updateCount();

        } catch (err) {
            console.error('[LogHook Error]', err);
        }

        // 返回 false 或 undefined 以防影响断点逻辑（虽然日志断点通常不关心返回值）
        return '';
    };

    // 再次 Hook 原生 console.log
    const originalLog = console.log;
    console.log = function(...args) {
        originalLog.apply(console, args);
    };


    //UI
    function createUI() {
        const container = document.createElement('div');
        container.style.cssText = `position: fixed; bottom: 20px; right: 20px; z-index: 999999; background: rgba(0,0,0,0.8); padding: 10px; border-radius: 8px; color: white; font-family: sans-serif; display: flex; gap: 10px; align-items: center; font-size: 12px;`;

        const countSpan = document.createElement('span');
        countSpan.id = 'log-hook-count';
        countSpan.innerText = 'Logs: 0';

        const exportBtn = document.createElement('button');
        exportBtn.innerText = CONFIG.buttonText;
        exportBtn.style.cssText = `cursor: pointer; background: #2196F3; border: none; color: white; padding: 5px 10px; border-radius: 4px;`;
        exportBtn.onclick = exportLogs;

        const clearBtn = document.createElement('button');
        clearBtn.innerText = CONFIG.clearText;
        clearBtn.style.cssText = `cursor: pointer; background: #f44336; border: none; color: white; padding: 5px 10px; border-radius: 4px;`;
        clearBtn.onclick = clearLogs;

        container.appendChild(countSpan);
        container.appendChild(exportBtn);
        container.appendChild(clearBtn);
        document.body.appendChild(container);
    }

    function updateCount() {
        const span = document.getElementById('log-hook-count');
        if (span) span.innerText = `Logs: ${logStorage.length}`;
    }

    function clearLogs() {
        logStorage = [];
        updateCount();
    }

    function exportLogs() {
        if (!logStorage.length) return alert('无日志');
        const blob = new Blob([logStorage.join('\n')], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug_log_${Date.now()}.log`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createUI);
    } else {
        createUI();
    }
})();