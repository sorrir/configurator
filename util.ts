import _ = require("lodash");
import { ActiveReplication, CheckPointRecovery, Port, ComponentInfo, Connection, Data, ComponentInstanceExtended, ComponentInstance, Unit, Device, conn_protocol, UnitConnection, ResilienceInfo, DegradationInfo, SecConfig, ExtToolsConfig, NpmConfig, MigrationStatus, CheckPointRecoveryErrors, DebuggingConfiguration} from "./types";

export function checkParams(input: Record<string, unknown>, types: Record<string, "string" | "boolean" | "object" | "number" | "Array<object>">) {
    const invalidParams = {}
    for (const key of Object.keys(types)) {
        const t = typeof input[key];
        const tExpected = types[key];
        if (t !== tExpected) {
            invalidParams[key] = `'${input[key]}' is not of type '${tExpected}'.`;
        }
    }
    return Object.keys(invalidParams).length > 0 ? invalidParams : undefined;
}

export function handleGenericInputErrors(types: Record<string, "string" | "boolean" | "object" | "number" | "Array<object>">, body: any, res: any) {
    const invalidParams = checkParams(body, types)
    if (invalidParams) {
        res.status(400);
        res.send({
            "error": "faulty parameters",
            "info": invalidParams
        });
        return true;
    }
    return false;
}

export function executionSitesFeasible(sites: Array<string>, data: Data): boolean {
    for (const site of sites) {
        if (!site) {
            return false;
        }
        const unitNamesNames: string[] = Array.from(data.units, el => { return el.id });
        if (!unitNamesNames.includes(site)) {
            return false;
        }
    }
    return true;
}

export function setExecutionSites(sites: Array<string>, name: string, data: Data): string[] | undefined {
    let usedIndx = -1;
    for (let i = 0; i < data.resilienceInfo.components.length; i++) {
        if (data.resilienceInfo.components[i].id === name) {
            usedIndx = i;
            break;
        }
    }
    if (usedIndx === -1) {
        return undefined;
    }
    let component = data.resilienceInfo.components[usedIndx];
    
    (<ActiveReplication>component.mechanisms).activeReplication.executionSites = sites;
    data.resilienceInfo.components[usedIndx] = component;
    return sites;
}

export function raiseInputError(msg: string, res: any) {
    res.status(400);
    res.send({
        "error": "input error",
        "info": msg,
    });
}

export function getInstance(name: string, data: Data): ComponentInstance | undefined {
    for (const l of Object.values(data.componentInstances)) {
        const instance = _.find(l, (el) => el.name === name);
        if (instance) {
            return instance;
        }
    };
    return undefined;
}

export function componentTypeUsed(type: string, data: Data): boolean {
    for (const l of Object.keys(data.componentInstances)) {
        if (l === type) {
            return true;
        }
    };
    return false;
}

export function componentHasActiveReplication(name: string, data: Data): boolean {
    for(const comp of data.resilienceInfo.components) {
        const activeReplicated = Object.getPrototypeOf(comp.mechanisms) ===  "ActiveReplication" ? true: false;
        if(activeReplicated !== undefined && activeReplicated === true) {
            if (comp.id === name) {
                return true;
            }
        }
        else if (comp.id === name) {
            return true;
        }
    };
    return false;
}

export function componentHasCheckpointRecovery(name: string, data: Data): boolean {
    for(const comp of data.resilienceInfo.components) {
        const checkpointRecovered = Object.getPrototypeOf(comp.mechanisms) ===  "CheckPointRecovery" ? true: false;
        if(checkpointRecovered !== undefined && checkpointRecovered === true) {
            if (comp.id === name) {
                return true;
            }
        }
        else if (comp.id === name) {
            return true;
        }
    };
    return false;
}

export function unitHasCheckpointRecovery(unitName: string, data: Data): CheckPointRecoveryErrors {
    const feasibleUnits:Unit[] = data.units.filter(unit => unit.id === unitName);
    let checkPointRecoveryErrors:CheckPointRecoveryErrors = {
        unitNameUnique: true,
        hasCheckPointing: false,
    };
    if (feasibleUnits.length !== 1) {
       checkPointRecoveryErrors.unitNameUnique = false; 
    }
    const unit:Unit = feasibleUnits[0]; 
    unit.components.flatMap(comp => comp.instance).flatMap(inst => {
        if(inst && componentHasCheckpointRecovery(inst?.name, data)) {
            checkPointRecoveryErrors.hasCheckPointing = true;
    }})
    return checkPointRecoveryErrors;
}

export function strHasDirFormat(dir: string): boolean {
    const re = /^\/|(\/[a-zA-Z0-9_-]+)+$/;
    return dir.match(re) !== undefined;
}

export function addReplicatedComponent(faultModel:string, name: string, n: number, f: number, data: Data) {
    const component = {
        id: name,
        mechanisms: {
            activeReplication: {
                faultModel: faultModel,
                n: n,
                f: f,
                enabled: true,
                executionSites: []
            }
        }
    };
    data.resilienceInfo.components.push(component);
}

export function setReplicationParameters(faultModel:string, name: string, n: number, f: number, data: Data) {
    for (let i = 0; i < data.resilienceInfo.components.length; i++) {
        const comp = data.resilienceInfo.components[i];
        if (comp.id === name) {
            const ar: ActiveReplication = <ActiveReplication>comp.mechanisms;
            ar.activeReplication.faultModel = faultModel;
            ar.activeReplication.n = n;
            ar.activeReplication.f = f;
            const resComp = {
                id: name,
                mechanisms: ar
            }
            data.resilienceInfo.components[i] = resComp;
        }
    }
}

export function setReplicationExecutionSite(type: string, executionSite: string, data: Data) {
    for (let i = 0; i < data.resilienceInfo.components.length; i++) {
        const comp = data.resilienceInfo.components[i];
        if (comp.id === type) {
            const ar: ActiveReplication = <ActiveReplication>comp.mechanisms;
            (<ActiveReplication>data.resilienceInfo.components[i].mechanisms).activeReplication.executionSites.push(executionSite);
        }
    }
}

export function addCheckpointedComponent(type: string, data: Data) {
    const component = {
        id: type,
        mechanisms: {
            checkpointRecovery: {
                recovery: {
                    enabled: true,
                },
                checkpoint: {
                    enabled: true,
                },
            }
        }
    };
    data.resilienceInfo.components.push(component);
}

export function getUnitIndx(unit_name: string, data: Data): number | undefined {
    for (let i = 0; i < data.units.length; i++) {
        const unit = data.units[i];
        if (unit.id == unit_name) {
            return i;
        }
    }
    return undefined;
}

export function getDeviceIndx(device_name: string, data: Data): number | undefined {
    for (let i = 0; i < data.devices.length; i++) {
        const device = data.devices[i];
        if (device.deviceName === device_name) {
            return i;
        }
    }
    return undefined;
}

export function getComponentInfoOfInstance(name: string, data: Data): ComponentInfo | undefined {
    for (const [type, l] of Object.entries(data.componentInstances)) {
        const instance = _.find(l, (el) => el.name === name);
        if (instance) {
            return data.setupInfo.components[type];
        }
    };
    return undefined;
}

export function arePortsCompatible(sourcePort: Port, targetPort: Port): boolean {
    if(_.intersection(sourcePort.eventTypes, targetPort.eventTypes).length != sourcePort.eventTypes.length) {
        console.log("source: " + sourcePort.eventTypes + ", target: " + targetPort.eventTypes);
        return false;
    }
    return _.intersection(sourcePort.eventTypes, targetPort.eventTypes).length === sourcePort.eventTypes.length;
}

/**
 * Compares two UnitConnections, but ignores mismatches in protocols.
 *  */
function isEqualProtoLess(conn1: UnitConnection, conn2: UnitConnection) {
    return (conn1.sourceComponent === conn2.sourceComponent && conn1.sourcePort === conn2.sourcePort &&
        conn1.targetComponent === conn2.targetComponent && conn1.targetPort === conn2.targetPort)
};

export function connectionExists(toChangeConnection: UnitConnection, data: Data): boolean {
    for (const unit of data.units) {
        for (const connection of unit.unitConnections) {
            if (isEqualProtoLess(toChangeConnection, connection)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Changes the protocol of all UnitConnections in the given data to a given connection if source and target are the same.
 * 
 * @param toChangeConnection the connection to match (includes the target protocol)
 * @param data the data
 * @returns true if successful
 */
export function changeProtocol(toChangeConnection: UnitConnection, data: Data): boolean {
    // find out which units are involved in the connection
    let relevantUnitNames: string[] = [];
    for (const unit of data.units) {
        for (const connection of unit.unitConnections) {
            if (isEqualProtoLess(toChangeConnection, connection)) {
                relevantUnitNames.push(unit.id);
            }
        }
    }

    // check if involved devices support the desired protocol
    for (const dev of data.devices) {
        for (const unitName of dev.units) {
            if (relevantUnitNames.includes(unitName)) {
                if (!dev.protocols.includes(conn_protocol[toChangeConnection.protocol])) {
                    return false;
                }
            }
        }
    }

    // changes protocols of involved connections
    for (let i = 0; i < data.units.length; i++) {
        const unit: Unit = data.units[i];
        if (relevantUnitNames.includes(unit.id)) {
            for (let j = 0; j < unit.unitConnections.length; j++) {
                const connection: UnitConnection = unit.unitConnections[j];
                if (isEqualProtoLess(toChangeConnection, connection)) {
                    data.units[i].unitConnections[j].protocol = toChangeConnection.protocol;
                }
            }
        }
    }
    return true;
}

function generateExtToolsConfig(extToolsConfig_:ExtToolsConfig) {
    let extToolsConfig:ExtToolsConfig = {};
    if(extToolsConfig_.honeyPots && extToolsConfig_.honeyPots.length > 0) {
        extToolsConfig.honeyPots = extToolsConfig_.honeyPots;
    }
    if(extToolsConfig_.debugFrontendInfos && extToolsConfig_.debugFrontendInfos.portToOpenContainer && extToolsConfig_.debugFrontendInfos.portToOpenHost && extToolsConfig_.debugFrontendInfos.hostName) {
        extToolsConfig.debugFrontendInfos = extToolsConfig_.debugFrontendInfos;
    }
    if(extToolsConfig_.useIds && extToolsConfig_.useIds === true) {
        extToolsConfig.useIds = true; 
    } else {
        extToolsConfig.useIds = false; 
    }
    return extToolsConfig;
}

export function generateId(n) {
    var s = "abcdefghijklmnopqrstuvwxyz0123456789";
    var rndStr = Array(n).join().split(',').map(function () { return s.charAt(Math.floor(Math.random() * s.length)); }).join('');
    return rndStr;
}

function checkRelevantConn(connection: Connection, unitConnections: UnitConnection[], relCompName: string | undefined) {
    if (!relCompName) {
        return false;
    }
    for (const unitConnection of unitConnections) {
        if (connection.sourceComponent != relCompName &&
            connection.targetComponent != relCompName) {
            return false;
        }
        if (connection.sourceComponent === unitConnection.sourceComponent && connection.sourcePort === unitConnection.sourcePort &&
            connection.targetComponent === unitConnection.targetComponent && connection.targetPort === unitConnection.targetPort) {
            return false;
        }
    }
    return true;
}

function generateOutputConnections(componentInstanceExtended: ComponentInstanceExtended, unitConnections: UnitConnection[], connections: Connection[]): UnitConnection[] {
    let conns: UnitConnection[] = [];
    let relevantUnitConns = unitConnections.filter(el => {
        return el.componentOnUnit === componentInstanceExtended.instance?.name;
    })
    for (const relevantUnitConn of relevantUnitConns) {
        const conn = {
            sourceComponent: relevantUnitConn.sourceComponent,
            sourcePort: relevantUnitConn.sourcePort,
            targetComponent: relevantUnitConn.targetComponent,
            targetPort: relevantUnitConn.targetPort,
            protocol: relevantUnitConn.protocol
        }
        conns.push(conn);
    }
    // also need connections not leaving unit
    for (const connection of connections) {
        if (!checkRelevantConn(connection, conns, componentInstanceExtended.instance?.name)) {
            continue;
        }
        const conn = {
            sourceComponent: connection.sourceComponent,
            sourcePort: connection.sourcePort,
            targetComponent: connection.targetComponent,
            targetPort: connection.targetPort,
            protocol: conn_protocol.ON_UNIT
        }
        conns.push(conn);
    }
    return conns;
}

function generateOutputComponents(componentInstancesExtended: ComponentInstanceExtended[], unitConnections: UnitConnection[], connections: Connection[]) {
    let comps: any[] = [];

    for (const componentInstanceExtended of componentInstancesExtended) {
        const comp = {
            type: componentInstanceExtended.type?.name,
            id: componentInstanceExtended.instance?.name,
            ports: componentInstanceExtended.type?.ports,
            connections: generateOutputConnections(componentInstanceExtended, unitConnections, connections),
            startState: componentInstanceExtended.instance?.startState,
            startStateGenerator: componentInstanceExtended.instance?.startStateGenerator,
            startStateArgs: componentInstanceExtended.instance?.startStateArgs
        }
        comps.push(comp);
    }
    return comps;
}

function generateOutputUnits(unitNames: string[], data: Data) {
    let units: any[] = [];
    for (const unitName of unitNames) {
        const indx = getUnitIndx(unitName, data);
        if (indx === undefined) {
            continue;
        }
        const unit = data.units[indx];
        const unit_transformed = {
            id: unit.id,
            components: generateOutputComponents(unit.components, unit.unitConnections, data.connections),
            shadowModeConfig: unit.shadowModeConfig,
            pinnedNodePort: unit.pinnedNodePort,
        }
        units.push(unit_transformed);
    }
    return units;
}

// init -> does not check for duplicate, sets default: REST
export function initUnitConnections(device_indx: number, unit_indx: number, data: Data) {
    const unitConsidered: Unit = data.units[unit_indx];
    const deviceConsidered: Device = data.devices[device_indx];

    for (let i = 0; i < data.units.length; i++) {
        if (i === unit_indx) {
            continue;
        }
        const unit = data.units[i];
        for (const connection of data.connections) {
            const sourceComp = connection.sourceComponent;
            const targetComp = connection.targetComponent;

            for (const compExtendedConsidered of unitConsidered.components) {
                for (const compExtended of unit.components) {
                    if ((compExtendedConsidered.instance?.name === sourceComp && compExtended.instance?.name === targetComp) ||
                        (compExtendedConsidered.instance?.name === targetComp && compExtended.instance?.name === sourceComp)) {
                        const unitConnectionBase: UnitConnection = {
                            sourceComponent: sourceComp,
                            sourcePort: connection.sourcePort,
                            targetComponent: targetComp,
                            targetPort: connection.targetPort,
                            protocol: conn_protocol.REST
                        }
                        if (compExtendedConsidered.instance?.name === sourceComp) {
                            data.units[unit_indx].unitConnections.push({
                                componentOnUnit: sourceComp,
                                ...unitConnectionBase
                            });
                        } else {
                            data.units[unit_indx].unitConnections.push({
                                componentOnUnit: targetComp,
                                ...unitConnectionBase
                            });
                        }
                        // TODO: do not use REST as default but some of intersect proto of two devices of mapped units
                        // -> intersect ===0 -> if(...) return false;
                    }
                }
            }
        }
    }
    return true;
}

function generateOutputElements(data: Data) {
    let elems: any[] = [];

    for (const dev of data.devices) {
        if (dev.units.length === 0) {
            continue;
        }
        const elem = {
            device_name: dev.deviceName,
            id: generateId(6),
            architecture: dev.architecture,
            protocols: dev.protocols,
            location: dev.location,
            units: generateOutputUnits(dev.units, data),
        }
        elems.push(elem);
    }
    return elems;
}

export function instanceNameUnique(name: string, data: Data): boolean {
    let foundInstances: string[] = [];
    for (const instances of Object.values(data.componentInstances)) {
        for (const instance of instances) {
            if (name === instance.name) {
                foundInstances.push(name);
            }
        }
    }
    return foundInstances.length == 1 ? true : false;
}

export function transformOutput(data: Data) {//: ConfigurationOutput {
    return {
        elements: generateOutputElements(data),
        resilienceLibrary: {
            directoryPath: data.resilienceInfo.resilienceLibraryPath,
        },
        resilienceConfiguration: data.resilienceInfo.components.length > 0 ? {
            components: data.resilienceInfo.components
        } : {},
        securityConfiguration: data.securityConfig ? data.securityConfig : {},
        extToolsConfiguration: generateExtToolsConfig(data.extToolsConfig),
        degradationConfiguration: data.degradationInfo,
        npmConfiguration: data.npmConfig,  
        migrationStatus: data.migrationStatus,
        debuggingConfiguration: data.debuggingConfiguration,
    }
}
// todo: congiguration type bauen & Fehlerbehandlung falls einglesener state inkompatibel
export function transformInput(configuration:any):Data {
    let data:Data;
    let setupInfo:typeof data.setupInfo = {components: {}};
    let devices:Device[] = [];
    let connections:Connection[] = [];
    let units:Unit[] = [];
    let resilienceInfo: ResilienceInfo;
    let securityConfig: SecConfig;
    let extToolsConfig: ExtToolsConfig;
    let npmConfig: NpmConfig;
    let degradationInfo: DegradationInfo;
    let migrationStatus:MigrationStatus;
    let debuggingConfiguration:DebuggingConfiguration;

    let components:typeof data.setupInfo.components = {};
    let componentInstances: Record<string, ComponentInstance[]> = {};
    let startStates:typeof data.setupInfo.startStates = {};
    let startStateGenerators:typeof data.setupInfo.stateGenerators = new Map<string,object>();
    configuration.elements.flatMap(el => el.units).flatMap(unit => unit.components).forEach(comp => {
        components[comp.type] = {
            name: comp.type,
            ports: comp.ports,
            tsType: "Component"
        }
        const compInstance:ComponentInstance = {
            name: <string>comp.id,
            startState: comp.startState,
            startStateGenerator: comp.startStateGenerator,
            startStateArgs: comp.startStateArgs,
        }
        const instances = componentInstances[comp.type];
        if(!instances) {
            componentInstances[comp.type] = [];
            componentInstances[comp.type].push(compInstance);
        } else {
            instances.push(compInstance);
        }
        if(comp.startState) {
            if(startStates) {
                startStates[<string>comp.type + "StartState" + comp.startState ? "" : "Empty"] = {
                state: comp.startState,
                events: [],
                tsType: "State",
            }}
        }
        if(comp.startStateGenerator) {
            if(startStateGenerators) {
                startStateGenerators.set(<string>comp.startStateGenerator, comp.startStateArgs)
            }
        }
        comp.connections.forEach(conn => {
            if (!connections.find(item => {
                if(conn.sourceComponent == item.sourceComponent && conn.sourcePort == item.sourcePort
                    && conn.targetComponent == item.targetComponent && conn.targetPort == item.targetPort) {
                       return true; 
                    }
            })) {
                connections.push(conn);
            }
        });
    })
    setupInfo.components = components; 
    setupInfo.startStates = startStates; 
    setupInfo.stateGenerators = startStateGenerators; 

    for (const elem of configuration.elements) {
        const dev:Device = {
            deviceName: elem.device_name,
            architecture: elem.architecture,
            protocols: elem.protocols,
            location: elem.location,
            units: elem.units.map(unit => 
               unit.id
            ),
        }
        devices.push(dev);
    }
    units = configuration.elements.flatMap(el => el.units).map(unit => {
        const unitConnections:UnitConnection[] = unit.components.flatMap( comp => comp.connections); 
        const unitComponentNames:string[] = unit.components.flatMap(component => component.id);
        for(const conn of unitConnections) {
            for(const name of unitComponentNames) {
                if(name === conn.sourceComponent || name === conn.targetComponent) {
                    conn.componentOnUnit = name;
                    break;
                }
            } 
        }
        let insts:typeof componentInstances = {}; 
        unit.components.forEach(comp => {
            componentInstances[comp.type].forEach(inst => {
                if(comp.id === inst.name) {
                    if(!insts[comp.type]) {
                        insts[comp.type] = [];
                    }
                    insts[comp.type].push(inst);
                }
            })
        });
        return {
            id: unit.id,
            components: unit.components.map(comp => {
                return {
                    type: {
                        name: comp.type,
                        ports: comp.ports,
                        tsType: "Component"
                    },
                    // todo: errror-handling
                    instance: insts[comp.type] ? insts[comp.type][0] ? insts[comp.type][0] : undefined: undefined, 
                } 
            }),
            unitConnections: unitConnections,
            shadowModeConfig: unit.shadowModeConfig,
        }
    });
    resilienceInfo = {
        resilienceLibraryPath: configuration.resilienceLibrary.directoryPath,
        components: configuration.resilienceConfiguration.components,
    }
    securityConfig = configuration.securityConfiguration;
    extToolsConfig = configuration.extToolsConfiguration;
    degradationInfo = configuration.degradationConfiguration;
    npmConfig = configuration.npmConfiguration;
    migrationStatus = configuration.migrationStatus;
    debuggingConfiguration = configuration.DebuggingConfiguration;

    return {
        setupInfo: setupInfo,
        componentInstances: componentInstances,
        connections: connections,
        units: units,
        devices: devices,
        resilienceInfo: resilienceInfo,
        securityConfig: securityConfig,
        extToolsConfig: extToolsConfig,
        npmConfig: npmConfig,
        degradationInfo: degradationInfo,
        migrationStatus: migrationStatus,
        debuggingConfiguration: debuggingConfiguration,
    }
}