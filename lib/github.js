!function(global, exports){
  "use strict";

  // ###########################
  // ### Helpers and globals ###
  // ###########################

  var has = Function.call.bind({}.hasOwnProperty),
      slice = Function.call.bind([].slice),
      token = 'Δ',
      tokenRegex = new RegExp(token, 'g'),
      toNativeString = function toString(){ return 'function toString(){ [native code] }' };

  toNativeString.toString = toNativeString;

  function isObject(o){
    return Object(o) === o;
  }

  function isIndexed(o){
    return Array.isArray(o) || isObject(o) && has(o, 'length') && has(o, o.length - 1);
  }

  function noToken(s){
    return s.replace(tokenRegex,'')
  }

  function hasToken(s){
    return s[0] === token;
  }


  // ########################################
  // ### Routes for Github V3 API in full ###
  // ########################################

  var githubRoutes = function(){
    var PAGE = [ 'page', 'per_page' ];
    var TYPEPAGE = ['type'].concat(PAGE);
    var ANONPAGE = { GET: ['anon'].concat(PAGE) };
    var GET = { GET: [] };
    var GETDELETE = { GET: [], DELETE: [] };
    var GETDELETEPUT = { GET: [], DELETE: [], POST: [] };
    var GETPAGEDELETEPUT = { GET: PAGE, DELETE: [], POST: [] };
    var GETDELETEPATCH = { GET: [], DELETE: [], PATCH: [ 'body' ] };
    var GETPAGE = { GET: PAGE };
    var TITLEKEY = [ 'title', 'key' ];
    var ISSUES = [ 'title', 'body', 'assignee', 'milestone', 'labels' ];
    var MILESTONE = [ 'title', 'state', 'description', 'due_on' ]
    var REPOS = [ 'name', 'description', 'homepage', 'private', 'has_issues', 'has_wiki', 'has_downloads' ]

    return {
      gists: {
        SLICE: 1, POST: [ 'description', 'public', 'files' ],
        GET: PAGE, public: GET, starred: GET,
        Δid: {
          GET: [],
          PATCH: [ 'description', 'files' ],
          star: GETDELETEPUT,
          fork: { POST: [] },
          comments: {
            GET: [],
            POST: ['input'],
            Δid: GETDELETEPATCH
          }
        }
      },
      teams: {
        SLICE: 2,
        Δid: {
          GET: [], DELETE: [], PATCH: [ 'name', 'permission' ],
          members: { GET: PAGE, Δuser: GETDELETEPUT },
          repos: { GET: PAGE, Δuser: { Δrepo: GETDELETEPUT } }
        }
      },
      orgs: {
        SLICE: 2,
        Δorg: {
          GET: PAGE,
          PATCH: [ 'billing_email', 'company', 'email', 'location', 'name' ],
          members: { GET: PAGE, Δuser: GETDELETE },
          public_members: { GET: [], Δuser: GETDELETEPUT },
          teams: { GET: [], POST: [ 'name', 'repo_names', 'permission' ] },
          repos: { GET: TYPEPAGE, POST: REPOS.concat('team_id'), Δsha: GET }
        }
      },
      repos: {
        SLICE: 3,
        Δuser: {
          Δrepo: {
            GET: [], GET2: PAGE, PATCH: REPOS, contributors: ANONPAGE, languages: ANONPAGE, teams: GETPAGE,
            tags: { GET: PAGE, Δsha: { POST: [ 'tag', 'message', 'object', 'type', 'tagger.name', 'tagger.email', 'tagger.date' ] } },
            git: {
              refs: { POST: [ 'refs', 'sha' ], GET: PAGE, Δref: { GET: [], PATCH: [ 'sha', 'force' ] } },
              commits: { POST: [ 'message', 'tree', 'parents', 'author', 'committer' ], Δsha: GET },
              blobs: { POST: [ 'content', 'encoding' ], Δsha: GETPAGE }
            },
            branches: GETPAGE,
            events: GETPAGE,
            issues: {
              GET: [ 'milestone', 'state', 'assignee', 'mentioned', 'labels', 'sort', 'direction', 'since', 'page', 'per_page' ],
              POST: ISSUES,
              events: { GET: PAGE, GET2: [], Δid: {} },
              Δnumber: { GET: [], PATCH: ISSUES, comments: { GET: PAGE, POST: [ 'body' ] }, events: GETPAGE  },
              comments: { Δid: GETDELETEPATCH },
            },
            pulls: {
              GET: [ 'state', 'page', 'per_page' ],
              POST: [ 'title', 'body', 'base', 'head' ],
              POST2: [ 'issue', 'base', 'head' ],
              Δnumber: {
                GET: [],
                PATCH: [ 'state', 'title', 'body' ],
                merge: { GET: PAGE, POST: [ 'commit_message' ] },
                files: GETPAGE,
                commits: GETPAGE,
                comments: {
                  POST: [ 'body', 'in_reply_to' ],
                  POST2: [ 'body', 'commit_id', 'path', 'position' ],
                  GET: PAGE,
                }
              },
              comments: { Δnumber: GETDELETEPATCH }
            },
            commits: {
              GET: [ 'sha', 'path', 'page', 'per_page' ],
              Δsha: {
                GET: [],
                comments: { GET: PAGE, POST: [ 'body', 'commit_id', 'line', 'path', 'position' ] }
              },
            },
            comments: { Δid: GETDELETEPATCH },
            compare: { ΔbaseΔhead: { GET: [ 'base', 'head' ] } },
            download: GETPAGE,
            downloads: { Δid: GETDELETE },
            forks: { POST: [ 'org' ], GET: [ 'sort', 'page', 'per_page' ] },
            labels: { GET: [], POST: [ 'name', 'color' ], Δname: { GET: [], POST: [ 'color' ] } },
            keys: { GET: PAGE, POST: TITLEKEY, Δid: { GET: [], DELETE: [], POST: TITLEKEY } },
            watchers: GETPAGE,
            hooks: {
              GET: PAGE, POST: [ 'name', 'config', 'events', 'active' ],
              Δid: {
                GET: [], DELETE: [], PATCH: [ 'name', 'config', 'events', 'add_events', 'remove_events', 'active' ],
                test: { POST: [] }
              }
            },
            milestones: {
              POST: MILESTONE,
              GET: [ 'state', 'sort', 'page', 'per_page' ],
              Δnumber: { DELETE: [], GET: [], PATCH: MILESTONE }
            },
            trees: { POST: [ 'tree' ], Δsha: { GET: [ 'recursive' ] } },
            collaborators: { GET: PAGE, Δcollabuser: GETDELETEPUT }
          },
        }
      },
      authorizations: { SLICE: 0, GET: [] },
      user: {
        SLICE: 1,
        GET: [],
        PATCH: [ 'name', 'email', 'blog', 'company', 'location', 'hireable', 'bio' ],
        gists: GETPAGE,
        emails: GETPAGEDELETEPUT,
        following: { GET: PAGE, Δuser: GETPAGEDELETEPUT },
        watched: { GET: PAGE, Δuser: { Δrepo: GETPAGEDELETEPUT } },
        keys: { GET: PAGE, POST: TITLEKEY, Δid: { GET: [], DELETE: [], PATCH: TITLEKEY } },
        repos: { GET: TYPEPAGE, POST: REPOS }
      },
      users: {
        SLICE: 2,
        Δuser: {
          GET: [], gists: GETPAGE, followers: GETPAGE, following: GETPAGE, orgs: GETPAGE, watched: GETPAGE,
          received_events: GETPAGE, events: GETPAGE, repos: { GET: TYPEPAGE }
        }
      },
      networks: { SLICE: 2, Δuser: { Δrepo: { events: GETPAGE }, events: { orgs: { Δorg: GETPAGE } } } },
      events: { SLICE: 1, GET: PAGE }
    };
  }();


  // ############
  // ### Path ###
  // ############

  // encapsulates logic to make use of REST API Defs

  function Path(a){
    if (isIndexed(a)) {
      this.pushall(a);
    }
  }

  Path.prototype = {
    constructor: Path,
    length: 0,
    join: Array.prototype.join,
    map: Array.prototype.map,
    concat: function concat(){
      var out = new Path(this);
      out.pushall(arguments);
      return out;
    },
    args: function args(){
      return [].filter.call(this, hasToken).map(noToken);
    },
    removeToken: function removeToken(){
      return [].map.call(this, noToken);
    },
    toName: function toName(slice, last){
      var arr = this.removeToken();
      if (last) arr.push(last);
      var out = arr.slice(slice || 1).map(function(s){ return s[0].toUpperCase() + s.slice(1).toLowerCase() });
      if (!out[0]) return '';
      out[0] = out[0].toLowerCase();
      return out.join('').replace(/_(.)/g, function(s){ return s[1].toUpperCase() });
    },
    slice: function slice(){
      return new Path([].slice.apply(this, arguments));
    },
    pushall: function pushall(a){
      return [].push.apply(this, a);
    }
  };


  // #################
  // ### Transport ###
  // #################

  // superclass for XHR and JSONP

  function Transport(options, callback){
    options = options || {};
    if (typeof options === 'string')
      options = { url: options };
    if (typeof callback === 'function')
      options.callback = callback;
    this.data = options.data || {};
    this.base = options.url;
    this.path = options.path || [];
    this.callback = options.callback || function(){};
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
      data.push([this.callbackParam, this.callbackName]);
      return data.map(function(item){
        return encodeURIComponent(item[0]) + "=" + encodeURIComponent(item[1]);
      }).join('&');
    },
  }

  // #######################
  // ### JSONP Transport ###
  // #######################

  function JSONP(options, callback){
    Transport.call(this, options = options || {}, callback);
    this.callbackParam = options.callbackParam || 'callback';
    this.callbackName = options.callbackName || '_'+Math.random().toString(36).slice(2);
  }

  Transport.register(JSONP);

  JSONP.prototype = {
    __proto__: Transport.prototype,
    get url(){
      return [this.base].concat(this.path).join('/') + '?' + this.params;
    },

    send: function send(){
      var script = document.createElement('script');
      var completed;
      var self = this;

      function complete(state, result){
        if (completed) return; else completed = true;
        delete window[self.callbackName];
        document.body.removeChild(script);
        self.state = state;
        self.callback.call(self, result);
      }

      script.src = this.url;
      script.async = script.defer = true;
      script.onerror = complete.bind(this, 'error');
      window[this.callbackName] = complete.bind(this, 'success');

      document.body.appendChild(script);
      this.state = 'loading';
      return this;
    }
  };

  // ################################
  // ### XMLHttpRequest Transport ###
  // ################################

  function XHR(options, callback){
    Transport.call(this, options = options || {}, callback);
    this.headers = {};
    if (options.headers) {
      Object.keys(options.headers).forEach(function(n){
        this.headers[n] = options.headers[n];
      }, this);
    }
  }

  Transport.register(XHR);


  XHR.prototype = {
    __proto__: Transport.prototype,
    constructor: XHR,
    get url(){
      return [this.base].concat(this.path).join('/') + (this.verb === 'get' && this.params ? '?' + this.params : '');
    },
    auth: function auth(user, pass){
      if (!pass && user.length === 40) {
        this.headers.Authorization = 'token '+user;
      } else {
        this.headers.Authorization = 'Basic '+btoa(user+':'+pass);
      }
    },
    send: function send(callback){
      var xhr = new XMLHttpRequest;
      var self = this;
      var completed;

      function complete(data){
        if (xhr.readyState === 4) {
          self.state = 'complete';
          callback.call(self, JSON.parse(xhr.responseText));
        }
      }

      xhr.open(verb || 'GET', this.url);
      if (this.headers.Authenticate) {
        xhr.withCredentials = true;
      }

      Object.keys(this.headers).forEach(function(name){
        xhr.setRequestHeader(name, self.headers[name]);
      });

      xhr.onerror = complete;
      xhr.onload = complete;

      xhr.send(this.data ||  null);
      this.state = 'loading';
      return this;
    }
  };




  function HTTP(options, callback){
    Transport.call(this, options = options || {}, callback);
    this.headers = {};
    if (options.headers) {
      Object.keys(options.headers).forEach(function(n){
        this.headers[n] = options.headers[n];
      }, this);
    }
  }

  Transport.register(HTTP);

  HTTP.prototype = {
    __proto__: Transport.prototype,
    constructor: HTTP,
    get url(){
      return [this.base].concat(this.path).join('/') + (this.verb === 'get' && this.params ? '?' + this.params : '');
    },
    auth: function auth(token){
      this.headers.Authorization = 'token '+token;
    },
    send: function send(verb){
      var self = this;
      this.state = 'loading';
      require('https').get(require('url').parse(this.url), function(res){
        var string = '';
        res.on('data', function(c){ string += c });
        res.on('end', function(){ self.callback && self.callback(string) });
      });
      return this;
    }
  };


  function makeCtor(args, api){
    var Ctor = function(){
      var self = this instanceof Ctor ? this : Object.create(Ctor.prototype);
      return api.request(arguments, args, self);
    }

    Object.defineProperties(Ctor, {
      args: {
        enumerable: true,
        value: Object.freeze(args)
      },
      toString: {
        value: function(){ return '[ '+this.args.join(', ')+' ]' }
      }
    });
    Ctor.toString.toString = toNativeString;
    return Ctor;
  }

  // #################
  // ### APIClient ###
  // #################

  // generalized REST API handler that turns routes into functions

  function APIClient(routes, onlyGetters){
    var self = this;

    var slices = {};

    function recurse(o,path){
      Object.keys(o).forEach(function(k){
        if (k === 'SLICE') {
          slices[path[0]] = o[k];
        } else if (k.toUpperCase() === k) {
          if (onlyGetters) {
            if (k !== 'GET') return;
            var name = path.toName(slices[path[0]]);
          } else {
            var name = path.toName(slices[path[0]], k);
          }

          if (name) {
            var target = self[path[0]] || (self[path[0]] = {});
          } else {
            name = path[0];
            var target = self;
          }

          target[name] = makeCtor(path.args().concat(o[k]), self);

          Object.defineProperty(target[name].prototype, 'path', {
            get: function(){
              return path.map(function(s){
                return hasToken(s) ? this[s.slice(1)] : s;
              }, this).join('/');
            }
          });

        } else if (isObject(o[k])) {
          recurse(o[k], path.concat(k));
        }
      });
    }

    recurse(routes, new Path);
  };

  APIClient.prototype = {
    constructor: APIClient,
    request: function request(args, fields, req){
      args = [].slice.call(args);
      if (typeof args[args.length-1] === 'function') {
        var callback = args.pop();
      }
      fields.forEach(function(p,i){
        if (typeof args[i] !== 'undefined') {
          req[p] = args[i];
        }
      });
      var transport = Object.create(this.transport);
      transport.path = req.path;
      transport.data = req;
      transport.send(callback || this.callback);
      return transport;
    },
    setTransport: function setTransport(type, base, dispatcher){
      Object.defineProperty(this, 'transport', {
        value: Transport.create(type, base, dispatcher),
        configurable: true,
        writable: true
      });
    }
  };


  // ######################
  // ### GithubV2Client ###
  // ######################

  // handles searches on Github until their new API does

  function GithubV2Client(v3client){
    this.v3client = v3client;

    function findRefs(obj){
      Object.keys(obj).forEach(function(key){
        if (isObject(obj[key])) return findRefs2(obj[key]);
      });
      if (isObject(obj)) {
        if (obj.type === 'repo') {
          var owner = obj.owner;
          var org = obj.organization;
          var name = obj.name;
          obj.getOwner = function(cb){ return v3client.users(owner, cb) }
          obj.getOrg = function(cb){ return v3client.orgs(org, cb) }
          obj.getRepo = function(cb){ return v3client.repos(owner, name) }
        } else if (obj.type === 'user'){
          obj.getUser = function(cb){ return v3client.users(obj.username, cb) }
          obj.getRepos = function(cb){ return v3client.users.repos(obj.username, cb) }
        }
      }
    }

    this.setTransport('jsonp', 'http://github.com/api/v2/json', function(result){
      if (result) {
        v3client.lastResult = result = result.users || result.repositories;
        findRefs(result);
      }
      if (v3client.callback) {
        v3client.callback.call(v3client, result);
      }
    });

    var search = { search: { Δquery: { GET: [] } } };
    APIClient.call(this, { user: search, repos: search }, true);
  }

  GithubV2Client.prototype = Object.create(APIClient.prototype);
  GithubV2Client.prototype.constructor = GithubV2Client;

  Object.defineProperty(GithubV2Client.prototype, 'callback', {
    get: function(){ return this.v3client.callback },
    set: function(v){ this.v3client.callback = v }
  });




  // ######################
  // ### GithubV3Client ###
  // ######################

  // APIClient subclass with routes and utilities for Github

  function GithubV3Client(user, password, transport){
    var self = this;

    Object.defineProperties(this, {
      limit: { writable: true, configurable: true, value: null },
      remaining: { writable: true, configurable: true, value: null }
    });


    function findRefs(obj){
      Object(obj) === obj && Object.keys(obj).forEach(function(key){
        if (isObject(obj[key])) return findRefs(obj[key]);
        if (key !== 'url') return;

        var val = obj[key].slice(23).split('/');
        var fn = self[val[0]];
        if (!fn) return;
        if (fn[val[1]]) {
          fn = fn[val[1]];
          val = val.slice(2);
        } else {
          val = val.slice(1);
        }

        obj.resolve = function(cb){
          if (typeof cb === 'function') val.push(cb);
          return fn.apply(null, val);
        }.bind(null)
      });
    }

    this.setTransport(transport || 'xhr', 'https://api.github.com', function(result){
      if (result) {
        findRefs(result);
        self.lastResult = result;
      }
      if (self.callback) {
        self.callback.call(self, result);
      }
    });

    this.transport.headers.Accept = 'application/vnd.github.full+json';
    if (user) {
      this.transport.auth(user, password);
    }

    APIClient.call(this, githubRoutes, true);

    var searchClient = new GithubV2Client(this);

    this.users.search = function(){
      return searchClient.user.searchQuery.apply(searchClient.user, arguments);
    }
    this.repos.search = function(){
      return searchClient.repos.searchQuery.apply(searchClient.repos, arguments);
    }
  }

  GithubV3Client.create = function(user, pass){
    return new GithubV3Client(user, pass);
  }

  GithubV3Client.prototype = Object.create(APIClient.prototype);
  GithubV3Client.prototype.constructor = GithubV3Client;

  exports.createClient = function createClient(useOrToken, password, transport){
    return new GithubV3Client(useOrToken, password, transport || typeof XMLHttpRequest !== 'undefined' ? 'xhr' : 'http');
  }

}(new Function('return this')(), typeof exports === 'undefined' ? this : exports);