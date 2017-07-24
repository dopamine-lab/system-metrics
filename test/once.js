"use strict"

const   sensors = require('../index.js'),
        printTerm = (out) => { 
            process.stdout.write(
                out.map((a) => { 
                    return a.name + ' ' + a.value + ' ' + a.time; }
                ).join("\n") + "\n"
            );
        };

sensors.run();
setTimeout(() => { sensors.run(printTerm); },2000);
