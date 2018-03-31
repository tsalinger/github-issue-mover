import { Dom, Selectors, MainComment } from './dom';
// @ts-ignore
import { uniqueToken } from '../config/config';

(function () {
    const GM_DATA_KEY: string = 'issue-data';

    class CommentData {
        constructor(public mainComment: string, public followUpComments: string[]) { }
    }

    const dom = new Dom();
    start();

    async function start() {
        if (location.href.includes(decodeURI(uniqueToken))) {
            const issueBodyText: string = dom.getTextThrows(Selectors.bodyTextarea, document);
            if (issueBodyText === uniqueToken) {
                paste();
            }
        } else {
            dom.initMoveIssueButton(function onButtonClick() {
                dom.initRepoSuggestInput(function onSuggestInputSubmit(destinationIssueURL: string) {
                    copy(destinationIssueURL);
                });
            });
        }
    }

    async function copy(destinationIssueURL: string): Promise<void> {
        const mainComment: MainComment = dom.getMainComment(location.href);
        const followUpComments: string[] = dom.getFollowUpCommentsIfAny()
        // @ts-ignore
        GM_setValue(GM_DATA_KEY, JSON.stringify(new CommentData(mainComment.asString, followUpComments)));
        const newIssueURL = destinationIssueURL + `new?title=${encodeURIComponent(mainComment.subject)}&body=${uniqueToken}`;
        // @ts-ignore
        GM_openInTab(newIssueURL, false);
    }

    function paste() {
        // @ts-ignore
        const jsonString = GM_getValue(GM_DATA_KEY);
        if (!jsonString) {
            throw new ReferenceError('Could not get issue-data');
        }

        const data: CommentData = JSON.parse(jsonString);
        dom.querySelectorThrows(Selectors.bodyTextarea, document).textContent = data.mainComment + data.followUpComments.join('');

        // @ts-ignore
        GM_setValue(GM_DATA_KEY, '');
    }
})();