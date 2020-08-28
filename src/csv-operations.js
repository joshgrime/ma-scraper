
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

function outputSummary(data) {
    return new Promise(function(resolve, reject) {
        fs.writeFile(path.resolve(__dirname + '/../files/results/job-' + new Date().getTime() + '.json'), JSON.stringify(data, null, 4), function(err) {
            if(err) {
                reject(err);
                return console.log(err);
            }
            resolve();
        });         
    });
}

function outputReport(fileName, fileData){
    return new Promise(function(resolve, reject) {
        function writeFile(fp, data, newData){

            var tempdata = [];

            for (let i=-1; i<newData.length; i++) {
                var firstRun = i === -1;
                var a = [
                    firstRun ? 'URL' : newData[i].url.url,
                    firstRun ? 'DEPTH' : newData[i].url.depth
                ];

                let j = firstRun ? 0 : i;
                if (newData[j] !== undefined) {
                    for (let y of newData[j].data) {
                        if (firstRun) {
                            a.push(y.module);
                        }
                        else {
                            a.push(y.data.toString());
                        }
                    }
                }
                tempdata.push(a);
                firstRun = false;
            }

            var writeData = tempdata.concat(data);
            console.log('Writing data to file:');
            console.log(JSON.stringify(writeData, null, 4));
            csv.writeToPath(fp, writeData)
                .on('error', err => {
                    console.log(err);
                    reject(false)
                })
                .on('finish', () => {resolve(true)})
        }


        try {
            var data = [];
            var fp = path.resolve(__dirname + '/../files/results/' + fileName + '.csv');
            fs.access(fp, fs.F_OK, (err) => {
                if (!err) {
                    console.log('File already exists');
                    fs.createReadStream(fp)
                    .pipe(csv.parse({ headers: true }))
                    .on('error', error => reject(error))
                    .on('data', row => data.push(row))
                    .on('end', rowCount => {
                        writeFile(fp, data, fileData);
                    });
                }
                else {
                    console.log('File does not exist');
                    writeFile(fp, data, fileData);
                }
                
            });
            
        }
        catch (e) {
            console.log(e);
            resolve(false);
        }
    });
}

module.exports = {
    getQueueFromFile: getQueueFromFile,
    outputReport: outputReport,
    outputSummary: outputSummary
}