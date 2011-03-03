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

