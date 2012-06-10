!function(d, tags){

  // ###################
  // ### Boilerplate ###
  // ###################

  var FP = Function.prototype,
      AP = Array.prototype,
      OP = Object.prototype;

  var bindbind = FP.bind.bind(FP.bind),
      callbind = bindbind(FP.call),
      applybind = bindbind(FP.apply),
      bind = callbind(FP.bind),
      call = callbind(FP.call),
      apply = callbind(FP.apply);

  var _push = callbind(AP.push),
      pushall = applybind(AP.push),
      concat = callbind(AP.concat),
      flatten = applybind(AP.concat),
      slice = callbind(AP.slice);

  var has = callbind(OP.hasOwnProperty);

  function isObject(o){
    return o !== null && typeof o === 'object' || typeof o === 'function';
  }

  function each(object, callback, context){
    context = context || object;
    Object.keys(Object(object)).forEach(function(key){
      call(callback, context, object[key], key, object);
    });
  }

  function extend(o){
    var i, k, p, a = arguments;
    for (i in a) if (i) for (k in (p = a[i])) if (has(p, k)) o[k] = p[k];
    return o;
  }

  function partial(f){
    var args = slice(arguments, 1);
    return function(){
      return apply(f, this, flatten(args, arguments));
    }
  }

  function extend(to, from){
    to = Object(to);
    from = Object(from);

    if (Array.isArray(from))
      from.forEach(function(item){
        if (typeof item === 'function' && item.name)
          to[item.name] = item;
      });

    else Object.keys(from).forEach(function(key){
        if (!has(to, key) && typeof from[key] === 'function')
          to[key] = from[key];
      });

    if (arguments.length > 2)
      extend(to, arguments[2]);

    return to;
  }

  function getDescriptor(obj, prop){
    do {
      var desc = Object.getOwnPropertyDescriptor(obj, prop);
      if (desc)
        return desc;
    } while (obj = Object.getPrototypeOf(obj))
  }

  function isArrayish(o){
    if (o == null)
      return false;

    switch (typeof o) {
      case 'boolean':
      case 'number':
      case 'function':
        return false;
      case 'string':
        return true;
      default:
        return Array.isArray(o) || AP.isPrototypeOf(o) || has(o, 'length');
    }
  }

  ['HTML', 'SVG'].forEach(function(type){
    each(tags[type], function(iface, tag){
      iface = type+iface+'Element';
      if (iface in window)
        tags[type][tag] = window[iface];
      else
        delete tags[type][tag];
    });
  });




  function rewire(Super){
    return function(Ctor){
      Ctor.prototype.__proto__ = Super.prototype;
    }
  }

  [NodeList, CSSRuleList, DOMTokenList, CSSStyleDeclaration].map(rewire(Array));




  var select = bind(d.querySelector, d),
      selectAll = bind(d.querySelectorAll, d),
      create = bind(d.createElement, d),
      symbols = { '#': 'id', '.': 'className', '|': 'textContent' };

  function collection(s){
    if (typeof s === 'string')
      return selectAll(s);
    else if (s instanceof NodeList || s instanceof Wrapper)
      return s;
    else if (s instanceof Node)
      return [s];
    else
      return [];
  }

  function single(s){
    if (typeof s === 'string')
      return select(s);
    else if (s instanceof NodeList || s instanceof Wrapper)
      return s[0];
    else if (s instanceof Node)
      return s;
  }
  var HashMap = function(){
    var hashmaps = new WeakMap;

    function HashMap(){
      hashmaps.set(this, Object.create(null));
    }

    HashMap.prototype = {
      constructor: HashMap,
      has: function has(key){
        return key in hashmaps.get(this);
      },
      get: function get(key){
        return hashmaps.get(this)[key];
      },
      set: function set(key, value){
        return hashmaps.get(this)[key] = value;
      },
      delete: function delete_(key){
        var ret = this.has(key);
        if (ret)
          delete hashmaps.get(this)[key];
        return ret;
      }
    };

    return HashMap;
  }();

  function createStorage(){
    var ostore = new WeakMap
    var pstore = new HashMap;
    return function storage(o){
      var store = isObject(o) ? ostore : pstore;
      var data = store.get(o);
      if (!data)
        store.set(o, data = Object.create(null));
      return data;
    }
  }

  var storage = createStorage();

  var extendEventTarget = function(){
    function resolveEvents(events){
      if (typeof events === 'string')
        return events.split(' ');
      else if (Array.isArray(events))
        return events;
      else
        return [];
    }

    function on(events, listener){
      resolveEvents(events).forEach(function(event){
        this.addEventListener(event, listener);
      }, this);
    }

    function off(events, listener){
      resolveEvents(events).forEach(function(event){
        this.removeEventListener(event, listener);
      }, this);
    }

    function once(events, listener){
      function one(){
        offAll();
        listener.apply(this, arguments);
      }
      var offAll = off.bind(this, events, one);
      this.on(events, one);
    }

    var loggers = new WeakMap;

    function log(events){
      if (loggers.has(this)) {
        var logger = loggers.get(this);
        this.off(logger.events, logger);
      } else {
        var logger = function logger(evt){
          console.log(evt.type, evt);
        }
        loggers.set(this, logger);
      }
      logger.events = resolveEvents(events);
      this.on(logger.events, logger);
    }

    return function extendEventTarget(Ctor){
      extend(Ctor.prototype, [on, off, once, log]);
    }
  }();

  extendEventTarget(WebSocket);
  extendEventTarget(Node);


  // ###################
  // ### Entry Point ###
  // ###################

  var Wrapper = function _(tag, attrs, parent){
    if (typeof attrs === 'string')
      parent = attrs, attrs = {};
    else if (!attrs)
      attrs = {};

    if (tag instanceof NodeList || tag instanceof Element || tag instanceof Wrapper)
      this.push(tag);
    else if (typeof tag === 'string') {
      tag = tag.match(/(\w*)([.#|]?)(.*)/);
      if (tag[1]) {
        if (tag[1] === 'body' || tag[1] === 'head' || tag[1] === 'html')
          this.push(select(tag[0]));
        else {
          this.push(create(tag[1]));
          if (tag[2] in symbols)
            attrs[symbols[tag[2]]] = tag[3];
        }
      } else
        this.push(selectAll(tag[0]));
    }

    this.attr(attrs);

    if (parent)
      this.appendTo(parent);
  }

  Wrapper.prototype = {
    length: 0,
    constructor: Wrapper,
    forEach: function forEach(callback, context){
      context = context || this;
      for (var i=0; i < this.length; i++)
        callback.call(context, this[i], i, this);
      return this;
    },
    map: Array.prototype.map,
    attr: function attr(key, value){
      if (typeof key === 'string') {
        this.forEach(function(el){
          //el.setAttribute(key, value);
          //if (!has(el, key))
            el[key] = value;
        });
      } else if (isObject(key)) {
        each(key, function(value, key){
          this.attr(key, value);
        }, this);
      }
      return this;
    },
    push: function push(){
      var arg, i;
      for (i in arguments) {
        arg = arguments[i];
        if (!arg.length)
          _push(this, arg);
        else if (arg.length === 1)
          _push(this, arg[0]);
        else
          pushall(this, arg);
      }
      return this;
    },
    pop: Array.prototype.pop,
    appendTo: function appendTo(parent){
      parent = single(parent);
      this.forEach(function(el){
        parent.appendChild(el);
      });
      return this;
    },
    prependTo: function prependTo(parent){
      parent = single(parent);
      this.forEach(function(el){
        if (parent.firstChild)
          parent.insertBefore(el, parent.firstChild);
        else
          parent.appendChild(el);
      });
      return this;
    },
    append: function append(){
      if (this.length) {
        var self = this[0];
        each(arguments, function(val, key){
          collection(val).forEach(function(el){
            self.appendChild(el);
          });
        });
      }
      return this;
    },
    prepend: function prepend(){
      if (this.length) {
        var self = this[0];
        each(arguments, function(val, key){
          collection(val).forEach(function(el){
            self.insertBefore(el, self.firstChild);
          });
        });
      }
      return this;
    },
    detach: function detach(){
      this.forEach(function(el, i){
        if (el.parentNode)
          el.parentNode.removeChild(el);
      }, this);
      return this;
    },
    remove: function remove(){
      this.forEach(function(el, i){
        if (el.parentNode)
          el.parentNode.removeChild(el);
        this[i] = undefined;
      }, this);
      return this;
    },
    css: function css(rule){
      if (!rule) {
        var store = storage(this[0]);
        if (!store.rules)
          store.rules = {};
        return Object.keys(store.rules).map(function(key){
          return store.rules[key];
        });
      }
      if (!(rule instanceof Sheet.Rule))
        rule = createRule(rule);

      this.forEach(function(el){
        var store = storage(el);
        if (!store.rules)
          store.rules = {};

        store.rules[rule.selector] = rule;
        el.classList.add(rule.selector.slice(1));
      });

      return this;
    },
    on: function on(events, listener){
      this.forEach(function(el){
        el.on(events, listener)
      });
      return this;
    },
    once: function once(events, listener){
      this.forEach(function(el){
        el.onnce(events, listener);
      });
      return this;
    },
    off: function off(events, listener){
      this.forEach(function(el){
        el.off(events, listener);
      });
      return this;
    },
    delay: function delay(time){
      var out = Object.create(delayed);
      out.target = this;
      out.delay = time;
      return out;
    },
    select: function select(){
      document.createRange().selectNodeContents(this[0]);
      return this;
    },
    observe: function observe(obj, prop, callback){
      var desc = getDescriptor(obj, prop) || { enumerable: true,
                                               configurable: true,
                                               writable: true,
                                               value: undefined }
      if (desc.configurable) {
        var self = this;
        var newdesc = { enumerable: desc.enumerable, configurable: true };
        if ('get' in desc || 'set' in desc) {
          newdesc.set = function set(v){
            desc.set.call(this, v);
            var old = desc.value;
            desc.value = desc.get.call(this);
            callback.call(self, desc.value, old, prop, this);
          };

          newdesc.get = function get(){
            return desc.value = desc.get.call(this);
          };
        } else if ('value' in desc) {
          newdesc.set = function set(v){
            var old = desc.value;
            desc.value = v;
            callback.call(self, v, old, prop, this);
          };

          newdesc.get = function get(){
            return desc.value;
          };
        }
        Object.defineProperty(obj, prop, newdesc);
      }

      return this;
    },

    get content(){
      switch (this.length) {
        case 0: return '';
        case 1: return this[0].nodeName === 'INPUT' ? this[0].value : this[0].textContent;
        default:
          return this.map(function(item){
            return item.nodeName === 'INPUT' ? item.value : item.textContent;
          });
      }
    },
    set content(v){
      var property = this[0].nodeName === 'INPUT' ? 'value' : 'textContent';
      switch (this.length) {
        case 0: return;
        case 1: return this[0][property] = String(v);
        default:
          if (isArrayish(v)) {
            var len = v.length;
            this.forEach(function(item, index){
              item.textContent = String(v[index % len]);
            });
          } else {
            v = String(v);
            this.forEach(function(item){
              item[item.nodeName === 'INPUT' ? 'value' : 'textContent'] = v;
            });
          }
      }
    }
  };

  ['add', 'remove', 'toggle'].forEach(function(action){
    Wrapper.prototype[action+'Class'] = function(name){
      this.forEach(function(el){
        if (el.classList)
          el.classList[action](name);
      });
      return this;
    };
  });

  var delayed = Object.create(Wrapper.prototype);

  Object.keys(Wrapper.prototype).forEach(function(key){
    if (typeof delayed[key] === 'function') {
      delayed[key] = function(){
        var args = arguments;
        var self = this.target;
        setTimeout(function(){
          Wrapper.prototype[key].apply(self, args);
        }, this.delay);
        return this;
      }
    }
  });

  delayed.resume = function(){
    return this.target;
  };


  function _(a, b, c){
    return new Wrapper(a, b, c);
  }



  // #############
  // ### CSSOM ###
  // #############

  var Sheet = function(sheet){
    var prefix = function(props, computed){
      var vendorPrefix = '';
      var skip = ['length', 'cssText', 'parentRule'];
      function dasherize(s){
        return s.replace(/[A-Z]/g, function(a){ return '-' + a.toLowerCase() });
      }

      function camelize(s){
        return s.replace(/-(\w)/g, function(a,b){ return b.toUpperCase() });
      }
      for (var k in computed) {
        if (isNaN(k) && typeof computed[k] !== 'function' && !~skip.indexOf(k)) {
          var translated = k.replace(/^(?:ms|[mM]oz|webkit|O)(\w)/, function(a,b){ return b.toLowerCase() });
          props[0][translated] = k;
          props[1][k] = translated;
          if (!vendorPrefix) {
            k = k.replace(/^[a-z]|[A-Z]/g, function(a){ return '-' + a.toLowerCase() });
            if (computed.getPropertyValue(k))
              vendorPrefix = k.match(/^(-\w+-)/)[0];
          }
        }
      }
      return {
        vendor: vendorPrefix,
        denormalize: function denormalize(s){
          return props[0][s] || s;
        },
        normalize: function normalize(s){
          return props[1][s] || s;
        },
        camelize: camelize,
        dasherize: dasherize
      };
    }([{},{}], getComputedStyle(d.body));

    var rules = [];

    function Rule(sheet, selector, props){
      var index = sheet.cssRules.length;
      sheet.insertRule(selector+'{}', index);
      this.id = rules.push(sheet.cssRules[index]) - 1;
      this.selector = selector;
      this.set(props);
      this.rule = rules[this.id];
    }

    Rule.prototype = {
      get selector(){
        return rules[this.id].selectorText;
      },
      set selector(v){
        rules[this.id].selectorText = v;
      },
      set: function set(prop, value){
        var rule = rules[this.id];
        if (isObject(prop)) {
          each(prop, function(value, prop){
            rule.style[prefix.denormalize(prop)] = String(value).replace(/\$/g, prefix.vendor);
          });
        } else
          rule.style[prefix.denormalize(prop)] = String(value).replace(/\$/g, prefix.vendor);

      },
      get: function get(prop){
        var rule = rules[this.id];
        if (Array.isArray(prop)) {
          var ret = {};
          prop.forEach(function(prop){
            ret[prop] = rule.style[prefix.denormalize(prop)];
          });
          return ret;
        } else
          return rule.style[prefix.denormalize(prop)];
      },
      list: function list(){
        var rule = rules[this.id];
        var out = {};
        rule.style.forEach(function(prop){
          out[prefix.camelize(prop)] = rule.get
        });
      },
      apply: function apply(to){
        if (!(to instanceof Wrapper))
          to = _(to);
        to.addClass(this.selector);
      }
    };

    var sheets = [];

    function Sheet(){
      this.id = sheets.length;
      sheets.push(_('style', 'head')[0]);
    }

    Sheet.Rule = Rule;

    Sheet.prototype = {
      constructor: Sheet,
      insert: function insert(selector, props){
        if (typeof selector !== 'string') {
          each(selector, function(rules, selector){
            this.insert(selector, rules);
          }, this);
          return this;
        }
        return this[selector] = new Rule(sheets[this.id].sheet, selector, props);
      }
    };

    return Sheet;
  }();


  sheet = new Sheet;

  function createRule(selector, rule){
    if (!rule) {
      rule = selector;
      selector = '._'+Math.random().toString(36).slice(2);
    }
    return sheet.insert(selector, rule);
  }

  _.rule = createRule;

  window._ = _;

}(document, {
  HTML:
   { a: 'Anchor',
     abbr: '',
     address: '',
     area: 'Area',
     article: '',
     aside: '',
     audio: 'Audio',
     b: '',
     base: 'Base',
     bdi: '',
     bdo: '',
     blockquote: 'Quote',
     body: 'Body',
     br: 'BR',
     button: 'Button',
     canvas: 'Canvas',
     caption: 'TableCaption',
     cite: '',
     code: '',
     col: 'TableCol',
     colgroup: 'TableCol',
     command: 'Command',
     dd: '',
     del: 'Mod',
     details: 'Details',
     dfn: '',
     div: 'Div',
     dl: 'DList',
     dt: '',
     em: '',
     embed: 'Embed',
     fieldset: 'FieldSet',
     figcaption: '',
     figure: '',
     footer: '',
     form: 'Form',
     head: 'Head',
     h1: 'Heading',
     h2: 'Heading',
     h3: 'Heading',
     h4: 'Heading',
     h5: 'Heading',
     h6: 'Heading',
     header: '',
     hgroup: '',
     hr: 'HR',
     html: 'Html',
     i: '',
     iframe: 'IFrame',
     img: 'Image',
     input: 'Input',
     ins: 'Mod',
     kbd: '',
     keygen: 'Keygen',
     label: 'Label',
     legend: 'Legend',
     li: 'LI',
     link: 'Link',
     map: 'Map',
     mark: '',
     menu: 'Menu',
     meta: 'Meta',
     meter: 'Meter',
     nav: '',
     noscript: '',
     object: 'Object',
     ol: 'OList',
     optgroup: 'OptGroup',
     option: 'Option',
     output: 'Output',
     p: 'Paragraph',
     param: 'Param',
     pre: 'Pre',
     progress: 'Progress',
     q: 'Quote',
     rp: '',
     rt: '',
     ruby: '',
     s: '',
     samp: '',
     script: 'Script',
     section: '',
     select: 'Select',
     small: '',
     source: 'Source',
     span: 'Span',
     strong: '',
     style: 'Style',
     sub: '',
     summary: '',
     sup: '',
     table: 'Table',
     tbody: 'TableSection',
     td: 'TableDataCell',
     textarea: 'TextArea',
     tfoot: 'TableSection',
     th: 'TableHeaderCell',
     thead: 'TableSection',
     time: 'Time',
     title: 'Title',
     tr: 'TableRow',
     track: 'Track',
     u: '',
     ul: 'UList',
     var: '',
     video: 'Video',
     wbr: '' },
  SVG:
   { a: 'A',
     altGlyph: 'AltGlyph',
     altGlyphDef: 'AltGlyphDef',
     altGlyphItem: 'AltGlyphItem',
     animate: 'Animate',
     animateColor: 'AnimateColor',
     animateMotion: 'AnimateMotion',
     animateTransform: 'AnimateTransform',
     set: 'Set',
     circle: 'Circle',
     path: 'Path',
     'color-profile': 'ColorProfile',
     cursor: 'Cursor',
     defs: 'Defs',
     desc: 'Desc',
     ellipse: 'Ellipse',
     filter: 'Filter',
     feBlend: 'FEBlend',
     feColorMatrix: 'FEColorMatrix',
     feComponentTransfer: 'FEComponentTransfer',
     feComposite: 'FEComposite',
     feConvolveMatrix: 'FEConvolveMatrix',
     feDiffuseLighting: 'FEDiffuseLighting',
     feDisplacementMap: 'FEDisplacementMap',
     feDistantLight: 'FEDistantLight',
     feFlood: 'FEFlood',
     feGaussianBlur: 'FEGaussianBlur',
     feImage: 'FEImage',
     feMerge: 'FEMerge',
     feMergeNode: 'FEMergeNode',
     feMorphology: 'FEMorphology',
     feOffset: 'FEOffset',
     fePointLight: 'FEPointLight',
     feSpecularLighting: 'FESpecularLighting',
     feSpotLight: 'FESpotLight',
     feTile: 'FETile',
     feTurbulence: 'FETurbulence',
     feFuncR: 'FEFuncR',
     feFuncG: 'FEFuncG',
     feFuncB: 'FEFuncB',
     feFuncA: 'FEFuncA',
     font: 'Font',
     'font-face': 'FontFace',
     'font-face-format': 'FontFaceFormat',
     'font-face-name': 'FontFaceName',
     'font-face-src': 'FontFaceSrc',
     'font-face-uri': 'FontFaceUri',
     foreignObject: 'ForeignObject',
     g: 'G',
     glyph: 'Glyph',
     glyphRef: 'GlyphRef',
     linearGradient: 'LinearGradient',
     radialGradient: 'RadialGradient',
     hkern: 'HKern',
     image: 'Image',
     line: 'Line',
     marker: 'Marker',
     mask: 'Mask',
     metadata: 'Metadata',
     'missing-glyph': 'MissingGlyph',
     mpath: 'MPath',
     pattern: 'Pattern',
     polyline: 'Polyline',
     polygon: 'Polygon',
     rect: 'Rect',
     script: 'Script',
     stop: 'Stop',
     style: 'Style',
     svg: 'SVG',
     switch: 'Switch',
     symbol: 'Symbol',
     text: 'Text',
     textPath: 'TextPath',
     title: 'Title',
     tref: 'TRef',
     tspan: 'TSpan',
     use: 'Use',
     view: 'View',
     vkern: 'VKern' } });
