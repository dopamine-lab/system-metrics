# system-metrics
Open source sensors for Linux. 


## In Lunux terminal write:

```bash
npm install system-metrics
```

## Create file sensors.js

```javascript
"use strict"
const   sensors = require('system-metrics'),
        printTerm = (out) => { 
            process.stdout.write(out.map((res) => { 
                return res.name + ' ' + res.value + ' ' + res.time; 
            }).join("\n") + "\n");
        };
sensors.run();
setTimeout(() => { sensors.run(printTerm); },2000);

```

## Run:
```bash
node sensors.js
```
