# GitHub Issue Mover
Moving issues on GitHub is bothersome. This Tampermonkey script facilitates this task by doing the work for you.

## Getting Started
There are 2 settings that you need to adapt: 
- ```sourceRepos``` are all the repos from which you want to move issues
- ```suggestDestinationRepos``` are shown as suggestions in the input box

To set these settings either edit the dist/issueMover.js directly or edit config/config.json and run ```gulp```.

## Activation Events
There are 2 activation events (see config/config.json):
1. Whenever a new issue has been created whose URL matches https://github.com/\*/issues/new?title\*_uniqueToken_
2. Whenever an issue is opened in one of the source repos, e.g. https://github.com/tsalinger/github-issue-mover/issues/*