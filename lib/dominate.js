/*
 * class DJSDominatrix
 *
 * This class serves as the core ancestor for any DominateJS classes that take
 * over manual operation of native DOM elements.
 */
    var DJSDominatrix = function(sub) {

        var self = this;

        self.target = sub;
        self.deferredProperties = [];
    };

    DJSDominatrix.prototype = {

        watchProperty: function(propertyString) {

            var self = this,
                target = self.target,
                deferredProperties = self.deferredProperties;

            if(DJSUtil.defineSetterGetter) {

            }
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
        self.document = document;

        self.subscriptStack = [];

        self.nativeMethods = {
            
            write: document.write,
            writeln: document.writeln,
            createElement: document.createElement,
            addEventListener: document.addEventListener,
            attachEvent: document.attachEvent
        };

        self.handlers = {
            
            DOMContentLoaded: [],
            readystatechange: []
        };
        
        if(html) {
            self.hasWriteBuffer = false;
            self.parser = new html.Parser(
                new html.DefaultHandler(
                    function(error, dom) {
                        
                        if(error) {
                            
                            DJSUtil.error('PARSER ERROR: ' + error);
                        } else {

                            self.insert(dom);

                            if (DJSParserSemantics) {

                                DJSParserSemantics.mixins.afterInsert.apply(this, arguments);
                            }

                        }
                    }
                )
            );
        } else {
        	
        	DJSUtil.error('Warning: no HTML parser detected. Document.write will be disabled!');
        }
    };

    DJSDocument.prototype = {

/*
 * DJSDocument.restore
 *
 * This method will restore the native document.write and document.writeln
 * properties originally over-written by the DJSDocument.
 */
        restore: function() {
            
            var self = this,
                document = self.document,
                nativeMethods = self.nativeMethods;

            document.createElement = nativeMethods.createElement;
            document.write = nativeMethods.write;
            document.writeln = nativeMethods.writeln;
            document.addEventListener = nativeMethods.addEventListener;
            document.attachEvent = nativeMethods.attachEvent;
        },

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
                document = self.document,
                nativeMethods = self.nativeMethods,
                handlers = self.handlers;

            document.write = document.writeln = function(out) {
            
                self.write(out);
            };

            document.createElement = function(type) {

                var args = arguments,
                    element = DJSUtil.feature.createElementCallApply ? nativeMethods.createElement.apply(document, args) : nativeMethods.createElement(type);

                if(type.indexOf('script') != -1) {

                    self.pushSubscript(element);
                }

                return element;
            };
            
            // TODO: See about unifying this functionality with the almost
            // identical stuff in DJSWindow.dominate...
            if(document.__defineSetter__ && document.__defineGetter__) {
                
                window.__defineSetter__(
                    'onreadystatechange',
                    function(handler) {
                        
                        self.onreadystatechange = handler;
                    }
                );

                window.__defineGetter__(
                    'onreadystatechange',
                    function() {
                        
                        return self.onreadystatechange;
                    }
                );
            } else {
                
                self.fallback = true;
            }

            if(document.addEventListener) {
                document.addEventListener = function(event, handler) {
                    
                    if(handlers[event]) {
                        
                        // TODO: See similar comment in DJSWindow.dominate
                        handlers[event].push(handler);
                    } else {
                        
                        nativeMethods.addEventListener.apply(document, arguments);
                    }
                }

                DJSUtil.forEach(

                    handlers,
                    function(handlerArray, eventName) {

                        nativeMethods.addEventListener.call(

                            document,
                            eventName,
                            function(event) {

                                self[eventName + 'Event'] = event;
                            },
                            true
                        );
                    }
                );
            } else if(document.attachEvent) {

                document.attachEvent = function(event, handler) {

                    var trimmedEvent = event.substring(2);

                    if(handlers[trimmedEvent]) {

                        handlers[trimmedEvent].push(handler);
                    } else {

                        nativeMethods.attachEvent(event, handler);
                    }
                };

                DJSUtil.forEach(

                    handlers,
                    function(handlerArray, eventName) {
                        
                        nativeMethods.attachEvent(

                            'on' + eventName,
                            function(event) {

                                self[eventName + 'Event'] = event;
                            }
                        );
                    }
                );
            }
        },

 /*
  * DJSDocument.ready
  *
  * When called, this simulates the dispatching of the DOMContentLoaded event.
  */
        ready: function() {
            
            var self = this,
                document = self.document,
                handlers = self.handlers;

            // TODO: Figure out if we need to simulate readystatechange...
            // NOTE: I think we do - see this:
            if(self.readystatechangeEvent) {
                
                DJSUtil.forEach(
                    handlers.readystatechange,
                    function(handler) {

                        handler(self.readystatechangeEvent);
                    }
                );
            }
            
            // TODO: Honor event propagation rules etc (see DJSWindow.load)...
            // TODO: We need to figure out how to best simulate the
            // DOMContentLoaded event when we don't get the real one.
            if(self.DOMContentLoadedEvent || true) {

                DJSUtil.forEach(
                    handlers.DOMContentLoaded,
                    function(handler) {

                        handler(self.DOMContentLoadedEvent);
                    }
                );
            }
        },

/*
 * DJSDocument.pushSubscript
 *
 * Push a new script onto our execution stack.  Top-level
 *  script execution cannot resume until this stack
 *  reaches 0
 *
 * TODO generalize to inline scripts
 */
        pushSubscript: function(element) {

            DJSUtil.log('Pushing a subscript of the current execution: ');
            DJSUtil.inspect(element);
            
            var self = this,
                subscriptStack = self.subscriptStack,
                parentStreamCursor = self.streamCursor,
                popStack = function() {
                    
                    subscriptStack.pop();

                    if(subscriptStack.length == 0) {

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
                   
                    //self.flush();
                    self.streamCursor = parentStreamCursor;
                    removeHandlers();
                    popStack();
                },
                errorHandler = function() {

                    self.streamCursor = parentStreamCursor;
                    removeHandlers();
                    popStack();
                },
                // TODO: Mega hack to make sure pushed subscripts don't pause
                // us indefinitely. We MUST to find a better way around this.
                // (this is in case a script node is created but never added to the live DOM)
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
                    
            self.streamCursor = element || document.body.firstChild;

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
 * Let scripts execute document.write post-onload without clobbering the page
 *
 * This method inserts nodes into the DOM given a fragment of HTML. Ideally,
 * a call to DJSDocument.write(html) post-onload and document.write(html)
 * pre-onload would yeild the same DOM structure.
 * 
 * General approach: use an HTML parser and HTML semantics engine to simulate
 * the browser's native behavior.
 *
 */
        write: function(out) {
            
            var self = this,
                parser = self.parser;

            if(parser && DJSParserSemantics) {

                self.hasWriteBuffer = true;
                DJSParserSemantics.mixins.withParserDocwrite.apply(self, [parser, out]);
            } else {
                
                DJSUtil.log('Ignoring document.write content: ' + out);
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
    };
    
/*
 * class DJSWindow
 *
 * This class wraps the window object. It takes over for native event handling
 * of the 'load' event in a browser-transparent way.
 */
    var DJSWindow = function(window) {
        
        var self = this;
        self.window = window;

        self.nativeMethods = {
            
            addEventListener: window.addEventListener,
            attachEvent: window.attachEvent 
        };

        self.handlers = {
            
            load: []
        };
    };
    
    DJSWindow.prototype = {

/*
 * DJSWindow.restore
 *
 * This method restores all native methods wrapped by DJSWindow back to their
 * original state.
 */
        restore: function() {

            var self = this,
                window = self.window,
                nativeMethods = self.nativeMethods;

            window.addEventListener = nativeMethods.addEventListener;
            window.attachEvent = nativeMethods.attachEvent;

            if(self.onload) {
                window.onload = self.onload;
            }
        },

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
                window = self.window,
                nativeMethods = self.nativeMethods,
                handlers = self.handlers;

            window.DJS = window.DJS || {};
            window.DJS.inlineScriptDone = function inlineScriptDone(scriptCode) {
                var script = slaveScripts.inlineScripts[scriptCode];
                script.whenLoaded();
            };

            if(window.__defineSetter__ && window.__defineGetter__) {
                
                var windowOnloadHandler;

                window.__defineSetter__(
                    'onload',
                    function(handler) {
                        
                        self.onload = handler;
                    }
                );

                window.__defineGetter__(
                    'onload',
                    function() {
                        
                        return self.onload;
                    }
                );
            } else {
                
                self.fallback = true;
            }
            
            if(window.addEventListener) {
                window.addEventListener = function(event, handler) {

                    if(handlers[event]) {
                        
                        // TODO: It would be nice if we could properly handle
                        // the 'captures' argument as well. Should be doable.
                        handlers[event].push(handler);
                    } else {
                        
                        nativeMethods.addEventListener.apply(window, arguments);
                    }
                };

                nativeMethods.addEventListener.call(
                    window,
                    'load',
                    function(event) {
                        
                        self.loadEvent = event;
                    },
                    true
                );

            } else if(window.attachEvent) {
                window.attachEvent = function(event, handler) {

                    var trimmedEvent = event.substring(2);

                    if(handlers[trimmedEvent]) {
                    
                        handlers[trimmedEvent].push(handler);
                    } else {
                        
                        if(DJSUtil.feature.attachEventCallApply) {

                            nativeMethods.attachEvent.apply(window, arguments);
                        } else {

                            nativeMethods.attachEvent(event, handler);
                        }
                    }
                };

                nativeMethods.attachEvent(
                    'onload',
                    function(event) {

                        self.loadEvent = event;
                    }
                );
            }
        },

/*
 * DJSWindow.whenLoaded
 *
 * Manually insert an event listener for the 'load' event on the dominated window
 */
        whenLoaded: function(callback) {

            var self = this,
                window = self.window,
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
                window = self.window,
                handlers = self.handlers;
            

            if(self.onload) {
                
                self.onload(self.loadEvent);
            }

            // TODO: Need to properly honor propagation-related properties on
            // the event.
            DJSUtil.forEach(
                handlers.load,
                function(handler) {

                    handler(self.loadEvent);
                }
            );

            if(self.fallback && window.onload) {
                
                setTimeout(
                    function() {
                        
                        window.onload(self.loadEvent);
                    },
                    10
                );
            }
        }
    };

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
        self.inlineScripts = [];

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
 * DJSScriptManager.handleInlineScriptText
 *
 * Inject exection flow mamangement snippet
 */
        handleInlineScriptText: function(scriptNode, scriptText) {

            var script = scriptNode,
                code = this.inlineScripts.push(script) - 1,
                snippet = "\n(function(){window.DJS.inlineScriptDone(" + code + ")})();";

            return scriptText + snippet;
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

                    slaveDocument.flush();
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
