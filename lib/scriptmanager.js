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
        self.subscriptStack = [];

        self.inlineScriptCache = [];

        self.urlCache = {};
        self.executing = false;
        self.currentExecution = null;
        self.paused = self.breakExecution = false;

        // After every subscript finishes, 
        self.subscriptDoneHandlers = [];
        self.onSubscriptDone(function popScriptStack(done) {
                    
            self.subscriptStack.pop();

            DJSUtil.log("Script completed: ");
            DJSUtil.inspect(done);

            if(self.subscriptStack.length == 0) {

                self.resume();
            }
        });

        window.DJS_inlineScriptDone = function(index) {

            var done = self.inlineScriptCache[index];

            delete self.inlineScriptCache[index];

            self.fireSubscriptDone(index);
        }
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
        handleInlineScriptText: function(scriptElement, scriptText) {

            var self = this,
                inlineScriptCache = self.inlineScriptCache,
                index = inlineScriptCache.push(scriptElement) - 1,
                result = scriptText + "\n(function(){DJS_inlineScriptDone(" + index + ")})();";

            DJSUtil.log("Pushing script to inline script stack:");
            DJSUtil.inspect(result);

            return result;
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
                        
                        // Execute remaining inline handlers if any..
                        if(DJSUtil.inlineHandlers) {

                            DJSUtil.forEach(
                                DJSUtil.inlineHandlers,
                                function(handler, index) {

                                    handler.call(window);
                                }
                            );

                            delete DJSUtil.inlineHandlers;
                        }

                        // Replace DJS.push so that future handlers are
                        // executed immediately..
                        DJS.push = function(item) {
                            
                            if(typeof item == "function") {

                                item.call(window);
                            }
                        };

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
        },
/*
 * DJSScriptManager.pushSubscript
 *
 * Push a new script onto our execution stack.  Top-level
 *  script execution cannot resume until this stack
 *  reaches 0
 *
 * For online scripts, track onload by injecting a callback
 */
        pushSubscript: function(element, chaperone) {

            var self = this,
                subscriptStack = self.subscriptStack,
                stackLevel,
                parentStreamCursor = slaveDocument.streamCursor,
                popStack = function() {
                    
                    subscriptStack.pop();

                    if(subscriptStack.length == 0) {

                        self.resume();
                    }
                },
                loadEventHandler = function() {

                    var readyState = element.readyState;

                    clearTimeout(timeout);

                    if(readyState && readyState != 'complete' && readyState != 'loaded') {

                        return;
                    }
                   
                    //self.flush();
                    slaveDocument.streamCursor = parentStreamCursor;
                    removeHandlers();
                    // TODO: this part should become the global script-complete handler:
                    //popStack();
                    self.fireSubscriptDone(element);
                },
                removeHandlers = function() {

                    DJSUtil.removeEventListener.call(element, 'load', loadEventHandler, true);
                    DJSUtil.removeEventListener.call(element, 'readystatechange', loadEventHandler, true);
                    DJSUtil.removeEventListener.call(element, 'error', errorHandler, true);
                },
                errorHandler = function() {

                    slaveDocument.streamCursor = parentStreamCursor;
                    removeHandlers();
                    self.fireSubscriptDone(element);
                    //popStack();
                },
                // TODO: Mega hack to make sure pushed subscripts don't pause
                // us indefinitely. We MUST to find a better way around this.
                // (this is in case a script node is created but never added to the live DOM)
                timeout = setTimeout(
                    function() {
                        
                        if(!element.parentNode) {

                            DJSUtil.log('Subscript took too long to be inserted. Bailing out!');
                            DJSUtil.inspect(element);
                            DJSUtil.inspect(chaperone);
                            errorHandler();
                        }
                    }, 
                    30
                );


            stackLevel = subscriptStack.push(element);
            DJSUtil.log('Pushing a subscript of the current execution (level '+stackLevel+'): ');
            DJSUtil.inspect(element);

            self.pause();
                    

            // external only
            // inline scripts can't modify the streamCursor as external
            // scripts can (or can they?)
            slaveDocument.streamCursor = element || document.body.firstChild;

            // external only - use text hack here for internal
            if(DJSUtil.navigator.IE) {

                DJSUtil.addEventListener.call(element, 'readystatechange', loadEventHandler, true);
            } else {

                DJSUtil.addEventListener.call(element, 'load', loadEventHandler, true);
            }

            DJSUtil.addEventListener.call(element, 'error', errorHandler, true);

        },

        fireSubscriptDone: function(element) {
            var self = this;

            DJSUtil.forEach(self.subscriptDoneHandlers, function(handler) {

                handler.call(self, element);
            });
        },

/*
 * DJSScriptManager.onSubscriptDone
 *
 * Attach a callback which will run whenever a subscript finishes
 */
        onSubscriptDone: function(callback) {
            var self = this;

            self.subscriptDoneHandlers.push(callback);
        }
    };

