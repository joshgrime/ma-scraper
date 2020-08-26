
const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');

function getQueueFromFile(fileName) {
    return new Promise(function(resolve, reject) {
        var queue = [];
        fs.createReadStream(path.resolve(__dirname + '/../files/start/' + fileName))
            .pipe(csv.parse({ headers: true }))
            .on('error', error => reject(error))
            .on('data', row => queue.push(row['URL']))
            .on('end', rowCount => resolve(queue));
    });
}

module.exports = {
    getQueueFromFile: getQueueFromFile
}