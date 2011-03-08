/*
 * DJSUtil
 *
 * Contains helpers and cross-browser wrappers to aide in other DJS functions
 */
    var DJSUtil = window._ || {};

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

        if(options.verbose) {

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

        if(options.verbose) {

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

        if(options.verbose) {

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
        Opera: window.navigator.userAgent.indexOf('Opera') !== -1,
        Webkit: window.navigator.userAgent.indexOf('AppleWebKit') !== -1,
        Firefox: window.navigator.userAgent.indexOf('Firefox/') !== -1
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
