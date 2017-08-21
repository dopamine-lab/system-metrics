#!/usr/bin/env node

"use strict"

const Sensor = require(__dirname + '/../lib/proxy.js');
var   sensor = new Sensor({delta:2000,rootPath:'',host:''});
var   highlight = process.argv[2] ? process.argv[2] : '/';
var   padSize1 = 0;
var   padSize2 = 0;
var   alerts = {};
var   Table  = {};
var   styles = {};
var   repHorizontal = process.argv[3] || 4;

// BEGIN SETTINGS
var   GridCol = 'gray';
var   alertRows = 5;
var   maxLen = 35;
var   emoji = {"rainbow":"🌈","thermometer":"🌡","capricorn":"♑️","radioactive_sign":"☢"};
var   threshold = {
    '.ping.gateway':{over:20,below:0},
    '.disk.sdb2.usage.percent':{over:99,below:0},
    '.cpu.idle':{over:'z',below:50},
    '.uptime.load':{over:10,below:0}
};
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
                                white:    [37, 39],  bgWhite:     [47, 49],
                                gray:     [90, 39],
};

Object.keys(codes).forEach(function (key) {
  var val = codes[key];
  var style = styles[key] = [];
  style.open = '\u001b[' + val[0] + 'm';
  style.close = '\u001b[' + val[1] + 'm';
});

const pad = function (str, len, pad) {
  if (len + 1 >= str.length)
  return str + Array(len + 1 - str.length).join(pad);
};

const color = function(string,style){
    return styles[style].open + string + styles[style].close
}

const truncate = function (str, length, chr){
  chr = chr || '…';
  return str.length >= length ? str.substr(0, length - chr.length) + chr : str;
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
        if(typeof threshold[i] !== 'undefined' && ( tab[i] > threshold[i].over || tab[i]< threshold[i].below) ){
            alert = 'inverse';
            alerts[i] = [tab[i],new Date()];
        }
        let data = color(color(chars['left'],GridCol),'bold')
                    + color(
                        color(color(pad(truncate(i,maxLen),padSize1,' '),'green'),(i.indexOf(highlight) > -1 ? 'underline' : 'italic'))
                        ,alert
                      )
                    + color(chars['middle'],GridCol)
                    + color(
                        color(color(pad(tab[i],padSize2,' '),'red'),(i.indexOf(highlight) > -1 ? 'underline' : 'italic'))
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
                        + color(pad(i,padSize1,' ') + ' ' + pad(alerts[i][0],padSize2,' ') + 'UTC: ' + alerts[i][1].toUTCString(),'white') 
        }
//  process.stdout.write('\x1Bc');
    process.stdout.write('\u001B[2J\u001B[0;0f');
    console.log(header + final + footer);
}

sensor.on(sensor.events.DATA,(data) => {
    data.map((row) => {
        if(row.name.length  > padSize1) padSize1 = row.name.length;
        if(row.value.length > padSize2) padSize2 = row.value.length;
        padSize1 = padSize1 < maxLen ? padSize1 : maxLen;
        Table[row.name] = row.value;
    });
    printOutput(Table);
});
sensor.runForever();



