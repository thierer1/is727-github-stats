var fs = require('fs'),
    _ = require('underscore'),
    Promise = require('bluebird');

var CSVService = function () { };

function escapeStr (str) {
    if (!str) {
        str = '';
    } else {
        str = str.toString();
    }

    str.replace('"', '""');

    return '"' + str + '"';
}

function toLine () {
    var values = _.toArray(arguments),
        line = '';

    _.each(values, function (value, idx) {
        line += escapeStr(value);
        if (idx + 1 < values.length) {
            line += ',';
        }
    });

    return line + '\n';
}

CSVService.prototype.generateCSV = function (header, arr, getter) {
    var deferred = Promise.pending();
        csv = '';

    if (header && _.isArray(header)) {
        csv += toLine.apply(null, header);
    }

    if (_.isArray(arr)) {

        if (!getter) {
            getter = _.noop;
        }

        _.each(arr, function (element) {
            var values = getter(element);

            if (values && _.isArray(values)) {
                csv += toLine.apply(null, values);
            }
        });
    }

    deferred.resolve(csv);

    return deferred.promise;
}

CSVService.prototype.saveCSV = function (filename, header, arr, getter) {
    var deferred = Promise.pending();

    console.log('saving "' + filename + '"...');

    this.generateCSV(header, arr, getter).then(function (csv) {
        fs.writeFile(filename, csv, function (err) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(csv);
            }
        });
    });

    return deferred.promise;
}

module.exports = CSVService;