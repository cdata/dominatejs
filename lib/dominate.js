(function(window, document, options, html) {

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
        
        IE: window.navigator.userAgent.indexOf('MSIE') !== -1,
        Chrome: window.navigator.userAgent.indexOf('Chrome/') !== -1,
        Opera: window.navigator.userAgent.indexOf('Opera') !== -1,
        Webkit: window.navigator.userAgent.indexOf('AppleWebKit') !== -1,
        Firefox: window.navigator.userAgent.indexOf('Firefox/') !== -1
    },

/*
 * DJSUtil.feature
 *
 * TODO: Document me
 */
    DJSUtil.feature = {

        createElementCallApply: !!(document.createElement.call),
        attachEventCallApply: !!(window.attachEvent && window.attachEvent.call),
        standardEvents: !!(window.addEventListener)
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

        if(self.setAttribute) {

            self.setAttribute(attribute, value);
        } else {
            
            self.attributes[attribute] = value;
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
 * TODO: Document me
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
     * DJSUtil.htmlSemanticRules
     *
     * Based on HTML5 semantics: 
     * http://dev.w3.org/html5/spec/Overview.html
     */
    DJSUtil.htmlSemanticRules = {
        'head': {
            inclusive: {
                'html': 1
            }
         },
        'title': {
            inclusive: {
                'head': 1
            }
        },
        'base': {
            inclusive: {
                'head': 1
            }
        },
        'link': {
            exclusive: { }
        },
        'meta': {
            exclusive: { }
        },
        'style': {
            exclusive: { }
        },
        'script': {
            exclusive: { }
        },
        'noscript': {
            exclusive: {
                'noscript': 1
            } //TODO: noscript cannot be a descendant of noscript, even indirectly
        },
        'body': {
            inclusive: {
                'html': 1
            }
        },
        'div': { // this is a hack until proper flow / phrasing classes are used
            exclusive: {
                'p': 1
            }
        }
        // TODO: define rules in terms of content models (tag classes), i.e. flow content vs phrasing content
    };

    DJSUtil.isValidParent = function(node, parentNode) {

        var rules = DJSUtil.htmlSemanticRules,
            nodeName = node.nodeName.toLowerCase(),
            parentNodeName = parentNode.nodeName.toLowerCase();

        if (!rules[nodeName]) {
            return true;
        }

        if (rules[nodeName].inclusive) {
            return !!rules[nodeName].inclusive[parentNodeName];
        } else if (rules[nodeName].exclusive) {
            return !rules[nodeName].exclusive[parentNodeName];
        }

        return !(rules[nodeName]) ||
            (rules[nodeName].inclusive && !!rules[nodeName].inclusive[parentNodeName]) || 
            (rules[nodeName].exclusive && !rules[nodeName].exclusive[parentNodeName]);
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

        self.subscriptQueue = [];

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
                            
                            DJSUtil.error('PARSER ERROR: ' + e);
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

                    self.queueSubscript(element);
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
 */
        convertAbstractElement: function(abstractElement) {
            
            // TODO: Review whether we're reading the abstractElement properly

            var self = this,
                document = self.document,
                setNodeAttributes = function(node, attributes) {
                    
                    if(attributes) {
	                    DJSUtil.forEach(
	                        attributes,
	                        function(value, key) {
	
	                            switch(key) {
	
	                                case 'class':
	                                    node.className += value;
	                                    break;
	                                default:
	                                    DJSUtil.setAttribute.call(node, key, value);
	                                    break;
	                            }
	                        }
	                    );
                    }
                };
                
            switch(abstractElement.type) {
                
                case 'text':
                    
                    return document.createTextNode(abstractElement.data);

                case 'comment':
                    
                    return document.createComment(abstractElement.data);

                case 'script':
                    
                    var script = document.createElement(abstractElement.name);
                    
                    setNodeAttributes(script, abstractElement.attribs);

                    return script;

                case 'style':
                case 'tag':
                    
                    var node = document.createElement(abstractElement.name);
                    
                    setNodeAttributes(node, abstractElement.attribs);
                    
                    return node;

                case 'directive':
                    DJSUtil.log('Ignoring an HTML directive found in document.write stream ' + abstractElement.raw);
                    return false;

                default: 
                    DJSUtil.error('WARNING: unexpected element type found: ' + abstractElement.raw);
                    return false;
            }
        },

/*
 * DJSDocument.insert
 *
 * Given abstract DOM data as generated by the HTML parser, and optionally a
 * parent node, this method will iterate over the data and ensure that it is
 * properly inserted into the DOM.
 *
 * In all browsers in Standards mode, tags inserted with document.write
 * cannot bring the DOM into an invalid structure (i.e. <p><div></div></p>).
 * So, the browser will close open tags until a valid structure is reached
 * (i.e. <p></p><div></div>).  To simulate this behavior, inserted nodes
 * can "bubble" up the dom until a vaild structure is found.  Bubble events
 * will permanently adjust the insertion cursor until a new script.
 */
        insert: function(abstractDOM, parent) {
            /*
             * Implementation notes:
             *
             * Basically we are performing a depth-first traversal
             * of the tag tree given as abstractDOM, with one enhancement:
             * Closed Nodes.
             *
             * For any node, we may encounter an Invalid Insertion, such
             * as insert(<div>, <p>) or insert(<div>) when the stream cursor
             * is a <p> tag.  In this situation, we move up the tree until we
             * find a valid parent.  All candidate parents tried along the way
             * are marked Closed.
             *
             * Insert must not insert any nodes into a Closed Node.
             * insert(nodeA, nodeB) where nodeB is Closed will attach
             * nodeA to nodeB's most immediate non-Closed parent.
             *
             * Closedness is a property of HTML Elements which must persist
             * after this function completes.
             */
            
            var self = this,
                document = self.document;

            DJSUtil.forEach(
                abstractDOM,
                function(data) {

                    /*
                     * Return the streamCursor for the current document,
                     * or the most immediate non-Closed parent
                     * in the event that the streamCursor is closed.
                     */
                    var getEffectiveStreamCursor = function() {

                        /*
                         * Search begins at the first defined insertion point:
                         * 1 parent (for recursive group insertion)
                         * 2 streamCursor.executingScript.parentNode
                         *   (if script parent was not know)
                         * 3 document.body (if script did not attach
                         *   successfully)
                         */
                        var rawCursor = parent ||

                            (self.streamCursor.executingScript && 
                                self.streamCursor.executingScript.parentNode)

                            || document.body;

                        return (function getFirstNonClosedParent(element) {

                            return !element.closed ? element :

                                (!element.parentNode ?

                                    document.body.firstChild :

                                    getFirstNonClosedParent(element.parentNode));

                        })(rawCursor);
                    };

                    /*
                     * Given HTMLElements node, cursor, find the most immediate
                     * ancestor of 'cursor' for which 'node' is a valid child,
                     * i.e. <div> cannot be a child of <p>.  Search begins
                     * with 'cursor'.
                     *
                     * Closes all invalid nodes encountered during the
                     * search.
                     */
                    var findValidAncestorAndCloseNodes = function(node, cursor) {

                        if (DJSUtil.isValidParent(node, cursor)) {

                            return cursor;

                        } else {

                            cursor.closed = true;

                            if (cursor.parentNode) {

                                return findValidAncestorAndCloseNodes(node, cursor.parentNode);

                            } else {

                                return document.body;

                            }
                        }
                    };

                    var cursor = getEffectiveStreamCursor(),
                        node = self.convertAbstractElement(data),
                        name = node.nodeName.toLowerCase();

                    /*
                     * Cursor will be either
                     * > the parent node in the the insertion group
                     * > the parent node of document.write's callee script node
                     * > the nearest non-closed parent node of one of the above
                     */
                    try {

                        if (cursor.nodeName.toLowerCase() == "script" && name == "#text") {

                            cursor.text = node.nodeValue;

                        } else {

                            cursor = findValidAncestorAndCloseNodes(node, cursor);
                            cursor.appendChild(node);
                        }

                        if (data.children) {

                            self.insert(data.children, node);

                        }

                    } catch(e) {

                        DJSUtil.log('Insert failed');
                        DJSUtil.inspect(e);
                    }


                    /*
                    if(parent) {
                        
                        // For some reason, in IE the script content is a text 
                        // child node of the script. Parser bug?
                        if(parent.nodeName.toLowerCase() == "script" && name == "#text") {
                        
                            parent.text = node.nodeValue;
                        } else {
                            
                            try {
                                parent.appendChild(node);
                            } catch (e) {
                                DJSUtil.log('EXCEPTION CAUGHT');
                                console.log(e);
                            }
                        }
                    } else {
                        
                        try {
                            cursor.parentNode.insertBefore(node, cursor);
                        } catch (e) {
                            DJSUtil.log('EXCEPTION CAUGHT');
                            console.log(e);
                        }
                    }

                    if(data.children) {
                        
                        self.insert(data.children, node);
                    }
                    */
                }
            );
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

            if(nativeMethods.addEventListener) {

                nativeMethods.addEventListener.call(window, 'load', callback, true);
            } else {

                nativeMethods.attachEvent('onload', callback);
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
    
})(
    window,
    document,
    typeof DJS != "undefined" ? DJS : {}, 
    typeof exports != "undefined" ? exports : false
);
