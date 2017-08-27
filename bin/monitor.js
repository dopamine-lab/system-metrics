#!/usr/bin/env node

"use strict"

const Sensor = require(__dirname + '/../lib/proxy.js');
const cp = require('child_process');
const defaultHighlight = '(^.cpu([0-9]+\).(user|system|clock))|(^.mem.(free|used))|(.usage.percent)|(.uptime.load)';
var   sensor = new Sensor({delta:2000,rootPath:'',host:''});

var   highlight = null;
try{
      highlight = new RegExp(process.argv[2] ? process.argv[2] : defaultHighlight);
}catch(e){
      highlight = new RegExp(defaultHighlight)
}
var   padSize1 = 0;
var   padSize2 = 0;
var   alerts = {};
var   Table  = {};
var   styles = {};
var   repHorizontal = process.argv[3] || 4;
var   cpus = cp.execSync('nproc');
// BEGIN SETTINGS
var   GridCol = 'gray';
var   alertRows = 5;
var   maxLen = 35;
var   emoji = {"rainbow":"🌈","thermometer":"🌡","capricorn":"♑️","radioactive_sign":"☢"};
var   threshold = {
    '.cpu.user':{max:100},
    '.cpu.system':{max:100},
    '.uptime.load':{over:100,below:0,max:100},
    '.mem.used':{max:100}
};
for(let i = 0; i<cpus; i++){
    threshold['.cpu' + i + '.user']   = {max:100};
    threshold['.cpu' + i + '.system'] = {max:100};
} // auto setup cpu's scales

threshold['.ping.gateway'] = {over:100};

// END SETTINGS

var   chars = {
    'top':      '─', 'top-mid':     '┬', 'top-left':    '┌', 'top-right':    '┐',
    'bottom':   '─', 'bottom-mid':  '┴', 'bottom-left': '└', 'bottom-right': '┘',
    'left':     '│', 'left-mid':    '├', 'mid':         '─', 'mid-mid':      '┼',
    'right':    '│', 'right-mid':   '┤', 'middle':      '│'
      };
var   codes = {
    reset:            [0, 0 ],
    bold:             [1, 22],  black:    [30, 39],  bgBlack:     [40, 49],
    dim:              [2, 22],  red:      [31, 39],  bgRed:       [41, 49],
    italic:           [3, 23],  green:    [32, 39],  bgGreen:     [42, 49],
    underline:        [4, 24],  yellow:   [33, 39],  bgYellow:    [43, 49],
    inverse:          [7, 27],  blue:     [34, 39],  bgBlue:      [44, 49],
    hidden:           [8, 28],  magenta:  [35, 39],  bgMagenta:   [45, 49],
    strikethrough:    [9, 29],  cyan:     [36, 39],  bgCyan:      [46, 49],
    blink:            [5, 25],  white:    [37, 39],  bgWhite:     [47, 49],
                                gray:     [90, 39],
};

Object.keys(codes).forEach(function (key) {
  var val = codes[key];
  var style = styles[key] = [];
  style.open = '\u001b[' + val[0] + 'm';
  style.close = '\u001b[' + val[1] + 'm';
});

const padRight = function (str, len, pad) {
  if (len + 1 >= str.length)
  return str + Array(len + 1 - str.length).join(pad);
};

const padLeft = function (str, len, pad) {
  if (len + 1 >= str.length)
  return Array(len + 1 - str.length).join(pad) + str;
};

const color = function(string,style){
    return styles[style].open + string + styles[style].close
};

const truncate = function (str, length, chr){
  chr = chr || '…';
  return str.length >= length ? str.substr(0, length - chr.length) + chr : str;
};

const intToMac = function(addr){
    return (parseInt(addr)).toString(16).match(/.{1,2}/g).join(':').toUpperCase();
};

const intToIP = function (int) {
    return ((int >> 24) & 255) + "." + ((int >> 16) & 255) + "." + ((int >> 8) & 255) + "." + (int & 255);
};

var printOutput = function(tab){

    let header  = color(chars['left'],'gray') + ' ' + color(emoji['rainbow'],'yellow') + ' '
                + color( color("D",'white') + color("O",'red') + color('PAMINE','white') , 'bold' )
                + color(" Live stats:" + new Date().toString() + ":",'white')
                + color(emoji['thermometer'],'red') + color("Highlight:" + highlight, 'gray');
    let dataLength = 0;
    let buffer = [];
    let final = [];
    let cols = process.stdout.columns;
    let rows = process.stdout.rows;
    for(let i in tab){
        let alert = 'reset';

        // BEGIN scale
        let metricName = i;
            metricName = padLeft(truncate(metricName,maxLen),padSize1,' ');
            if(typeof threshold[i] !== 'undefined' && typeof threshold[i].max !== 'undefined'){
                let maxScale = threshold[i].max;
                let scaled = Math.ceil((padSize1 / maxScale) * tab[i]);
                metricName = metricName.split('');
                for(let j in metricName){
                    if(j > scaled) break;
                    metricName[j] = color(metricName[j],'underline');
                }
                metricName = metricName.join('');
            }
        // END scale
        // BEGIN alert
        if(typeof threshold[i] !== 'undefined' && ( tab[i] > threshold[i].over || tab[i]< threshold[i].below) ){
            alert = 'inverse';
            alerts[i] = [tab[i],new Date()];
        }
        // END alert

        let data = color(color(chars['left'],GridCol),'bold')
                    + color(
                        color(color(metricName,'green'),(highlight.test(i) ? 'bold' : 'italic'))
                        ,alert
                      )
                    + color(chars['middle'],GridCol)
                    + color(
                        color(color(padRight(tab[i],padSize2,' '),'red'),(highlight.test(i)  ? 'bold' : 'italic'))
                      ,alert)
                    + color(chars['right'],GridCol);
              buffer.push(data);
              if(dataLength < data.length) dataLength = data.length;
    }

    for(let i in buffer){
        if(i % repHorizontal === 0) final += "\n";
        final += buffer[i];
    }

    let footer  = "\n" + color(chars['left'] + 'Author: ' + emoji['capricorn'] + ' Nikolay Terziev (cupuyc@gmail.com)',GridCol)
                + color(" CLI $" + process.argv.join(' '),'white');

        for(let i in alerts){
         footer += "\n" + color(chars['left'],'gray')
                        + color(emoji['radioactive_sign'],'yellow')
                        + color(" [alert] ",'red')
                        + color(padRight(i,padSize1,' ') + ' ' + padRight(alerts[i][0],padSize2,' ') + 'UTC: ' + alerts[i][1].toUTCString(),'white') 
        }

//    process.stdout.write('\u001B[2J\u001B[0;0f');
    let rend = header + final + footer;
    process.stdout.write('\x1b[H\x1b[J')
    process.stdout.write(rend);

}

sensor.on(sensor.events.DATA,(data) => {
    data.map((row) => {
        if(row.name.indexOf('.arp.') === 0){
         row.value = intToMac(row.value);
         row.name = '.arp.'+intToIP(row.name.split('.').pop());
        }
        if(/(.cpu)*(.clock)/g.test(row.name)){
         row.value += ' MHz';
        }
        if(/.uptime.boot/g.test(row.name)){
         row.value += ' sec';
        }
        if(row.name.length  > padSize1) padSize1 = row.name.length;
        if(row.value.length > padSize2) padSize2 = row.value.length;
        padSize1 = padSize1 < maxLen ? padSize1 : maxLen;
        Table[row.name] = row.value;
    });
    printOutput(Table);
});

sensor.runForever();
