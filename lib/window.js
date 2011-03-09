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
                    handlers = self.handlers;

                window.DJS = window.DJS || {};
                window.DJS.inlineScripts = [];
                window.DJS.inlineScriptDone = function inlineScriptDone(code) {
                    var done = window.DJS.inlineScripts[code];
                    delete window.DJS.inlineScripts[code];
                    slaveScripts.fireSubscriptDone(done);
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

