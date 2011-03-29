/*
 * Try pre-loading javascript assets
 * using different preloading strategies.
 *
 * Hypothesis: some filenames may be incompatable
 * with the object preloading strategy in Chrome, at least.
 */
$(function() {

    var config = {
        host: '192.168.121.133:8201',
        appendTarget: (window.navigator.userAgent.indexOf('Firefox/') !== -1) ? document.getElementsByTagName('head')[0] : document.body,
    };
        
    var strategies = ['image', 'object', 'printcss'],

        filenames = {
            'js': '/myscript.js',
            'php': '/myphpscript.php',
            'php3': '/myphpscript.php3',
            'asp': '/myphpscript.asp',
            'aspx': '/myphpscript.aspx',
            'jsp': '/myphpscript.jsp',
            'html': '/myhtmlscript.html',
            'shtml': '/myhtmlscript.shtml',
            'css': '/mycssscript.css',
            'none': '/myjs120424',
            'php-long': '/combo.php?type=js&version=23b4b&files=mootools.v1.11_jsmin,mootools_ext,lab,video,framebuster,stats_module,stats_sparkline,google_afc,forage,share,moo_rainbow,embed,scrollybrozar,swfobject.v2.2&ssl=0'
        },

        getUrl = function(strategy, filenametype) {
            var path = filenames[filenametype];

            path = '/strategy=' + strategy + path;

            return 'http://' + config.host + path;
        },

        getHandler = {
        'load': function(strategy, filenametype) {
            return function() {
                $('.'+strategy+'-preload .'+filenametype).html('LOAD OK');
            };
        },
        'error': function(strategy, filenametype) {
            return function(e) {
                console.log(e);
                $('.'+strategy+'-preload .'+filenametype).html('LOAD ERR');
            };
        },
    },

        strategycode = {
        'image': function(filenametype) {

            var url = getUrl(strategy, filenametype),
                i = new Image();
            i.onload = getHandler.load('image', filenametype);
            i.onerror = getHandler.error('image', filenametype);
            i.src = url;

            setTimeout(function() {
                $("<script src='"+url+"'></script>").appendTo(config.appendTarget);
            }, 500);
        },

        'object': function(filenametype) {

            var url = getUrl(strategy, filenametype),
                o = document.createElement('object');
            o.onload = getHandler.load('object', filenametype);
            o.onerror = getHandler.error('object', filenametype);
            o.data = url;
            o.width = 0;
            o.height = 0;
            o.style.position = "absolute";
            o.style.left = "-999";

            config.appendTarget.appendChild(o);

            setTimeout(function() {
                $("<script src='"+url+"'></script>").appendTo(config.appendTarget);
            }, 500);
        },

        'printcss': function(filenametype) {

            var url = getUrl(strategy, filenametype);

            $("<link rel='stylesheet' media='print' href='"+url+"'></link>")
                .load(getHandler.load('printcss', filenametype))
                .error(getHandler.error('printcss', filenametype))
                .appendTo($("head"));

            setTimeout(function() {
                $("<script src='"+url+"'></script>").appendTo(config.appendTarget);
            }, 500);
        }
    };

    for(var i in strategies) {

        var strategy = strategies[i];

        if (strategy == "object" && (window.navigator.userAgent.indexOf('MSIE') !== -1)) continue;

        for (var type in filenames) {

            console.log('trying pair ' + type + ' ' + strategy);
            strategycode[strategy](type);
        }
    }
});
