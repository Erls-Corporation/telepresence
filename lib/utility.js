var path = require('path'),
    url = require('url'),
    util = require('util'),
    http = require('http'),
    fs = require('fs');



exports.uid = function(taken){
  return function uid (){
    var id = Math.random().toString(16).slice(2);
    return id in taken ? uid() : (taken[id] = id);
  }
}(Object.create(null));


exports.arrayToHash = function arrayToHash(array){
  var hash = Object.create(null);
  for (var i=0; i < array.length; i++)
    hash[array[i]] = i;

  return hash;
}


exports.inspect = function inspect(o){
  return util.inspect(o, false, 6);
}

exports.extend = function extend(o){
  var i, k, p, d, a = arguments;
  for (i in a)
    if (i)
      for (k in (p = a[i]))
        if (d = Object.getOwnPropertyDescriptor(p, k))
          Object.defineProperty(o, k, d);
  return o;
}



var EVENT_TOKEN = exports.EVENT_TOKEN = String.fromCharCode(30);

var cleanToken = new RegExp('^'+EVENT_TOKEN);

exports.logJSON = function logJSON(json){
  try {
    var out = JSON.parse(json.replace(cleanToken, ''));
    out.cmd = CMDS[out.cmd];
    if ('trap' in out)
      out.trap = TRAPS[out.trap];
    console.log(util.inspect(out, false, 4, true));
  }
  catch (e){}
}

var CMDS = exports.CMDS = [ 'SESSION_INVITE', 'SESSION_CREATE', 'SESSION_JOIN', 'SESSION_PART', 'TRACE_START',
                          'TRACE_STOP', 'TRACE_EVENT', 'LISTEN_START', 'LISTEN_STOP', 'CLIENT_NAME' ];

exports.importCMDS = 'var '+CMDS.map(function(item, index){
  CMDS[item] = index;
  return item+'='+index
}).join(', ')+';';


var TRAPS = exports.TRAPS = [ 'UNKNOWN', 'GET', 'SET', 'DESCRIBE', 'DEFINE', 'DELETE', 'HAS',
                              'OWNS', 'ENUMERATE', 'KEYS', 'NAMES', 'FIX', 'APPLY', 'CONSTRUCT' ];

exports.importTRAPS = 'var '+TRAPS.map(function(item, index){
  TRAPS[item] = index;
  return item+'='+index
}).join(', ')+';';
