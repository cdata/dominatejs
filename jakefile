var fs = require('fs'),
    util = require('util'),
    http = require('http'),
    querystring = require('querystring'),
    closure = http.createClient('80', 'closure-compiler.appspot.com'),
    concatenate = function(inputFiles, outputFile, callback) {
        
        var contents = [],
            callback = callback || outputFile,
            complete = function() {
                
                if(callback) {
                    
                    callback(contents.join('\n'));
                }
            };
        
        inputFiles.forEach(
            function(file, index) {
                
                fs.readFile(
                    file,
                    function(error, data) {
                        
                        if(error) {
                            
                            util.error("Error reading concatenation target " + file + ": " + error);
                            contents[index] = "/* ERROR READING FILE: " + file + " */"
                        } else {
                            
                            contents[index] = data;
                        }
                        
                        if(index == inputFiles.length - 1) {
                            
                            if(outputFile == callback) {
                                
                                complete();
                            } else {
                                
                                fs.writeFile(
                                    outputFile,
                                    contents.join('\n'),
                                    function(error) {
                                        
                                        if(error) {
                                            
                                            util.error("Error writing concatenated file: " + error);
                                        } else {
                                            
                                            complete();
                                        }
                                    }
                                );
                            }
                        }
                    }
                );
            }
        );
    },
    minify = function(input, outputFile, callback) {
        
        var options = [
                "output_format=json",
                "output_info=compiled_code",
                "output_info=statistics",
                "compilation_level=ADVANCED_OPTIMIZATIONS",
                "js_code=" + querystring.escape(input)
            ].join("&"),
            request = closure.request(
                'POST',
                '/compile',
                {
                    "Host" : "closure-compiler.appspot.com",
                    "Referer" : "http://closure-compiler.appspot.com/home",
                    "Content-Type" : "application/x-www-form-urlencoded;charset=UTF-8",
                    "Content-Length" : options.length,
                    "Accept" : "*/*",
                }
            ),
            complete = function(result, stats) {
                
                if(callback) {
                    
                    callback(result, stats);
                }
            };
        
        request.write(options);
        
        request.once(
            'response',
            function(response) {
                
                var responseJSON = "";
                
                response.on(
                    'data',
                    function(chunk) {
                        
                        responseJSON += chunk;
                    }
                ).on(
                    'end',
                    function() {
                        
                        try {
                            
                            var response = JSON.parse(responseJSON),
                                code = querystring.unescape(response.compiledCode),
                                stats = response.statistics;
                            
                            if(outputFile == callback) {
                                
                                complete(code, stats);
                            } else {
                                
                                fs.writeFile(
                                    outputFile,
                                    code,
                                    function(error) {
                                        
                                        if(error) {
                                            
                                            util.error("Error writing minified file: " + error);
                                        } else {
                                            
                                            complete(code, stats);
                                        }
                                    }
                                );
                            }
                        } catch(e) {
                            
                            complete(e.toString());
                        }
                    }
                );
            }
        );
        
        request.end();
    };

task(
    'nominify',
    [],
    function() {
        
        util.log('Concatenating library...');
        
        concatenate(
            [
                "./lib/libraryprefix.js",
                "./vendor/htmlparser/lib/htmlparser.js",
                "./lib/dominate.js",
                "./lib/librarysuffix.js"
            ],
            "./dist/cf-control.js",
            function(concatenated) {
                
                util.log('Concatenation complete!');
            }
        );
    },
    true
);

task(
    'default',
    [],
    function() {
        
        util.log('Concatenating library...');
        
        concatenate(
            [
                "./lib/libraryprefix.js",
                "./vendor/htmlparser/lib/htmlparser.js",
                "./lib/dominate.js",
                "./lib/librarysuffix.js"
            ],
            "./dist/dominate.js",
            function(concatenated) {
                
                util.log('Concatenation complete!');
                util.log('Minifying library...');
                
                minify(
                    concatenated,
                    "./dist/dominate.min.js",
                    function(minified, statistics) {
                        
                        util.log('Minification complete!');
                        
                        util.log('Original size: ' + statistics.originalSize + ' bytes (' + statistics.originalGzipSize + ' bytes gzipped)');
                        util.log('Minified size: ' + statistics.compressedSize + ' bytes (' + statistics.compressedGzipSize + ' bytes gzipped)');
                        util.log('Compression: ' + Math.floor((1 - statistics.compressedSize / statistics.originalSize) * 100) + '% (' +  Math.floor((1 - statistics.compressedGzipSize / statistics.originalGzipSize) * 100) + '% gzipped)' );
                        util.log('Total compression (minify + gzip): ' + Math.floor((1 - statistics.compressedGzipSize / statistics.originalSize) * 100) + '%');
                    }
                );
            }
        );
    }
);