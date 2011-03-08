/*
 * class DJSScript
 *
 * This class wraps DOM script objects. It provides a helper interface for
 * pre-caching scripts asynchronously and then executing them synchronously 
 */
    var DJSScript = function(script) {
        
        var self = this;
        
        self.originalScript = script;
        self.src = DJSUtil.getData.call(script, 'djssrc');
        self.external = !!self.src;
        self.loadHandlers = [];
        
        script.dominated = true;
    };

    DJSScript.prototype = {

/*
 * DJSScript.precache
 *
 * Performs precache-ing of the script if necessary. In IE and Opera, scripts
 * are precached with an image, and in all other browsers an object is used.
 */
        precache: function(callback) {
            
            var self = this,
                loadHandlers = self.loadHandlers;

            if(self.external) {
                
                var precacheObject,
                    loadHandler = function() {

                        // TODO: Investigate whether or not we need to be
                        // checking the readyState here for IE
                        
                        // Handler cache complete..
                        DJSUtil.log('Finished precache-ing resource at ' + self.src);

                        self.ready = true;

                        DJSUtil.forEach(
                            self.loadHandlers,
                            function(handler) {

                                handler(self);
                            }
                        );

                        if(callback) {

                            callback(self.src);
                        }

                        detachHandlers();
                    },
                    errorHandler = function() {

                        // Handle cache error..
                        DJSUtil.log('Failed to precache resource at ' + self.src);

                        if(callback) {

                            callback(false);
                        }

                        detachHandlers();
                    },
                    attachHandlers = function() {
                        
                        precacheObject.onload = loadHandler;
                        precacheObject.onerror = errorHandler;
                    },
                    detachHandlers = function() {
                     
                        precacheObject.onload = precacheObject.onerror = null;
                    };
                
                DJSUtil.log('Precache-ing script at ' + self.src);
                
                if(DJSUtil.navigator.IE || DJSUtil.navigator.Opera) {
                    
                    // Precache the element as an Image...
                    precacheObject = new Image();

                    attachHandlers();
                    
                    precacheObject.src = self.src;
                } else {

                    // Precache the element as an Object...
                    var appendTarget = DJSUtil.navigator.Firefox ? document.getElementsByTagName('head')[0] : document.body;                        

                    precacheObject = document.createElement('object'),
                    
                    attachHandlers();

                    precacheObject.data = self.src;
                    precacheObject.width = 0;
                    precacheObject.height = 0;
                    precacheObject.style.position = "absolute";
                    precacheObject.style.left = "-999";

                    appendTarget.appendChild(precacheObject);
                }
            } else {

                self.ready = true;

                DJSUtil.forEach(
                    self.loadHandlers,
                    function(handler) {

                        handler(self);
                    }
                );

                if(callback) {
                    
                    callback(true);
                }
            }
        },

/*
 * DJSScript.execute
 *
 * Executes the script using the appropriate method. External scripts are
 * attached a s properly formatted script tag, and inline scripts are eval'd
 * in the global scope.
 */
        execute: function(callback) {
            
            var self = this,
                script = self.originalScript;

            slaveDocument.streamCursor = script || document.body.firstChild;
			
            if(self.external) {

                var createElement = slaveDocument.nativeMethods.createElement,
                    newScript = DJSUtil.feature.createElementCallApply ? createElement.call(document, 'script') : createElement('script'),
                    detachHandlers = function() {
                     
                        newScript.onload = newScript.onreadystatechange = newScript.onerror = null;
                    };

                DJSUtil.log('Executing external script from ' + self.src + '...');

                newScript.onload = newScript.onreadystatechange = function() {

                    var readyState = newScript.readyState;

                    if(readyState && readyState != 'complete' && readyState != 'loaded') {

                        return;
                    }
                    
                    //slaveDocument.flush();

                    detachHandlers();

                    callback(self.src);
                };

                newScript.onerror = function() {

                    DJSUtil.error('Error while attempting to execute this external script: ' + self.src);
                    
                    detachHandlers();

                    callback(false);
                };

                newScript.src = self.src;
                
                script.parentNode.insertBefore(newScript, script);
            } else {

                DJSUtil.log('Executing an inline script...');

                try {

                    DJSUtil.globalEval(script.text);
                    //slaveDocument.flush();
                } catch(e) {
                    
                    DJSUtil.error(e + ' while attempting to execute this inline script: ');
                    DJSUtil.inspect(script);

                    callback(false);
                    // TODO: Reset slave document buffer without a flush..
                }

                callback(true);
            }
        },

        whenLoaded: function(callback) {

            var self = this,
                loadHandlers = self.loadHandlers;
            
            if(self.ready) {

                callback(self);
            } else {

                loadHandlers.push(callback);
            }
        } 
    };

