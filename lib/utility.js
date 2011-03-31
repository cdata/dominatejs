/*
 * DJSUtil
 *
 * Contains helpers and cross-browser wrappers to aide in other DJS functions
 */

    var DJSUtil = {
        options: {},
        inlineHandlers: []
    };

    DJSUtil.setup = function() {
        
        var self = this;

        if(DJS.length) {
            for(var i = 0; i < DJS.length; i++) {

                self.sortItem(DJS[i]);
            }
        }

        self.fixWindow();
    };

    DJSUtil.fixWindow = function() {

        var self = this;

        DJS = {
            push: function(value) {

                self.sortItem(value);
            }
        };

        if(window.__CF && window.__CF.DJS) {
            
            window.__CF.DJS = DJS;
        } 
        
        if(window.DJS) {

            window.DJS = DJS;
        }

    };

/*
 * DJSUtil.sortItem
 *
 * Process DJS.push() arguments
 */
    DJSUtil.sortItem = function(item) {
                    
        var self = this;

        switch(typeof item) {

            case "function":

                self.inlineHandlers.push(item);
                
                break;
            case "object":
                
                for(var option in item) {

                    if(item.hasOwnProperty(option)) {

                        self.options[option] = item[option];
                    }
                }

                break;
            default:
                break;
        }
    };

/*
 * DJSUtil.epoch
 *
 * Marking the DominateJS epoch
 */
    DJSUtil.epoch = (new Date()).getTime();

/*
 * DJSUtil.log
 *
 * Attempt to write output to the console using an externally defined 
 * console.log
 */
    DJSUtil.log = function(out) {

        if(DJSUtil.options.verbose) {

            try {

                console.log('[ DJS ] ' + out);
            } catch(e) {}
        }
    };

/*
 * DJSUtil.error
 *
 * Attempt to write output to the console using an externally defined
 * console.error. Falls back to console.log.
 */
    DJSUtil.error = function(out) {

        if(DJSUtil.options.verbose) {

            try {

                console.error('[ DJS ] ' + out);
            } catch(e) {

                DJSUtil.log('[ DJS ] ' + out);
            }
        }
    };

/*
 * DJSUtil.inspect
 *
 * Attempt to inspect an object in the console using an externally defined 
 * console.inspect
 */
    DJSUtil.inspect = function(object) {

        if(DJSUtil.options.verbose) {

            try {

                console.info(object);
            } catch(e) {
                
                DJSUtil.log(object);
            }
        }
    };

/*
 * DJSUtil.globalEval
 *
 * Enables evaluating a JavaScript string in the global scope in a browser-
 * transparent way.
 */
    DJSUtil.globalEval = function(string) {

        if(window.execScript) {
                
            window.execScript(string);
        } else {
            
            window.eval.call(window, string);
        }
    };

/*
 * DJSUtil.forEach
 *
 * Emulates the behavior of forEach in modern browsers, if a native property is
 * not already available.
 */
    DJSUtil.forEach = DJSUtil.forEach || function(list, callback, context) {
        
        if(list.forEach) {
            
            list.forEach(callback, context);
        } else {
            
            if(typeof list.length == 'number') {
                
                for(var index = 0, item; item = list[index]; index++) {

                    if(callback.call(context, item, index, list) === false) return;
                }
            } else {
    
                for(var j in list) {
                    
                    if(list.hasOwnProperty(j)) {
                        
                        if(callback.call(context, list[j], j, list) === false) return;
                    }
                }
            }
        }
    };

/*
 * DJSUtil.navigator
 *
 * This object contains boolean values that indicate which browser is likely
 * being served. This should probably be upgrade to some kind of feature
 * detection for caching methods and other things. If possible.
 */
    DJSUtil.navigator = {
        
        ModernIE: window.navigator.userAgent.indexOf('MSIE 8') !== -1 || window.navigator.userAgent.indexOf('MSIE 9') !== -1,
        IE: window.navigator.userAgent.indexOf('MSIE') !== -1,
        Chrome: window.navigator.userAgent.indexOf('Chrome/') !== -1,
        Safari: window.navigator.userAgent.indexOf('Chrome/') !== -1,
        Opera: window.navigator.userAgent.indexOf('Opera') !== -1,
        Webkit: window.navigator.userAgent.indexOf('AppleWebKit') !== -1,
        Firefox: window.navigator.userAgent.indexOf('Firefox/') !== -1,
        Macintosh: window.navigator.userAgent.indexOf('Macintosh') !== -1,
        Windows: window.navigator.userAgent.indexOf('Windows') !== -1
    },

/*
 * DJSUtil.feature
 *
 * This is a hash of boolean values corresponding to the existance of various
 * browser-level features. Features detected are:
 *
 *      - Native call and apply properties on Element.createElement
 *      - Native call and apply properties on Element.attachEvent
 *      - Existance of the standard Element.addEventListener property
 *      - Support for __defineSetter__ and __defineGetter__ on native elements
 */
    DJSUtil.feature = {

        createElementCallApply: !!(document.createElement.call),
        attachEventCallApply: !!(window.attachEvent && window.attachEvent.call),
        standardEvents: !!(window.addEventListener),
        defineSetterGetter: !!(document.__defineSetter__ && document.__defineGetter__)
    },
/*
 * DJSUtil.getAttribute / DJSUtil.setAttribute
 *
 * Enable browser-transparent manipulation of standard attributes.
 */
    DJSUtil.getAttribute = function(attribute) {
        
        var self = this;

        if(self.getAttribute) {
            
            return self.getAttribute(attribute);
        } else {
            
            return self.attributes[attribute];
        }
    };

    DJSUtil.setAttribute = function(attribute, value) {
        
        var self = this;

        try {

            if(self.setAttribute) {

                self.setAttribute(attribute, value);
            } else {
                
                self.attributes[attribute] = value;
            }
        } catch(e) {
            DJSUtil.log(e);
        }
    };

/*
 * DJSUtil.getData / DJSUtil.setData
 *
 * Enable browser-transparent manipulation of data-* attribute data.
 */
    DJSUtil.getData = function(key) {
        
        var self = this;

        if(self.dataset) {
            
            return self.dataset[key];
        } else {
            
            return DJSUtil.getAttribute.call(self, 'data-' + key);
        }
    };

    DJSUtil.setData = function(key, value) {
        
        var self = this;

        if(self.dataset) {
            
            self.dataset[key] = value;
        } else {
            
            DJSUtil.setAttribute.call(self, 'data-' + key);
        }
    };

/*
 * DJSUtil.addEventListener / DJSUtil.removeEventListener
 *
 * These helper functions wrap the native event attachment properties in order
 * to transparently enable event handling across browsers.
 */
    DJSUtil.addEventListener = function(event, listener, captures) {

        var self = this;

        if(DJSUtil.feature.standardEvents) {

            self.addEventListener(event, listener, captures);
        } else {

            self.attachEvent('on' + event, listener);
        }
    };

    DJSUtil.removeEventListener = function(event, listener, captures) {

        var self = this;

        if(DJSUtil.feature.standardEvents) {

            self.removeEventListener(event, listener, captures);
        } else {

            self.detachEvent('on' + event, listener);
        }
    };

/*
 * DJSUtil.subclass
 *
 * Provides an interface for creating simple class inheritance.
 */
    DJSUtil.subclass = function(superConstructor, constructor, prototype) {

        constructor.prototype = new superConstructor();

        DJSUtil.forEach(
            prototype,
            function(value, property) {

                constructor.prototype[property] = prototype[property]
            }
        );

        return constructor;
    };

/*
 * DJSUtil.getClass
 *
 * Return the class name of an object
 */
    DJSUtil.getClass = function(obj) {

        return Object.prototype.toString.call(obj);
    };

/*
 * DJSUtil.parseUrl
 *
 * Parse the URL into parts
 *
 * 0 URL
 * 1 protocol + domain + port
 * 2 protocol
 * 3 domain + port
 * 4 domain
 * 5 port
 * 6 path
 * 7 query string
 * 8 query string initial char (? or &)
 *
 * e.g. "http://example.com/files/filename.js?xy=z" --> [
    "http://example.com/files/filename.js?xy=z",    // url
    "http://example.com",   // protocol + domain + port
    "http://",              // protocol
    "example.com",          // domain + port
    undefined,              // no port
    "example.com",          // domain
    "/files/filename.js",   // path
    "?xy=z",                // query string
    "?"                     // query string initial char
    ]
 */
    DJSUtil.parseUrl = function(url) {

        return url && url.match(/^(([^:\/]+:\/\/)(([^:\/]+)(:[^:\/]+)?))?([^?&]*)((\?|&).*)?$/);
    };

/*
 * DJSUtil.getPathExtension
 *
 * Return the file extension given a URL
 *
 * e.g. "http://example.com/files/filename.js?xy=z" --> "js"
 */
    DJSUtil.getPathExtension = function(url) {

        var parts = DJSUtil.parseUrl(url),
            pathFragments = parts[6] ? parts[6].split('/') : [''],
            lastPath = pathFragments[pathFragments.length - 1],
            dotParts = lastPath.split && lastPath.split('.');

        return dotParts[dotParts.length - 1];
    };

DJSUtil.setup();

