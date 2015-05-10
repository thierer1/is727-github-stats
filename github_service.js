
var request = require('request'),
    _ = require('underscore'),
    parse = require('parse-link-header'),
    Promise = require('bluebird'),
    path = require('path').posix;

var GitHubService = function (username, password, options) {
    this.username = username;
    this.password = password;
    this.options = _.isObject(options) ? options : {};
};

function makeRequest (url, options) {
    var deferred = Promise.pending();

    if (!options) {
        options = {};
    }

    if (!options.request) {
        options.request = {};
    }

    if (!options.request.headers) {
        options.request.headers = {};
    }

    if (!options.parser) {
        options.parser = function (body) { return body; };
    }

    options.request['url'] = url;
    options.request['headers']['User-Agent'] = 'thierer1';

    console.log('making request=',options.request.url);

    request(options.request, function (err, res, body) {
        var result = {};

        if (err) {
            deferred.reject(err);
            return;
        }

        result['body'] = options.parser(body);
        result['next'];

        if (_.has(res.headers, 'link')) {
            var linkObj = parse(res.headers['link']);

            if (_.has(linkObj, 'next')) {
                result['next'] = linkObj['next']['url'];
            }
        }

        if (_.isString(result['next'])) {
          nextUrl = result['next'];
        }

        deferred.resolve(result);
    });

    return deferred.promise;
}

function makeRequests (url, options, results) {
    if (!_.isArray(results)) {
        results = [];
    }

    return makeRequest(url, options).then(function (result) {
        results.push(result);

        if (_.has(result, 'next') && _.isString(result['next'])) {
            return makeRequests(result['next'], options, results);
        } else {
            return results;
        }
    });
}

function getAll (url, options) {
    return makeRequests(url, options).then(function (results) {
        return _.flatten(_.pluck(results, 'body'));
    });
}


GitHubService.prototype.getEndpoint = function (resourcePath) {
    var root = _.has(this.options, 'endpoint') 
        ? this.options['endpoint'] 
        : 'api.github.com';

    if (_.isString(resourcePath)) {
        root = path.join(root, resourcePath);
    }
    
    return 'https://' + root;
};

GitHubService.prototype.getAuth = function () {
    return {
        'user': this.username,
        'pass': this.password
    };
};

GitHubService.prototype.getRequestOptions = function () {
    return {
        'auth': this.getAuth()
    };
};

GitHubService.prototype.getAll = function (path) {
    var endpoint = this.getEndpoint(path),
        requestOptions = this.getRequestOptions(),
        options = {};

    options['parser'] = JSON.parse;
    options['request'] = requestOptions;

    return getAll(endpoint, options);
};

GitHubService.prototype.getContributors = function (owner, repo) {
    var resource = path.join('repos', owner, repo, 'contributors');
    return this.getAll(resource);
};

module.exports = GitHubService;