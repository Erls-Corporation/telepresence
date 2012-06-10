!function(global){
"use strict";
/***/
var util = meta.utility,
    extend    = util.Object.extend,
    isObject  = util.Object.isObject,
    apply     = util.Function.apply,
    applybind = util.Function.applybind,
    flatten   = util.Array.flatten,
    Emitter   = meta.Emitter;


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
  this.dispatcher = meta.createDispatcher(this.window, sessionId, name);
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
  function destroy(){
    this.window = null;
    this.document = null;
    this.iframe[0].parentNode.removeChild(this.iframe[0]);
    this.iframe = null;
    this.emit('destroyed');
  },
  function loadCode(source){
    var self = this;
    this.dispatcher.broadcaster.on('code-load', function(evt){
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

var TRAPS = ['UNKNOWN', 'GET', 'SET', 'DESCRIBE', 'DEFINE', 'DELETE', 'HAS',
  'OWNS', 'ENUMERATE', 'KEYS', 'NAMES', 'FIX', 'APPLY', 'CONSTRUCT' ];

TRAPS.forEach(function(trap, index){
  TRAPS[trap] = index;
});



meta.createContext = function createContext(name, sessionId){
  return new Context(name, sessionId);
};


_('#accept').on('click', function(e){
  e.preventDefault();
  var context = new Context(_('#name').content, _('#sesssionId').content);
  _('#masthead').delay(300).addClass('activated');
  _('#participants').delay(100).addClass('activated');
  _('#events').delay(300).addClass('activated');
  _('#initializing').delay(300).css({ display: 'none' });

  context.on('ready', function(){

    window.$ = function $(a,b){
      return context.window.$(a, b);
    }

    var events = _('#events ul');

    context.dispatcher.reifier.on('SET CONSTRUCT DEFINE APPLY DELETE', function(evt, record){
      var li = _('li.'+TRAPS[record.trap]).prependTo(events);
      li.content = record.name;
      }, 20);
    });

    // context.dispatcher.broadcaster.on('broadcast', function(e, record){
    //   events.append('li|'+TRAPS[e.data.type]);
    // });
  });

  context.loadCode('./jquery-1.7.2.js');
  console.log(window.c = context);
});

/***/
}(new Function('return this')());