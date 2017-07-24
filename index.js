"use strict";

var CACHE = null,
    nowSec = null;

const precision = 2,
    timeServer = 'http://pool.ntp.org', // set this to your gateway or desired server
    rootPath = 'system',
    fs = require('fs'),
    cp = require('child_process'),
    sanitize = (str) => {
        return str.toString().trim().toLowerCase().replace(/[^a-z0-9.]/gi,'_').replace(/__+/gi, '_'); // convert to lowercase -> replace non a-z0-9 with '_' and replace multiple underscores '__' with single '_'
    },
    host = sanitize(cp.execSync('echo $HOSTNAME',{shell:'/bin/bash'})),
    spath = rootPath + '.' + host,
    cmdSensors = [
        // System load.
        {'cmd':` echo  \`cat /proc/loadavg | cut -d ' ' -f1\`  \`nproc\` | awk '{printf "%f", ($1 / $2) * 100}'`,'path':'uptime.load'}, // system load scaled to number of cpu's
        // Ping gateway.
        {'cmd':`ping -c 1 $(ip route | awk '/default/ { print $3 }') | grep ttl | cut -d '=' -f 4 | awk '{print $1}'`,'path':'ping.gateway'},
        // Mem used / free.
        {'cmd':`free | awk 'FNR == 3 {print "${spath}.mem.used " $3/($3+$4)*100; print "${spath}.mem.free " $4/($3+$4)*100}'`,'path':null},
        // Disks usage.
        {'cmd':`df -k -x devtmpfs -x tmpfs | tail --lines=+2 | sed -e 's/\\/dev\\///g' | awk '{print "${spath}.disk."$1".usage.percent " int($5); print "${spath}.disk."$1".usage.used " int($3); print "${spath}.disk."$1".usage.free " int($4);}'`,'path':null},
        // Up time.
        {'cmd':`awk '{print $1}' /proc/uptime`,'path':'uptime.boot'},
        // CPU clock speeds.
        {'cmd':`cat /proc/cpuinfo | grep -E 'MHz' | awk '{print "${spath}." $1NR-1 ".clock " $4}'`,'path':null},
        // Threads.
        {'cmd':`grep -s '^Threads' /proc/[0-9]*/status | awk '{ sum += $2; } END { print "${spath}.threads", sum; }'`,'path':null},
        // TCP stats.
        {'cmd':`cat /proc/net/tcp* | awk '
            match ($4, /0[0-9A-B]/) {
                STATE[$4]++;
            }
            END {
                printf "${spath}.net.tcp.established %d\\n", STATE["01"];
                printf "${spath}.net.tcp.syn_sent %d\\n",    STATE["02"];
                printf "${spath}.net.tcp.syn_recv %d\\n",    STATE["03"];
                printf "${spath}.net.tcp.fin_wait1 %d\\n",   STATE["04"];
                printf "${spath}.net.tcp.fin_wait2 %d\\n",   STATE["05"];
                printf "${spath}.net.tcp.time_wait %d\\n",   STATE["06"];
                printf "${spath}.net.tcp.close %d\\n",       STATE["07"];
                printf "${spath}.net.tcp.close_wait %d\\n",  STATE["08"];
                printf "${spath}.net.tcp.last_ack %d\\n",    STATE["09"];
                printf "${spath}.net.tcp.listen %d\\n",      STATE["0A"];
                printf "${spath}.net.tcp.closing %d\\n",     STATE["0B"];
            }'`,'path':null},
        // Top 10 processes by number of instances
        {'cmd':`top -bn1 | grep -v COMMAND | awk 'NR > 7 && $8 ~ /R|S|D|T/ {print $12}' | sort | uniq -c | sort -nr | head -n 10 | awk '{print "${spath}.prc." $2 ".instances " $1 }'`,'path':null},
        // processes by user
        {'cmd':`ps hax -o user | sort | uniq -c | sort -nr | awk '{print "${spath}.users." $2 ".numprocs " $1}'`,'path':null},
        // opened file handlers
        {'cmd':`awk '{print "${spath}.openedFileHandlers " $1}' /proc/sys/fs/file-nr`,'path':null},
        // Total processes
        {'cmd':`top -bn1 | awk 'NR > 7 && $8 ~ /R|S|D|T/ { print $12 }' | wc -l`,'path':`procstotal`},
        // Zombies
        {'cmd':`top -bn1 | awk 'NR > 7 && $8 ~ /Z/ { print $12 }' | wc -l`,'path':`procszombie`},
        // Numbers of users on terminal
        {'cmd':`ls /dev/pts/ | grep -v ptmx | wc -l`,'path':`terminals`},
        // Services that run on open ports and their amount
        {'cmd':`netstat -auntp | grep 'LISTEN' | awk '{print $4 " " $7}' | sed -E "s~(.*):([0-9]+)~\\2~" | sed -E "s~(\\s.*)/(.*)~ \\2~" | sort -k 1,1 | uniq -c | awk -F ' ' '{print "${spath}.service."$3 "." $2 " " $1 }'`,'path':null},
        // Check time lag.
        {'cmd':`curl -w "Date: %{time_connect}" -s --head ${timeServer} | grep ^Date: | sed 's/Date: //g' | awk '{ if(NR == 1){ system("date -d \\"" $0 "\\" +\\"%s\\" ")  } if(NR==2){ print $0;system("date +\\"%s\\"") } }' | tr '\\n' ' ' | tr ',' '.' | awk '{print $3 " - ( " $1 " - "  $2 " )" }' | bc | awk '{ printf "%f", $0}'`,'path':'time.sync','interval':12 * 60 * 60},
        // Available entropy
        {'cmd':`cat /proc/sys/kernel/random/entropy_avail`,'path':'random.entropy'},
        // Entropy pool size
        {'cmd':`cat /proc/sys/kernel/random/poolsize`,'path':'random.pool'},
    ],
    addrToInt = (addr,delimiter,fromBase) => {
            let newAddr = addr;
                newAddr = newAddr.split(delimiter);
            let newAddrLength = newAddr.length;
            let newAddrInt = 0;
            for(let m in newAddr){
                let pow = (newAddrLength - m - 1);
                let segment = parseInt(newAddr[m],fromBase);
                newAddrInt = (newAddrInt + (pow ? segment * Math.pow(256,pow) : segment ));
            }
            return newAddrInt;
    },
    runCmd = (callback)=>{
        let start = false;
        nowSec =  parseInt(Date.now() / 1000);
        for(let i in cmdSensors){

            start = false;
            if(typeof cmdSensors[i].interval !== 'undefined'){
                let currentState = Math.floor(nowSec / cmdSensors[i].interval);
                if(typeof cmdSensors[i].cache === 'undefined' ) cmdSensors[i].cache = currentState;
                start = (cmdSensors[i].cache !== currentState);
                cmdSensors[i].cache = currentState;
            }else{
                start = true;
            }
            if(start)  sensorFromCmd(cmdSensors[i].cmd,cmdSensors[i].path,callback)
        }
    },
    out = (ob,callback) => {
        ob = ob.split("\n").filter(a=>a).map((a) => {
                a = a.split(' ');
            let al = a.length;
                a[0] = sanitize(a[0]);
                if(al === 2) a[2] = nowSec
                return {'name':a[0],'value':a[1],'time':a[2]};
            });
        if(callback) callback(ob);

    },
    sum = (arr) => {
        return num(arr.reduce((a, b) => num(a) + num(b), 0));
    },
    num = (str) => {
        return (new Number(str) + 0); // add 0 to force numeric context
    },
    percent = (a, b) => {
        return ((num(a) / num(b)) * 100);
    },
    format = (fl) => {
        return fl.toFixed(precision);
    },
    cpuCalc = (oldData, newData, usedIndex) => {
        return format(percent(num(newData[usedIndex]) - num(oldData[usedIndex]), sum(newData) - sum(oldData)));
    },
    netCalc = (oldData, newData) => {
        return format((num(newData) - num(oldData)) / 1000 ); // to Kb
    },
    getFile = (file) => {
        return fs.readFileSync(file).toString().trim();
    },
    fileExists = (filename) => {
        let exists = true;
        try{ fs.accessSync(filename); }
        catch(e){ exists = false; }
        return exists;
    },
    sensorFromCmd = (cmd,path,callback) => {
        cp.exec(cmd,{},(err,stdout,errout) =>{
            out((path ? spath + '.' + path + ' ' : '') + stdout.trim() + "\n",callback);
        });
    },
    prepare = (output) => {
        return output
            .split("\n")
            .filter(a=>a)
            .map((a)=>{
                return spath + '.' + a;
            })
            .join("\n");
    },
    readStat = (file) => {
        let sysStat = {};
        if(fileExists(file)){
            let stats = getFile(file).trim().split("\n");
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
    },
    runMsgWatcher = (cb) => {
	let file = '/var/log/kern.log';
	let getLines = () => {
		let lines = cp.execSync(`wc -l ${file} | awk {'print \$1'} `).toString();
	    	return parseInt(lines);
		};
	let lines = getLines();

	fs.watchFile(file,{persistent:true},(currStat,prevStat) => {

		let newLines = getLines();;
		let changes = lines - newLines;
		let output = '';
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
				output += spath + '.' + lineOut + ' 1 ' + time + "\n";
			});
			out(output,cb);
		})

	});

    },
    runDelta = (callback) => {
        nowSec =  parseInt(Date.now() / 1000);
        let output = '';
        let majorNumbers = cp.execSync(`lsblk | grep  -Ev 'NAME|rom' | awk '{print $2}' | cut -d: -f 1 | sort -u`)
            .toString()
            .split("\n")
            .filter(a=>a)
            .map((a) => { return num(a);});
        let sensor = {
            "time": nowSec,
            "disk":     readStat('/proc/diskstats'),
            "stats":    readStat('/proc/stat'),
            "net":      readStat('/proc/net/dev'),
            "arp":      readStat('/proc/net/arp')
        };
        
        if(CACHE === null ){
            CACHE = sensor;// if no cache ( cleared or first run, assume that current data is a cache data )
        }
        let cores = num(cp.execSync('nproc')); // get number of cores
        let netInterfaces = cp.execSync(`ls /sys/class/net/ | grep -v lo`).toString().split("\n").filter(a => a);
        let cacheTime = CACHE.time;
        let cacheTimeDiff = nowSec - cacheTime;
        cacheTimeDiff = cacheTimeDiff === 0 ? 1 : cacheTimeDiff; // prevent division by zero for intervals less than 1 sec.
        // Total CPU
        output +=  "cpu.user "   + cpuCalc(CACHE.stats['cpu'][0], sensor.stats['cpu'][0], 0 /* user */   ) + "\n";
        output +=  "cpu.nice "   + cpuCalc(CACHE.stats['cpu'][0], sensor.stats['cpu'][0], 1 /* nice */   ) + "\n";
        output +=  "cpu.system " + cpuCalc(CACHE.stats['cpu'][0], sensor.stats['cpu'][0], 2 /* system */ ) + "\n";
        output +=  "cpu.idle "   + cpuCalc(CACHE.stats['cpu'][0], sensor.stats['cpu'][0], 3 /* idle */   ) + "\n";
        // each core load
        for (let i = 0; i < cores; i++){
            output += 'cpu' + i + '.user '   + cpuCalc(CACHE.stats['cpu' + i][0], sensor.stats['cpu' + i][0], 0) + "\n";
            output += 'cpu' + i + '.nice '   + cpuCalc(CACHE.stats['cpu' + i][0], sensor.stats['cpu' + i][0], 1) + "\n";
            output += 'cpu' + i + '.system ' + cpuCalc(CACHE.stats['cpu' + i][0], sensor.stats['cpu' + i][0], 2) + "\n";
            output += 'cpu' + i + '.idle '   + cpuCalc(CACHE.stats['cpu' + i][0], sensor.stats['cpu' + i][0], 3) + "\n";
        }
        // Get network speed ( upload / download ) per sec.
        for (let i in netInterfaces) {
            let inet = netInterfaces[i]; // interface name
            output  += "net." + inet + ".rx " + netCalc(CACHE.net[inet + ':'][0][0] / cacheTimeDiff , sensor.net[inet + ':'][0][0] / cacheTimeDiff ) + "\n"
                    +  "net." + inet + ".tx " + netCalc(CACHE.net[inet + ':'][0][8] / cacheTimeDiff , sensor.net[inet + ':'][0][8] / cacheTimeDiff ) + "\n"
        }
        // Disks stats
        for(let i in majorNumbers){
            let sensorDriver = sensor.disk[majorNumbers[i]];
            let cacheDriver = CACHE.disk[majorNumbers[i]];
            for(let j in sensorDriver){
                output += "disk." + sensorDriver[j][1] + '.writespeed ' + format((sensorDriver[j][8] - cacheDriver[j][8]) / 2 / cacheTimeDiff) + "\n";
            }
        }
        // ARP changes
        let arpNew = sensor.arp;
        for(let ip in arpNew){
            if(ip === 'ip') continue;
            output += "arp." + addrToInt(ip,'.',10) + ' ' + addrToInt(arpNew[ip][0][2],':',16) + "\n";
        }
        // Procs
        output  += ''
            + "procs.running " + sensor.stats['procs_running'][0][0] + "\n"
            + "procs.blocked " + sensor.stats['procs_blocked'][0][0] + "\n"
            + '';
        // build sensors output
        CACHE = sensor;
        out(prepare(output) + "\n",callback);
    },
    run = (callback) => {
        runCmd(callback);
        runDelta(callback);
    };

module.exports.run = run; // all sensors
module.exports.runCmd = runCmd; // cmd static sensors
module.exports.runDelta = runDelta; // cpu, net, disk
module.exports.sensorFromCmd = sensorFromCmd; //
module.exports.runMsgWatcher = runMsgWatcher; // file watcher;
