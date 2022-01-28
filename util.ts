import _ = require("lodash");
import { ConfigurationOutput, ExecutionSite, ActiveReplication, Port, ComponentInfo, Connection, Data, ComponentInstanceExtended, ComponentInstance, Unit, Device, conn_protocol, UnitConnection  } from "./types";

export function checkParams(input: Record<string, unknown>, types: Record<string, "string" | "object" | "number" | "Array<object>">) {
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

export function handleGenericInputErrors(types: Record<string, "string" | "object" | "number" | "Array<object>">, body: any, res: any) {
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

export function executionSitesFeasible(sites:Array<ExecutionSite>, data:Data): boolean {
    for(const site of sites) {
        if(!site.unitName || !site.deviceName) {
            return false;
        }
        const deviceNames:string[] = Array.from(data.devices, el => { return el.deviceName });
        const unitNamesNames:string[] = Array.from(data.units, el => { return el.id });
        if(!deviceNames.includes(site.deviceName)) {
            return false;
        }
        if(!unitNamesNames.includes(site.unitName)) {
            return false;
        }
    }
    return true;
}

export function setExecutionSites(sites:Array<ExecutionSite>, name: string, data:Data): ExecutionSite[] | undefined {
    let executionSites:[string,string][] = [];
    let usedIndx = -1;
    for (let i=0; i<data.resilienceInfo.components.length; i++) {
        if(data.resilienceInfo.components[i].id === name) {
            usedIndx = i;
            break;
        }
    }
    if(usedIndx === -1) {
        return undefined;
    }
    let component = data.resilienceInfo.components[usedIndx];
    for(const site of sites) {
        if(site.unitName && site.deviceName) {
            const elem:[string,string] = [site.unitName,site.deviceName];
            executionSites.push(elem);
        } else {
            return undefined;
        }
    }
    (<ActiveReplication>component.mechanisms).activeReplication.executionSites = executionSites;
    data.resilienceInfo.components[usedIndx] = component;
}

export function raiseInputError(msg: string, res: any) {
    res.status(400);
    res.send({
        "error": "input error",
        "info": msg,
    });
}

export function getInstance(name: string, data: Data): ComponentInstance | undefined {
    for(const l of Object.values(data.componentInstances)) {
        const instance = _.find(l, (el) => el.name === name);
        if (instance) {
            return instance;
        }
    };
    return undefined;
}

export function componentTypeUsed(type: string, data: Data): boolean {
    for(const l of Object.keys(data.componentInstances)) {
        if (l === type) {
            return true;
        }
    };
    return false;
}

export function componentHasResilienceConfig(name: string, data: Data, activeReplicated?: boolean): boolean {
    for(const comp of data.resilienceInfo.components) {
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

export function addReplicatedComponent(name: string, n: number, f: number, data: Data) {
    const component = {
        id: name,
        mechanisms: {
            activeReplication: {
                faultModel: "BFT",
                n: n,
                f: f,
                enabled: true,
                executionSites: []
            }
        } 
    };
    data.resilienceInfo.components.push(component);
}

export function setReplicationParameters(name: string, n:number, f:number, data: Data) {
    for (let i=0; i<data.resilienceInfo.components.length; i++) {
        const comp = data.resilienceInfo.components[i];
        if(comp.id === name) {
            const ar:ActiveReplication = <ActiveReplication>comp.mechanisms;
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

export function setReplicationExecutionSite(type:string, executionSite:ExecutionSite, data: Data) {
    for (let i=0; i<data.resilienceInfo.components.length; i++) {
        const comp = data.resilienceInfo.components[i];
        if(comp.id === type) {
            const ar:ActiveReplication = <ActiveReplication>comp.mechanisms;
            const exSiteTransformed:[string,string] = [executionSite.deviceName,executionSite.unitName];
            (<ActiveReplication>data.resilienceInfo.components[i].mechanisms).activeReplication.executionSites.push(exSiteTransformed);
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
                }
            }
        } 
    };
    data.resilienceInfo.components.push(component);
}

export function getUnitIndx(unit_name: string, data: Data): number | undefined {
    for (let i=0; i<data.units.length; i++) {
        const unit = data.units[i];
        if (unit.id == unit_name) {
            return i;
        }
    }
    return undefined;
}

export function getDeviceIndx(device_name: string, data: Data): number | undefined {
    for (let i=0; i<data.devices.length; i++) {
        const device = data.devices[i];
        if (device.deviceName === device_name) {
            return i;
        }
    }
    return undefined;
}

export function getComponentInfoOfInstance(name: string, data: Data): ComponentInfo | undefined {
    for(const [type, l] of Object.entries(data.componentInstances)) {
        const instance = _.find(l, (el) => el.name === name);
        if (instance) {
            return data.setupInfo.components[type];
        }
    };
    return undefined;
}

export function arePortsCompatible(sourcePort: Port, targetPort: Port): boolean {
    return _.intersection(sourcePort.eventTypes, targetPort.eventTypes).length === sourcePort.eventTypes.length;
}

function isEqualProtoLess (conn1:UnitConnection, conn2:UnitConnection)  {
    return (conn1.sourceComponent === conn2.sourceComponent && conn1.sourcePort === conn2.sourcePort &&
        conn1.targetComponent === conn2.targetComponent && conn1.targetPort === conn2.targetPort) 
};

export function connectionExists(toChangeConnection: UnitConnection, data:Data): boolean {
    for(const unit of data.units) {
        for(const connection of unit.unitConnections) {
            if(isEqualProtoLess(toChangeConnection,connection)) {
                return true; 
            }
        }
    }
    return false;
}

export function changeProtocol(toChangeConnection: UnitConnection, data:Data): boolean {
    let relevantUnitNames:string[] = []
    for(const unit of data.units) {
        for(const connection of unit.unitConnections) {
            if(isEqualProtoLess(toChangeConnection,connection)) {
                relevantUnitNames.push(unit.id);
            }
        }
    }
    for(const dev of data.devices) {
        for(const unitName of dev.units) {
            if(relevantUnitNames.includes(unitName)) {
                if(!dev.protocols.includes(conn_protocol[toChangeConnection.protocol])) {
                    return false;
                }
            }
        }
    }
    for(let i=0; i<data.units.length; i++) {
        const unit:Unit = data.units[i];
        if(relevantUnitNames.includes(unit.id)) {
            for(let j=0; j<unit.unitConnections.length; j++) {
                const connection:UnitConnection = unit.unitConnections[j];
                if(isEqualProtoLess(toChangeConnection,connection)) {
                    toChangeConnection.componentOnUnit = data.units[i].unitConnections[j].componentOnUnit!;
                    data.units[i].unitConnections[j] = toChangeConnection;
                }
            }
        }
    } 
    return true; 
}

export function generateId(n) {
  var s = "abcdefghijklmnopqrstuvwxyz0123456789";
  var rndStr = Array(n).join().split(',').map(function() { return s.charAt(Math.floor(Math.random() * s.length)); }).join('');
  return rndStr;
}

function checkRelevantConn(connection:Connection, unitConnections:UnitConnection[], relCompName:string|undefined) {
    if(!relCompName) {
        return false;
    }
    for(const unitConnection of unitConnections) {
        if(connection.sourceComponent != relCompName &&
            connection.targetComponent != relCompName) {
            return false;
        }
        if(connection.sourceComponent === unitConnection.sourceComponent && connection.sourcePort === unitConnection.sourcePort &&
            connection.targetComponent === unitConnection.targetComponent && connection.targetPort === unitConnection.targetPort) {
            return false;
        }
    }
    return true;
}

function generateOutputConnections(componentInstanceExtended:ComponentInstanceExtended, unitConnections:UnitConnection[], connections:Connection[]): UnitConnection[] {
    let conns:UnitConnection[] = [];
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
    for(const connection of connections) {
        if(!checkRelevantConn(connection,conns,componentInstanceExtended.instance?.name)) {
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

function generateOutputComponents(componentInstancesExtended:ComponentInstanceExtended[], unitConnections:UnitConnection[], connections:Connection[]) {
    let comps:any[] = [];

    for(const componentInstanceExtended of componentInstancesExtended) {
        const comp = {
            type: componentInstanceExtended.type?.name,
            id: componentInstanceExtended.instance?.name,
            ports: componentInstanceExtended.type?.ports,
            connections: generateOutputConnections(componentInstanceExtended, unitConnections, connections),
        }
        comps.push(comp);
    }
    return comps;
}

function generateOutputUnits(unitNames:string[], data:Data) {
    let units:any[] = [];
    for(const unitName of unitNames) {
        const indx = getUnitIndx(unitName, data);
        if(indx === undefined) {
            continue;
        }
        const unit = data.units[indx];
        const unit_transformed = {
            id: unit.id,
            components: generateOutputComponents(unit.components, unit.unitConnections, data.connections),
        }
        units.push(unit_transformed);
    }
    return units;
}

// init -> does not check for duplicate, sets default: REST
export function initUnitConnections(device_indx:number, unit_indx:number, data:Data) {
    const unitConsidered:Unit = data.units[unit_indx];
    const deviceConsidered:Device = data.devices[device_indx];

    for(let i=0; i<data.units.length; i++) {
        if(i === unit_indx) {
            continue;
        }
        const unit = data.units[i];
        for(const connection of data.connections) {
            const sourceComp = connection.sourceComponent;
            const targetComp = connection.targetComponent;

            for(const compExtendedConsidered of unitConsidered.components) {
                for(const compExtended of unit.components) {
                    if((compExtendedConsidered.instance?.name === sourceComp && compExtended.instance?.name === targetComp) ||
                        (compExtendedConsidered.instance?.name === targetComp && compExtended.instance?.name === sourceComp)) {
                        const unitConnectionSource:UnitConnection = {
                            componentOnUnit: sourceComp,
                            sourceComponent: sourceComp,
                            sourcePort: connection.sourcePort,
                            targetComponent: targetComp,
                            targetPort: connection.targetPort,
                            protocol: conn_protocol.REST
                        }
                        const unitConnectionTarget:UnitConnection = {
                            componentOnUnit: targetComp,
                            sourceComponent: sourceComp,
                            sourcePort: connection.sourcePort,
                            targetComponent: targetComp,
                            targetPort: connection.targetPort,
                            protocol: conn_protocol.REST
                        }
                        if(compExtendedConsidered.instance?.name === sourceComp) {
                            data.units[unit_indx].unitConnections.push(unitConnectionSource);
                        } else {
                            data.units[unit_indx].unitConnections.push(unitConnectionTarget);
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

function generateOutputElements(data:Data) {
    let elems:any[] = [];

    for(const dev of data.devices) {
        if(dev.units.length === 0) {
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
    let foundInstances:string[] = [];
    for(const instances of Object.values(data.componentInstances)) {
        for (const instance of instances) {
            if(name === instance.name) {
                foundInstances.push(name);
            }
        }
    }
    return foundInstances.length == 1 ? true : false;
}

export function getSecretConnectionIndex(from:string, to:string, data:Data): number {
    for(let i=0; i<data.securityConfig.communicationSecret.length; i++) {
        const secret = data.securityConfig.communicationSecret[i];
        if(secret.from === from && secret.to === to) {
            return i;
        }
    }
    return -1;
}

export function transformOutput(data:Data) {//: ConfigurationOutput {
    return {
        elements: generateOutputElements(data),
        resilienceLibrary: {
            directoryPath: data.resilienceInfo.resilienceLibraryPath, 
        },
        resilienceConfiguration: data.resilienceInfo.components.length > 0 ? {
            components: data.resilienceInfo.components
        } : {},
        securityConfiguration: data.securityConfig ? data.securityConfig : {}
    }
}