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

