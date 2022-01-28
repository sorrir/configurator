# Install via npm
```
$ npm install --production
$ npm run-script build
```

# Start and initialize the server
```
$ npm run start
$ npm run-script load-setup-info -- -s /path/to/sorrir-app/info/setupInfo.json
$ npm run-script load-devices-info -- -d
```

# Example Usage

## Use the rest-api to create component instances

```
$ curl -d '{
    "name": "user",
    "component": "user",
    "startState": "userStartState"
}' -X POST http://localhost:3000/add-component-instance -H 'Content-Type: application/json'

$ curl -d '{
    "name": "component",
    "component": "component",
    "startState": "componentStartState"
}' -X POST http://localhost:3000/add-component-instance -H 'Content-Type: application/json'

```

## Use the rest-api to auto-connect compatible ports
```
$ curl -d '{}' -X POST http://localhost:3000/add-connections-auto -H 'Content-Type: application/json'
```

## Use the rest-api to create units for component encapsulation
```
$ curl -d '{
    "count": 2
}' -X POST http://localhost:3000/create-units -H 'Content-Type: application/json'
```

## Use the rest-api to place component instances on units
```
$ curl -d '{
    "name": "user",
    "component": "user",
    "unit": "unit_1"
}' -X POST http://localhost:3000/map-component-instance-on-unit -H 'Content-Type: application/json'

$ curl -d '{
    "name": "component",
    "component": "component",
    "unit": "unit_2"
}' -X POST http://localhost:3000/map-component-instance-on-unit -H 'Content-Type: application/json'
```

## Use the rest-api to place units on devices
```
$ curl -d '{
    "unit": "unit_1",
    "device": "ext"
}' -X POST http://localhost:3000/map-unit-on-device -H 'Content-Type: application/json'

$ curl -d '{
    "unit": "unit_2",
    "device": "jetson-01"
}' -X POST http://localhost:3000/map-unit-on-device -H 'Content-Type: application/json'
```

## Use the rest-api to generate final configuration file for orchestrator
```
curl -d '{}' -X GET http://localhost:3000/get-configuration -H 'Content-Type: application/json' > configuration.json
```
