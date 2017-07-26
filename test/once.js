"use strict"

const Sensor = require(__dirname + '/../lib/proxy.js');
var   sensor = new Sensor({delta:2000,rootPath:'system'});

sensor.on(sensor.events.DATA,(data) => {
    data.map((row) => {
         process.stdout.write(row.name + ' ' + row.value + ' ' + row.time  + "\n");
    });
});
sensor.runForever();
