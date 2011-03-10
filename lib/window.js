/*
 * class DJSWindow
 *
 * This class wraps the window object. It takes over for native event handling
 * of the 'load' event in a browser-transparent way.
 */
    var DJSWindow = function(window) {
        
        var self = this;

        DJSDominatrix.call(self, window);
    };

    DJSUtil.subclass(
        DJSDominatrix, 
        DJSWindow,
        {

/*
 * DJSWindow.dominate
 *
 * This method manipulates the window object in the following ways:
 *
 *     -  If possible, wraps window.onload in a getter / setter pair in order to
 *        capture assignments to it.
 *     -  If possible, wraps window.addEventListener in order to capture all
 *        'load' event handlers for deferred execution.
 *     -  Alternatively, attempts to wrap window.attachEvent in a similar way.
 *     -  As a last resort, makes a note to manually execute whatever is assigned
 *        to window.onload at the appropriate time.
 *        
 * Additionally, this method captures the actual 'load' event for proper
 * distribution later on.
 */
            dominate: function() {
                
                var self = this,
                    window = self.target,
                    nativeMethods = self.nativeMethods,
                    handlers = self.handlers,
                    options = {};

                /* First time dominate runs, DJS will be an array of
                 * commands and onload listeners.
                 * Process all commands and replace DJS with a hash.
                 * DJS.push() remains.
                 */
                if (DJS instanceof Array) {

                    var withValidArgs = function(args, cb) {

                        if (args[0] instanceof Function ||
                           (args[0] instanceof Array
                            && args[0].length)) {

                            return cb();
                        }
                    };

                    DJSUtil.forEach(DJS, function(pushed) {

                        withValidArgs(arguments, function() {

                            if (pushed instanceof Function ||

                                 pushed[0] == "defer") {

                                self.whenLoaded(pushed[1]);

                            } else if (pushed[0] == "option") {

                                // format is ["option", keyname, value]
                                var key = pushed[1],
                                    value = pushed[2];

                                options[key] = value;
                            }
                        });
                    });

                    DJS = window.__CF.DJS = {

                        inlineScripts: [],

                        inlineScriptDone: function(code) {

                            var done = window.__CF.DJS.inlineScripts[code];
                            delete window.__CF.DJS.inlineScripts[code];
                            slaveScripts.fireSubscriptDone(done);
                        },

                        options: options,

                        push: self.whenLoaded

                    };

                };

                DJSDominatrix.prototype.dominate.call(self);
                
                self.deferEvent('load');
            },

/*
 * DJSWindow.whenLoaded
 *
 * Manually insert an event listener for the 'load' event on the dominated window
 */
            whenLoaded: function(callback) {

                var self = this,
                    window = self.target,
                    nativeMethods = self.nativeMethods;

                if (document.readyState === "complete") {

                    callback();
                } else {

                    if(nativeMethods.addEventListener) {

                        nativeMethods.addEventListener.call(window, 'load', callback, true);
                    } else {

                        nativeMethods.attachEvent('onload', callback);
                    }
                }
            },
/*
 * DJSWindow.load
 *
 * This method enables simulation of the window's load event. It calls all
 * deferred handlers, and gracefully handles un-wrappable onload assignments.
 */
            load: function() {
                
                var self = this,
                    window = self.target,
                    handlers = self.handlers;
                
                self.fireEvent('load');
            }
        }
    );

