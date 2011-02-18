/*
 * Watcher.js
 *
 * Watcher watches the JS/DOM interface.
 *
 * Watcher will log these actions
 * 
 * > CALL document.createElement
 * > CALL document.getElementsByClassName
 * > CALL document.getElementById
 * > CALL document.getElementsByTagName
 * > CALL document.write
 * > CALL document.writeln
 * > SET HTMLElement.innerHTML
 * 
 * Watcher is currently compatable with Firefox (since 
 * we're building it to debug an issue in Firefox)
 * but should be easily adaptable to webkit-based 
 * browsers.
 *
 */
(function(config,window,document,HTMLElement,undefined){

var El = HTMLElement.prototype;

var dom = {
   createElement: document.createElement,
   getElementsByClassName: document.getElementsByClassName,
   getElementById: document.getElementById,
   getElementsByTagName: document.getElementsByTagName,
   querySelector: document.querySelector,
   querySelectorAll: document.querySelectorAll,
   write: document.write,
   writeln: document.writeln
};

var element = {
   appendChild: El.appendChild,
   insertBefore: El.insertBefore,
   removeChild: El.removeChild,
   replaceChild: El.replaceChild
};

config.off = config.off || {};

window.watcher = {

    /*
     * watcher.log
     */
    log: function(m) {
        console.log("[Watcher] " + m);
    },

    config: config
};

var getWatcher = function(name, backup, callbacks) {
    return function watcherFn(){
        var response;
        /*
         * Call callbacks.pre
         * pass all arguments passed to the target method as an array
         */
        name in config.off || !!callbacks.pre && callbacks.pre.call(this,arguments);

        /*
         * Log the caller for a bit of context
         */
        name in config.off || !!watcherFn.caller && console.info(watcherFn.caller);

        response = backup.apply(this,arguments);

        /*
         * Call callbacks.post
         * pass arguments, plus return value
         */
        name in config.off || !!callbacks.post && callbacks.post.call(this,arguments,response);

        return response;
    };
};

document.getElementsByClassName = getWatcher(
    'document.getElementsByClassName',
    dom.getElementsByClassName,
    {
        post: function(args, response) {
            watcher.log('document.getElementsByClassName: ' + args[0] + ' -->');
            console.info(response);
        }
    }
);

document.getElementById = getWatcher(
    'document.getElementById',
    dom.getElementById,
    {
        post: function(args, response) {
            watcher.log('document.getElementById: ' + args[0] + ' -->');
            console.info(response);
        }
    }
);

document.getElementsByTagName = getWatcher(
    'document.getElementsByTagName',
    dom.getElementsByTagName,
    {
        post: function(args, response) {
            watcher.log('document.getElementsByTagName: ' + args[0] + ' -->');
            console.info(response);
        }
    }
);


document.write = getWatcher(
   'document.write',
   dom.write,
   {
        pre: function(args) {
            watcher.log('document.write: ' + args[0]);
        }
   }
);

document.writeln = getWatcher(
   'document.writeln',
   dom.writeln,
   {
        pre: function(args) {
            watcher.log('document.writeln: ' + args[0]);
        }
   }
);

var iframeCount = 0;

document.createElement = getWatcher(
    'document.createElement',
    dom.createElement,
    {
        pre: function(args) {
            watcher.log('Creating element of type: ' + args[0]);
        },
        post: function(args,response) {

           var type = args[0],
               element = response;

           if(type.indexOf('iframe') != -1) {
           
               (function(iframe, id) {
                   
                   watcher.log('[ IFRAME ' + id + ' ] iframe => ');
                   console.info(iframe);
                   
                   iframe.watch(
                       'innerHTML',
                       function(target, oldProp, newProp) {
                           
                           watcher.log('[ IFRAME ' + id + ' ] iframe.innerHTML => ' + newProp);
                           
                           return newProp;
                       }
                   );
                   
                   iframe.watch(
                       'content',
                       function(target, oldProp, newProp) {
                           
                           watcher.log('[ IFRAME ' + id + ' ] iframe.contents => ' + newProp);
                           
                           return newProp;
                       }
                   );
                   
                   iframe.watch(
                       'contentDocument',
                       function(target, oldProp, newProp) {
                           
                           watcher.log('[ IFRAME ' + id + ' ] iframe.contentDocument => ' + newProp);
                       }
                   );
                   
                   iframe.__defineSetter__(
                       'onload',
                       function(val) {
                           
                           watcher.log('[ IFRAME ' + id + ' ] iframe.onload => ' + onload);
                       }
                   );
                   
               })(element, iframeCount++);
               
               
           }
        }
    }
);

watcher.log('is watching you!');

})({
    off: {
        //'document.write':1, 'document.createElement':1, 'document.getElementsByTagName':1
    }
},window,document,HTMLElement);
