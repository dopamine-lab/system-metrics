# system-metrics
Open source sensors for Linux. 


## In Lunux terminal write:

```bash
npm install system-metrics
```

## Create file sensors.js

```javascript
"use strict"
var Sense = require('system-metrics');
var Sensor = new Sense({ delta:2000, rootPath:'system'});
Sensor.on(Sensor.events.DATA,(data) => {
    data.map((row) => {
         // write result to standard output
         process.stdout.write(row.name + ' ' + row.value + ' ' + row.time  + "\n");
    });
});
// Uncomment desired method:
// Sensor.runOnce();
// Sensor.runOnceDelta();
// Sensor.runForever();
```
## Available methods:
- runOnce (outputs data that does not represent deviation):
```javascript
"use strict"
var Sense = require('system-metrics');
var Sensor = new Sense();
    Sensor.on(Sensor.events.DATA,console.log);
Sensor.runOnce();
```
- runOnceDelta (ouputs data end exits on first iteration):
```javascript
"use strict"
var Sense = require('system-metrics');
var Sensor = new Sense();
    Sensor.on(Sensor.events.DATA,console.log);
Sensor.runOnceDelta();
```

- runForever (constantly ouputs data):
```javascript
"use strict"
var Sense = require('system-metrics');
var Sensor = new Sense();
    Sensor.on(Sensor.events.DATA,console.log);
Sensor.runForever();
```

## Options:
- rootPath: first part of the name ( before first '.').
- host: name of the host ( default is HOSTNAME environment variable ).
- delta: time im milliseconds to check for deviation ( default is 2 sec. ).
- timeServer: ( timeserver to check time against ).
- timeServerCheckInterval: ( interval to perform the check in seconds. default is 12 hours ).
- precision: ( precision of metric value. default is 2).
## Run:
```bash
node sensors.js
```
