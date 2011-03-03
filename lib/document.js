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
