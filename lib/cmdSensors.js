"use strict";

class cmdSensors{

    constructor(options){

        for(let v in options) this[v] = options[v];

        this.sensors = [
            // System load
            {'cmd':` echo  \`cat /proc/loadavg | cut -d ' ' -f1\`  \`nproc\` | awk '{printf "%f", ($1 / $2) * 100}'`,'path':'uptime.load'}, // system load scaled to number of cpu's
            // Ping gateway.
            {'cmd':`ping -c 1 $(ip route | awk '/default/ { print $3 }') | grep ttl | cut -d '=' -f 4 | awk '{print $1}'`,'path':'ping.gateway'},
            // Mem used / free.
            {'cmd':`free | grep ^Mem | awk '{print "${this.spath}.mem.used " $3/($3+$4)*100; print "${this.spath}.mem.free " $4/($3+$4)*100}'`,'path':null},
            // Disks usage.
            {'cmd':`df -k -x devtmpfs -x tmpfs | tail --lines=+2 | sed -e 's/\\/dev\\///g' | awk '{print "${this.spath}.disk."$1".usage.percent " int($5); print "${this.spath}.disk."$1".usage.used " int($3); print "${this.spath}.disk."$1".usage.free " int($4);}'`,'path':null},
            // Up time.
            {'cmd':`awk '{print $1}' /proc/uptime`,'path':'uptime.boot'},
            // CPU clock speeds.
            {'cmd':`cat /proc/cpuinfo | grep -E 'MHz' | awk '{print "${this.spath}." $1NR-1 ".clock " $4}'`,'path':null},
            // Threads.
            {'cmd':`grep -s '^Threads' /proc/[0-9]*/status | awk '{ sum += $2; } END { print "${this.spath}.threads", sum; }'`,'path':null},
            // TCP stats.
            {'cmd':`cat /proc/net/tcp* | awk '
                    match ($4, /0[0-9A-B]/) {
                        STATE[$4]++;
                    }
                    END {
                        printf "${this.spath}.net.tcp.established %d\\n", STATE["01"];
                        printf "${this.spath}.net.tcp.syn_sent %d\\n",    STATE["02"];
                        printf "${this.spath}.net.tcp.syn_recv %d\\n",    STATE["03"];
                        printf "${this.spath}.net.tcp.fin_wait1 %d\\n",   STATE["04"];
                        printf "${this.spath}.net.tcp.fin_wait2 %d\\n",   STATE["05"];
                        printf "${this.spath}.net.tcp.time_wait %d\\n",   STATE["06"];
                        printf "${this.spath}.net.tcp.close %d\\n",       STATE["07"];
                        printf "${this.spath}.net.tcp.close_wait %d\\n",  STATE["08"];
                        printf "${this.spath}.net.tcp.last_ack %d\\n",    STATE["09"];
                        printf "${this.spath}.net.tcp.listen %d\\n",      STATE["0A"];
                        printf "${this.spath}.net.tcp.closing %d\\n",     STATE["0B"];
                    }'`,'path':null},
            // Top 10 processes by number of instances
            {'cmd':`top -bn1 | grep -v COMMAND | awk 'NR > 7 && $8 ~ /R|S|D|T/ {print $12}' | sort | uniq -c | sort -nr | head -n 10 | awk '{print "${this.spath}.prc." $2 ".instances " $1 }'`,'path':null},
            // processes by user
            {'cmd':`ps hax -o user | sort | uniq -c | sort -nr | awk '{print "${this.spath}.users." $2 ".numprocs " $1}'`,'path':null},
            // opened file handlers
            {'cmd':`awk '{print "${this.spath}.openedFileHandlers " $1}' /proc/sys/fs/file-nr`,'path':null},
            // Total processes
            {'cmd':`top -bn1 | awk 'NR > 7 && $8 ~ /R|S|D|T/ { print $12 }' | wc -l`,'path':`procstotal`},
            // Zombies
            {'cmd':`top -bn1 | awk 'NR > 7 && $8 ~ /Z/ { print $12 }' | wc -l`,'path':`procszombie`},
            // Numbers of users on terminal
            {'cmd':`ls /dev/pts/ | grep -v ptmx | wc -l`,'path':`terminals`},
            // Services that run on open ports and their amount
            {'cmd':`netstat -auntp | grep 'LISTEN' | awk '{print $4 " " $7}' | sed -E "s~(.*):([0-9]+)~\\2~" | sed -E "s~(\\s.*)/(.*)~ \\2~" | sort -k 1,1 | uniq -c | awk -F ' ' '{print "${this.spath}.service."$3 "." $2 " " $1 }'`,'path':null},
            // Check time lag.
            {'cmd':`curl -w "Date: %{time_connect}" -s --head ${this.timeServer} | grep ^Date: | sed 's/Date: //g' | awk '{ if(NR == 1){ system("date -d \\"" $0 "\\" +\\"%s\\" ")  } if(NR==2){ print $0;system("date +\\"%s\\"") } }' | tr '\\n' ' ' | tr ',' '.' | awk '{print $3 " - ( " $1 " - "  $2 " )" }' | bc | awk '{ printf "%f", $0}'`,'path':'time.sync','interval':this.timeServerCheckInterval},
            // Available entropy
            {'cmd':`cat /proc/sys/kernel/random/entropy_avail`,'path':'random.entropy'},
            // Entropy pool size
            {'cmd':`cat /proc/sys/kernel/random/poolsize`,'path':'random.pool'},
        ];
    }
}

module.exports = cmdSensors;
