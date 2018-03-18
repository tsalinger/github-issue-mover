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

    const BODY_UNIQUE_SIGN: string = 'zzqqjfafsfalsjafslQ';
    const GM_DATA_KEY: string = 'issue-data';

    enum Selectors {
        bodyTextarea = 'textarea.comment-form-textarea',
        subject = '.gh-header-title span.js-issue-title',
        author = 'a.author',
        mainComment = 'div[id^="issue-"].comment',
        followUpComments = 'div[id^="issuecomment-"].comment',
        commentsContainer = '.js-comment-container',
        avatar = '.timeline-comment-avatar',
        editButton = '.js-comment-edit-button',
        cancelButton = '.js-comment-cancel-button',
        moveIssueButtonContainer = '.gh-header-show .gh-header-actions'
    }

    class CommentData {
        constructor(public mainComment: string, public followUpComments: string[]) { }
    }

    interface CommentInfo {
        bodyText: string,
        author: string,
        avatar: string
    }

    class IssueCollector {

        public showUIButton() {
            const button = this.createUIButton();
            const container = querySelectorThrows(Selectors.moveIssueButtonContainer, document);
            container.appendChild(button);
        }

        private createUIButton() {
            const button = document.createElement('button');
            button.addEventListener('click', this.start.bind(this));
            'btn btn-sm'.split(' ').forEach(cls => button.classList.add(cls));
            button.appendChild(document.createTextNode('Move Issue'));
            return button;
        }

        private start(): void {
            const origIssueURL: string = location.href;
            const mainComment = this.getMainComment();
            const mainCommentFormatted: string = this.generateMainCopy(mainComment, origIssueURL);
            const followUpCommentsFormatted = this.getFormattedFollowUpCommentsIfAny()
            const newIssueURL = this.promptForNewIssueUrl();
            if (!newIssueURL) {
                return undefined;
            }
            
            // @ts-ignore
            GM_setValue(GM_DATA_KEY, JSON.stringify(new CommentData(mainCommentFormatted, followUpCommentsFormatted)));

            const finalURL = newIssueURL + `new?title=${encodeURIComponent(mainComment.subject)}&body=${BODY_UNIQUE_SIGN}`;
            const openInBackground: boolean = false;
            // @ts-ignore
            GM_openInTab(finalURL, openInBackground);
        }

        private promptForNewIssueUrl(): string | undefined {
            let validInput = false;
            let newIssueURL: string = '';
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

        private getText(selector: Selectors, container: HTMLElement | Document): string {
            const el: HTMLElement | null = querySelectorThrows(selector, container);
            if (!el || !el.textContent) {
                throw new ReferenceError(`Selector: '${selector}' failed.`);
            }
            return el.textContent.trim();
        }

        generateMainCopy(info: CommentInfo, origIssueURL: string): string {
            const matches = this.getAbbreviation(origIssueURL);
            return `>This issue has been moved from [${matches[1]}](${origIssueURL})\n` +
                `Original author is ${info.avatar}@${info.author}\n---\n` +
                `${info.bodyText}\n\n` +
                `---\n\n`;
        }

        generateFollowUpCopy(info: CommentInfo): string {
            return `>This is a reply from ${info.avatar}@${info.author}\n\n` +
                `${info.bodyText}\n\n` +
                `---\n\n`;
        }

        getFormattedFollowUpCommentsIfAny() {
            let followUpComments: CommentInfo[] = [];
            let followUpCommentsFormatted: string[] = [];

            if (document.querySelector(Selectors.followUpComments)) {
                followUpComments = this.getComments(Selectors.followUpComments);
                followUpCommentsFormatted = followUpComments.map(c => this.generateFollowUpCopy(c));
            }

            return followUpCommentsFormatted;
        }

        getAbbreviation(origIssueURL: string) {
            const matches = origIssueURL.match(/https:\/\/github.com\/(.+\/)+issues/);
            if (!matches) {
                throw new Error(`Could not extract repository name from ${origIssueURL}`);
            }
            return matches;
        }

        getComments(selector: Selectors.mainComment | Selectors.followUpComments): CommentInfo[] {
            const commentsData = [];
            const comments = querySelectorAllThrows(selector, document);
            for (const comment of comments) {
                getButtonThrows(Selectors.editButton, comment).click();   // click on edit button to get raw markdown
                const data = this.getCommentData(comment);
                commentsData.push(data);
                getButtonThrows(Selectors.cancelButton, comment).click(); // cancel button closes edit again
            }
            return commentsData;
        }

        getCommentData(comment: HTMLElement) {
            const bodyText: string = this.getText(Selectors.bodyTextarea, comment);
            const author: string = this.getText(Selectors.author, comment);
            const avatar: string = this.getAvatar(comment)
            return { bodyText, author, avatar };
        }

        getMainComment() {
            const subject: string = this.getText(Selectors.subject, document);
            const data = this.getComments(Selectors.mainComment)[0];
            return { subject, ...data };
        }

        getAvatar(comment: HTMLElement): string {
            const container = closestThrows(Selectors.commentsContainer, comment);
            return querySelectorThrows(Selectors.avatar, container).innerHTML.trim();
        }
    }


    function querySelectorThrows<T extends HTMLElement>(selector: Selectors, container: HTMLElement | Document): T {
        const el: T | null = container.querySelector(selector) as T;
        if (!el) {
            throw new Error(`Could not get element ${selector}`);
        }
        return el;
    }

    function querySelectorAllThrows<T extends HTMLElement>(selector: Selectors, container: HTMLElement | Document): NodeListOf<T> {
        const els: NodeListOf<T> | null = container.querySelectorAll(selector) as NodeListOf<T>;
        if (!els || !els.length) {
            throw new Error(`Could not get element ${selector}`);
        }
        return els;
    }

    function closestThrows<T extends HTMLElement>(selector: Selectors, container: HTMLElement) {
        const el: T | null = container.closest(selector) as T;
        if (!el) {
            throw new Error(`Could not get closest element of ${selector}`);
        }
        return el;
    }

    function getButtonThrows(selector: Selectors, container: HTMLElement) {
        const button = querySelectorThrows(selector, container) as HTMLButtonElement;
        return button;
    }

    class IssuePaster {

        public paste() {
            const el: HTMLElement | null = querySelectorThrows(Selectors.bodyTextarea, document);
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
            const data: CommentData = JSON.parse(jsonString);
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




