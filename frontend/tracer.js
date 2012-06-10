!function(global){
"use strict";

/***/
var util = meta.utility,
    extend = util.Object.extend,
    isObject = util.Object.isObject,
    apply = util.Function.apply,
    applybind = util.Function.applybind,
    flatten = util.Array.flatten,
    Emitter = meta.Emitter;


function arrayToHash(array){
  var hash = Object.create(null);
  for (var i=0; i < array.length; i++)
    hash[array[i]] = i;

  return hash;
}


function log(){
  console.log.apply(console, arguments);
}


var CMDS = [ 'SESSION_INVITE', 'SESSION_CREATE', 'SESSION_JOIN', 'SESSION_PART',
             'TRACE_START','TRACE_STOP', 'TRACE_EVENT', 'LISTEN_START', 'LISTEN_STOP' ];

var CMDS_ = arrayToHash(CMDS);

var SESSION_INVITE = 0,
    SESSION_CREATE = 1,
    SESSION_JOIN   = 2,
    SESSION_PART   = 3,
    TRACE_START    = 4,
    TRACE_STOP     = 5,
    TRACE_EVENT    = 6,
    LISTEN_START   = 7,
    LISTEN_STOP    = 8,
    LIB_REQUEST    = 9;

var EVENT_TOKEN = String.fromCharCode(30);

var TRAPS = [ 'UNKNOWN', 'GET', 'SET', 'DESCRIBE', 'DEFINE', 'DELETE', 'HAS',
              'OWNS', 'ENUMERATE', 'KEYS', 'NAMES', 'FIX', 'APPLY', 'CONSTRUCT' ];

TRAPS.forEach(function(trap, index){
  TRAPS[trap] = index;
});


var nativeNames = arrayToHash([
  'Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError',
  'Array', 'Boolean', 'Date', /*Function,*/ 'Map', 'Number', 'Object', 'Proxy', 'RegExp', 'Set', 'String', 'WeakMap',
  'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'escape', /*eval,*/
  'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'unescape', 'Math', 'JSON'
]);



function SessionEvent(type, name, sessionId, target){
  this.target = target;
  this.type = types;
  this.name = name;
  this.sessionId = sessionId;
}




function Dispatcher(url, context, session, name){
  var self = this;
  Emitter.call(this);
  buffered.set(this, []);
  if (name)
    this.name = name;
  this.socket = new WebSocket(url);
  this.reifier = new Reifier(this, context);

  this.socket.log('error close');

  this.socket.on('message', function(evt){
    if (evt && evt.data && evt.data[0] === EVENT_TOKEN) {
      var data = JSON.parse(evt.data.slice(1));
      var event = eventMap[data.cmd];
      if (event)
        self.emit(event, data.msg);
    }
  });

  this.socket.on('open', function(socket){
    if (session) {
      self.sendCommand(SESSION_JOIN, { name: self.name, id: session });
    } else {
      self.sendCommand(SESSION_CREATE, { name: self.name });
    }
    self.emit('connect', session);
  });

  this.broadcaster = new Broadcaster(context);
  this.broadcaster.on('code-load', function(evt, source){
    self.sendCommand(TRACE_START, source);
  });

  this.broadcaster.on('broadcast', function(evt, record){
    self.sendCommand(TRACE_EVENT, record);
  });

}

var eventMap = {};
eventMap[TRACE_START] = 'code-load';
eventMap[TRACE_EVENT] = 'remote-event';
eventMap[SESSION_INVITE] = 'user-invite';
eventMap[SESSION_JOIN] = 'user-join';
eventMap[SESSION_PART] = 'user-leave';

var buffered = new WeakMap;

Dispatcher.prototype = extend(new Emitter, [
  function loadCode(source){
    this.broadcaster.loadCode(source);
  },
  function sendCommand(cmd, msg){
    this.socket.send(EVENT_TOKEN + JSON.stringify({ cmd: cmd, msg: msg || 0 }));
  }
]);




var Script = function(){
  if (typeof require === 'function') {
    try {
      var fs = require('fs');
      var loader = {
        request: function request(source, callback){
          var file = fs.readFileSync(source, 'utf8');
          setTimeout(function(){ callback(source) }, 1);
        }
      };
    } catch (e) {
      var loader = new XHR;
    }
  } else {
    var loader = new XHR;
  }

  function Script(origin, code){
    Object.defineProperties(this, {
      origin: { enumerable: true, value: origin },
      code: { value: code }
    });
  }

  extend(Script, [
    function load(origin, callback){
      if (typeof origin === 'function') {
        setTimeout(function(){
          callback(new Script(origin, '('+origin+')();'));
        }, 1);
      } else {
        loader.request(origin, function(code){
          callback(new Script(origin, code));
        });
      }
    }
  ]);

  extend(Script.prototype, [
    function compile(keys){
      this.compiled = Function.apply(null, keys.concat('\n'+this.code+'\n'));
    },
    function run(context, env){
      this.compiled.apply(context, env);
    }
  ]);

  return Script;
}();


function compileRun(context, script){
  var tracer = meta.tracer(context);
  var root = tracer.root;
  var keys = Object.getOwnPropertyNames(context).filter(function(key){
    return /^[\w_$]*$/.test(key)
           && isObject(context[key])
           && !(key in nativeNames);
  });
  var interceptors = keys.map(function(key){
    return root[key];
  });

  setTimeout(function(){
    script.compile(keys);
    script.run(root, interceptors)
  }, 100);

  delete tracer.root;
  return tracer;
}


// ##############
// ### Record ###
// ##############

function Record(time, trap, id, name, result, args){
  this.cmd = TRACE_EVENT;
  this.time = time;
  this.trap = trap;
  this.id = id;
  if (name)
    this.name = name;
  if (result)
    this.result = result;
  if (args)
    this.args = args;
}


extend(Record, [
  function deserialize(json){
    var record = Object.create(Record.prototype);

    Object.keys(json).forEach(function(key){
      record[key] = json[key];
    });

    record.trap = TRAPS[record.trap];
    return record;
  },
]);


// ###################
// ### Broadcaster ###
// ###################

function Broadcaster(context, source){
  var self = this;
  this.map = new WeakMap;
  this.map.index = 10000;
  this.names = Object.create(null);
  this.context = context;
  this.scripts = [];
  this.names.___count = 1;
  this.names.window = 0
  this.resolve(context);
  if (source)
    this.loadCode(source);
}

var functionNames = new WeakMap;


Broadcaster.prototype = extend(new Emitter, [
  function loadCode(source){
    var self = this;
    var context = this.context || global;

    Script.load(source, function(script){
      var tracer = compileRun(context, script);

      //setTimeout(function(){
        if (!self.startTime) {
          self.startTime = Date.now();
          self.emit('start');
        }

        TRAPS.forEach(function(trap){
          if (typeof self[trap] === 'function') {
            tracer.on(trap.toLowerCase(), function(evt){
              self[trap].call(self, evt);
            });
          }
        });

        self.scripts.push(script);
        self.emit('code-load', source);
      //}, 10);
    });
  },
  function resolveName(name){
    if (name in this.names)
      return this.names[name];

    this.names[name] = this.names.___count++;
    return name;
  },
  function resolve(o){
    if (!isObject(o))
      return o;
    if (this.map.has(o))
      return this.map.get(o);

    this.map.set(o, this.map.index++);
    return this.map.index - 1;
  },
  function broadcast(trap, target, name, result, args){
    target = this.resolve(target);
    result = this.resolve(result)
    if (args)
      args = args.map(this.resolve.bind(this));

    var record = new Record(this.elapsed(), trap, target, this.resolveName(name), result, args);
    this.emit('broadcast', record);
  },
  function elapsed(){
    return Date.now() - this.startTime;
  },
  function GET(e){
    if (typeof e.result === 'function')
      functionNames.set(e.result, e.property);
    this.broadcast(TRAPS.GET, e.target, e.property, e.result);
  },
  function SET(e){
    this.broadcast(TRAPS.SET, e.target, e.property, e.value);
  },
  function DELETE(e){
    this.broadcast(TRAPS.DELETE, e.target, e.property);
  },
  function FIX(e){
    this.broadcast(TRAPS.FIX, e.target);
  },
  function DESCRIBE(e){
    this.broadcast(TRAPS.DESCRIBE, e.target, e.property, e.result);
  },
  function DEFINE(e){
    this.broadcast(TRAPS.DEFINE, e.target, e.property, e.value);
  },
  function APPLY(e){
    this.broadcast(TRAPS.APPLY, e.context, functionNames.get(e.target) || e.target.name, e.result, e.args);
  },
  function CONSTRUCT(e){
    this.broadcast(TRAPS.CONSTRUCT, e.target, e.name, e.result, e.args);
  }
]);



// ###############
// ### Reifier ###
// ###############

function Reifier(dispatcher, context){
  var self = this;
  Emitter.call(this);
  this.map = Object.create(null);
  this.names = [null];
  this.resolve(10000, context);
  dispatcher.on('remote-event', function(evt, json){
    var record = Record.deserialize(json);
    record.name = self.resolveName(record.name);
    record.result = self[record.trap](record);
    self.emit(record.trap, record);
  });
}

Reifier.prototype = extend(new Emitter, [
  function resolveName(name){
    if (typeof name === 'number')
      return this.names[name];
    this.names.push(name);
    return name;
  },
  function resolveGet(record){
    if (record.id in this.map)
      return this.map[record.id][record.name];
    else
      log('id not found', record);
  },
  function resolve(id, o){
    if (typeof id !== 'number' || id < 10000)
      return id;
    if (!(id in this.map) && o !== undefined)
      this.map[id] = o;
    return this.map[id];
  },
  function OWNS(record){ },
  function ENUMERATE(record){ },
  function KEYS(record){ },
  function NAMES(record){ },
  function FIX(record){ },
  function DESCRIBE(record){
    var target = this.resolve(record.id);
    if (isObject(target))
      return this.resolve(record.id, Object.getOwnPropertyDescriptor(target, record.name));
  },
  function DEFINE(record){
  },
  function HAS(record){
  },
  function GET(record){
    return this.resolve(record.result, this.resolveGet(record));
  },
  function SET(record){
    var target = this.resolve(record.id)
    if (target) {
      var result = this.resolve(record.result);
      if (result !== undefined)
        target[record.name] = result;
      else if (target[record.name])
        this.resolve(record.result, target[record.name]);
    }
  },
  function DELETE(record){
    delete this.resolve(record.id)[record.name];
  },
  function APPLY(record){
    var fn = this.resolveGet(record);
    if (typeof fn === 'function') {
      var args = record.args.map(function(arg){
        return arg >= 10000 ? this.resolve(arg) : arg;
      }, this);
      return this.resolve(record.result, fn.apply(this.resolve(record.id), args));
    }
  },
  function CONSTRUCT(record){
    var fn = this.resolve(record.id);
    var result;
    var args = record.args.map(function(arg){
      return typeof arg === 'number' && arg >= 10000 ? this.resolve(arg) : arg;
    });
    if (typeof fn === 'function' && isFinite(record.result)) {
      switch (record.args.length) {
        case 0: result = new fn; break;
        case 1: result = new fn(args[0]); break;
        case 2: result = new fn(args[0], args[1]); break;
        case 3: result = new fn(args[0], args[1], args[2]); break;
        default: result = new (applybind(fn, flatten(null, args)));
      }
      return this.resolve(record.result, result);
    }
  }
]);




var socketPath = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;

meta.createDispatcher = function createDispatcher(context, sessionId, name){
  return new Dispatcher(socketPath, context || global, sessionId, name);
}

/***/
}(new Function('return this')());