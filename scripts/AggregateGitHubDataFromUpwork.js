/*
 * To run this script from the root of E/App:
 *
 * node ./scripts/AggregateGitHubDataFromUpwork.js <path_to_csv> <github_pat>
 */
const _ = require('underscore');
const fs = require('fs');
const {GitHub, getOctokitOptions} = require("@actions/github/lib/utils");
const {throttling} = require("@octokit/plugin-throttling");
const {paginateRest} = require("@octokit/plugin-paginate-rest");

if (process.argv.length < 3) {
    throw new Error('Error: must provide filepath for CSV data');
}

if (process.argv.length < 4) {
    throw new Error('Error: must provide GitHub token');
}

// Get filepath for csv
const filepath = process.argv[2];

// Get data from csv
let issues = _.filter(fs.readFileSync(filepath).toString().split('\n'), issue => !_.isEmpty(issue));

// Skip header row
issues = issues.slice(1);


// Get GitHub token
const token = process.argv[3].trim();
const Octokit = GitHub.plugin(throttling, paginateRest);
const octokit = new Octokit(getOctokitOptions(token, {
    throttle: {
        onRateLimit: (retryAfter, options) => {
            console.warn(
                `Request quota exhausted for request ${options.method} ${options.url}`,
            );

            // Retry once after hitting a rate limit error, then give up
            if (options.request.retryCount <= 1) {
                console.log(`Retrying after ${retryAfter} seconds!`);
                return true;
            }
        },
        onAbuseLimit: (retryAfter, options) => {
            // does not retry, only logs a warning
            console.warn(
                `Abuse detected for request ${options.method} ${options.url}`,
            );
        },
    },
})).rest;



async function getGitHubData() {
    const gitHubData = [];
    for (const issueNumber of issues) {
        const num = issueNumber.trim();
        const result = await octokit.issues.get({
            owner: 'Expensify',
            repo: 'App',
            issue_number: num,
        });
        const issue = result.data;
        gitHubData.push({
            number: issue.number,
            title: issue.title,
            labels: _.map(issue.labels, label => label.name),
        });
    }
    return gitHubData;
}

const bugs = [];
const newFeatures = [];
const other = [];

getGitHubData().then((issues) => {
    _.each(issues, issue => {
        if (_.contains(issue.labels, 'Bug')) {
            bugs.push(issue);
            return;
        }
        if (_.contains(issue.labels, 'New Feature')) {
            newFeatures.push(issue);
            return;
        }
        other.push(issue);
    });
});

console.log('Bugs:', bugs);
console.log('New Features:', newFeatures);
console.log('Other:', other);
