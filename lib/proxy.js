"use strict";

const Sensor = require(__dirname + '/sensor.js'),
      EventEmitter = require('events').EventEmitter;

class Proxy extends EventEmitter{

    constructor(options){
        super();
        this.sensor = new Sensor(options);
        this.delta = this.sensor.delta;
        this.events = this.sensor.events;

        this.sensor.on(this.events.DATA,(data) => {
                this.emit(this.events.DATA,data);
            }
        );
    }

    runMsgWatcher(){
        this.sensor.runMsgWatcher();
    }

    runOnce(){
        this.sensor.runCmd();
        this.sensor.runDelta();
    }

    runOnceDelta(){
        this.runOnce();
        setTimeout(()=>{ this.runOnce(); },this.delta);
    }

    runForever(){
        this.runOnce();
        this.runMsgWatcher();
        setInterval(()=>{ this.runOnce(); },this.delta);
    }
}

module.exports = Proxy;
