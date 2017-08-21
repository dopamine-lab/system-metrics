# dope-system-metrics
Open source sensors for Linux. 


## Open bash terminal:

```bash
npm install dope-system-metrics
```

## Create file sensors.js

```javascript
const Sensor = require('dope-system-metrics');
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

const Sensor = require('dope-system-metrics');
var   sensor = new Sensor();
      sensor.on(sensor.events.DATA,console.log);
      sensor.runOnce();
```
- runOnceDelta (ouputs data end exits on first iteration):
```javascript
const Sensor = require('dope-system-metrics');
var   sensor = new Sensor();
      sensor.on(sensor.events.DATA,console.log);
      sensor.runOnceDelta();
```

- runForever (constantly ouputs data):
```javascript
const Sensor = require('dope-system-metrics');
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

## Execute:
- As standalone linux app.
```bash
dope-sys-monitor
```
- In graphite comapability mode.
```bash
dope-sys-metrics
```

## Metrics.
- arp.*: (*ip as integer) Sends ipv4 (int) as metric name and mac addr as integer.
- cpu*.clock: (*cpu number) Current Cpu clock speed.
- cpu*.idle: (*cpu number) Current Cpu idle.
- cpu*.nice: (*cpu number) Current Cpu nice.
- cpu*.system: (*cpu number) Current Cpu system load.
- cpu*.user: (*cpu number) Current Cpu user load.
- cpu.idle: Total Cpu idle.
- cpu.nice: Total Cpu nice.
- cpu.system: Total Cpu system load.
- cpu.user: Total cpu user load.
- disk.*.usage.free: (*disk name) Current disk free space.
- disk.*.usage.percent: (*disk name) Current disk free space as percents.
- disk.*.usage.used: (*disk name) Current disk used space.
- disk.*.writespeed: (*disk name) Current disk writespeed.
- mem.free: System memory free.
- mem.used: System memory used.
- net.*.rx: (*interface) Current interface receive speed.
- net.*.tx: (*interface) Current interface trasmit speed.
- net.tcp.close: 
- net.tcp.close_wait:
- net.tcp.closing:
- net.tcp.established:
- net.tcp.fin_wait1:
- net.tcp.fin_wait2:
- net.tcp.last_ack:
- net.tcp.listen:
- net.tcp.syn_recv:
- net.tcp.syn_sent:
- net.tcp.time_wait:
- openedfilehandlers: Opened file handlers by kernel.
- ping.gateway: Ping to the gateway.
- prc.*.instances: (*process name) Current process. Number of instances.
- procs.blocked: Processes blocked on CPU.
- procs.running: Processes running on CPU.
- procstotal: Total processes.
- procszombie: Number of zombie processes.
- random.entropy: Available entropy.
- random.pool: Randomness pool size.
- service.*.80: (*service name) Current service. Used port.
- terminals: Number of terminals opened.
- threads: Number of threads.
- uptime.boot: Uptime ( since boot ).
- uptime.load: System load ( returned by uptime command )
- users.*.numprocs: (*user's name) Number of processes per user.
- time.sync: Time diff. of current machine, compared to remote server.
- watcher: System file ( by default: kernel's log ) watcher ( displays changes, a.k.a. new lines ).  
