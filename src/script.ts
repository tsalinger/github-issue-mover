// ==UserScript==
// @name        GitHub Issue Mover Tool
// @namespace   github-issue-mover-tool
// @version     0.1
// @description Semi-automates issue moving on GitHub
// @author      Till Salinger
// @match       https://github.com/Microsoft/vscode/issues/*
// @grant       GM_setClipboard
// @grant       GM_log
// @run-at      context-menu

// ==/UserScript==

(function () {
    "use strict";

    enum Selectors {
        bodyTextarea = 'textarea[name="issue[body]"]',
        subject = '.gh-header-title span.js-issue-title',
        author = '.TableObject-item--primary a.author'
    }

    function getText(selector: Selectors): string {
        const el: HTMLElement | null = document.querySelector(selector);
        if (!el || !el.textContent) {
            throw new ReferenceError(`Selector: '${selector}' failed.`);
        }
        return el.textContent.trim();
    }

    function start() {
        const bodyText: string = getText(Selectors.bodyTextarea);
        const subject: string = getText(Selectors.subject);
        const author: string = getText(Selectors.author);
        const origIssueURL: string = location.href;
        const clipBoardContent: string = generateCopy(bodyText, subject, author, origIssueURL);
        // @ts-ignore
        GM_setClipboard(clipBoardContent);
    }

    function generateCopy(bodyText: string, subject: string, author: string, origIssueURL: string): string {
        return `${subject}\n` +
        `--This issue has been moved from [Microsoft/vscode](${origIssueURL})--\n` +
        `Author is @${author}.\n` +
        `${bodyText}`;
    }

    start();
})();
