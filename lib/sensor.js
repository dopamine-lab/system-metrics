"use strict"

const   fs = require('fs'),
        cp = require('child_process'),
        EventEmitter = require('events').EventEmitter,
        CmdSensors = require(__dirname + '/cmdSensors.js');

class Sensor extends EventEmitter{
    
    /**
     * @param options (array)
     */
    constructor(options){
        super();
        this.timeServer = 'http://pool.ntp.org'; // set this to your gateway or desired server
        this.timeServerCheckInterval = 12 * 60 * 60;
        this.rootPath = 'system';
        this.host = this.sanitize(cp.execSync('cat /etc/hostname'));
        this.events = { DATA:'data' };
        this.delta = 2000; // ms
        // import configuration ( variables all defined above this point can be overwritten by options parameter ).
        for(let v in options) this[v] = options[v];

        this.CACHE = null;
        this.nowSec = null;
        this.precision = 2;

        this.spath = (this.rootPath ? this.rootPath + '.' : '' ) + (this.host || '') ;

        let cmdSensors = new CmdSensors({
            timeServer:this.timeServer,
            spath:this.spath,
            timeServerCheckInterval:this.timeServerCheckInterval
        });
        this.cmdSensors = cmdSensors.sensors;
    }
    
    /**
     * Sanitize as metric name
     * @param str (metric name)
     * @returns {string}
     */
    sanitize(str){
        return str.toString().trim().toLowerCase().replace(/[^a-z0-9.]/gi,'_').replace(/__+/gi, '_').trim('.'); // convert to lowercase -> replace non a-z0-9 with '_' and replace multiple underscores '__' with single '_'
    }

    /**
     * Converts IP or MAC address to integer ( for IPv4 )
     * @param addr (IP or MAC for IPv4)
     * @param delimiter
     * @param fromBase
     * @returns {number}
     */
    addresToInt(addr,delimiter,fromBase){
        let newAddr = addr;
        newAddr = newAddr.split(delimiter);
        let newAddrLength = newAddr.length;
        let newAddrInt = 0;
        for(let m in newAddr){
            let pow = (newAddrLength - m - 1);
            let segment = parseInt(newAddr[m],fromBase);
            newAddrInt = (newAddrInt + (pow ? segment * Math.pow(256,pow) : segment ));
        }
        return newAddrInt + '';
    }
    
    /**
     * Convert commands to sensors
     */
    runCmd(){
        let start = false,
            cmdSensors = this.cmdSensors;
        this.nowSec =  parseInt(Date.now() / 1000);
        for(let i in cmdSensors){
            start = false;
            if(typeof cmdSensors[i].interval !== 'undefined'){
                let currentState = Math.floor(this.nowSec / cmdSensors[i].interval);
                if(typeof cmdSensors[i].cache === 'undefined' ) cmdSensors[i].cache = currentState;
                start = (cmdSensors[i].cache !== currentState);
                cmdSensors[i].cache = currentState;
            }else{
                start = true;
            }
            if(start)  this.sensorFromCmd(cmdSensors[i].cmd,cmdSensors[i].path)
        }
    }
    
    /**
     * Emmit data when available
     * @param out
     */
    out(out){
        this.emit(this.events.DATA,out.map((a) => {
            let al = a.length;
            a[0] = this.sanitize(a[0]);
            if(al === 2) a[2] = this.nowSec
            return {'name':a[0],'value':a[1],'time':a[2]};
        }));
    }
    
    /**
     * Sum array
     * @param arr
     * @returns {*}
     */
    sum(arr){
        return this.num(arr.reduce((a, b) => this.num(a) + this.num(b), 0));
    }
    
    /**
     * Convert to number
     * @param str
     * @returns {number}
     */
    num(str){
        return (new Number(str) + 0); // add 0 to force numeric context
    }
    
    /**
     * Percentage
     * @param a
     * @param b
     * @returns {number}
     */
    percent(a, b){
        return ((this.num(a) / this.num(b)) * 100);
    }
    
    
    /**
     * Format output to desired precision
     * @param fl
     * @returns {string}
     */
    format(fl){
        return fl.toFixed(this.precision);
    }
    
    /**
     * CPU load by deviation
     * @param oldData
     * @param newData
     * @param usedIndex
     * @returns {string}
     */
    cpuCalc(oldData, newData, usedIndex){
        return this.format(this.percent(this.num(newData[usedIndex]) - this.num(oldData[usedIndex]), this.sum(newData) - this.sum(oldData)));
    }
    
    
    /**
     * Network speed
     * @param oldData
     * @param newData
     * @returns {string}
     */
    netCalc(oldData, newData){
        return this.format((this.num(newData) - this.num(oldData)) / 1000 ); // to Kb
    }
    
    /**
     * Read file
     * @param file
     * @returns {string}
     */
    getFile(file){
        return fs.readFileSync(file).toString().trim();
    }

    /**
     * Check if file exists
     * @param filename
     * @returns {boolean}
     */
    fileExists(filename){
        let exists = true;
        try{ fs.accessSync(filename); }
        catch(e){ exists = false; }
        return exists;
    }

    /**
     * Create sensor from command
     * @param cmd
     * @param path
     */
    sensorFromCmd(cmd,path){
        cp.exec(cmd,{},(err,stdout) =>{
            this.out(
                stdout.split("\n").filter(a=>a).map((row) => {
                    row = row.split(' ');
                    if(row.length === 1) row = [path,row[0]];
                    if(path) row[0] = this.spath + '.' + path;
                    return row;
                })
            );
        });
    }

    /**
     * Prepare output
     * @param out
     * @returns {Array}
     */
    prepare(out){
        return out
            .filter(a=>a)
            .map((a)=>{
                a[0] = this.spath + '.' + a[0];
                return a;
            });
    }
    
    /**
     * Read /proc/* files as array
     * @param file
     * @returns {{}}
     */
    readStat(file){
        let sysStat = {};
        if(this.fileExists(file)){
            let stats = this.getFile(file).trim().split("\n");
            for (var i in stats) {
                stats[i] = stats[i].trim().split(' ').filter((a) => {
                    return !(a + '' === '')
                });
                let statKey = stats[i].splice(0, 1)[0];
                statKey = statKey.toLowerCase();
                if(typeof sysStat[statKey] === 'undefined'){
                    sysStat[statKey] = [stats[i]];
                }else{
                    sysStat[statKey].push(stats[i]);
                }
            }
        }
        return sysStat;
    }
    
    /**
     * Read kernel log
     */
    runMsgWatcher(){
        let file = '/var/log/kern.log';
        let getLines = () => {
            let lines = cp.execSync(`wc -l ${file} | awk {'print \$1'} `).toString();
            return parseInt(lines);
        };
        let lines = getLines();
        fs.watchFile(file,{persistent:true},(currStat,prevStat) => {
            let newLines = getLines();;
            let changes = lines - newLines;
            let output = [];
            lines = newLines;
            cp.exec(`tail -n${changes} ` +file,{},(stderr,stdout) => {
                if(stderr){
                    stdout = "watcher could not read file!\n"
                }
                stdout.trim().split("\n").map( (line) => {
                    let msg  = line.split('] ');
                    let time = msg.shift();
                    time = line.split(' ');
                    time = [new Date().getFullYear(),time[0],time[1],time[2]].join(' ');
                    time = Date.parse(time) / 1000; //Unix timestamp to sec.
                    msg  = msg.join('] ');
                    let lineOut = 'watcher.'
                        + file.toLowerCase().replace(/[^a-z0-9]/gi,'_') + '.'
                        + msg.trim()
                            .toLowerCase()
                            .replace(/[^a-z0-9]/gi,' ')
                            .replace(/  +/gi,' ')
                            .trim().split(' ').join('_');
                    output.push([this.spath + '.' + lineOut,'1',time]);
                });
                this.out(output);
            })
        });
    }
    
    /**
     * Read data from /proc based on deviation per interval
     */
    runDelta(){
        this.nowSec =  parseInt(Date.now() / 1000);
        let output = [];
        let initialRun = false;
        let majorNumbers = cp.execSync(`lsblk | grep  -Ev 'NAME|rom' | awk '{print $2}' | cut -d: -f 1 | sort -u`)
            .toString()
            .split("\n")
            .filter(a=>a)
            .map((a) => { return this.num(a);});
        let sensor = {
            "time":     this.nowSec,
            "disk":     this.readStat('/proc/diskstats'),
            "stats":    this.readStat('/proc/stat'),
            "net":      this.readStat('/proc/net/dev'),
            "arp":      this.readStat('/proc/net/arp')
        };
        
        if(this.CACHE === null ){
            initialRun = true;
            this.CACHE = sensor;// if no cache ( cleared or first run, assume that current data is a cache data )
        }
        let cores = this.num(cp.execSync('nproc')); // get number of cores
        let netInterfaces = cp.execSync(`ls /sys/class/net/ | grep -v lo`).toString().split("\n").filter(a => a);
        let cacheTime = this.CACHE.time;
        let cacheTimeDiff = this.nowSec - cacheTime;
        cacheTimeDiff = cacheTimeDiff === 0 ? 1 : cacheTimeDiff; // prevent division by zero for intervals less than 1 sec.
        if(initialRun === false)
        {
            // Total CPU
            output.push(["cpu.user",     this.cpuCalc(this.CACHE.stats['cpu'][0], sensor.stats['cpu'][0], 0 /* user */       )]);
            output.push(["cpu.nice",     this.cpuCalc(this.CACHE.stats['cpu'][0], sensor.stats['cpu'][0], 1 /* nice */       )]);
            output.push(["cpu.system",   this.cpuCalc(this.CACHE.stats['cpu'][0], sensor.stats['cpu'][0], 2 /* system */     )]);
            output.push(["cpu.idle",     this.cpuCalc(this.CACHE.stats['cpu'][0], sensor.stats['cpu'][0], 3 /* idle */       )]);
            // each core load
            for (let i = 0; i < cores; i++){
                output.push(['cpu' + i + '.user',    this.cpuCalc(this.CACHE.stats['cpu' + i][0], sensor.stats['cpu' + i][0], 0  )]);
                output.push(['cpu' + i + '.nice',    this.cpuCalc(this.CACHE.stats['cpu' + i][0], sensor.stats['cpu' + i][0], 1  )]);
                output.push(['cpu' + i + '.system',  this.cpuCalc(this.CACHE.stats['cpu' + i][0], sensor.stats['cpu' + i][0], 2  )]);
                output.push(['cpu' + i + '.idle',    this.cpuCalc(this.CACHE.stats['cpu' + i][0], sensor.stats['cpu' + i][0], 3  )]);
            }
            // Get network speed ( upload / download ) per sec.
            for (let i in netInterfaces) {
                let inet = netInterfaces[i]; // interface name
                output.push(["net." + inet + ".rx",this.netCalc(this.CACHE.net[inet + ':'][0][0] / cacheTimeDiff , sensor.net[inet + ':'][0][0] / cacheTimeDiff )]);
                output.push(["net." + inet + ".tx",this.netCalc(this.CACHE.net[inet + ':'][0][8] / cacheTimeDiff , sensor.net[inet + ':'][0][8] / cacheTimeDiff )]);
            }
            // Disks stats
            for(let i in majorNumbers){
                let sensorDriver = sensor.disk[majorNumbers[i]];
                let cacheDriver = this.CACHE.disk[majorNumbers[i]];
                for(let j in sensorDriver){
                    output.push(["disk." + sensorDriver[j][1] + '.writespeed',this.format((sensorDriver[j][8] - cacheDriver[j][8]) / 2 / cacheTimeDiff)]);
                }
            }

        }
        // ARP changes
        let arpNew = sensor.arp;
        for(let ip in arpNew){
            if(ip === 'ip') continue;
            output.push(['arp.' + this.addresToInt(ip,'.',10),this.addresToInt(arpNew[ip][0][2],':',16)]);
        }
        // Processes
        output.push(["procs.running",sensor.stats['procs_running'][0][0]]);
        output.push(["procs.blocked",sensor.stats['procs_blocked'][0][0]]);
        // build sensors output
        this.CACHE = sensor;
        this.out(this.prepare(output));
    }
}

module.exports = Sensor;
