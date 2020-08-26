#!/bin/sh 
":" //# comment; exec /usr/bin/env node --experimental-modules "$0" "$@"
const app = require('./src/app.js');
const options = require('./config.json');
const fs = require("fs");

async function initialise(){
    try {
        await fs.promises.access("./files/results");
    } catch (e) {
        await fs.promises.mkdir("./files/results", { recursive: true });
    }
    finally {
        if (options.readQueueFromFile) {
            try {
                await fs.promises.access("./files/start");
            } catch (e) {
                await fs.promises.mkdir("./files/start", { recursive: true });
            }
            finally {
                var files = await fs.promises.readdir('./files/start');
                files = files.filter(x=>{
                    return x.substring(x.length-4, x.length) === '.csv';
                });
                if (files.length > 0) {
                    options.fileName = files[0];
                } 
                else {
                    throw new Error('No CSV found! Change options or add your file to ./files/start');
                }
                startApp(options);
            }
        }
        else {
            startApp(options);
        }
    }
}

function startApp(options) {
    try {
        app.start(options)
    }
    catch (e) {
        console.log(e);
    }
}

initialise();