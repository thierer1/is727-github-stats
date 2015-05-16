
var fs = require('fs'),
    Promise = require('bluebird');

var JSONService = function () { };

JSONService.prototype.saveJSON = function (filename, obj) {
    var deferred = Promise.pending();

    console.log('saving "' + filename + '"...');

    fs.writeFile(filename, JSON.stringify(obj), function (err) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
};

module.exports = JSONService;