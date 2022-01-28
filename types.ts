import { boolean } from "yargs"

// set defaults
export const DEFAULT_PORT = 3000;

export type ComponentInstance = {
    name: string,
    startState: string
}

export type Port = {
        name: string,
        eventTypes: string[],
        direction: "in" | "out"
}

export type ComponentInfo = {
    name: string,
    ports: Port[],
    tsType: "Component"
}

export enum conn_protocol {
    REST = 'REST',
    MQTT = 'MQTT',
    MQTT_EXTERNAL = 'MQTT_EXTRENAL',
    BLE = 'BLE',
    TOM = 'TOM',
    ON_UNIT = 'ON_UNIT',
}

export type Connection = {
    sourceComponent: string,
    sourcePort: string,
    targetComponent: string,
    targetPort: string,
}

export type Data = {
    setupInfo: {
        components: {
            [key: string]: ComponentInfo,
        },
        startStates: {
            [key: string]: {
                state: any,
                events: any[],
                tsType: "State"
            }
        }
    },
    componentInstances: Record<string, ComponentInstance[]>,
    connections: Connection[],
    units: Unit[],
    devices: Device[],
    resilienceInfo: ResilienceInfo,
    securityConfig: SecConfig,
}

export type Device = {
    deviceName: string,
    // todo: enum
    architecture: string,
    // todo: elems -> enum
    protocols: conn_protocol[],
    location: string,
    units: string[],
}

export interface ComponentInstanceExtended {
    type?: ComponentInfo,
    instance?: ComponentInstance,
}

export type UnitConnection = {
    componentOnUnit?: string,
    sourceComponent: string,
    sourcePort: string,
    targetComponent: string,
    targetPort: string,
    protocol: conn_protocol
}

export type Unit = {
    id: string,
    components: ComponentInstanceExtended[],
    unitConnections: UnitConnection[]
}

export type ActiveReplication = {
    activeReplication: {
        faultModel: string,
        n: number,
        f: number,
        enabled: boolean,
        executionSites: [string,string][],
    }
}

export type CheckPointRecovery = {
    checkpointRecovery: {
        recovery: {
            enabled: boolean,
        },
        checkpoint: {
            enabled: boolean,
        }
    }
}

type ResilienceInfoComponent = {
    id: string,
    mechanisms: ActiveReplication | CheckPointRecovery
}

type CommunicationSecret = {
    from: string, 
    to: string, 
    secret: string, 
}

export type ResilienceInfo = {
    resilienceLibraryPath: string,
    components: ResilienceInfoComponent []
}

type SecConfig = {
    ssl: boolean,
    privateKey: string, 
    passphrase: string,
    certificate: string, 
    communicationSecret: CommunicationSecret[]
}

export type ExecutionSite = {
    unitName: string
    deviceName: string
}

//todo: das hier final typsicher machen und Bezeichner anpassen/erweitern/reduzieren
export type ConfigurationOutput = {
    //naming anpassen
    elements: [{
        deviceName: string, 
        id: string,
        architecture: string,
        protocols: string[],
        location: string,
        units: {
            id: string,
            components: {
                type: string,
                id: string,
                ports: {
                    name: string,
                    eventTypes: string[],
                    direction: "in" | "out"
                }[]
            }[]
        }
    }],
    resilienceLibrary: {
        directoryPath: string,
    },
    resilienceConfiguration: {
        components: ResilienceInfoComponent[]
    } | {},
    SecurityConfiguration: SecConfig | {}
}