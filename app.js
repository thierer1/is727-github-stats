
var fs = require('fs'),
    Promise = require('bluebird'),
    path = require('path'),
    _ = require('underscore'),
    util = require('util'),
    GitHubService = require('./github_service'),
    CSVService = require('./csv_service'),
    JSONService = require('./json_service');

var githubService = new GitHubService(process.argv[2], process.argv[3]),
    csvService = new CSVService(),
    jsonService = new JSONService(),
    outDir = 'out',
    promises = [],
    projects;

projects = [
    { owner: 'elixir-lang', repo: 'elixir' },
    { owner: 'scala', repo: 'scala' },
    { owner: 'twbs', repo: 'bootstrap' },
    { owner: 'angular', repo: 'angular.js' }
];

function getFilePrefix (owner, repo, resource) {
    return path.join(outDir, owner + '-' + repo + '-' + resource);
}

function get (owner, repo, resource, resultGetter, dataGetter) {
    return resultGetter.call(githubService, owner, repo).then(function (results) {
        var filePrefix = getFilePrefix(owner, repo, resource),
            promises = [];

        if (dataGetter) {
            promises.push(csvService.saveCSV(filePrefix + '.csv', null, results, dataGetter));
        }

        promises.push(jsonService.saveJSON(filePrefix + '.json', results));

        return Promise.all(promises);
    });
}

function contributorToCSV (contributor) {
    return [contributor['login'], contributor['contributions']];
}

function getContributors (owner, repo) {
    return get(owner, repo, 'contributors', githubService.getContributors, contributorToCSV);   
}

function issuesToCSV (issue) {
    var numComments = _.isArray(issue['comments']) ? issue['comments'].length : 0,
        isPR = _.has('pull_request', issue) ? 'true' : 'false';
    return [issue['id'], issue['title'], issue['user']['login'], isPR, numComments];
}

function getIssues (owner, repo) {
    return githubService.getIssues(owner, repo).then(function (issues) {
        return githubService.getCommentsForIssues(issues).then(function (issues) {
            var filePrefix = getFilePrefix(owner, repo, 'issues-comments');
            return [
                jsonService.saveJSON(filePrefix + '.json', issues),
                csvService.saveCSV(filePrefix + '.csv', null, issues, issuesToCSV)
            ];
        });
    });
}

_.each(projects, function (project) {
    promises.push(getContributors(project.owner, project.repo));
    promises.push(getIssues(project.owner, project.repo));
});

Promise.all(promises).then(function () {
    console.log('done!');
}).catch(function (err) {
    console.log(err);
    console.log(util.inspect(err, { depth: null }));
});