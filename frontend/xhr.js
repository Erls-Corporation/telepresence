var XHR = function(){
  function Transport(options, callback){
    options = options || {};
    if (typeof options === 'string')
      options = { url: options };
    if (typeof callback === 'function')
      options.callback = callback;
    this.data = options.data || {};
    this.base = options.url;
    this.path = options.path || [];
    if (options.callback)
      this.callback = options.callback;
    this.state = 'idle';
  }

  !function(){
    var transports = {}

    Transport.register = function register(ctor){
      transports[ctor.name.toLowerCase()] = ctor;
    }

    Transport.lookup = function lookup(name){
      name = name.toLowerCase();
      return name in transports ? transports[name] : null;
    }
    Transport.create = function create(type, base, dispatcher){
      var T = Transport.lookup(type);
      return new T(base, dispatcher);
    }
  }();

  Transport.prototype = {
    constructor: Transport,

    get params(){
      var data = Object.keys(this.data).map(function(name){ return [name, this.data[name]] }, this);
      return data.map(function(item){
        return encodeURIComponent(item[0]) + "=" + encodeURIComponent(item[1]);
      }).join('&');
    },
  }


  var types = {
    json: 'text',
    css: 'text',
    jpg: 'blob',
    png: 'blob',
    txt: 'text',
    js: 'text',
    html: 'document',
    svg: 'document',
    xml: 'document',
    '': 'text'
  };


  function XHR(options, callback){
    this.sync = false;
    Transport.call(this, options = options || {}, callback);
    this.headers = {};
    if (options.headers) {
      Object.keys(options.headers).forEach(function(n){
        this.headers[n] = options.headers[n];
      }, this);
    }
    this.callback = callback;
  }

  Transport.register(XHR);

  var pathmap = {};
  var verbs = {
    get: true,
    post: true,
    put: true,
    delete: true,
    options: true
  }

  XHR.prototype = {
    __proto__: Transport.prototype,
    constructor: XHR,
    verb: 'get',
    get url(){
      var base = this.base ? [this.base] : [];
      return base.concat(this.path).join('/') + (this.verb === 'get' && this.params ? '?' + this.params : '');
    },
    get ext(){
      if (this.path in pathmap)
        return pathmap[this.path];
      else {
        var offset = this.path.lastIndexOf('.');
        return pathmap[this.path] = ~offset ? this.path.slice(offset + 1) : '';
      }
    },
    auth: function auth(user, pass){
      if (!pass && user.length === 40) {
        this.headers.Authorization = 'token '+user;
      } else {
        this.headers.Authorization = 'Basic '+btoa(user+':'+pass);
      }
    },
    exec: function exec(request){
      var xhr = new XMLHttpRequest;
      var self = this;
      var completed;
      if (request) {
        if (request.toLowerCase() in verbs) {
          var verb = request;
          request = arguments[1];
        }
        if (typeof request === 'string')
          this.path = request;
      }


      function complete(){
        if (xhr.readyState === 4) {
          self.state = 'complete';
          if (xhr.sync)
            xhr.responseType = types[xhr.ext];

          var result = xhr.response
          if (xhr.ext === 'json')
            result = JSON.parse(result);

          if (self.callback)
            self.callback.call(self, result);

          return result;
        }
      }

      xhr.ext = this.ext;
      if (xhr.ext === 'js' || xhr.ext === 'json')
        xhr.overrideMimeType('text/plain');

      xhr.onerror = complete;
      xhr.onload = complete;

      xhr.open(verb || 'GET', this.url, !this.sync);

      if (this.sync)
        xhr.responseType = types[xhr.ext];

      if (this.headers.Authenticate)
        xhr.withCredentials = true;

      Object.keys(this.headers).forEach(function(name){
        xhr.setRequestHeader(name, self.headers[name]);
      });


      if (this.sync) {
        xhr.send(this.data || null);
        return complete();
      }

      xhr.send(this.data ||  null);
      this.state = 'loading';
      return this;
    }
  };

  return XHR;
}();


