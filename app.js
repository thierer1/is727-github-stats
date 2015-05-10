
var fs = require('fs'),
    Promise = require('bluebird'),
    path = require('path'),
    GitHubService = require('./github_service'),
    CSVService = require('./csv_service'),
    JSONService = require('./json_service');

var githubService = new GitHubService(process.argv[2], process.argv[3]),
    csvService = new CSVService(),
    jsonService = new JSONService(),
    outDir = 'out';

function get (owner, repo, resource, resultGetter, dataGetter) {
    return resultGetter.call(githubService, owner, repo).then(function (results) {
        var filePrefix = path.join(outDir, owner + '-' + repo + '-' + resource);

        return Promise.all([
            csvService.saveCSV(filePrefix + '.csv', null, results, dataGetter),
            jsonService.saveJSON(filePrefix + '.json', results)
        ]);
    });
}

function contributorToCSV (contributor) {
    return [contributor['login'], contributor['contributions']];
}

function getContributors (owner, repo) {
    return get(owner, repo, 'contributors', githubService.getContributors, contributorToCSV);   
}

Promise.all([
    getContributors('elixir-lang', 'elixir'),
    getContributors('scala', 'scala'),
    getContributors('twbs', 'bootstrap'),
    getContributors('angular', 'angular.js')
]).then(function () {
    console.log('done!');
});