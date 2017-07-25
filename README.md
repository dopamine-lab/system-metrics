# system-metrics
Open source sensors for Linux. 


## Open bash terminal:

```bash
npm install system-metrics
```

## Create file sensors.js

```javascript
const Sensor = require('system-metrics');
var   sensor = new Sensor({ delta:2000, rootPath:'system'});
sensor.on(sensor.events.DATA,(data) => {
    data.map((row) => {
         // write result to standard output
         process.stdout.write(row.name + ' ' + row.value + ' ' + row.time  + "\n");
    });
});
// Uncomment desired method:
// sensor.runOnce();
// sensor.runOnceDelta();
// sensor.runForever();
```
## Available methods:
- runOnce (outputs data that does not represent deviation):
```javascript

const Sensor = require('system-metrics');
var   sensor = new Sensor();
      sensor.on(sensor.events.DATA,console.log);
      sensor.runOnce();
```
- runOnceDelta (ouputs data end exits on first iteration):
```javascript
const Sensor = require('system-metrics');
var   sensor = new Sensor();
      sensor.on(sensor.events.DATA,console.log);
      sensor.runOnceDelta();
```

- runForever (constantly ouputs data):
```javascript
const Sensor = require('system-metrics');
var   sensor = new Sensor();
      sensor.on(sensor.events.DATA,console.log);
      sensor.runForever();
```

## Options:
- rootPath: first part of the name ( before first '.')
- host: name of the host ( default is HOSTNAME environment variable ).
- delta: time im milliseconds to check for deviation ( default is 2 sec. ).
- timeServer: ( timeserver to check time against ).
- timeServerCheckInterval: ( interval to perform the check in seconds. default is 12 hours ).
- precision: ( precision of metric value. default is 2).

## Execute as standalone linux app.
- cd into system-metrics directory and run: 
```bash
sudo npm test
```
## Metrics.
- arp.* (*ip as integer)
- cpu*.clock (*cpu number)
- cpu*.idle (*cpu number)
- cpu*.nice (*cpu number)
- cpu*.system (*cpu number)
- cpu*.user (*cpu number)
- cpu.idle 
- cpu.nice
- cpu.system
- cpu.user
- disk.*.usage.free (*disk name)
- disk.*.usage.percent (*disk name)
- disk.*.usage.used (*disk name)
- disk.*.writespeed (*disk name)
- disk.*.writespeed (*disk name)
- mem.free
- mem.used
- net.*.rx (*interface)
- net.*.tx (*interface)
- net.tcp.close
- net.tcp.close_wait
- net.tcp.closing
- net.tcp.established
- net.tcp.fin_wait1
- net.tcp.fin_wait2
- net.tcp.last_ack
- net.tcp.listen
- net.tcp.syn_recv
- net.tcp.syn_sent
- net.tcp.time_wait
- openedfilehandlers
- ping.gateway
- prc.*.instances (*process name)
- procs.blocked
- procs.running
- procstotal
- procszombie
- random.entropy
- random.pool
- service.*.80 (*service name)
- terminals
- threads
- uptime.boot
- uptime.load
- users.*.numprocs (*user's name)
