(function(window, document, undefined) {
    
    console.log("Executing test wrappers!");
    var nativeWrite = document.write,
        nativeWriteCount = 0,
        nativeWriteln = document.writeln,
        nativeWritelnCount = 0,
        getElementsByClassName = function(parent, class) {
            
            var body = document.getElementsByTagName(parent)[0],
                children = body.getElementsByTagName('*'),
                search = new RegExp("\\b" + class + "\\b");
                result = [];
            
            for(var i = 0; i < children.length; i++) {
                
                var child = children[i];
                
                if(search.test(child.className)) {
                    
                    result.push(child);
                }
            }
            
            return result;
        },
        testWrites = function() {
            
            console.log("Existing written elements: " + getElementsByClassName('body', 'dw').length + ". Total write calls: " + (nativeWriteCount + nativeWritelnCount));
        };
    
    document.write = function() {
        console.log("Caught write: " + arguments[0]);
        nativeWriteCount++;
        nativeWrite.apply(this, arguments);
    };
    
    document.writeln = function() {
        
        nativeWritelnCount++;
        nativeWrite.apply(this, arguments);
    };
    
    window.testWrites = testWrites;
    
})(window, document);