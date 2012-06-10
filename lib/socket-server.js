var WebSocketServer = require('ws').Server;

var path = require('path'),
    url = require('url'),
    util = require('util'),
    http = require('http'),
    fs = require('fs');


fs.existsSync || (fs.existsSync = path.existsSync);
fs.exists || (fs.exists = path.exists);


var utility = require('./utility'),
    uid = utility.uid,
    extend = utility.extend,
    inspect = utility.inspect,
    logJSON = utility.logJSON,
    arrayToHash = utility.arrayToHash,
    EVENT_TOKEN = utility.EVENT_TOKEN,
    CMDS = utility.CMDS,
    TRAPS = utility.TRAPS;


// sorry
eval(utility.importCMDS);







function File(root, name){
  this.name = name;
  this.path = path.resolve(root, name);
  this.type = path.extname(name).slice(1);
  this.mimeType = File.mimeTypes[this.type];
}

File.mimeTypes = {
  js: 'application/javascript',
  css: 'text/css',
  json: 'application/json',
  html: 'text/html',
  svg: 'xml/svg'
};

extend(File.prototype, {
  get contents(){
    if (!this._contents || this.outdated) {
      this._contents = fs.readFileSync(this.path, 'utf8');
      this.timestamp = Date.now();
    }
    return this._contents;
  },
  get age(){
    return Date.now() - this.timestamp;
  },
  get outdated(){
    return fs.statSync(this.path).mtime > this.timestamp;
  }
});



function Cache(root){
  this.timestamp = new Date;
  this.files = Object.create(null);
  this.root = root;
}

extend(Cache.prototype, {
  addFile: function addFile(file){
    this.files['/'+file.name] = file;
  },
  getFile: function getFile(name){
    if (name in this.files) {
      return this.files[name];
    } else if (fs.existsSync(path.resolve(this.root, name))) {
      return this.files[name] = new File(this.root, name);
    } else {
      return new Error('File not found: '+name);
    }
  }
});




function Session(client){
  this.id = uid();
  this.state = 'initialized';
  this.clients = {};
  this.history = [];
  if (client)
    this.joins(client);
}

Session.prototype = {
  constructor: Session,
  joins: function joins(client){
    var self = this;

    client.id = uid();
    client.session = this;

    this.clients[client.id] = client;

    client.on('message', function(data){
      if (EVENT_TOKEN === data[0]) {
        if (JSON.parse(data.slice(1)).cmd === TRACE_EVENT)
          self.history.push(data);
        else
          logJSON(data);
        self.broadcastRaw(client, data);
      }
    });

    client.on('close', function(){
      self.parts(client);
    });

    this.send(client, SESSION_INVITE, {
      id: this.id,
      names: Object.keys(this.clients).map(function(key){
        return this[key].name;
      }, this.clients)
    });

    this.broadcast(client, SESSION_JOIN, client.name);

    var history = this.history.slice();
    var i = 0;

    // !function resync(){
    //   if (i < history.length) {
    //     self.send(client, SESSION_PART, client.name);
    //     setTimeout(resync, 1);
    //   }
    // }();

    logJSON(this);
  },
  parts: function parts(client){
    var name = client.name;
    delete this.clients[client.id];
    this.broadcast(client, SESSION_PART, name);
    logJSON('parts '+client.id);
  },

  send: function send(client, cmd, msg){
    var data = EVENT_TOKEN + JSON.stringify({ cmd: cmd, msg: msg });
    client.send(data);
    logJSON(data);
  },

  broadcast: function broadcast(client, cmd, msg){
    var data = EVENT_TOKEN + JSON.stringify({ cmd: cmd, msg: msg });
    logJSON(data);
    for (var k in this.clients) {
      if (this.clients[k] !== client)
        this.clients[k].send(data);
    }
  },
  broadcastRaw: function broadcastRaw(client, data){
    for (var k in this.clients) {
      if (this.clients[k] !== client)
        this.clients[k].send(data);
    }
  }
};



function SocketServer(config){
  var self = this;

  http.Server.call(this, function httpHandler(request, response){
    if (request.url === '/')
      request.url = '/index.html';

    var file = this.files.getFile('.'+request.url);

    response.writeHead(200, { 'Content-Type': file ? file.mimeType : 'text/html' });
    response.write(file instanceof File ? file.contents : inspect(file) );
    response.end();
  });

  this.sessions = {};
  this.files = new Cache(config.webroot);
  this.websocket = new WebSocketServer({ server: this });

  process.nextTick(function(){
    self.listen(config.port);
  });
}

SocketServer.prototype = extend(Object.create(http.Server.prototype), {
  constructor: SocketServer,
});



exports.createServer = function createServer(config){
  return new SocketServer(config);
}

exports.Server = SocketServer;
exports.Session = Session;