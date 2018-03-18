"use strict";
// ==UserScript==
// @name        GitHub Issue Mover Tool
// @namespace   github-issue-mover-tool
// @version     0.1
// @description Semi-automates issue moving on GitHub
// @author      Till Salinger
// add all repositories from which you want to move issues from
// @match       https://github.com/Microsoft/vscode/issues/*
// @match       https://github.com/tsalinger/github-issue-mover/issues/*
// Scripts needs to be activated when a new issue with our unique sign is created
// @match       https://github.com/*/issues/new?title*zzqqjfafsfalsjafslQ
// @grant       GM_openInTab
// @grant       GM_setValue
// @grant       GM_getValue
// @run-at      document-end
// ==/UserScript==
(function () {
    "use strict";
    const BODY_UNIQUE_SIGN = 'zzqqjfafsfalsjafslQ';
    const GM_DATA_KEY = 'issue-data';
    let Selectors;
    (function (Selectors) {
        Selectors["bodyTextarea"] = "textarea.comment-form-textarea";
        Selectors["subject"] = ".gh-header-title span.js-issue-title";
        Selectors["author"] = "a.author";
        Selectors["mainComment"] = "div[id^=\"issue-\"].comment";
        Selectors["followUpComments"] = "div[id^=\"issuecomment-\"].comment";
        Selectors["commentsContainer"] = ".js-comment-container";
        Selectors["avatar"] = ".timeline-comment-avatar";
        Selectors["editButton"] = ".js-comment-edit-button";
        Selectors["cancelButton"] = ".js-comment-cancel-button";
        Selectors["moveIssueButtonContainer"] = ".gh-header-show .gh-header-actions";
    })(Selectors || (Selectors = {}));
    class CommentData {
        constructor(mainComment, followUpComments) {
            this.mainComment = mainComment;
            this.followUpComments = followUpComments;
        }
    }
    class IssueCollector {
        showUIButton() {
            const button = this.createUIButton();
            const container = querySelectorThrows(Selectors.moveIssueButtonContainer, document);
            container.appendChild(button);
        }
        createUIButton() {
            const button = document.createElement('button');
            button.addEventListener('click', this.start.bind(this));
            'btn btn-sm'.split(' ').forEach(cls => button.classList.add(cls));
            button.appendChild(document.createTextNode('Move Issue'));
            return button;
        }
        start() {
            const origIssueURL = location.href;
            const mainComment = this.getMainComment();
            const mainCommentFormatted = this.generateMainCopy(mainComment, origIssueURL);
            const followUpCommentsFormatted = this.getFormattedFollowUpCommentsIfAny();
            const newIssueURL = this.promptForNewIssueUrl();
            if (!newIssueURL) {
                return undefined;
            }
            // @ts-ignore
            GM_setValue(GM_DATA_KEY, JSON.stringify(new CommentData(mainCommentFormatted, followUpCommentsFormatted)));
            const finalURL = newIssueURL + `new?title=${encodeURIComponent(mainComment.subject)}&body=${BODY_UNIQUE_SIGN}`;
            const openInBackground = false;
            // @ts-ignore
            GM_openInTab(finalURL, openInBackground);
        }
        promptForNewIssueUrl() {
            let validInput = false;
            let newIssueURL = '';
            while (!validInput) {
                newIssueURL = prompt('Enter the destination github repo', 'https://github.com/Microsoft/vscode/issues/') || '';
                if (!newIssueURL) {
                    alert('Empty string, aborting');
                    return undefined;
                }
                if (!newIssueURL.startsWith('https://github.com/')) {
                    alert('URL doesn\'t start with "https://github.com/"');
                    continue;
                }
                if (!newIssueURL.endsWith('issues/')) {
                    alert('URL doesn\'t end on "issues/"');
                    continue;
                }
                validInput = true;
            }
            return newIssueURL;
        }
        getText(selector, container) {
            const el = querySelectorThrows(selector, container);
            if (!el || !el.textContent) {
                throw new ReferenceError(`Selector: '${selector}' failed.`);
            }
            return el.textContent.trim();
        }
        generateMainCopy(info, origIssueURL) {
            const matches = this.getAbbreviation(origIssueURL);
            return `>This issue has been moved from [${matches[1]}](${origIssueURL})\n` +
                `Original author is ${info.avatar}@${info.author}\n---\n` +
                `${info.bodyText}\n\n` +
                `---\n\n`;
        }
        generateFollowUpCopy(info) {
            return `>This is a reply from ${info.avatar}@${info.author}\n\n` +
                `${info.bodyText}\n\n` +
                `---\n\n`;
        }
        getFormattedFollowUpCommentsIfAny() {
            let followUpComments = [];
            let followUpCommentsFormatted = [];
            if (document.querySelector(Selectors.followUpComments)) {
                followUpComments = this.getComments(Selectors.followUpComments);
                followUpCommentsFormatted = followUpComments.map(c => this.generateFollowUpCopy(c));
            }
            return followUpCommentsFormatted;
        }
        getAbbreviation(origIssueURL) {
            const matches = origIssueURL.match(/https:\/\/github.com\/(.+\/)+issues/);
            if (!matches) {
                throw new Error(`Could not extract repository name from ${origIssueURL}`);
            }
            return matches;
        }
        getComments(selector) {
            const commentsData = [];
            const comments = querySelectorAllThrows(selector, document);
            for (const comment of comments) {
                getButtonThrows(Selectors.editButton, comment).click(); // click on edit button to get raw markdown
                const data = this.getCommentData(comment);
                commentsData.push(data);
                getButtonThrows(Selectors.cancelButton, comment).click(); // cancel button closes edit again
            }
            return commentsData;
        }
        getCommentData(comment) {
            const bodyText = this.getText(Selectors.bodyTextarea, comment);
            const author = this.getText(Selectors.author, comment);
            const avatar = this.getAvatar(comment);
            return { bodyText, author, avatar };
        }
        getMainComment() {
            const subject = this.getText(Selectors.subject, document);
            const data = this.getComments(Selectors.mainComment)[0];
            return Object.assign({ subject }, data);
        }
        getAvatar(comment) {
            const container = closestThrows(Selectors.commentsContainer, comment);
            return querySelectorThrows(Selectors.avatar, container).innerHTML.trim();
        }
    }
    function querySelectorThrows(selector, container) {
        const el = container.querySelector(selector);
        if (!el) {
            throw new Error(`Could not get element ${selector}`);
        }
        return el;
    }
    function querySelectorAllThrows(selector, container) {
        const els = container.querySelectorAll(selector);
        if (!els || !els.length) {
            throw new Error(`Could not get element ${selector}`);
        }
        return els;
    }
    function closestThrows(selector, container) {
        const el = container.closest(selector);
        if (!el) {
            throw new Error(`Could not get closest element of ${selector}`);
        }
        return el;
    }
    function getButtonThrows(selector, container) {
        const button = querySelectorThrows(selector, container);
        return button;
    }
    class IssuePaster {
        paste() {
            const el = querySelectorThrows(Selectors.bodyTextarea, document);
            if (!el || !el.textContent) {
                throw new ReferenceError(`Selector: '${Selectors.bodyTextarea}' failed.`);
            }
            if (el.textContent.trim() !== BODY_UNIQUE_SIGN) {
                return;
            }
            // @ts-ignore
            const jsonString = GM_getValue(GM_DATA_KEY);
            if (!jsonString) {
                throw new ReferenceError('Could not get issue-data');
            }
            const data = JSON.parse(jsonString);
            el.textContent = data.mainComment;
            el.textContent += data.followUpComments.join('');
            // @ts-ignore
            GM_setValue(GM_DATA_KEY, '');
        }
    }
    starter();
    function starter() {
        if (location.href.indexOf(decodeURI(BODY_UNIQUE_SIGN)) !== -1) {
            // unique sign signals that this issue has been opened automatically by our script
            new IssuePaster().paste();
        }
        else {
            // script has been activated cause one of the URLS in the @match directive on top of the file has been matched
            new IssueCollector().showUIButton();
        }
    }
})();
