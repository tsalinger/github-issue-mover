// ==UserScript==// Source Repos:
// @match		https://github.com/Microsoft/vscode/issues/*
// @match		https://github.com/tsalinger/github-issue-mover/issues/*

// @namespace   https://github.com/tsalinger/github-issue-mover
// @downloadURL https://github.com/tsalinger/github-issue-mover/tree/master/dist/issueMover.js
// @supportURL  https://github.com/tsalinger/github-issue-mover/issues
// @name        GitHub Issue Mover Tool
// @description Tampermonkey script for moving issues on GitHub
// @author      Till Salinger
// @version     0.3
// @grant       GM_openInTab
// @grant       GM_setValue
// @grant       GM_getValue
// @run-at      document-end

/** Script needs to be activated when a new issue with the unique token has been created */
// @match       https://github.com/*/issues/new?title*zzqqjfafsfalsjafslQ

// ==/UserScript==
(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
module.exports={
    "repositories": {
        "sourceRepos": [
            "https://github.com/Microsoft/vscode/issues/*",
            "https://github.com/tsalinger/github-issue-mover/issues/*"
        ],
        "suggestDestinationRepos": [
            "https://github.com/Microsoft/vscode-cpptools/issues",
            "https://github.com/OmniSharp/omnisharp-vscode/issues",
            "https://github.com/Microsoft/vscode-python/issues",
            "https://github.com/redhat-developer/vscode-java/issues"
        ]
    },
    "uniqueToken": "zzqqjfafsfalsjafslQ"
}
},{}],2:[function(require,module,exports){
"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
}
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const config = __importStar(require("../config/config"));
var Selectors;
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
    Selectors["moveIssueButtonID"] = "#move-issue-button";
})(Selectors = exports.Selectors || (exports.Selectors = {}));
class Dom {
    initMoveIssueButton(onClick) {
        const button = document.createElement('button');
        button.id = Selectors.moveIssueButtonID.replace('#', '');
        'btn btn-sm'.split(' ').forEach(cls => button.classList.add(cls));
        button.textContent = 'Move Issue';
        this.querySelectorThrows(Selectors.moveIssueButtonContainer, document).appendChild(button);
        button.addEventListener('click', onClick);
    }
    getMainComment(origIssueUrl) {
        const subject = this.getTextThrows(Selectors.subject, document);
        const data = this.getComments(Selectors.mainComment)[0];
        const asString = this.stringifyMainComment(data, origIssueUrl);
        return Object.assign({ subject }, data, { asString });
    }
    initRepoSuggestInput(onSubmit) {
        const input = document.createElement('input');
        input.type = 'url';
        input.placeholder = 'Destination repo (https://github.com/tsalinger/github-issue-mover/issues)';
        input.classList.add('form-control');
        input.style.width = '38em';
        input.style.marginLeft = '0.3em';
        const dataList = document.createElement('datalist');
        dataList.id = 'repositories';
        input.setAttribute('list', dataList.id);
        config.repositories.suggestDestinationRepos.forEach(repo => {
            var option = document.createElement('option');
            option.value = repo;
            dataList.appendChild(option);
        });
        input.appendChild(dataList);
        input.setAttribute('pattern', new RegExp('https?://github.com/.+/issues/?$').source);
        input.addEventListener('keyup', (e) => {
            if (e.keyCode == 13) {
                if (input.validity.patternMismatch) {
                    input.style.border = '1px solid red';
                }
                else {
                    input.style.border = '';
                    const val = input.value;
                    onSubmit(val.endsWith('/') ? val : val + '/');
                }
            }
        });
        const moveIssueButtonEl = this.querySelectorThrows(Selectors.moveIssueButtonID, document);
        moveIssueButtonEl.parentNode && moveIssueButtonEl.parentNode.replaceChild(input, moveIssueButtonEl);
    }
    stringifyMainComment(info, origIssueURL) {
        const matches = origIssueURL.match(new RegExp('https?://github.com/(.+/)+issues').source);
        if (!matches) {
            throw new Error('Could not extract the original issue URL');
        }
        return `>This issue has been moved from [${matches[1]}](${origIssueURL})\n` +
            `Original author is ${info.avatar}@${info.author}\n---\n` +
            `${info.bodyText}\n\n` +
            `---\n\n`;
    }
    getFollowUpCommentsIfAny() {
        const commentEls = document.querySelector(Selectors.followUpComments);
        if (commentEls) {
            return this.getComments(Selectors.followUpComments)
                .map((info) => `>This is a reply from ${info.avatar}@${info.author}\n\n` +
                `${info.bodyText}\n\n` +
                `---\n\n`);
        }
        return [];
    }
    getComments(selector) {
        const commentsData = [];
        const comments = this.querySelectorAllThrows(selector, document);
        for (const comment of comments) {
            this.getButtonThrows(Selectors.editButton, comment).click(); // click on edit button to get raw markdown
            commentsData.push(this.getCommentData(comment));
            this.getButtonThrows(Selectors.cancelButton, comment).click(); // cancel button closes edit again
        }
        return commentsData;
    }
    getCommentData(comment) {
        const bodyText = this.getTextThrows(Selectors.bodyTextarea, comment);
        const author = this.getTextThrows(Selectors.author, comment);
        const avatar = this.getAvatar(comment);
        return { bodyText, author, avatar };
    }
    getAvatar(comment) {
        const container = this.closestThrows(Selectors.commentsContainer, comment);
        return this.querySelectorThrows(Selectors.avatar, container).innerHTML.trim();
    }
    querySelectorThrows(selector, container) {
        const el = container.querySelector(selector);
        if (!el) {
            throw new Error(`Could not get element ${selector}`);
        }
        return el;
    }
    getTextThrows(selector, container) {
        const el = this.querySelectorThrows(selector, container);
        if (!el || !el.textContent) {
            throw new ReferenceError(`Selector: '${selector}' failed.`);
        }
        return el.textContent.trim();
    }
    querySelectorAllThrows(selector, container) {
        const els = container.querySelectorAll(selector);
        if (!els || !els.length) {
            throw new Error(`Could not get element ${selector}`);
        }
        return els;
    }
    closestThrows(selector, container) {
        const el = container.closest(selector);
        if (!el) {
            throw new Error(`Could not get closest element of ${selector}`);
        }
        return el;
    }
    getButtonThrows(selector, container) {
        return this.querySelectorThrows(selector, container);
    }
}
exports.Dom = Dom;

},{"../config/config":1}],3:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const dom_1 = require("./dom");
// @ts-ignore
const config_1 = require("../config/config");
(function () {
    const GM_DATA_KEY = 'issue-data';
    class CommentData {
        constructor(mainComment, followUpComments) {
            this.mainComment = mainComment;
            this.followUpComments = followUpComments;
        }
    }
    const dom = new dom_1.Dom();
    start();
    function start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (location.href.includes(decodeURI(config_1.uniqueToken))) {
                const issueBodyText = dom.getTextThrows(dom_1.Selectors.bodyTextarea, document);
                if (issueBodyText === config_1.uniqueToken) {
                    paste();
                }
            }
            else {
                dom.initMoveIssueButton(function onButtonClick() {
                    dom.initRepoSuggestInput(function onSuggestInputSubmit(destinationIssueURL) {
                        copy(destinationIssueURL);
                    });
                });
            }
        });
    }
    function copy(destinationIssueURL) {
        return __awaiter(this, void 0, void 0, function* () {
            const mainComment = dom.getMainComment(location.href);
            const followUpComments = dom.getFollowUpCommentsIfAny();
            // @ts-ignore
            GM_setValue(GM_DATA_KEY, JSON.stringify(new CommentData(mainComment.asString, followUpComments)));
            const newIssueURL = destinationIssueURL + `new?title=${encodeURIComponent(mainComment.subject)}&body=${config_1.uniqueToken}`;
            // @ts-ignore
            GM_openInTab(newIssueURL, false);
        });
    }
    function paste() {
        // @ts-ignore
        const jsonString = GM_getValue(GM_DATA_KEY);
        if (!jsonString) {
            throw new ReferenceError('Could not get issue-data');
        }
        const data = JSON.parse(jsonString);
        dom.querySelectorThrows(dom_1.Selectors.bodyTextarea, document).textContent = data.mainComment + data.followUpComments.join('');
        // @ts-ignore
        GM_setValue(GM_DATA_KEY, '');
    }
})();

},{"../config/config":1,"./dom":2}]},{},[2,3,1]);
