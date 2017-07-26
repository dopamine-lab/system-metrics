"use strict"

const Sensor = require('../index.js');
var   sensor = new Sensor({delta:2000,rootPath:'',host:''});

sensor.on(sensor.events.DATA,(data) => {
    data.map((row) => {
         process.stdout.write(row.name + ' ' + row.value + ' ' + row.time  + "\n");
    });
});
sensor.runForever();
