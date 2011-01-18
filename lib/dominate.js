(function(window, document, options, html) {
    
    var djsScripts = [],
        djsRogueScripts = [],
        djsLoadedPaths = {},
        djsExecuteStack = [],
        scriptTimeout = 5000,
        scriptRetryInterval = 200,
        nativeWrite = document.write,
        nativeWriteln = document.writeln,
        Navigator = {
            
            IE: "MSIE",
            Chrome: "Chrome/",
            Opera: "Opera"
        },
        isNavigator = function(id) {
            
            return navigator.userAgent.indexOf(id) != -1;
        },
        log = function() {
            
            if(options.verbose) {
                try {
                    
                    console.log.apply(this, arguments);
                } catch(e){}
            }
        },
        inspect = function() {
            
            if(options.verbose) {
                try {
                    
                    console.info.apply(this, arguments);
                } catch(e){}
            }
        },
        each = function(list, callback) {
            
            for(var index = 0, item; item = list[index]; index++) {
                
                callback(item, index, list);
            }
        },
        getAttribute = function(element, attributeName, custom) {
            
            if(custom && element.dataset) { // Support HTML5 custom attributes..
                
                return element.dataset[attribute];
            } else {
                
                if(custom) {
                    
                    attributeName = "data-" + attributeName;
                }
                
                for(var i = 0, attribute; attribute = element.attributes[i++];) {
                    
                    if(attributeName == attribute.nodeName) {
                        
                        return attribute.nodeValue;
                    }
                }
                
                return undefined;
            }
        },
        setAttribute = function(element, attributeName, value, custom) {
            
            if(custom && element.dataset) {
                
                element.dataset[attributeName] = value;
            } else {
                
                if(custom) {
                    
                    attributeName = "data-" + attributeName;
                }
                
                element.attributes[attributeName] = value;
            }
        },
        addEventListener = function(target, event, listener, capture) {
            
            if(target.addEventListener) {
                
                target.addEventListener(event, listener, !!capture);
            } else if(element.attachEvent) {
                
                target.attachEvent('on' + event, listener);
            } else if(!target['on' + event]) {
                    
                target['on' + event] = listener;
            }
        },
        
        // Script stack operations
        getCurrentScript = function() { return djsScripts.length ? djsScripts[0] : false; },
        pushScript = function(script) { djsScripts.push(script); },
        nextScript = function() { djsScripts.shift(); },
        
        // Execution stack operations
        getCurrentExecution = function() { return djsExecuteStack.length ? djsExecuteStack[0] : false; },
        pushExecution = function(value) { djsExecuteStack.push(value); },
        nextExecution = function() { djsExecuteStack.shift(); },
        
        // Rogue script operations
        getCurrentRogue = function() { return djsRogueScripts.length ? djsRogueScripts[0] : false; },
        pushRogue = function(value) { djsRogueScripts.unshift(value); },
        removeRogue = function(script) { for(var i = 0, rogue; rogue = djsRogueScripts[i++];) { if(script == rogue) { djsRogueScripts.slice(i, 1); break; } } },
        
        djsParser = (function() {
            
            if(html) {
                
                var createElement = function(nodeData) {
                        
                        switch(nodeData.type) {
                            
                            case 'text':
                                
                                return document.createTextNode(nodeData.data);
                            case 'script':
                                
                                var script = document.createElement(nodeData.name),
                                    source = nodeData.attribs['src'];
                                
                                for(var attribute in nodeData.attribs) {
                                    
                                    script.setAttribute(attribute, nodeData.attribs[attribute]);
                                }
                                
                                script.onload = script.onreadystatechange = function() {
                                    
                                    removeRogue(script);
                                    script.onload = script.onreadystatchange = null;
                                };
                                
                                pushRogue(script);
                                
                                return script;
                            case 'tag':
                                
                                var node = document.createElement(nodeData.name);
                                
                                for(var attribute in nodeData.attribs) {
                                    
                                    node.setAttribute(attribute, nodeData.attribs[attribute]);
                                }
                                
                                return node;
                            default: 
                                log('WARNING: I have no idea what node this is: ' + nodeData.raw);
                                return false;
                        }
                    },
                    walk = function(list, parent, script) {
                        
                        for(var i = 0, nodeData; nodeData = list[i++];) {
                            
                            var node = createElement(nodeData);
                            
                            if(nodeData.children) {
                                
                                (function(node, children) {
                                    
                                    if(children) {
                                        
                                        setTimeout(
                                            function() {
                                                
                                                walk(children, node);
                                            },
                                            0
                                        );
                                    }
                                })(node, nodeData.children);
                            }
                            
                            if(parent && parent.nodeName.toLowerCase() != 'head') {
                                
                                var append = function() {
                                    
                                    parent.appendChild(node);
                                };
                                
                                if(script) {
                                    
                                    try {
                                        
                                        parent.insertBefore(node, script);
                                    } catch(e) {
                                        
                                        log("WARNING: Insertion before cursor failed; appending to end of node.");
                                        append();
                                    }
                                } else {
                                    
                                    append();
                                }
                            } else {
                                
                                (document.getElementsByTagName('body')[0]).appendChild(node);
                            }
                        }
                    };
                
                return new html.Parser(
                    new html.DefaultHandler(
                        function(error, dom) {
                            
                            if(error) {
                                
                                log('PARSER ERROR: ' + e);
                            } else {
                                
                                var script = getCurrentRogue() || getCurrentScript(),
                                    parent = script.parentNode;
                                
                                walk(dom, parent, script);
                            }
                        }
                    )
                );
            }
            
            return false;
        })(),
        djsWrite = function() {
            
            if(djsParser) {
                
                djsParser.reset();
                djsParser.parseComplete(arguments[0]);
            }
        },
        djsEval = function(code) {
            
            if(window.execScript) {
                
                window.execScript(code);
            } else {
                
                (function() {
                    
                    window.eval.call(window, code);
                })();
            }
        },
        djsExecute = function(source, callback) {
            
            pushExecution(arguments);
            
            if((djsExecuteStack.length - 1) && source != getCurrentExecution()[0]) {
                
                return;
            }
            
            log('Executing pre-cached script from ' + source);            
            
            var complete = (function(callback) {
                    
                    // TODO: Figure out why we do this. Seems sloppy...
                    switch(typeof(callback)) {
                        case "string":
                            return new Function(callback);
                        case "function":
                            return callback;
                        default:
                            return function(){};
                    }
                })(callback),
                loadHandler = function() {
                    
                    var self = this;
                    if(self.readyState && self.readyState != "complete" && self.readyState != "loaded") {
                        
                        return;
                    }
                    
                    completeExecution(source);
                    self.onload = self.onreadystatechange = null;
                    complete();
                },
                script = document.createElement('script'),
                cursor = document.getElementsByTagName('script')[0];
            
            script.onload = script.onreadystatechange = loadHandler;
            script.src = source;
            cursor.parentNode.insertBefore(script, cursor);
        },
        
        completeExecution = function(source) {
            
            if(!djsExecuteStack.length) {
                
                log("ERROR: We finished executing a script but the exec queue is empty: " + source);
                return;
            }
            
            if(source == getCurrentExecution()[0]) {
                
                nextExecution();
            } else {
                
                log("ERROR: We finished executing a script that wasn't on the queue: " + url);
            }
            
            if(getCurrentExecution()) {
                
                djsExecute.apply(this, getCurrentExecution());
            }
        },
        
        findScripts = function() {
            
            var scripts = document.getElementsByTagName('script');
            
            for(var i = 0, script; script = scripts[i++];) {
                
                if(getAttribute(script, 'type') === "text/djs" && !script.djsFound) {
                    
                    djsScripts.push(script);
                    script.djsFound = true;
                }
            }
            
            log('Found ' + djsScripts.length + ' scripts.');
        },
        precacheScripts = function() {
            
            var loadHandler = function(url, precacheObject) {
                    
                    log('Script at ' + url + ' successfully precached');
                    // TODO: Investigate the possibility of removing the precacheObject...
                    djsLoadedPaths[url] = true;
                };
            
            each(
                djsScripts,
                function(script, index) {
                    
                    var source = getAttribute(script, "djssrc", true);
                    
                    if(source) {
                        
                        var precacheAsImage = function() {
                                
                                var image = new Image();
                                
                                image.onload = function() { loadHandler(source, image); };
                                image.onerror = function() { loadHandler(source, image); };
                                image.src = source;
                            },
                            precacheAsObject = function() {
                                
                                var object = document.createElement('object');
                                
                                object.data = source;
                                object.width = 0;
                                object.height = 0;
                                object.style.display = "none";
                                object.onload = function() { loadHandler(source, object); };
                                object.onerror = function() { loadHandler(source, object); };
                                
                                document.body.appendChild(object);
                            }
                        
                        log('Precache-ing script at ' + source);
                        
                        isNavigator(Navigator.IE) || isNavigator(Navigator.Opera) ? precacheAsImage() : precacheAsObject();
                    }
                }
            );
        },
        
        processScripts = function() {
            
            log('Starting script processing phase.');
            
            processNextScript();
        },
        processNextScript = function() {
            
            if(getCurrentScript()) {
                
                log('Processing next script...');
                
                var script = getCurrentScript(),
                    source = getAttribute(script, 'djssrc', true),
                    processInline = function() {
                        
                        djsEval(script.text);
                    },
                    processCached = function(callback) {
                        
                        djsExecute(source, callback);
                    };
                
                if(source) {
                    
                    log('Has source: ' + source);
                    inspect(djsLoadedPaths);
                    
                    if(djsLoadedPaths[source]) {
                        
                        processCached(processNextScript);
                        nextScript();
                    } else {
                        
                        var now = Date.now();
                        
                        if(!script.startWait) {
                            
                            script.startWait = now;
                        }
                        
                        if(now - script.startWait < scriptTimeout) {
                            
                            log('Waiting for script to finish loading...');
                            setTimeout(processNextScript, scriptRetryInterval);
                        } else {
                            
                            log("Script loading timed out!");
                        }
                    }
                } else {
                    
                    processInline();
                    nextScript();
                    setTimeout(
                        processNextScript,
                        0
                    );
                }
                
                return;
            }
            
            // TODO: Second pass is lame; there must be a better way!
            findScripts();
            
            if(getCurrentScript()) {
                
                precacheScripts();
                setTimeout(processNextScript, 0);
                return;
            }
            
            log("Apparently done processing scripts!");
        },
        start = function() {
            
            document.write = document.writeln = djsWrite;
            
            findScripts();
            
            precacheScripts();
            
            // TODO: Control.js has an unimplemented defer option here. Maybe implement this?
            
            if ( "undefined" != typeof(document.readyState) && "complete" === document.readyState ) {
                
                processScripts();
            } else {
            
                addEventListener(window, 'load', processScripts);
            }
        };
    
    // Note: you probably shouldn't call this function... ;)
    window.resetNativeWrite = function() {
        
        document.write = nativeWrite;
        document.writeln = nativeWriteln;
    };
    
    start();
    
})(
    window,
    document,
    typeof DJS != "undefined" ? DJS : {}, 
    typeof exports != "undefined" ? exports : false
);