
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
        } else {
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
            return makeRequests(result['next'], options, results).catch(function (err) {
                return results;
            });
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
    if (resourcePath && resourcePath.indexOf('http') === 0) {
        return resourcePath;
    }

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
    var resource = path.join('repos', owner, repo, 'contributors') + '?' +
        'per_page=100';
    return this.getAll(resource);
};

GitHubService.prototype.getIssues = function (owner, repo) {
    var resource = path.join('repos', owner, repo, 'issues') + '?' + 
        'per_page=100&state=all&since=' + encodeURIComponent((new Date('2015-03-08')).toISOString());
    return this.getAll(resource);
};

GitHubService.prototype.getCommentsForIssues = function (issues) {
    var deferred = Promise.pending(),
        issueWithComments = [],
        self = this,
        next;

    // make comment retrieval synchronous, to prevent from overloading the 
    // GitHub API and triggering timeouts 
    // still needs to fit into the asyncrhonous callback framework exposed by 
    // this API
    next = function (idx) {
        if (!idx) {
            idx = 0;
        }

        if (idx >= issues.length) {
            deferred.resolve(issueWithComments);     
        } else {
            var issue = issues[idx],
                resource = issue['comments_url'] + '?per_page=100';

            self.getAll(resource).then(function (comments) {
                issue['comments'] = comments;
                issueWithComments.push(issue);
                next(idx + 1);
            }).catch(function (err) {
                console.log(err);
                next(idx + 1);
            });
        }
    };

    next();

    return deferred.promise;
};

module.exports = GitHubService;