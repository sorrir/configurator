import * as yargs from "yargs";
import * as express from "express";
import { hideBin } from "yargs/helpers";
import * as bodyParser from "body-parser";
import * as util from "./util";
import { Data, DEFAULT_PORT, conn_protocol, UnitConnection } from "./types";
import * as _ from "lodash";
import { string } from "yargs";

// init data
const data: Data = <any>{}
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
    }
}
clearData();

function initData() {
    data.resilienceInfo.resilienceLibraryPath = "/usr/src/sorrir/framework/resilience_library";
}
initData();

// get input arguments
const args = yargs(hideBin(process.argv)).argv;

// init endpoints
const app = express();
app.use(bodyParser.json());
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
    console.log("--------");
    console.dir(data, { depth: 3 });
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
    console.log("--------");
    console.dir(data, { depth: 3 });
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
        util.raiseInputError("Component does not exist in setupConfig.", res)
    } else if (!data.setupInfo.startStates[body.startState]) {
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
    console.log("--------");
    console.dir(data, { depth: 3 });
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
    console.log("--------");
    console.dir(data, { depth: 3 });
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
    console.log("--------");
    console.dir(data, { depth: 3 });
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
    console.log("--------");
    console.dir(data, { depth: 3 });
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
    const connection:UnitConnection = {
        sourceComponent: body.sourceComponent,
        sourcePort: body.sourcePort,
        targetComponent: body.targetComponent,
        targetPort: body.targetPort,
        protocol: body.protocol
    }
    if(!util.connectionExists(connection,data)) {
        util.raiseInputError("Connection does not exist.", res);
        return;
    }
    if (!util.changeProtocol(connection, data)) {
        util.raiseInputError("Protocol " + connection.protocol + " not allowed on mapped devices", res);
        return;
    }
    res.sendStatus(200);
    console.log("--------");
    console.dir(data, { depth: 3 });
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
    console.log("--------");
    console.dir(data, { depth: 3 });
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

    for (let i=0; i<count; i++) {
        const unit = {
            id: "unit_".concat(String(unit_mbr)),
            components: [],
            unitConnections: []
        }
        data.units.push(unit)
        unit_mbr++; 
    }

    res.sendStatus(200);
    console.log("--------");
    console.dir(data, { depth: 3 });
});
app.post("/map-component-instance-on-unit", (req, res) => {
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
    for(let unit of data.units) {
        for(let component of unit.components) {
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
    console.log("--------");
    console.dir(data, { depth: 3 });
});
app.post("/map-unit-on-device", (req, res) => {
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
        util.raiseInputError("Device with the given name '" + body.device + "' does not exist." , res);
        return;
    }
    if (unit_indx === undefined) {
        util.raiseInputError("Unit with the given name '" + body.unit + "' does not exist.", res);
        return;
    }
    for(const dev of data.devices) {
        for(const unit of dev.units) {
            if (unit == data.units[unit_indx].id) {
                util.raiseInputError("Unit already mapped.", res);
                return;
            }
        }
    }
    if (!util.initUnitConnections(device_indx,unit_indx,data)) {
        util.raiseInputError("Cannot map unit with the given name '" + body.unit + "' on device " + data.devices[device_indx] + " as\
        there would be a protocol incompatibility", res);
        return;
    }
    data.devices[device_indx].units.push(data.units[unit_indx].id);
    res.sendStatus(200);
    console.log("--------");
    console.dir(data, { depth: 3 });
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
        util.raiseInputError("Component does not exist in setupConfig.", res)
    }
    const instance = util.getInstance(body.name, data)
    if (!instance) {
        util.raiseInputError("Instance with the given name does not exist.", res);
        return;
    }
    if (util.componentHasResilienceConfig(instance.name,data)) {
        util.raiseInputError("Resilience Mechanism already defined for component.", res);
        return;
    }
    if(body.mechanism === "activeReplication") {
        util.addReplicatedComponent(instance.name,4,1,data);
    }
    if(body.mechanism === "checkpointRecovery") {
        util.addCheckpointedComponent(instance.name,data);
    }
    res.sendStatus(200);
    console.log("--------");
    console.dir(data, { depth: 3 });
});
app.post("/change-fault-tolerance-params", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        component: "string",
        name: "string",
        n: "number",
        f: "number"
    }, body, res)) return;
    const instances = data.componentInstances[body.component];
    if (!instances) {
        util.raiseInputError("Component does not exist in setupConfig.", res)
    }
    const instance = util.getInstance(body.name, data)
    if (!instance) {
        util.raiseInputError("Instance with the given name does not exist.", res);
        return;
    }
    if (!util.componentHasResilienceConfig(instance.name,data,true)) {
        util.raiseInputError("Resilience Mechanism for component instance '" + body.name + "' not set to activeReplication.", res);
        return;
    }
    util.setReplicationParameters(instance.name,body.n,body.f,data);
    res.sendStatus(200);
    console.log("--------");
    console.dir(data, { depth: 3 });
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
        util.raiseInputError("Component does not exist in setupConfig.", res)
    }
    const instance = util.getInstance(body.name, data)
    if (!instance) {
        util.raiseInputError("Instance with the given name does not exist.", res);
        return;
    }
    if (!util.componentHasResilienceConfig(instance.name,data,true)) {
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
    console.log("--------");
    console.dir(data, { depth: 3 });
});
app.post("/set-security-config", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        privateKey: "string",
        passphrase: "string",
        certificate: "string"
    }, body, res)) return;
    const secConfig = {
        ssl: true,
        privateKey: body.privateKey, 
        passphrase: body.passphrase,
        certificate: body.certificate, 
        communicationSecret: []
    } 
    data.securityConfig = secConfig;
    res.sendStatus(200);
    console.log("--------");
    console.dir(data, { depth: 3 });
});
app.post("/set-communication-secret", (req, res) => {
    if (req.body === undefined) {
        res.sendStatus(400);
        return;
    }
    const body = req.body;
    if (util.handleGenericInputErrors({
        from: "string",
        to: "string",
        secret: "string",
    }, body, res)) return;
    if (body.from === body.to) {
        util.raiseInputError("unit names for secured communication must differ", res);
        return;
    }
    const uNames:string[] = Array.from(data.units, el => { return el.id });
    if (!uNames.includes(body.from)) {
        util.raiseInputError("unit name from: '" + body.from + "' not known.", res);
        return;
    }
    if (!uNames.includes(body.to)) {
        util.raiseInputError("unit name to: '" + body.from + "' not known.", res);
        return;
    }
    const indx = util.getSecretConnectionIndex(body.from, body.to, data);
    const secret = {
        from: body.from,
        to: body.to,
        secret: body.secret
    }
    if (indx < 0) {
        data.securityConfig.communicationSecret.push(secret); 
    } else {
        data.securityConfig.communicationSecret[indx] = secret; 
    }
    res.sendStatus(200);
    console.log("--------");
    console.dir(data, { depth: 3 });
});
app.get("/get-setup", (req, res) => {
    res.status(200);
    res.send({
        result: {
            componentInstances: data.componentInstances,
            connections: data.connections,
            units: data.units,
            devices: data.devices
        }
    });
    console.log("--------");
    console.dir(data, { depth: 3 });
})
app.get('/get-devices', (req, res) => {
    res.status(200);
    res.send({
        devices: data.devices,
    });
    console.log("--------");
    console.dir(data, { depth: 3 });
});
app.get('/get-configuration', (req, res) => {
    res.status(200);
    res.send(
        util.transformOutput(data), 
    );
});

/*
* todo:
* - sec_conf setzen
* - make transformOutput typesafe to ConfigurationOutput 
*/

// start server
app.listen(args.port ?? DEFAULT_PORT, () => console.log("start listening on port " + (args.port ?? DEFAULT_PORT)));
