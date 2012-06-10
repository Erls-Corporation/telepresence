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


/*

var timeago = function(n,v){
  v=[ [ 'second', n *= 60 ],
      [ 'minute', n *= 60 ],
      [ 'hour',   n *= 24 ],
      [ 'day',    n *=  7 ],
      [ 'week',   n *=  4 ],
      [ 'month',  n *= 12 ],
      [ 'year',  Infinity ] ];

  return function timeago(d){
    n=0; d=Date.now()-d;
    while (++n)
      if (v[n][1] > d)
        return (d=d/v[n-1][1]+.5|0)+' '+v[n][0]+(!--d?'':'s')+' ago';
  }
}(1000);


var keywords = function(store){
  return function keywords(o, v){
    var a = store[o] || (store[o] = []);
    if (v && !~a.indexOf(v))
      a.push(v);
    return a;
  }
}(Object.create(null));


function Package(json, index){
  if (!(this instanceof Package))
    return new Package(json, index);

  ['name', 'description', 'homepage', 'watchers', 'forks'].forEach(function(s){
    this[s] = json[s];
  }, this);
  this.id = index;
  this.pushed = new Date(json.pushed_at);
  this.issues = json.open_issues;
  (json.keywords || []).forEach(function(key){
    keywords(key, this);
  }, this);

  this.path = json.filename;
  this.el = _('li|'+this.name);
  $(this.el[0]).library = this;
}


extend(Package.prototype, [
  function timeAgo(){
    return timeago(this.this.pushed);
  },
  function toString(){
    return this.path;
  }
]);


function Library(items){
  this.el = _('ul');
  if (Array.isArray(items)) {
    items.forEach(function(item, index){
      item = item instanceof Package ? item : new Package(item, index);
      this.push(item);
      this.el.append(item.el);
    }, this);
  }
}

extend(Library.prototype, {
  length: 0,
  forEach: Array.prototype.forEach,
  push: Array.prototype.push,
  sort: Array.prototype.sort,
  sortby: function sortby(field){
    if (isNaN(this[0][field])) {
      var hash = {};
      return this.map(function(item){
        hash[item[field]] = item;
        return item[field];
      }).sort().reduce(function(r,s){
        r[s] = hash[s];
        return r;
      }, {});
    } else {
      return this.sort(function(a, b){
        return a - b;
      });
    }
  },

});
*/

// function load(url, callback){
//   return new XHR('', callback).exec(url);
// }


// var libs;
// load('libs.json', function(json){
//   libs = new Library(json);
// });




exports.context = function context(name, sessionId){
  return new Context(name, sessionId);
};


_('#accept').on('click', function(e){
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

  // libs.el.delay(200).addClass('hide').appendTo('#libs').removeClass('hide');
  // libs.el.on('click', function(e){
  //   _('#holder').addClass('activated');
  //   context.loadCode($(e.target).library.path);
  //   libs.el.delay(200).addClass('hide').detach();
  // });
  e.preventDefault();
  console.log(window.c = context);
});

/***/
}(new Function('return this')(),

  typeof exports !== 'undefined' ? exports : this,
  typeof require !== 'undefined' ? require : function(s,r){
    return function require(n){ return s[n] }
  }(new Function('return this')()));



