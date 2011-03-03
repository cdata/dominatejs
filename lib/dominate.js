/*
 * class DJSDominatrix
 *
 * This class serves as the core ancestor for any DominateJS classes that take
 * over manual operation of native DOM elements.
 */
    var DJSDominatrix = function(sub) {

        var self = this;

        self.target = sub;
        self.deferredEventHandlers = {};
        self.capturedEvents = {};
        self.nativeMethods = {};

    };

    DJSDominatrix.prototype = {

/*
 * DJSDominatrix.dominate
 *
 * This method handles basic element domination. It wraps the event handling
 * entry points on the target element, and listens for any handlers being
 * attached to deferred events. These handlers are then cached for deferred
 * execution. Subclasses should override this method when performing custom
 * domination of an element.
 */
        dominate: function() {

            var self = this,
                nativeMethods = self.nativeMethods,
                deferredEventHandlers = self.deferredEventHandlers,
                wrapNativeMethod = self.wrapNativeMethod,
                target = self.target,
                addEventWrapper = function(event, handler) {

                    // TODO: The specification and documents specify that this
                    // method will be smart enough not to add the same handler
                    // twice. The same handler means same event, same function
                    // and same captures value. Currently we don't respect this
                    var args = arguments,
                        attachEventUsed = event.indexOf('on') == 0,
                        eventType = attachEventUsed ? event.substring(2) : event,
                        handlerQueue = deferredEventHandlers[eventType];

                    if(handlerQueue) {
                        
                        handlerQueue.push(args);
                    } else {

                        if(attachEventUsed) {

                            if(DJSUtil.feature.attachEventCallApply) {

                                nativeMethods.attachEvent.apply(target, args);
                            } else {

                                nativeMethods.attachEvent(event, handler);
                            }
                        } else {

                            nativeMethods.addEventListener.apply(target, args);
                        }
                    }
                },
                removeEventWrapper = function(event) {

                    var args = arguments,
                        eventType = event.indexOf('on') == 0 ? event.substring(2) : event,
                        handlerQueue = deferredEventHandlers[eventType];

                    DJSUtil.forEach(

                        handlerQueue,
                        function(queuedArgs, queueIndex) {

                            DJSUtil.forEach(
                                queuedArgs,
                                function(queuedArg, argIndex) {

                                    if(queuedArg !== args[argIndex]) {

                                        return false;
                                    }

                                    if(index == 2) {

                                        handlerQueue.splice(queueIndex, 1);
                                    }
                                }
                            );
                        }
                    );
                };

            wrapNativeMethod.call(self, 'addEventListener', addEventWrapper);
            wrapNativeMethod.call(self, 'attachEvent', addEventWrapper);
            wrapNativeMethod.call(self, 'removeEventListener', removeEventWrapper);
            wrapNativeMethod.call(self, 'detachEvent', removeEventWrapper);
        },

/*
 * DJSDominatrix.restore
 *
 * This method returns the domination target to its "natural" state. Override
 * this method to restore any modifications to the target element.
 */
        restore: function() {

            var self = this;
            
            self.restoreNativeMethods();
        },

/*
 * DJSDominatrix.deferEvent
 *
 * This method registers an event to be deferred. When fired in the DOM, the
 * actual event object will be cached. All handlers listening for that event
 * will have already been redirect away from the DOM into a the DJSDominatrix
 * queue. See DJSDominatrix.fireEvent for re-firing cached events.
 */
        deferEvent: function(eventType) {

            var self = this,
                target = self.target,
                deferredEventHandlers = self.deferredEventHandlers,
                capturedEvents = self.capturedEvents,
                nativeMethods = self.nativeMethods,
                addEventListener = nativeMethods.addEventListener || nativeMethods.attachEvent,
                captureHandler = function(event) {
                    
                    event.captureHandler = arguments.callee;
                    capturedEvents[eventType] = event;
                };

            if(addEventListener) {

                if(!deferredEventHandlers[eventType]) {

                    deferredEventHandlers[eventType] = [];
                }

                if(DJSUtil.feature.standardEvents || DJSUtil.feature.attachEventCallApply) {

                    addEventListener.call(target, eventType, captureHandler, true);
                } else {

                    addEventListener(target, eventType, captureHandler);
                }
            }
        },

/*
 * DJSDominatrix.fireEvent
 *
 * This method re-dispatches deferred events. Queued handlers receive the event
 * in the appropriate order. Finally, "on" event properties are checked and
 * executed if they exist. After DJSDominatrix.fireEvent is called, the fired
 * event will no longer be captured by the DJSDominatrix instance.
 */
        fireEvent: function(eventType) {

            var self = this,
                target = self.target,
                capturedEvents = self.capturedEvents,
                deferredEventHandlers = self.deferredEventHandlers,
                nativeMethods = self.nativeMethods,
                removeEventListener = nativeMethods.removeEventListener || nativeMethods.detachEvent,
                event = capturedEvents[eventType];

            if(event) {

                var nativeStopPropagation = event.stopPropagation,
                    nativeStopImmediatePropagation = event.stopImmediatePropagation;

                if(nativeStopPropagation) {

                    event.stopPropagation = function() {

                        event.propagationStopped = true;
                        nativeStopPropagation.apply(event, arguments);
                    };
                }

                if(nativeStopImmediatePropagation) {

                    event.stopImmediatePropgation = function() {

                        event.propagationStopped = true;
                        nativeStopImmediatePropagation.apply(event, arguments);
                    };
                }

                DJSUtil.forEach(

                    deferredEventHandlers[eventType],
                    function(args, index) {

                        var context = nativeMethods.attachEvent ? window : target,
                            handler = args[1];

                        handler.call(context, event);

                        if(event.propagationStopped) {

                            return false;
                        }
                    }
                );

                if(!event.propagationStopped) {

                    var onHandler = target["on" + eventType.toLowerCase()];

                    if(onHandler) {

                        // TODO: Verify that the context should be window here
                        // it might be the element on which the property was
                        // set. This seems to vary between IE and others.
                        onHandler.call(window, event);
                    }
                }

                if(DJSUtil.feature.standardEvents || DJSUtil.feature.attachEventCallApply) {

                    removeEventListener.call(target, eventType, event.captureHandler, true);
                } else {

                    removeEventListener(target, eventType, event.captureHandler);
                }
            }
        },

/*
 * DJSDominatrix.wrapNativeMethod
 *
 * This method enables the wrapping of native methods in a consistant way. Native
 * methods are cached properly in a way that the DJSDominatrix instance can
 * reference consistently.
 */
        wrapNativeMethod: function(propertyString, wrapper) {

            var self = this,
                target = self.target,
                nativeMethods = self.nativeMethods;

            if(target[propertyString]) {

                nativeMethods[propertyString] = target[propertyString];
                target[propertyString] = wrapper;
            }
        },

/*
 * DJSDominatrix.restoreNativeMethods
 *
 * This method restores all native methods wrapped using 
 * DJSDominatrix.wrapNativeMethod. It is automatically called by the basic
 * DJSDominatrix.restore method.
 */
        restoreNativeMethods: function() {

            var self = this,
                target = self.target,
                nativeMethods = self.nativeMethods;

            DJSUtil.forEach(

                nativeMethods,
                function(method, propertyString) {

                    target[propertyString] = method;
                }
            );
        }
    };

/*
 * class DJSDocument
 *
 * This class wraps the document object. It ensures that all calls to the
 * document's write and writeln properties are handled in a safe way.
 */
    var DJSDocument = function(document) {
        
        var self = this;

        DJSDominatrix.call(self, document);
        self.subscriptQueue = [];
        
        if(html) {
            self.hasWriteBuffer = false;
            self.parser = new html.Parser(
                new html.DefaultHandler(
                    function(error, dom) {
                        
                        if(error) {
                            
                            DJSUtil.error('PARSER ERROR: ' + error);
                        } else {

                            self.insert(dom);
                        }
                    }
                )
            );
        } else {
        	
        	DJSUtil.error('Warning: no HTML parser detected. Document.write will be disabled!');
        }
    };

    DJSUtil.subclass(
        DJSDominatrix, 
        DJSDocument,
        {

/*
 * DJSDocument.dominate
 *
 * This method replaces the native document.write and document.writeln properties
 * with an asynchronous-load-safe alternative. Additionally, it captures the
 * DOMContentReady event if it is dispatched, and forwards it to any handlers at
 * the appropriate time.
 */
            dominate: function() {

                var self = this,
                    writeWrapper = function(out) {
                        
                        self.write(out);
                    };

                DJSDominatrix.prototype.dominate.apply(this);

                self.wrapNativeMethod("write", writeWrapper);
                self.wrapNativeMethod("writeln", writeWrapper);
                self.wrapNativeMethod(
                    "createElement",
                    function(type) {

                        var args = arguments,
                            nativeMethods = self.nativeMethods,
                            element = DJSUtil.feature.createElementCallApply ? nativeMethods.createElement.apply(document, args) : nativeMethods.createElement(type);

                        if(type.indexOf('script') != -1) {

                            self.queueSubscript(element);
                        }

                        return element;
                    }
                );

                self.deferEvent("DOMContentLoaded");
                self.deferEvent("readystatechange");
            },

/*
 * DJSDocument.ready
 *
 * When called, this simulates the dispatching of the DOMContentLoaded event
 * and the readystatechange event.
 */
            ready: function() {

                var self = this;
                self.fireEvent("DOMContentLoaded");
                self.fireEvent("readystatechange");
            },

/*
 * DJSDocument.queueSubscript
 *
 * TODO: Document me
 */
            queueSubscript: function(element) {

                DJSUtil.log('Queueing a subscript of the current execution: ');
                DJSUtil.inspect(element);
                
                var self = this,
                    subscriptQueue = self.subscriptQueue,
                    parentStreamCursor = self.streamCursor,
                    popQueue = function() {
                        
                        subscriptQueue.pop();

                        if(subscriptQueue.length == 0) {

                            slaveScripts.resume();
                        }
                    },
                    removeHandlers = function() {

                        DJSUtil.removeEventListener.call(element, 'load', loadHandler, true);
                        DJSUtil.removeEventListener.call(element, 'readystatechange', loadHandler, true);
                        DJSUtil.removeEventListener.call(element, 'error', errorHandler, true);
                    },
                    loadHandler = function() {

                        var readyState = element.readyState;

                        clearTimeout(timeout);

                        if(readyState && readyState != 'complete' && readyState != 'loaded') {

                            return;
                        }
                       
                        self.flush();
                        self.streamCursor = parentStreamCursor;
                        removeHandlers();
                        popQueue();
                    },
                    errorHandler = function() {

                        self.streamCursor = parentStreamCursor;
                        removeHandlers();
                        popQueue();
                    },
                    // TODO: Mega hack to make sure queued subscripts don't pause
                    // us indefinitely. We MUST to find a better way around this.
                    // NOTE: We've discussed an alternative. In theory you can
                    // dominate tree insertion methods and wait for the script
                    // to actually be inserted before you let it block the
                    // execution loop.
                    timeout = setTimeout(
                        function() {
                            
                            if(!element.parentNode) {

                                DJSUtil.log('Subscript took too long to be inserted. Bailing out!');
                                errorHandler();
                            }
                        }, 
                        30
                    );


                slaveScripts.pause();
                        
                self.streamCursor = { 
                    executingScript: element || document.body.firstChild
                };

                if(DJSUtil.navigator.IE) {

                    DJSUtil.addEventListener.call(element, 'readystatechange', loadHandler, true);
                } else {

                    DJSUtil.addEventListener.call(element, 'load', loadHandler, true);
                }

                DJSUtil.addEventListener.call(element, 'error', errorHandler, true);

            },
/*
 * DJSDocument.write
 *
 * This method captures write output, presumably on a script-by-script basis,
 * fills a buffer with it, and then parses / inserts it when the script is done
 * executing.
 */

            write: function(out) {
                
                var self = this,
                    parser = self.parser;

                DJSUtil.log('Buffering document.write content: ' + out);
                
                if(parser) {

                    self.hasWriteBuffer = true;
                    parser.parseChunk(out);
                } else {
                    
                    // TODO: Fallback to the span / innerHtml option?
                }
            },

/*
 * DJSDocument.flush
 *
 * Cuts off the current buffer and asks the parser to attempt to parse it.
 */
            flush: function() {
            
                var self = this;
                
                DJSUtil.log('Flushing document.write buffer!');
                
                if(self.hasWriteBuffer) {

                    self.parser.done();
                    self.parser.reset();
                    self.hasWriteBuffer = false;
                }
            },

/*
 * DJSDocument.convertAbstractElement
 *
 * Given abstract data for an element as generated by the HTML parser, this
 * method will return a DOM element.
 * 
 * This method forwards to the DJSParserSemantics mixin if available. Otherwise
 * it does nothing.
 */

            convertAbstractElement: function(abstractElement) {
             
                var self = this;

                // TODO: Look into a more elegant method for incorporating mixins..
                if(DJSParserSemantics) {

                    return DJSParserSemantics.mixins.convertAbstractElement.apply(self, arguments);
                }
            },

/*
 * DJSDocument.insert
 *
 * Inserts parsed document.write content into the DOM. Utilizes the
 * DJSParserSemantics.insertionMixin to do this if it is available, otherwise
 * does nothing.
 * 
 * This method forwards calls to the DJSParserSemantics mixin if available.
 * Otherwise it does nothing.
 */
            insert: function(abstractDOM, rawParent) {
                
                var self = this;
                
                if(DJSParserSemantics) {

                    return DJSParserSemantics.mixins.insert.apply(self, arguments);
                }
            }

        }
    );
    
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

            slaveDocument.streamCursor = {
                executingScript: script || document.body.firstChild
            };
			
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

/*
 * class DJSScriptManager
 *
 * This class handles the queueing, asynchronous loading and synchronous 
 * execution of all appropriately formatted script tags in the document.
 */
    DJSScriptManager = function() {

        var self = this;

        self.slaves = [];
        self.captives = [];

        self.urlCache = {};
        self.executing = false;
        self.currentExecution = null;
        self.paused = self.breakExecution = false;
    };

    DJSScriptManager.prototype = {
 
/*
 * DJSScriptManager.dominate
 *
 * TODO: Document me
 */
        dominate: function(once) {

            var self = this,
                urlCache = self.urlCache,
                captives = self.captives,
                scripts = document.getElementsByTagName('script'),
                enslavedCount = 0,
                passCount = 0,
                complete = function() {
                 
                    DJSUtil.log('Detected a total of ' + enslavedCount + ' undominated scripts...');
                },
                search = function() {

                    passCount++;

                    DJSUtil.forEach(

                        scripts,
                        function(script, index) {

                            if(!script.dominated && DJSUtil.getAttribute.call(script, 'type') === 'text/djs') {

                                var slave = new DJSScript(script);

                                captives.push(slave);

                                if(!self.executing) {

                                    setTimeout(
                                        function() {
                                            
                                            slave.precache();
                                        },
                                        1
                                    );
                                } else {

                                    slave.ready = true;
                                }

                                enslavedCount++;
                            }
                        }
                    );

                    if(passCount > 2 || once) {

                        clearInterval(searchLoop);
                        complete();
                    }
                },
                searchLoop = setInterval(
                    search,
                    25
                );

            search();
        },

/*
 * DJSScriptManager.execute
 *
 * TODO: Document me
 */
        execute: function(callback) {

            var self = this,
                paused = self.paused;

            if(!paused) {

                var captives = self.captives,
                    slaves = self.slaves,
                    executionCallback = self.executionCallback,
                    executeNext = function() {
                     
                        if(self.breakExecution) {

                            DJSUtil.log('Pausing execution...');
                            self.paused = true;
                        } else {
                            
                            self.execute();
                        }
                    };

                self.executionCallback = callback || self.executionCallback;
                self.executing = !!self.executionCallback

                if(captives.length) {

                    var slave = captives[0];

                    if(!self.currentExecution && self.executing) {

                        DJSUtil.log('Queueing execution of next script...');

                        self.currentExecution = captives.shift();

                        slave.whenLoaded(

                            function() {

                                slave.execute(

                                    function(success) {

                                        if(success) {

                                            slaves.push(slave);
                                            
                                            DJSUtil.log('Execution finished for this script: ');
                                            DJSUtil.inspect(slave);

                                            self.currentExecution = null;

                                            DJSUtil.log('Executed ' + slaves.length + ' scripts so far; ' + captives.length + ' scripts left in the queue...');
                                        } else {

                                            DJSUtil.error('Failed execution!');
                                        }

                                        executeNext();
                                    }
                                );
                            }
                        );
                    }

                    return;
                } else {

                    DJSUtil.log('Performing fallback scan for scripts..');

                    self.dominate(true);

                    if(captives.length) {

                        executeNext();
                        return;
                    }
                }

                if(!captives.length && self.executionCallback) {

                    if(!self.executionFinished) {
                        
                        DJSUtil.log('Looks like we are done dominating!');
                        self.executionCallback();
                        self.executionFinished = true;
                    }

                    return;
                }
            }
        },

/*
 * DJSScriptManager.pause
 *
 * TODO: Document me
 */
        pause: function() {

            var self = this;
            self.breakExecution = true;
        },

/*
 * DJSScriptManager.resume
 *
 * TODO: Document me
 */
        resume: function() {

            var self = this;

            self.breakExecution = false;

            if(self.paused) {

                DJSUtil.log('Resuming execution...');
                self.paused = false;
                self.execute();
            }
        }
    };

    var slaveDocument = new DJSDocument(document),
        slaveWindow = new DJSWindow(window),
        slaveScripts = new DJSScriptManager();

    DJSUtil.log('Dominating the window and any appropriate scripts!');

    slaveWindow.dominate();
    slaveScripts.dominate();

    slaveWindow.whenLoaded(

        function() {

            DJSUtil.log('Show time. Dominating the document and executing scripts!');
            
            slaveDocument.dominate();

            slaveScripts.execute(

                function() {

                    DJSUtil.log('Finished executing. Simulating load, ready and readystatechange events!');

                    slaveDocument.ready();
                    slaveWindow.load();

                    DJSUtil.log('Restoring native DOM methods!');

                    slaveDocument.restore();
                    slaveWindow.restore();

                    DJSUtil.log('Took ' + (((new Date()).getTime()) - DJSUtil.epoch) + 'ms for total domination!');
                    DJSUtil.log('Fin.');
                }
            );
        }
    );
