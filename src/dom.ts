// @ts-ignore
import * as reposList from '../config/repositories';

export enum Selectors {
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

interface CommentInfo {
    bodyText: string,
    author: string,
    avatar: string
}

interface MainComment extends CommentInfo {
    subject: string;
}

export class Dom {

    private readonly moveIssueButtonID: string = 'move-issue-button';

    public showUIButton(onClick: () => {}) {
        const container = this.querySelectorThrows(Selectors.moveIssueButtonContainer, document);
        container.appendChild(this.createUIButton(onClick));
    }

    public getMainComment(): MainComment {
        const subject: string = this.getTextThrows(Selectors.subject, document);
        const data = this.getComments(Selectors.mainComment)[0];
        return { subject, ...data };
    }

    public showRepoURLInputAsync(): Promise<string> {
        const promise: Promise<string> = new Promise((resolve, reject) => {

            const input = document.createElement('input');
            input.type = 'url';
            input.placeholder = 'Destination repo, e.g. https://github.com/OmniSharp/omnisharp-vscode/issues';
            input.classList.add('form-control');
            input.style.width = '25em';
            const dataList: HTMLDataListElement = document.createElement('datalist');
            dataList.id = 'repositories';
            input.setAttribute('list', dataList.id);
            input.setAttribute('pattern', new RegExp('https?://github.com/.+/issues/?$').source);
            const moveIssueButtonEl = document.getElementById(this.moveIssueButtonID);
            input.addEventListener('keyup', (e: KeyboardEvent) => {
                if (e.keyCode == 13) {
                    if (input.validity.patternMismatch) {
                        input.style.border = '1px solid red';
                        reject();
                    } else {
                        input.style.border = '';
                        const val: string = input.value;
                        this.replaceDomElement(input, moveIssueButtonEl);
                        resolve(val.endsWith('/') ? val : val + '/');
                    }
                }
            });

            const repositories = Array.from(reposList.repositories) as string[];
            repositories.forEach(repo => {
                var option: HTMLOptionElement = document.createElement('option');
                option.value = repo;
                dataList.appendChild(option);
            });

            input.appendChild(dataList);
            this.replaceDomElement(input, moveIssueButtonEl);
        });

        return promise;
    }

    public generateMainCopy(info: CommentInfo, origIssueURL: string): string {
        const matches = origIssueURL.match(new RegExp('https?://github.com/(.+/)+issues').source);
        if (!matches) {
            throw new Error('Could not extract the original issue URL');
        }

        return `>This issue has been moved from [${matches[1]}](${origIssueURL})\n` +
            `Original author is ${info.avatar}@${info.author}\n---\n` +
            `${info.bodyText}\n\n` +
            `---\n\n`;
    }

    public getFormattedFollowUpCommentsIfAny(): string[] {
        return document.querySelector(Selectors.followUpComments)
            ? this.getComments(Selectors.followUpComments).map(this.generateFollowUpCopy)
            : [];
    }

    public querySelectorThrows<T extends HTMLElement>(selector: Selectors, container: HTMLElement | Document): T {
        const el: T | null = container.querySelector(selector) as T;
        if (!el) {
            throw new Error(`Could not get element ${selector}`);
        }
        return el;
    }


    public getTextThrows(selector: Selectors, container: HTMLElement | Document): string {
        const el: HTMLElement | null = this.querySelectorThrows(selector, container);
        if (!el || !el.textContent) {
            throw new ReferenceError(`Selector: '${selector}' failed.`);
        }
        return el.textContent.trim();
    }

    public setTextThrows(selector: Selectors, container: HTMLElement | Document, text: string): void {
        const el: HTMLElement | null = this.querySelectorThrows(selector, container);
        el.textContent = text;
    }

    private querySelectorAllThrows<T extends HTMLElement>(selector: Selectors, container: HTMLElement | Document): NodeListOf<T> {
        const els: NodeListOf<T> | null = container.querySelectorAll(selector) as NodeListOf<T>;
        if (!els || !els.length) {
            throw new Error(`Could not get element ${selector}`);
        }
        return els;
    }

    private closestThrows<T extends HTMLElement>(selector: Selectors, container: HTMLElement) {
        const el: T | null = container.closest(selector) as T;
        if (!el) {
            throw new Error(`Could not get closest element of ${selector}`);
        }
        return el;
    }

    private getButtonThrows(selector: Selectors, container: HTMLElement): HTMLButtonElement {
        return this.querySelectorThrows(selector, container) as HTMLButtonElement;
    }

    private createUIButton(onClick: () => {}) {
        const button = document.createElement('button');
        button.id = this.moveIssueButtonID;
        button.addEventListener('click', onClick);
        'btn btn-sm'.split(' ').forEach(cls => button.classList.add(cls));
        button.appendChild(document.createTextNode('Move Issue'));
        return button;
    }

    private replaceDomElement(newEl: HTMLElement, oldEl: HTMLElement | null) {
        oldEl && oldEl.parentNode && oldEl.parentNode.replaceChild(newEl, oldEl);
    }

    private generateFollowUpCopy(info: CommentInfo): string {
        return `>This is a reply from ${info.avatar}@${info.author}\n\n` +
            `${info.bodyText}\n\n` +
            `---\n\n`;
    }

    private getComments(selector: Selectors.mainComment | Selectors.followUpComments): CommentInfo[] {
        const commentsData = [];
        const comments = this.querySelectorAllThrows(selector, document);
        for (const comment of comments) {
            this.getButtonThrows(Selectors.editButton, comment).click();   // click on edit button to get raw markdown
            commentsData.push(this.getCommentData(comment));
            this.getButtonThrows(Selectors.cancelButton, comment).click(); // cancel button closes edit again
        }
        return commentsData;
    }

    private getCommentData(comment: HTMLElement) {
        const bodyText: string = this.getTextThrows(Selectors.bodyTextarea, comment);
        const author: string = this.getTextThrows(Selectors.author, comment);
        const avatar: string = this.getAvatar(comment)
        return { bodyText, author, avatar };
    }

    private getAvatar(comment: HTMLElement): string {
        const container = this.closestThrows(Selectors.commentsContainer, comment);
        return this.querySelectorThrows(Selectors.avatar, container).innerHTML.trim();
    }
}