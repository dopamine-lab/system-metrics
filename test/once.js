"use strict"

var Sensor = require('../index.js');
        Sensor = new Sensor({
            delta:2000,
            rootPath:'system'
        });


Sensor.on(Sensor.events.DATA,(data) => {
    data.map((row) => {
         process.stdout.write(row.name + ' ' + row.value + ' ' + row.time  + "\n");
    });
});
Sensor.runForever();
