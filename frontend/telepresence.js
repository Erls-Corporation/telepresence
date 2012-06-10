!function(global, exports, require){
"use strict";
/***/
var meta      = require('meta-objects');
var extend    = meta.utility.Object.extend;
var isObject  = meta.utility.Object.isObject;
var apply     = meta.utility.Function.apply;
var applybind = meta.utility.Function.applybind;
var flatten   = meta.utility.Array.flatten;
var Emitter   = meta.Emitter;


var $ = meta.namespace();



function Context(name, sessionId){
  var self = this;
  Emitter.call(this);
  _('#session').observe(this, 'sessionId', function(v){
    this.content = v;
  });
  this.name = name;
  this.iframe = _('iframe.context').appendTo('#holder');
  this.window = this.iframe[0].contentWindow;
  this.document = this.iframe[0].contentDocument || this.window.document;
  this.document.write('<!doctype html><html></html>');
  this.document.close();

  var participants = {};
  this.dispatcher = createDispatcher(this.window, sessionId, name);
  this.dispatcher.on('user-invite', function(evt, data){
    self.sessionId = data.id;
    data.names.forEach(function(name){
      participants[name] = new Participant(name, name === self.name);
    });
    self.emit('ready');
  });

  this.dispatcher.on('user-join', function(evt, name){
    if (!(name in participants)) {
      participants[name] = new Participant(name, name === self.name);
    }
  });

  this.dispatcher.on('user-leave', function(evt, name){
    if (name in participants) {
      participants[name].remove();
      delete participants[name];
    }
  });
}

Context.prototype = extend(new Emitter, [
  function setParent(parent){
    parent.appendChild(parent);
  },
  function destroy(){
    this.window = null;
    this.document = null;
    this.iframe[0].parentNode.removeChild(this.iframe[0]) ;
    this.iframe = null;
    this.emit('destroyed');
  },
  function loadCode(source){
    var self = this;
    this.dispatcher.broadcaster.once('ready', function(evt){
      self.emit('load', source);
    });
    this.dispatcher.loadCode(source);
  }
]);

function Participant(name, isSelf){
  this.name = name;
  this.el = _('li|'+name).appendTo('#participants ul');
  if (isSelf)
    this.el.addClass('self');
}

Participant.prototype.remove = function remove(){
  this.el.remove();
}


var T = {};
['UNKNOWN', 'GET', 'SET', 'DESCRIBE', 'DEFINE', 'DELETE', 'HAS',
  'OWNS', 'ENUMERATE', 'KEYS', 'NAMES', 'FIX', 'APPLY', 'CONSTRUCT' ]
.forEach(function(trap, index){
  T[trap] = index;
});



exports.context = function context(name, sessionId){
  return new Context(name, sessionId);
};


_('#accept').on('click', function(e){
  e.preventDefault();
  var context = new Context(_('#name').content, _('#sesssionId').content);
  _('#masthead').delay(300).addClass('activated');
  _('#participants').delay(100).addClass('activated');
  _('#events').delay(300).addClass('activated');
  _('#initializing').delay(300).css({ display: 'none' });

  var events = _('#events ul');
  context.dispatcher.reifier.on('*', function(e, record){
    events.append('li|'+record.type);
  });

  context.dispatcher.broadcaster.on('broadcast', function(e, record){
    events.append('li|'+T[e.data.type]);
  });

  context.loadCode('./jquery-1.7.2.js');
  console.log(window.c = context);
});

/***/
}(new Function('return this')(),
  typeof exports !== 'undefined' ? exports : this,
  typeof require !== 'undefined' ? require : function(s,r){
    return function require(n){ return s[n] }
  }(new Function('return this')()));
