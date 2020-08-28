const puppeteer = require('puppeteer');
const csvFn = require('./csv-operations.js');



var linkQueue = [];
var data = [];
var queueCount = 0;
var saveCount = 0;
var options;

var browser;

var jobSummary = {
    linksCrawled:[],
    pagesCrawled:0,
    plugins:[]
}

function start(params) {

    options = params;

    jobSummary.plugins = params.plugins;
    jobSummary.timeStarted = new Date().getTime();
    jobSummary.reportFile = params.reportName + '.csv';

    console.log('Starting app with options:');
    console.log(options);

    if (options.readQueueFromFile) {
        var queue = csvFn.getQueueFromFile(options.fileName);
        queue.then(x=>{
            var links = [...x];
            linkQueue = formatNewLinks(links, -1);
            go();
        });
    }
    else if (typeof options.startUrl === 'string') {
        linkQueue.push({url: options.startUrl, depth: 0});
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

async function queueManager(page){
    console.log('link Q');
    console.log(linkQueue);
    if (saveCount > options.saveRate) {
        var save = await csvFn.outputReport(options.reportName, data);
        if (save) {
            console.log('Mid-process save successful! Clearing data memory.');
            data.length = 0;
        }
        else {
            console.log('Mid-process save unsucessful.');
        }
        saveCount = 0;
    }
    if (queueCount < linkQueue.length) {
        console.log('Launching next page! ('+(queueCount+1)+'/'+linkQueue.length+')');
        goToNextPage(page, linkQueue[queueCount]);
        queueCount++;
        saveCount++;
    }
    else {
        console.log('Finished all pages!');
        jobSummary.timeFinished = new Date().getTime();
        jobSummary.secondsToComplete = (jobSummary.timeFinished - jobSummary.timeStarted)/1000;
        await csvFn.outputReport(options.reportName, data);
        await csvFn.outputSummary(jobSummary, options.reportName);
        finishSession(page);
    }
}


async function goToNextPage(page, url) {
    try  {
    await page.goto(url.url);
    var scriptResults = await evaluateScripts(page, url.depth);
    var payload = {
        url: url,
        data: scriptResults
    }
    data.push(payload);
    jobSummary.linksCrawled.push(url);
    jobSummary.pagesCrawled++;
    }
    catch (e) {
        throw new Error(e);
    }
    finally {
        queueManager(page);
    }
}

function uniq(a) {

    var final = [];

    for (let x of a) {

        console.log('A is '+ a);

        var check = final.filter(y=>{ 
            return (x.url === y.url);
        });
        console.log('check is '+ check);

        if (check.length === 0) {
            final.push(x);
        } 

    }
    console.log('returning unique array')
    console.log(final);
    return final;

}

function evaluateScripts(page, depth){
    console.log('Evaluating scripts...');
    return new Promise(function(resolve, reject) {
        var scripts = options.plugins;
        var scriptCount = 0;
        var scriptData = [];
        console.log('Loaded scripts! there are '+scripts.length+' scripts to load and execute.')
        function scriptQueueManager(page, data) {
            if (data !== null) {
                scriptData.push(data);
                console.log('Crawling?');
                console.log(options.crawl === true && data.module === 'link-gather' && depth < options.maxLinkDepth);
                if (options.crawl === true && data.module === 'link-gather' && depth < options.maxLinkDepth) {
                    var links = formatNewLinks(data.data, depth);
                    linkQueue = linkQueue.concat(links);
                    linkQueue = uniq(linkQueue);
                }
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

function formatNewLinks(data, currentDepth) {
    var links = [];
    for (let li of data) {
        links.push({url:li, depth: currentDepth + 1});
    }
    return links;
}

async function executeScript(page, script, callback) {
    var scriptName = script.name;
    console.log('Loading '+scriptName);
    try {
        var plugin = await import('../plugins/'+scriptName+'/index.js');
        var s_options = script.options;
        var pageFunc;
        if (typeof plugin.default !== 'function' && typeof plugin.default.default === 'function') {
            pageFunc = plugin.default.default;
        }
        else {
            pageFunc = plugin.default;
        }
        var data = await page.mainFrame().evaluate(pageFunc, s_options);
        console.log('Finished!');
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
            const browser = await puppeteer.launch({headless: options.headless});
            const page = await browser.newPage();
            await page.setDefaultNavigationTimeout(options.pageTimeout * 1000);

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
    console.log('Program terminating.');
}


module.exports = {
    start:start
}