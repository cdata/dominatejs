(function(window) {
    
    window.DJS = [{verbose: true}];
    var djsscript = document.createElement('script');
    djsscript.src = "/dist/dominate.js";
    djsscript.async = true;
    var djssib = document.getElementsByTagName('script')[0];
    djssib.parentNode.insertBefore(djsscript, djssib);
})(window);
