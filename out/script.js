"use strict";
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
    var Selectors;
    (function (Selectors) {
        Selectors["bodyTextarea"] = "textarea[name=\"issue[body]\"]";
        Selectors["subject"] = ".gh-header-title span.js-issue-title";
        Selectors["author"] = ".TableObject-item--primary a.author";
    })(Selectors || (Selectors = {}));
    function getText(selector) {
        var el = document.querySelector(selector);
        if (!el || !el.textContent) {
            throw new ReferenceError("Selector: '" + selector + "' failed.");
        }
        return el.textContent.trim();
    }
    function start() {
        var bodyText = getText(Selectors.bodyTextarea);
        var subject = getText(Selectors.subject);
        var author = getText(Selectors.author);
        var origIssueURL = location.href;
        var clipBoardContent = generateCopy(bodyText, subject, author, origIssueURL);
        // @ts-ignore
        GM_setClipboard(clipBoardContent);
    }
    function generateCopy(bodyText, subject, author, origIssueURL) {
        return subject + "\n" +
            ("--This issue has been moved from [Microsoft/vscode](" + origIssueURL + ")--\n") +
            ("Author is @" + author + ".\n") +
            ("" + bodyText);
    }
    start();
})();
