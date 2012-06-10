var url = require('url');
var http = require('http');
var fs = require('fs');
var path = require('path');


var mkdirp = require('mkdirp');


var cache = '../frontend/packages.json';
var DAY = 1000 * 60 * 60 * 24;


var getRepo = function(){
  var github = new (require('github'))({ version: '3.0.0' });
  github.authenticate({
    type: 'oauth',
    token: 'e243a6a733de08c8dfd37e86abd7d2a3b82784de'
  });

  return function getRepo(user, repo, callback){
    github.repos.get({ user: user, repo: repo }, callback);
  }
}();


function writeJSON(file, obj, pretty){
  var json = pretty ? JSON.stringify(obj, false, '\t') : JSON.stringify(obj);
  fs.writeFileSync(file, json);
}


function updatePackages(callback){
  download('http://www.cdnjs.com/packages.json', function(result){
    var packages = JSON.parse(result).packages;
    writeJSON(cache, packages, true);
    callback(packages);
  });
}


function download(uri, callback){
  http.get(url.parse(uri), function(res){
    var string = '';
    res.on('data', function(c){ string += c; });
    res.on('end', function(){ callback(string) });
  });
}

function loadPackages(callback){
  function inflate(packages){
    var i = 0;
    function done(finalize){
      if (!--i) {
        if (finalize)
          callback(packages);
        else
          process.nextTick(done.bind(null, true));
      }
    }
    packages = packages.map(function(pkg){
      i++;
      pkg = new JSPackage(pkg);
      pkg.checkGithub(done);
      return pkg;
    });
  }
  if (!fs.existsSync(cache) || Date.now() - fs.statSync(cache).mtime > DAY) {
    updatePackages(inflate)
  } else {
    setTimeout(function(){ inflate(json) }, 1);
    var json = JSON.parse(fs.readFileSync(cache, 'utf8'));
  }
}


function JSPackage(json){
  for (var k in json)
    this[k] = json[k];
  if (this.repositories && this.repositories.length === 1) {
    this.repository = this.repositories[0];
    delete this.repositories;
  }
  if (this.repository && this.repository.type === 'git') {
    this.repository = this.repository.url;
  }
}

JSPackage.prototype = {
  constructor: JSPackage,

  downloadUrl: function downloadUrl(){
    return 'http://cdnjs.cloudflare.com/ajax/libs/' + this.name + '/' + this.version + '/' + this.filename;
  },
  hasGithub: function hasGithub(){
    if (this.github)
      return true;
    if (typeof this.repository === 'string') {
      var match = this.repository.match(/github\.com\/([\w-.]+)\/([\w-.]+)\/?(?:\.git)*$/);
      if (match) {
        match[2] = match[2].replace(/\.git$/, '');
        this.github = {
          user: match[1],
          repo: match[2],
          url: 'https://github.com/'+match[1]+'/'+match[2],
          clone: 'git://github.com/'+match[1]+'/'+match[2]+'.git'
        };
        return true;
      }
    }
    return false;
  },
  checkGithub: function checkGithub(callback){
    if (this.hasGithub()) {
      var self = this;
      getRepo(this.github.user, this.github.repo, function(err, result){
        self.github = result;
        if (callback)
          callback(self.github);
      });
    } else {
      process.nextTick(callback);
    }
  }
};

function writeStats(){
  loadPackages(function(o){
    fs.writeFileSync('./stats.json', JSON.stringify(o, false, '\t'));
    console.log(o);
  });
}


var libdir = path.resolve('../frontend/cdnjs');


function downloadLib(pkg){
  var localPath = path.resolve(libdir, pkg.name, pkg.version);
  var remotePath = ['http://cdnjs.cloudflare.com/ajax/libs', pkg.name, pkg.version, pkg.filename];
  mkdirp.sync(localPath);
  localPath += '/' + pkg.filename
  download(remotePath.join('/'), function(contents){
    fs.writeFileSync(localPath, contents);
  });
  remotePath[0] = 'cdnjs';
  return remotePath.join('/');
}


var githubprops = ['git_url', 'html_url', 'watchers', 'forks', 'open_issues', 'pushed_at', 'homepage', 'size'];
var props = ['name', 'filename', 'description', 'keywords', 'homepage', 'repository', 'watchers', 'forks', 'open_issues', 'pushed_at'];

function finalProcess(){
  var stats = require('./stats').map(function(pkg){
    pkg.filename = downloadLib(pkg);
    if (pkg.github) {
      props.forEach(function(prop){
        if (pkg.github[prop] !== undefined)
          pkg[prop] = pkg.github[prop]
      });
      delete pkg.github;
    }
    pkg.homepage = pkg.homepage || pkg.html_url || pkg.repository;

    return !pkg.watchers ? null : props.reduce(function(r,s){
      if (pkg[s])
        r[s] = pkg[s];
      return r;
    }, {});
  }).filter(Boolean);

  writeJSON('../frontend/libs.json', stats, true);

  console.log(stats);
}


finalProcess();
