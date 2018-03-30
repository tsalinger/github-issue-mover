import { Dom, Selectors } from './dom';
// @ts-ignore
import { BODY_UNIQUE_TOKEN } from './uniqueToken';

(function () {
    /**
     * There are 2 activation events and both can be found in config/settings.js:
     * 1. Whenever an issue is opened in the origin repo, e.g. https://github.com/tsalinger/github-issue-mover/issues/*
     * 2. Whenever a new issue has been created that starts with 'https://github.com/*\/issues/new?' and ends on BODY_UNIQUE_TOKEN
     */

    const GM_DATA_KEY: string = 'issue-data';

    class CommentData {
        constructor(public mainComment: string, public followUpComments: string[]) { }
    }

    const dom = new Dom();
    start();

    function start() {
        location.href.indexOf(decodeURI(BODY_UNIQUE_TOKEN)) !== -1
            ? paste() // unique sign signals that this issue has been opened automatically by our script
            : dom.showUIButton(collect); // script has been activated by one of the URLs in the @match directive in config/settings.js
    }

    async function collect(): Promise<void> {
        const origIssueURL: string = location.href;
        const mainComment = dom.getMainComment();
        const mainCommentFormatted: string = dom.generateMainCopy(mainComment, origIssueURL);
        const followUpCommentsFormatted = dom.getFormattedFollowUpCommentsIfAny()
        try {
            const issueURL = await dom.showRepoURLInputAsync();

            // @ts-ignore
            GM_setValue(GM_DATA_KEY, JSON.stringify(new CommentData(mainCommentFormatted, followUpCommentsFormatted)));

            const finalURL = issueURL + `new?title=${encodeURIComponent(mainComment.subject)}&body=${BODY_UNIQUE_TOKEN}`;
            const openInBackground: boolean = false;

            // @ts-ignore
            GM_openInTab(finalURL, openInBackground);
        } catch (e) {
            console.error(e);
        }
    }

    function paste() {
        const text: string = dom.getTextThrows(Selectors.bodyTextarea, document);
        if (text !== BODY_UNIQUE_TOKEN) {
            return;
        }

        // @ts-ignore
        const jsonString = GM_getValue(GM_DATA_KEY);
        if (!jsonString) {
            throw new ReferenceError('Could not get issue-data');
        }

        const data: CommentData = JSON.parse(jsonString);
        dom.setTextThrows(Selectors.bodyTextarea, document, data.mainComment + data.followUpComments.join(''));

        // @ts-ignore
        GM_setValue(GM_DATA_KEY, '');
    }
})();