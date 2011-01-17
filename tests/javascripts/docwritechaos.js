(function(document, window, undefined) {
    
    var DWC = window.DWC || (function(){
        
        var log = function(out) { try { console.log("[ DWC ] " + out); } catch(e) {} },
        writeCount = 0,
        write = function(out) { out = "<p>" + out + "<span>[ " + (window.DWCLocation || "I HAVE NO IDEA WHERE I AM") + " ]&nbsp;</span></p>"; !!(writeCount++ % 2) ? document.write(out) : document.writeln(out); },
        writeScript = function(source) { write('<script type="text/javascript" src="' + source + '"></script>'); };
        
        return {
            
            log: log,
            write: write,
            writeScript: writeScript
        };
        
    })();
    
    DWC.runtime++;
    DWC.runtime ? DWC.runtime++ : DWC.runtime = 1;
    
    DWC.write("=== document.write powers activate! ===");
    DWC.write("<span>HI I HEARD YOU LIKE <b>DOCUMENT.WRITE!</b></span>");
    
    if(DWC.runtime < 2) {
        
        setTimeout(
            function() {
                
                DWC.writeScript('/tests/javascripts/docwritechaos.js');
            },
            500
        );
    }
    
    DWC.write("=== document.write AWAAAYYYY! {fin} ===");
    
    window.DWC = DWC;
    
})(document, window);