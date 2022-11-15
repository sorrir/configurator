import { Data, conn_protocol, DEFAULT_PORT } from "./types";
import * as bent from "bent";
import * as yargs from "yargs";
import * as fs from "fs";

let argv = yargs.option('setup', {
    alias: 's',
    type: 'string',
    describe: 'Path to a setupInfo.json. If none is given, processing of component types is skipped.'
}).argv;

if (argv.setup || argv.s) {
    console.log("Parsing setupInfo json file");
    const setupInfoRaw = JSON.parse(fs.readFileSync(argv.setup ? argv.setup : <string>argv.s, 'utf-8'));
    const setupInfo = { config: setupInfoRaw };
    const postJSON = bent('POST', { 'Content-Type': 'application/json'});
    console.log("Trying to POST to Rest Server...");
    postJSON('http://localhost:' + DEFAULT_PORT + '/load-setup-info', JSON.stringify(setupInfo) ).then(async res => {
        console.log("Response:", (<any>res).statusCode, (<any>res).statusMessage)
        try { const json = await (<any>res).json()
        console.log(json) } catch (e) {}
    }).catch(error => {
        console.log("error: " + error);
    });
} else {
    console.warn("No option to parse setupInfo json file given, exiting ...");
}