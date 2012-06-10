var path = require('path'),
    util = require('util');

var utility = require('./lib/utility'),
    CMDS = utility.CMDS,
    logJSON = utility.logJSON,
    EVENT_TOKEN = utility.EVENT_TOKEN;

// sorry
eval(utility.importCMDS);




var Session = require('./lib/socket-server').Session;
var server = require('./lib/socket-server').createServer({
  port: 80,
  webroot:  path.resolve(__dirname, './frontend'),
});

var websocket = server.websocket;


websocket.on('connection', function(client){
  client.on('error', logJSON);
  client.once('message', function(data){
    logJSON(data);
    if (data[0] === EVENT_TOKEN) {
      data = JSON.parse(data.slice(1));
      switch (data.cmd) {
        case SESSION_CREATE:
          client.name = data.msg.name;
          var session = new Session(client);
          server.sessions[session.id] = session;
          break;
        case SESSION_JOIN:
          var session = server.sessions[data.msg.id];
          client.name = data.msg.name;
          session.joins(client);
          break;
      }
    }
  });
});


