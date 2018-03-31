// @ts-ignore
import * as config from '../config/config';

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
    moveIssueButtonContainer = '.gh-header-show .gh-header-actions',
    moveIssueButtonID = '#move-issue-button'
}

interface CommentInfo {
    bodyText: string,
    author: string,
    avatar: string
}

export interface MainComment extends CommentInfo {
    subject: string;
    asString: string;
}

export class Dom {
    public initMoveIssueButton(onClick: () => void) {
        const button = document.createElement('button');
        button.id = Selectors.moveIssueButtonID.replace('#', '');
        'btn btn-sm'.split(' ').forEach(cls => button.classList.add(cls));
        button.textContent = 'Move Issue';
        this.querySelectorThrows(Selectors.moveIssueButtonContainer, document).appendChild(button);
        button.addEventListener('click', onClick);
    }

    public getMainComment(origIssueUrl: string): MainComment {
        const subject: string = this.getTextThrows(Selectors.subject, document);
        const data: CommentInfo = this.getComments(Selectors.mainComment)[0];
        const asString: string = this.stringifyMainComment(data, origIssueUrl)
        return { subject, ...data, asString };
    }

    public initRepoSuggestInput(onSubmit: (destinationIssueURL: string) => void): void {
        const input: HTMLInputElement = document.createElement('input');
        input.type = 'url';
        input.placeholder = 'Destination repo (https://github.com/tsalinger/github-issue-mover/issues)';
        input.classList.add('form-control');
        input.style.width = '38em';
        input.style.marginLeft = '0.3em';

        const dataList: HTMLDataListElement = document.createElement('datalist');
        dataList.id = 'repositories';
        input.setAttribute('list', dataList.id);
        (config.repositories.suggestDestinationRepos as string[]).forEach(repo => {
            var option: HTMLOptionElement = document.createElement('option');
            option.value = repo;
            dataList.appendChild(option);
        });
        input.appendChild(dataList);

        input.setAttribute('pattern', new RegExp('https?://github.com/.+/issues/?$').source);
        input.addEventListener('keyup', (e: KeyboardEvent) => {
            if (e.keyCode == 13) {
                if (input.validity.patternMismatch) {
                    input.style.border = '1px solid red';
                } else {
                    input.style.border = '';
                    const val: string = input.value;
                    onSubmit(val.endsWith('/') ? val : val + '/');
                }
            }
        });

        const moveIssueButtonEl: HTMLButtonElement = this.querySelectorThrows(Selectors.moveIssueButtonID, document);
        moveIssueButtonEl.parentNode && moveIssueButtonEl.parentNode.replaceChild(input, moveIssueButtonEl);
    }

    private stringifyMainComment(info: CommentInfo, origIssueURL: string): string {
        const matches = origIssueURL.match(new RegExp('https?://github.com/(.+/)+issues').source);
        if (!matches) {
            throw new Error('Could not extract the original issue URL');
        }

        return `>This issue has been moved from [${matches[1]}](${origIssueURL})\n` +
            `Original author is ${info.avatar}@${info.author}\n---\n` +
            `${info.bodyText}\n\n` +
            `---\n\n`;
    }

    public getFollowUpCommentsIfAny(): string[] {
        const commentEls = document.querySelector(Selectors.followUpComments);
        if (commentEls) {
            return this.getComments(Selectors.followUpComments)
                .map((info) =>
                    `>This is a reply from ${info.avatar}@${info.author}\n\n` +
                    `${info.bodyText}\n\n` +
                    `---\n\n`
                )
        }
        return [];
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
}