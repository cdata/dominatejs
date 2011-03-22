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
                        
                        // onload or onerror, so long as the HTTP request completed,
                        // we must continue loading page scripts.
                        // non-IE browsers will fire onerror when loading an asset with
                        // non-image mimetype via the image strategy
                        precacheObject.onload = loadHandler;
                        precacheObject.onerror = loadHandler;
                    },
                    detachHandlers = function() {
                     
                        precacheObject.onload = precacheObject.onerror = null;
                    },

                     // Use Image pre-caching strategy
                     // Note that in Firefox, Chrome, and Safari, the image's
                     // error callback will fire as the response mimetype
                     // should be non-image, but that is acceptable as the
                     // asset should be loaded into cache anyway
                    preloadViaImage = function() {

                        precacheObject = new Image();

                        attachHandlers();
                        
                        precacheObject.src = self.src;
                    },

                    // Use Object pre-caching strategy
                    // Chrome:Mac and Safari:Win refuse to load
                    // assets with certain filenames using this scheme
                    //
                    // @target specifies insertion parent: i.e. document.body
                    // vs head
                    preloadViaObject = function(target) {

                        precacheObject = document.createElement('object');
                        
                        attachHandlers();

                        precacheObject.data = self.src;
                        precacheObject.width = 0;
                        precacheObject.height = 0;
                        precacheObject.style.position = "absolute";
                        precacheObject.style.left = "-999";

                        target.appendChild(precacheObject);
                    },
                    preloadViaObjectInBody = function() {

                        // in Chrome, sometimes document.body doesn't exist
                        // but the task to create document.body is probably
                        // waiting in the task queue.  So, stick this
                        // task at the end of the task queue so when it resumes,
                        // the document.body task will probably have run.
                        // And if not, keep doing this until it shows up.
                        // (inspired by http://bugs.jquery.com/ticket/4320,
                        //  https://github.com/jquery/jquery/commit/262fcf7b7b919da1564509f621cf7480a5d5572b)
                        if ('body' in document && document.body) {

                            preloadViaObject(document.body);
                        } else {

                            setTimeout(preloadViaObjectInBody, 13);
                        }
                        
                    };
                    preloadViaObjectInHead = function() {

                        preLoadViaObject(document.getElementsByTagName('head')[0]);
                    };
                
                DJSUtil.log('Precache-ing script at ' + self.src);
                
                if(DJSUtil.navigator.IE || DJSUtil.navigator.Opera) {
                    
                    // Precache the element as an Image...
                    preloadViaImage();

                } else if(DJSUtil.navigator.Chrome && DJSUtil.navigator.Macintosh &&
                    /php/i.test(DJSUtil.getPathExtension(self.src))) {

                    // Chrome/Mac disallows preloading via Object
                    // for asset URLs with path extension containing php
                    preloadViaImage();

                } else if(DJSUtil.navigator.Safari && DJSUtil.navigator.Windows &&
                    /css/i.test(DJSUtil.getPathExtension(self.src))) {

                    // Safari/Win disallows preloading via Object
                    // for asset URLs with path extension containing css
                    preloadViaImage();

                } else if(DJSUtil.navigator.Firefox) {

                    preloadViaObjectInHead();
                } else {

                    preloadViaObjectInBody();
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
                    
                    slaveDocument.flush();

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
                    slaveDocument.flush();
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

