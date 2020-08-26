const puppeteer = require('puppeteer');
const csvFn = require('./csv-operations.js');

var linkQueue = [];
var data = [];
var queueCount = 0;
var options;

var browser;

function start(params) {

    options = params;

    console.log('Starting app with options:');
    console.log(options);

    if (options.readQueueFromFile) {
        var queue = csvFn.getQueueFromFile(options.fileName);
        queue.then(x=>{
            linkQueue = [...x];
            go();
        });
    }
    else if (typeof options.startUrl === 'string') {
        linkQueue.push(options.startUrl);
        go();
    }
    else {
        throw new Error('No start URL defined and readQueueFromFile false. Terminating.');
    }
}

function go(){
    console.log('Launching Browser ');
    var launchBrowserPromise = launchBrowser();
    launchBrowserPromise.then(function(pup){
        browser = pup.browser;
        console.log('Browser launched, starting queue');
        queueManager(pup.page);
    });
}

function queueManager(page){
    if (queueCount < linkQueue.length) {
        console.log('Launching next page! ('+(queueCount+1)+'/'+linkQueue.length+')');
        goToNextPage(page, linkQueue[queueCount])
        queueCount++;
    }
    else {
        console.log('Finished all pages!');
        finishSession(page);
    }
}


async function goToNextPage(page, url) {
    await page.goto(url);
    var scriptResults = await evaluateScripts(page);
    var payload = {
        url: url,
        data: scriptResults
    }
    data.push(payload);
    queueManager(page);
}

function evaluateScripts(page){
    console.log('Evaluating scripts...');
    return new Promise(function(resolve, reject) {
        var scripts = options.plugins;
        var scriptCount = 0;
        var scriptData = [];
        console.log('Loaded scripts! there are '+scripts.length+' scripts to load and execute.')
        function scriptQueueManager(page, data) {
            if (data !== null) {
                scriptData.push(data);
            }
            if (scriptCount < scripts.length) {
                console.log('Executing script: '+scripts[scriptCount]+' ('+(scriptCount+1)+'/'+scripts.length+')');
                executeScript(page, scripts[scriptCount], scriptQueueManager);
                scriptCount++;
            }
            else {
                console.log('Finished executing all scripts!');
                resolve(scriptData);
            }
        }
        scriptQueueManager(page, null);
    });
}

async function executeScript(page, script, callback) {
    var scriptName = script.name;
    console.log('Loading '+scriptName);
    try {
        var plugin = await import('../plugins/'+scriptName+'/index.js');
        var options = script.options;
        console.log('my plugin:');
        console.log(plugin);
        await page.exposeFunction('ma_plugin', plugin.default);
        var data = await page.evaluate(async options => {
                return ma_plugin(options);
        }, options);
        console.log('Finished!');
        console.log(data);
        callback(page, {module: scriptName, data:data});
    }
    catch (e) {
        console.log('Error loading '+scriptName+':');
        console.log(e);
        callback(page, {module: scriptName, data:['Error loading script']});
        return;
    }

}


function launchBrowser() {
    return new Promise(async function(resolve, reject) {
        try {
            const browser = await puppeteer.launch({headless: false});
            const page = await browser.newPage();

            resolve({browser: browser, page: page});
        }
        catch(e) {
            reject(e);
        }
    });
}

async function finishSession(page){
    await page.close();
    await browser.close();
    console.log(JSON.stringify(data, null, 4));
}


module.exports = {
    start:start
}