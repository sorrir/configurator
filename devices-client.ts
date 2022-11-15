import { Data, conn_protocol, DEFAULT_PORT } from "./types";
import * as bent from "bent";
import * as yargs from "yargs";
import * as child_process from "child_process";

// retrieve from k3s cluster
let argv = yargs.option('devices', {
        alias: 'd',
        type: 'boolean',
        describe: "If this option is set, process thy types of devices found in the accessible kubernetes cluster",
}).argv;

if (argv.devices || argv.d) {
    console.log("Converting device information");
    const devicesRaw = JSON.parse(child_process.execSync('converter/get_k8s_devices.sh').toString());
    const devices = { devices: initDevices(devicesRaw) }; 
    const postJSON = bent('POST', { 'Content-Type': 'application/json'});
    console.log("Trying to POST to Rest Server...");
    postJSON('http://localhost:' + DEFAULT_PORT + '/load-devices-info', JSON.stringify(devices) ).then(async res => {
        console.log("Response:", (<any>res).statusCode, (<any>res).statusMessage)
        try { const json = await (<any>res).json()
        console.log(json) } catch (e) {}
    }).catch(error => {
        console.log("error: " + error);
    });
}
else {
    console.warn("No option to convert devices info, exiting ...");
}

function initDevices(devicesRaw) {
    let devices:any[] = [];
    if(Object.keys(devicesRaw["devices"]).length === 0) {
        return;
    }
    for(const dev of devicesRaw["devices"]) {
        const devTransformed = {
            deviceName: dev.name,
            // todo: enum
            architecture: dev.architecture,
            // todo: elems -> enum
            // todo: fix BLE <=> BLUETOOTH missmatch
            protocols: dev.protocols.map(prot => conn_protocol[prot == "BLE" ? "BLUETOOTH" : prot]),
            location: "unknown",
            units: [],
        }
        devices.push(devTransformed);
    }
  const devExt = {
    deviceName: "ext",
    architecture: "n/a",
    protocols: [ conn_protocol.REST, conn_protocol.MQTT, conn_protocol.MQTT_EXTERNAL, conn_protocol.BLUETOOTH, conn_protocol.TOM ],
    location: "unknown",
    units: [],
  }
  devices.push(devExt);

  return devices;
}
