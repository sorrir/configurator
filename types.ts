import { boolean } from "yargs"

// set defaults
export const DEFAULT_PORT = 3000;

export type ComponentInstance = {
    name: string,
    startState?: string,
    startStateGenerator?: string,
    startStateArgs?: object,
}

export type DebugFrontendInfos = {
    portToOpenHost?: number,
    portToOpenContainer?: number,
    // todo: change to deviceName to be consistent
    hostName?: string,
    pinnedNodePort?: PinnedNodePort,
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
    MQTT_EXTERNAL = 'MQTT_EXTERNAL',
    BLUETOOTH = 'BLUETOOTH',
    TOM = 'TOM',
    ON_UNIT = 'ON_UNIT',
}

export enum availableHpNames {
    cowrie = 'cowrie',
    honeyku = 'honeyku',
    log4pot = 'log4pot',
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
        startStates?: {
            [key: string]: {
                state: any,
                events: any[],
                tsType: "State"
            }
        },
        stateGenerators?: Map<string,object> 
    },
    componentInstances: Record<string, ComponentInstance[]>,
    connections: Connection[],
    units: Unit[],
    devices: Device[],
    resilienceInfo: ResilienceInfo,
    securityConfig: SecConfig,
    extToolsConfig: ExtToolsConfig,
    npmConfig: NpmConfig,
    degradationInfo: DegradationInfo,
    migrationStatus: MigrationStatus,
    debuggingConfiguration: DebuggingConfiguration  
}

export enum MigrationType {
    stateful = "stateful",
    stateless = "stateless",
}

export type MigrationFields = {
    migrationType:MigrationType,
    unit: string,
    fromDevice: string,
    toDevice: string
}

export interface CheckPointRecoveryErrors {
    unitNameUnique: boolean,
    hasCheckPointing: boolean,
}

export type MigrationStatus = {
    history: MigrationFields[],
    pending: MigrationFields[],
    finalizing: MigrationFields[],
}

export type DebuggingConfiguration = {
    [unit: string]: {
        debuggingAgent: {
            enabled: boolean,
            isServer: boolean,
            webSocketPort: number,
            checkForChangesIntervalMs: number,
        }
    }
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

export type ShadowModeConfig = {
    shadowAgent?: {
        enabled: boolean,
        commOptions: conn_protocol[],
        autoUpdate: {
            intervalSeconds: number,
            strategy: string,
            limit: number,
            content: string
        }
    },
    inMessageSharing?: {
        enabled: boolean,
        limit: number,
        content: string
    }
}

export type PinnedNodePort = {
    portNumber: number,
    type: string,
}

export type Unit = {
    id: string,
    components: ComponentInstanceExtended[],
    unitConnections: UnitConnection[],
    shadowModeConfig: ShadowModeConfig,
    pinnedNodePort?: PinnedNodePort,
}

export type ActiveReplication = {
    activeReplication: {
        faultModel: string,
        n: number,
        f: number,
        enabled: boolean,
        executionSites: string [],
    }
}

export type CheckPointRecovery = {
    checkpointRecovery: {
        recovery: {
            enabled: boolean,
        },
        checkpoint: {
            enabled: boolean,
        },
    }
}

type ResilienceInfoComponent = {
    id: string,
    mechanisms: ActiveReplication | CheckPointRecovery
}

type CommunicationSecretDirection = {
    from: string,
    to: string,
}

export type ResilienceInfo = {
    resilienceLibraryPath: string,
    components: ResilienceInfoComponent[]
}

export type DegradationInfo = {
    degradation?: boolean,
    degradationFileName?: string,
}

export type SecConfig = {
    ssl?: boolean,
    communicationSecret: CommunicationSecretDirection[]
}

export type HoneyPotConfig = {
    hpName:string,
    portToOpenHost:number,
    portToOpenContainer:number,
    // todo: change to deviceName to be consistent
    hostName:string
}


export type ExtToolsConfig = {
    honeyPots?: HoneyPotConfig[],
    useIds?: boolean,
    debugFrontendInfos?: DebugFrontendInfos
    // todo: intrusion_det
}

export type NpmConfig = {
    startScriptName: string 
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
    SecurityConfiguration: SecConfig | {},
    ExtToolsConfiguration: ExtToolsConfig | {},
    NpmConfiguration: NpmConfig,
}
