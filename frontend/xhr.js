var XHR = function(){

  var extend = meta.utility.O.extend;

  function extension(path){
    var start = path.lastIndexOf('.');
    if (~start)
      return path.slice(start + 1);
    else
      return '';
  }

  function serializeParams(o){
    return Object.keys(o).map(function(key){
      return encodeURIComponent(key) + '=' + encodeURIComponent(o[key]);
    }).join('&');
  }


  function XHR(options){
    if (typeof options === 'string')
      options = { url: options };
    else
      options = extend({}, options);

    extend(this, {
      data: options.data || {},
      base: options.url || '',
      state: 'idle',
      headers: extend({}, options.headers)
    });
  }

  extend(XHR.prototype, [
    function url(path, verb){
      var params = serializeParams(this.data);
      return [this.base].concat(path).join('/') + (verb === 'GET' && params ? '?' + params : '');
    },
    function auth(user, pass){
      if (!pass && user.length === 40) {
        this.headers.Authorization = 'token '+user;
      } else {
        this.headers.Authorization = 'Basic '+btoa(user+':'+pass);
      }
    },
    function createHandler(callback){
      var self = this
      var xhr = new XMLHttpRequest;
      xhr.onerror = xhr.onload = function complete(evt){
        if (xhr.readyState === 4) {
          var response = xhr.responseText;
          xhr.onload = xhr.onerror = null;
          self.state = 'complete';
          if (xhr.ext === 'json')
            response = JSON.parse(response);
          callback.call(self, response, evt);
        }
      }
      return xhr;
    },
    function request(path, verb, callback){
      var xhr = this.createHandler(arguments[arguments.length - 1]);
      verb = typeof verb === 'string' ? verb.toUpperCase() : 'GET';

      xhr.ext = extension(path);
      xhr.open(verb, this.url(path, verb));

      if (this.headers.Authenticate) {
        xhr.withCredentials = true;
      }
      Object.keys(this.headers).forEach(function(key){
        xhr.setRequestHeader(key, this[key]);
      }, this.headers);

      xhr.send(this.data || null);

      this.state = 'loading';
      return this;
    }
  ]);

  return XHR;
}();