import * as yargs from "yargs";
import * as express from "express";
import { hideBin } from "yargs/helpers";
import * as bodyParser from "body-parser";
import * as util from "./util";
import { Data, DEFAULT_PORT, conn_protocol, UnitConnection, Unit, availableHpNames, MigrationFields, MigrationType } from "./types";
import * as _ from "lodash";
import * as fs from 'fs';

const logDepth = 4;
function logData() {
    console.log("--------");
    console.dir(data, { depth: logDepth });
}

// init data
let data: Data = <any>{}
let stateReadIn:boolean = false;
function clearData() {
    data.componentInstances = {}
    data.setupInfo = {
        components: {},
        startStates: {}
    }
    data.connections = [];
    data.units = [];
    data.devices = [];
    data.resilienceInfo = {
        resilienceLibraryPath: "",
        components: []
    };
    data.securityConfig = {
        ssl: false,
        communicationSecret: []
    };
    data.extToolsConfig = {
        honeyPots: [],
        useIds: false,
        debugFrontendInfos: {},
    };
    data.npmConfig = {
        startScriptName: ""
    };
    data.degradationInfo = {
        degradation: false,
        degradationFileName: "" 
    };
    data.migrationStatus = {
        history: [],
        pending: [],
        finalizing: [],
    }
    data.debuggingConfiguration = {},
    stateReadIn = false;
}
clearData();

function initData() {
    data.resilienceInfo.resilienceLibraryPath = "/usr/src/sorrir/framework/resilience_library";
    data.npmConfig.startScriptName = "startExecutor"
}
initData();

// get input arguments
const args = yargs(hideBin(process.argv)).argv;

// init endpoints
const app = express();
app.use(bodyParser.json());
app.post("/reset-configuration", (req, res) => {
    clearData();
    initData();
    res.sendStatus(200);
    logData();
});
app.post("/load-setup-info", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        config: "object"
    }, body, res)) return;
    data.setupInfo = body.config;
    console.log(data.setupInfo);
    for (const component of Object.keys(data.setupInfo.components)) {
        data.componentInstances[component] = [];
    }
    res.sendStatus(200);
    logData();
});
app.post("/load-devices-info", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        devices: "object"
    }, body, res)) return;
    data.devices = body.devices;
    console.log(data.devices);
    res.sendStatus(200);
    logData();
});
app.post("/import-configuration", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        config: "string"
    }, body, res)) return;
    const config = body.config;
    const fileContent = fs.readFileSync(config).toString('utf-8');
    const configuration = JSON.parse(fileContent);
    clearData();
    //todo: error-handling, type incompatibility
    data = util.transformInput(configuration);
    stateReadIn = true;
    const migrationFieldsHistoryNew:MigrationFields[] = data.migrationStatus.finalizing;
    data.migrationStatus.finalizing = [];
    data.migrationStatus.history = data.migrationStatus.history.concat(migrationFieldsHistoryNew);
    res.sendStatus(200);
    logData();
});
app.post("/add-component-instance", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        component: "string",
        name: "string",
        startState: "string"
    }, body, res)) return;
    const instances = data.componentInstances[body.component];
    if (!instances) {
        util.raiseInputError("Component with name: '" + body.name + "' does not exist in setupConfig.", res)
    } else if (!data.setupInfo.startStates || !data.setupInfo.startStates[body.startState]) {
        util.raiseInputError("StartState does not exist in setupConfig.", res);
    } else if (util.getInstance(body.name, data)) {
        util.raiseInputError("Instance with the same name already exists.", res);
    } else {
        instances.push({
            name: body.name,
            startState: body.startState
        })
        res.sendStatus(200);
    }
    logData();
});
app.post("/add-component-instance-with-start-args", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        component: "string",
        name: "string",
        startStateGenerator: "string",
        startStateArgs: "object",
    }, body, res)) return;
    const instances = data.componentInstances[body.component];
    if (!instances) {
        util.raiseInputError("Component with name: '" + body.name + "' does not exist in setupConfig.", res)
    //} else if (!data.setupInfo.stateGenerators || !data.setupInfo.stateGenerators?.get(body.startStateGenerator)) {
        util.raiseInputError("StartStateGenerator does not exist in setupConfig.", res);
    } else if (util.getInstance(body.name, data)) {
        util.raiseInputError("Instance with the same name already exists.", res);
    } else {
        instances.push({
            name: body.name,
            startStateGenerator: body.startStateGenerator,
            startStateArgs: body.startStateArgs,
        })
        res.sendStatus(200);
    }
    logData();
});
app.post("/add-component-instance-auto", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        component: "string",
    }, body, res)) return;
    const startState = body.component + "StartState";
    const name = body.component;
    const instances = data.componentInstances[body.component];
    if (!instances) {
        util.raiseInputError("Component with name: '" + body.name + "' does not exist in setupConfig.", res)
    } else if (!data.setupInfo.startStates || !data.setupInfo.startStates[startState]) {
        util.raiseInputError("StartState does not exist in setupConfig.", res);
    } else if (util.getInstance(name, data)) {
        util.raiseInputError("There is already an auto-generated instance of the same component.", res);
    } else {
        instances.push({
            name: name,
            startState: startState
        })
        res.sendStatus(200);
    }
    logData();
});
app.post("/add-component-instances-auto", (req, res) => {
    let error = false;
    for (const [component, instances] of Object.entries(data.componentInstances)) {
        const startState = component + "StartState";
        const name = component;
        if (!data.setupInfo.startStates || !data.setupInfo.startStates[startState]) {
            util.raiseInputError("StartState for component does not exist in setupConfig.", res);
            error = true;
            break;
        } else if (util.getInstance(name, data)) {
            util.raiseInputError("There is already an auto-generated instance of the same component.", res);
            error = true;
            break;
        } else {
            instances.push({
                name: name,
                startState: startState
            })
        }
    }
    if (!error) res.sendStatus(200);
    logData();
});
app.post("/remove-component-instance", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        component: "string",
        name: "string"
    }, body, res)) return;
    const instance = util.getInstance(body.name, data)
    if (!instance) {
        util.raiseInputError("Instance with the given name '" + body.name + " 'does not exist for component type.", res);
        return;
    }
    Object.values(data.componentInstances).forEach((instances) => _.remove(instances, (el) => el.name === body.name));
    res.sendStatus(200);
    logData();
});
app.post("/add-connection", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        sourceComponent: "string",
        sourcePort: "string",
        targetComponent: "string",
        targetPort: "string",
    }, body, res)) return;
    const sourceComponent = util.getComponentInfoOfInstance(body.sourceComponent, data);
    const targetComponent = util.getComponentInfoOfInstance(body.targetComponent, data);
    if (!sourceComponent || !targetComponent) {
        util.raiseInputError("Invalid target or source name.", res);
        return;
    }
    const sourcePort = _.find(sourceComponent.ports, (port) => port.name === body.sourcePort && port.direction === "out")
    const targetPort = _.find(targetComponent.ports, (port) => port.name === body.targetPort && port.direction === "in")
    if (!sourcePort || !targetPort) {
        util.raiseInputError("Invalid target or source port.", res);
        return;
    }

    if (!util.arePortsCompatible(sourcePort, targetPort)) {
        util.raiseInputError("Ports are not compatible.", res);
        return;
    }

    const connection = {
        sourceComponent: body.sourceComponent,
        sourcePort: body.sourcePort,
        targetComponent: body.targetComponent,
        targetPort: body.targetPort,
    }
    if (_.some(data.connections, connection)) {
        util.raiseInputError("Connection is a duplicate.", res);
        return;
    }
    data.connections.push(connection);
    res.sendStatus(200);
    logData();
});
app.post("/remove-connection", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        sourceComponent: "string",
        sourcePort: "string",
        targetComponent: "string",
        targetPort: "string",
    }, body, res)) return;
    const sourceComponent = util.getComponentInfoOfInstance(body.sourceComponent, data);
    const targetComponent = util.getComponentInfoOfInstance(body.targetComponent, data);
    if (!sourceComponent || !targetComponent) {
        util.raiseInputError("Invalid target or source name.", res);
        return;
    }
    const sourcePort = _.find(sourceComponent.ports, (port) => port.name === body.sourcePort && port.direction === "out")
    const targetPort = _.find(targetComponent.ports, (port) => port.name === body.targetPort && port.direction === "in")
    if (!sourcePort || !targetPort) {
        util.raiseInputError("Invalid target or source port.", res);
        return;
    }
    const connection = {
        sourceComponent: body.sourceComponent,
        sourcePort: body.sourcePort,
        targetComponent: body.targetComponent,
        targetPort: body.targetPort,
    }
    if (_.remove(data.connections, connection).length === 0) {
        util.raiseInputError("Connection does not exist.", res);
        return;
    }
    res.sendStatus(200);
    logData();
});
app.post("/change-unit-connection-protocol", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        sourceComponent: "string",
        sourcePort: "string",
        targetComponent: "string",
        targetPort: "string",
        protocol: "string"
    }, body, res)) return;
    const sourceComponent = util.getComponentInfoOfInstance(body.sourceComponent, data);
    const targetComponent = util.getComponentInfoOfInstance(body.targetComponent, data);
    if (!sourceComponent || !targetComponent) {
        util.raiseInputError("Invalid target or source name.", res);
        return;
    }
    const sourcePort = _.find(sourceComponent.ports, (port) => port.name === body.sourcePort && port.direction === "out")
    const targetPort = _.find(targetComponent.ports, (port) => port.name === body.targetPort && port.direction === "in")
    if (!sourcePort || !targetPort) {
        util.raiseInputError("Invalid target or source port.", res);
        return;
    }
    const usedProtocol = body.protocol;
    if (!Object.values(conn_protocol).includes(usedProtocol)) {
        util.raiseInputError("Protocol " + usedProtocol + " not known.", res);
        return;
    }
    const connection: UnitConnection = {
        sourceComponent: body.sourceComponent,
        sourcePort: body.sourcePort,
        targetComponent: body.targetComponent,
        targetPort: body.targetPort,
        protocol: body.protocol
    }
    if (!util.connectionExists(connection, data)) {
        util.raiseInputError("Connection does not exist.", res);
        return;
    }
    if (!util.changeProtocol(connection, data)) {
        util.raiseInputError("Protocol " + connection.protocol + " not allowed on mapped devices", res);
        return;
    }
    res.sendStatus(200);
    logData();
})
app.post("/add-connections-auto", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    Object.entries(data.componentInstances).forEach(([type, sourceInstances]) => {
        const sourceComponent = data.setupInfo.components[type];
        for (const sourceInstance of sourceInstances) {
            Object.entries(data.componentInstances).forEach(([type, targetInstances]) => {
                const targetComponent = data.setupInfo.components[type];
                for (const targetInstance of targetInstances) {
                    if (sourceInstance === targetInstance) {
                        break;
                    }
                    for (const sourcePort of _.filter(sourceComponent.ports, (port) => port.direction === "out")) {
                        for (const targetPort of _.filter(targetComponent.ports, (port) => port.direction === "in")) {
                            if (util.arePortsCompatible(sourcePort, targetPort)) {
                                const connection = {
                                    sourceComponent: sourceInstance.name,
                                    sourcePort: sourcePort.name,
                                    targetComponent: targetInstance.name,
                                    targetPort: targetPort.name,
                                }
                                data.connections.push(connection);
                            }
                        }
                    }
                }
            })
        }
    })
    res.sendStatus(200);
    logData();
});
app.post("/create-units", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        count: "number",
    }, body, res)) return;

    const count = body.count;

    var unit_mbr = data.units.length + 1;

    for (let i = 0; i < count; i++) {
        const unit = {
            id: "unit_".concat(String(unit_mbr)),
            components: [],
            unitConnections: [],
            shadowModeConfig: {}
        }
        data.units.push(unit)
        unit_mbr++;
    }

    res.sendStatus(200);
    logData();
});
app.post("/map-component-instance-to-unit", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        component: "string",
        name: "string",
        unit: "string"
    }, body, res)) return;
    const instance = util.getInstance(body.name, data)
    const unit_indx = util.getUnitIndx(body.unit, data)
    if (!instance) {
        util.raiseInputError("Instance with the given name '" + body.name + "' does not exist for component type.", res);
        return;
    }
    for (let unit of data.units) {
        for (let component of unit.components) {
            if (component.instance?.name == instance.name) {
                util.raiseInputError("Component instance already mapped.", res);
                return;
            }
        }
    }
    if (unit_indx === undefined) {
        util.raiseInputError("Unit with the given name '" + body.unit + " 'does not exist.", res);
        return;
    }
    const component = {
        type: util.getComponentInfoOfInstance(instance.name, data),
        instance: instance
    }
    data.units[unit_indx].components.push(component);
    res.sendStatus(200);
    logData();
});
app.post("/map-unit-to-device", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        unit: "string",
        device: "string"
    }, body, res)) return;
    const unit_indx = util.getUnitIndx(body.unit, data)
    const device_indx = util.getDeviceIndx(body.device, data)
    if (device_indx === undefined) {
        util.raiseInputError("Device with the given name '" + body.device + "' does not exist.", res);
        return;
    }
    if (unit_indx === undefined) {
        util.raiseInputError("Unit with the given name '" + body.unit + "' does not exist.", res);
        return;
    }
    for (const dev of data.devices) {
        for (const unit of dev.units) {
            if (unit == data.units[unit_indx].id) {
                util.raiseInputError("Unit already mapped.", res);
                return;
            }
        }
    }
    if (!util.initUnitConnections(device_indx, unit_indx, data)) {
        util.raiseInputError("Cannot map unit with the given name '" + body.unit + "' on device " + data.devices[device_indx] + " as\
        there would be a protocol incompatibility", res);
        return;
    }
    data.devices[device_indx].units.push(data.units[unit_indx].id);
    res.sendStatus(200);
    logData();
});
app.post("/add-resilience-mechanism", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        component: "string",
        name: "string",
        mechanism: "string"
    }, body, res)) return;
    if (body.mechanism !== "activeReplication" && body.mechanism !== "checkpointRecovery") {
        util.raiseInputError("Resilience mechanism with the given name '" + body.mechanism + "' does not exist.", res);
        return;
    }
    const instances = data.componentInstances[body.component];
    if (!instances) {
        util.raiseInputError("Component with name: '" + body.name + "' does not exist in setupConfig.", res)
    }
    const instance = util.getInstance(body.name, data)
    if (!instance) {
        util.raiseInputError("Instance with the given name does not exist.", res);
        return;
    }
    if (util.componentHasActiveReplication(instance.name,data)) {
        util.raiseInputError("Resilience Mechanism already defined for component.", res);
        return;
    }
    if (body.mechanism === "activeReplication") {
        util.addReplicatedComponent("BFT", instance.name, 4, 1, data);
    } else if (body.mechanism === "checkpointRecovery") {
        util.addCheckpointedComponent(instance.name, data);
    } else {
        util.raiseInputError("Resilience Mechanism \'" + body.mechanism + "\' not known.", res);
        return;
    }
    res.sendStatus(200);
    logData();
});
app.post("/change-fault-tolerance-params", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        faultModel: "string",
        component: "string",
        name: "string",
        n: "number",
        f: "number"
    }, body, res)) return;
    const instances = data.componentInstances[body.component];
    if (!instances) {
        util.raiseInputError("Component with name: '" + body.name + "' does not exist in setupConfig.", res)
    }
    const instance = util.getInstance(body.name, data)
    if (!instance) {
        util.raiseInputError("Instance with the given name does not exist.", res);
        return;
    }
    if (!util.componentHasActiveReplication(instance.name,data)) {
        util.raiseInputError("Resilience Mechanism for component instance '" + body.name + "' not set to activeReplication.", res);
        return;
    }
    if ((body.faultModel !== "BFT") && (body.faultModel !== "CFT")) {
        util.raiseInputError("Either \'BFT\' or \'CFT\' must be set as mode.", res);
        return;
    }
    util.setReplicationParameters(body.faultModel, instance.name, body.n, body.f, data);
    res.sendStatus(200);
    logData();
});
app.post("/set-execution-sites", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        component: "string",
        name: "string",
        sites: "object"
    }, body, res)) return;
    const instances = data.componentInstances[body.component];
    if (!instances) {
        util.raiseInputError("Component with name: '" + body.name + "' does not exist in setupConfig.", res)
    }
    const instance = util.getInstance(body.name, data)
    if (!instance) {
        util.raiseInputError("Instance with the given name does not exist.", res);
        return;
    }
    if (!util.componentHasActiveReplication(instance.name,data)) {
        util.raiseInputError("Resilience Mechanism for component instance '" + body.name + "' not set to activeReplication.", res);
        return;
    }
    const executionSites = body.sites;
    if (!util.executionSitesFeasible(executionSites, data)) {
        util.raiseInputError("At least on executionSite unknown.", res);
        return;
    }
    util.setExecutionSites(executionSites, instance.name, data);
    res.sendStatus(200);
    logData();
});
app.post("/set-unit-shadow-mode-config", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        unit: "string",
        config: "object"
    }, body, res)) return;
    const unit = <Unit>_.find(data.units, unit => unit.id === body.unit);
    if (unit === undefined) {
        util.raiseInputError("Unit is not known.", res);
        return;
    }
    // todo: type checks for config
    unit.shadowModeConfig = body.config;
    res.sendStatus(200);
    logData();
});
app.post("/set-secure-connection", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        from: "string",
        to: "string",
    }, body, res)) return;
    if (body.from === body.to) {
        util.raiseInputError("unit names for secured communication must differ", res);
        return;
    }
    const uNames: string[] = Array.from(data.units, el => { return el.id });
    if (!uNames.includes(body.from)) {
        util.raiseInputError("unit name from: '" + body.from + "' not known.", res);
        return;
    }
    if (!uNames.includes(body.to)) {
        util.raiseInputError("unit name to: '" + body.from + "' not known.", res);
        return;
    }
    const secret = {
        from: body.from,
        to: body.to,
    }
    data.securityConfig.ssl = true;
    data.securityConfig.communicationSecret.push(secret);
    res.sendStatus(200);
    logData();
});
app.post("/set-honeypot-config", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        hpName: "string",
        portToOpenHost: "number",
        portToOpenContainer: "number",
        // todo: change to deviceName to be consistent
        device: "string"
    }, body, res)) return;
    const device_indx = util.getDeviceIndx(body.device, data)
    if (device_indx === undefined) {
        util.raiseInputError("Device with the given name '" + body.device + "' does not exist.", res);
        return;
    }
    const hpName = body.hpName;
    if (!Object.values(availableHpNames).includes(hpName)) {
        util.raiseInputError("Honeypot " + hpName + " not known.", res);
        return;
    }
    const hp = {
        hpName: body.hpName,
        portToOpenHost: body.portToOpenHost,
        portToOpenContainer: body.portToOpenContainer,
        hostName: body.device,
    }
    data.extToolsConfig.honeyPots?.push(hp); 
    res.sendStatus(200);
    logData();
});
app.post("/enable-ids", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        enabled: "boolean",
    }, body, res)) return;
    const enabled:boolean = body.enabled;
    data.extToolsConfig.useIds = enabled;
    res.sendStatus(200);
    logData();
 });

app.post("/set-debug-frontend-config", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        portToOpenHost: "number",
        portToOpenContainer: "number",
        // todo: change to deviceName to be consistent
        device: "string",
        pinnedNodePort: "number"
    }, body, res)) return;
    const device_indx = util.getDeviceIndx(body.device, data)
    if (device_indx === undefined) {
        util.raiseInputError("Device with the given name '" + body.device + "' does not exist.", res);
        return;
    }
    const frontendInfos = {
        portToOpenHost: body.portToOpenHost,
        portToOpenContainer: body.portToOpenContainer,
        hostName: body.device,
        pinnedNodePort: {
            portNumber: body.pinnedNodePort,
            type: "debug",
        }
    }
    data.extToolsConfig.debugFrontendInfos = frontendInfos; 
    res.sendStatus(200);
    logData();
});
app.post("/set-npm-config", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        startScriptName: "string",
    }, body, res)) return;
    const startScriptName = body.startScriptName;
    data.npmConfig.startScriptName = startScriptName;
    res.sendStatus(200);
    logData();
});
app.post("/enable-degradation", (req, res) => {
    data.degradationInfo.degradation = true;
    if(data.degradationInfo.degradationFileName === undefined || data.degradationInfo.degradationFileName! === "") {
        data.degradationInfo.degradationFileName = "production.deg.json"; 
    }
    res.sendStatus(200);
    logData();
});
app.post("/set-degradation-file", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    if (data.degradationInfo.degradation === false) {
        util.raiseInputError("Cannot set degradation file when degradation is disabled", res);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        degradationFile: "string",
    }, body, res)) return;
    const degradationFile = body.degradationFile;
    data.degradationInfo.degradationFileName = degradationFile;
    res.sendStatus(200);
    logData();
});
function genericChangeDeviceForUnitErrorHandling(req:any, res:any):boolean {
   if (req.body === undefined) {
        res.sendStatus(400);
        return false;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        unit: "string",
        deviceFrom: "string",
        deviceTo: "string"
    }, body, res)) return false;
    const unit_indx = util.getUnitIndx(body.unit, data);
    const migrate_device_from_indx = util.getDeviceIndx(body.deviceFrom, data);
    const migrate_device_to_indx = util.getDeviceIndx(body.deviceTo, data);
    if (migrate_device_from_indx === undefined) {
        util.raiseInputError("Device with the given name '" + body.deviceFrom + "' does not exist.", res);
        return false;
    }
    if (migrate_device_to_indx === undefined) {
        util.raiseInputError("Device with the given name '" + body.deviceTo + "' does not exist.", res);
        return false;
    }
    if (unit_indx === undefined) {
        util.raiseInputError("Unit with the given name '" + body.unit + "' does not exist.", res);
        return false;
    }
    let found:boolean = false;
    let mapped_device_indx = -1;
    let mapped_unit_indx = -1;
    for (let i = 0; i < data.devices.length; i++) {
        const dev = data.devices[i];
        for (let j = 0; j < dev.units.length; j++) {
            const unit = dev.units[j];
            if (unit == data.units[unit_indx].id) {
                mapped_device_indx = i;
                mapped_unit_indx = j;
                found = true; 
            }
        }
    }
    if (!found) {
        util.raiseInputError("Unit not mapped to device. Cannot migrate!", res);
        return false;
    }
    if (data.devices[mapped_device_indx].deviceName !== body.deviceFrom) {
        util.raiseInputError("Unit not mapped to device " + body.deviceFrom + ", but to " + data.devices[mapped_device_indx].deviceName + ". Cannot migrate!", res);
        return false;
    }
    return true;
}
function genericChangeDeviceForUnitFunction(req:any, res:any) {
    const body = req.body;
    const unit_indx = util.getUnitIndx(body.unit, data);
    const migrate_device_to_indx = util.getDeviceIndx(body.deviceTo, data);
    let found:boolean = false;
    let mapped_device_indx = -1;
    let mapped_unit_indx = -1;
    for (let i = 0; i < data.devices.length; i++) {
        const dev = data.devices[i];
        for (let j = 0; j < dev.units.length; j++) {
            const unit = dev.units[j];
            if (unit == data.units[unit_indx!].id) {
                mapped_device_indx = i;
                mapped_unit_indx = j;
                found = true; 
            }
        }
    }
    const unit_id_to_migrate = data.units[unit_indx!].id;
    data.devices[mapped_device_indx].units.splice(mapped_unit_indx, 1);
    data.devices[migrate_device_to_indx!].units.push(unit_id_to_migrate);
}
app.post("/remap-unit-to-device", (req, res) => {
    const hadErrors = genericChangeDeviceForUnitErrorHandling(req,res);
    if(hadErrors) {
        return;
    }
    if (stateReadIn) {
        util.raiseInputError("Cannot remap component when a state already exists. Use POST /migrate-unit-to-device-stateless", res);
        return;
    }
    const body = req.body;
    const unitName = body.unit;
    const checkPointRecoveryErrors = util.unitHasCheckpointRecovery(unitName, data);
    if (checkPointRecoveryErrors.unitNameUnique) {
        util.raiseInputError("Unit with name " + unitName + " does not exist. Cannot migrate!", res);
        return;
    }
    if (checkPointRecoveryErrors.hasCheckPointing) {
        util.raiseInputError("Cannot remap unit with name " + unitName + " as one of his components has checkpointing, so it is stateful!", res);
        return;
    }
    genericChangeDeviceForUnitFunction(req,res);
    res.sendStatus(200);
    logData();
});
app.post("/migrate-unit-to-device-stateless", (req, res) => {
    const hadNoErrors = genericChangeDeviceForUnitErrorHandling(req,res);
    if(!hadNoErrors) {
        return;
    }
    if(!stateReadIn) {
        util.raiseInputError("Can only live-migrate, if the state of the application was imported beforehand via: POST /import-configuration!", res);
        return;
    }
    const body = req.body;
    const unitName = body.unit;
    const checkPointRecoveryErrors = util.unitHasCheckpointRecovery(unitName, data);
    if (!checkPointRecoveryErrors.unitNameUnique) {
        util.raiseInputError("Unit with name " + unitName + " does not exist. Cannot migrate!", res);
        return;
    }
    if (checkPointRecoveryErrors.hasCheckPointing) {
        util.raiseInputError("Cannot live-migrate unit with name " + unitName + " as one of his components has checkpointing, so it is stateful!", res);
        return;
    }
    genericChangeDeviceForUnitFunction(req,res);
    const migrationFields:MigrationFields = {
        migrationType: MigrationType.stateless,
        unit: body.unit,
        fromDevice: body.deviceFrom,
        toDevice: body.deviceTo,
    }
    data.migrationStatus.finalizing.push(migrationFields);
    res.sendStatus(200);
    logData();
});
function migrateUnitToDeviceStatefulErrorHandling(req, res) {
    const hadNoErrors = genericChangeDeviceForUnitErrorHandling(req,res);
    if(!hadNoErrors) {
        return false;
    }
    if(!stateReadIn) {
        util.raiseInputError("Can only live-migrate, if the state of the application was imported beforehand via: POST /import-configuration!", res);
        return false;
    }
    const body = req.body;
    const unitName = body.unit;
    const checkPointRecoveryErrors = util.unitHasCheckpointRecovery(unitName, data);
    if (!checkPointRecoveryErrors.unitNameUnique) {
        util.raiseInputError("Unit with name " + unitName + " does not exist. Cannot migrate!", res);
        return false;
    }
    if (!checkPointRecoveryErrors.hasCheckPointing) {
        util.raiseInputError("Cannot live-migrate unit with name " + unitName + " as none of his components has checkpointing, so it is stateless!", res);
        return false;
    }
    return true;
}
app.post("/migrate-unit-to-device-stateful-pending", (req, res) => {
    if(!migrateUnitToDeviceStatefulErrorHandling(req,res)) {
        return;
    }
    const body = req.body;
    const migrationFields:MigrationFields = {
        migrationType: MigrationType.stateful,
        unit: body.unit,
        fromDevice: body.deviceFrom,
        toDevice: body.deviceTo,
    }
    data.migrationStatus.pending.push(migrationFields);
    res.sendStatus(200);
    logData();
});
app.post("/migrate-unit-to-device-stateful-finalizing", (req, res) => {
    if(!migrateUnitToDeviceStatefulErrorHandling(req,res)) {
        return;
    }
    const body = req.body;
    const migrationFields:MigrationFields = {
        migrationType: MigrationType.stateful,
        unit: body.unit,
        fromDevice: body.deviceFrom,
        toDevice: body.deviceTo,
    }
    const indx = _.findIndex(data.migrationStatus.pending, pending => {
        if(pending.migrationType.toString() === migrationFields.migrationType.toString() &&
            pending.unit === migrationFields.unit &&
            pending.fromDevice === migrationFields.fromDevice &&
            pending.toDevice === migrationFields.toDevice) {
                return true;
            }
            return false;
    });
    if (indx === -1) {
        util.raiseInputError("Cannot live-migrate unit with name " + body.unit + " as no migrationField with this signature has status \'pending\'!", res);
        return false;
    }
    genericChangeDeviceForUnitFunction(req,res);
    data.migrationStatus.pending.splice(indx, 1);
    data.migrationStatus.finalizing.push(migrationFields);
    res.sendStatus(200);
    logData();
});
app.post("/enable-debug-on-unit", (req, res) => {
   if (req.body === undefined) {
        res.sendStatus(400);
        return false;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        unit: "string",
        isServer: "boolean",
        ws_port: "number",
        check_interval_ms: "number"
    }, body, res)) return false;
    data.debuggingConfiguration[body.unit] = {
        debuggingAgent: {
            enabled: true,
            isServer: Boolean(JSON.parse(body.isServer)),
            webSocketPort: body.ws_port,
            checkForChangesIntervalMs: body.check_interval_ms
        }
    };
    res.sendStatus(200);
    logData();
})
app.post("/pin-unit-nodeport", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        unit_name: "string",
        port_number: "number",
        port_type: "string",
    }, body, res)) return;
    const unit_name = body.unit_name;
    const port_number = body.port_number;
    const port_type = body.port_type;
    const indx = data.units.findIndex(unit => unit.id === unit_name);
    if (indx === -1) {
        util.raiseInputError("Cannot pin node port as there is no unit with name " + unit_name + "!", res);
        return false;
    }
    if (port_type !== "default" && port_type !== "debug") {
        util.raiseInputError("Cannot pin node port as there is no type given. Either use \'default\' or \'debug\'", res);
        return false;
    }
    data.units[indx].pinnedNodePort = { 
        portNumber: port_number,
        type: port_type,
    }
    res.sendStatus(200);
    logData();
});
app.get("/get-setup", (req, res) => {
    res.status(200);
    res.send({
        componentInstances: data.componentInstances,
        connections: data.connections,
    });
    logData();
})
app.get('/get-devices', (req, res) => {
    res.status(200);
    res.send({ 
        devices: data.devices,
    });
    logData();
});
app.get('/get-configuration', (req, res) => {
    res.status(200);
    res.send(
        JSON.stringify(util.transformOutput(data), null, 2),
    );
});

/*
* todo:
* - sec_conf setzen
* - make transformOutput typesafe to ConfigurationOutput 
*/

// start server
app.listen(args.port ?? DEFAULT_PORT, () => console.log("start listening on port " + (args.port ?? DEFAULT_PORT)));
