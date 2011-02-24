var uglifyParser = require('uglify-js').parser,
    uglifyProcessor = require('uglify-js').uglify,
    util = require('util'),
    fs = require('fs'),
    process = require('child_process'),
    concatenate = function(inputFiles, outputFile, callback) {
        
        var contents = [],
            callback = callback || outputFile,
            complete = function() {
                
                if(callback) {
                    
                    callback(contents.join('\n'));
                }
            },
            parsed = 0;
        
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
                        
                        parsed++;
                        
                        if(parsed == inputFiles.length) {
                            
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
    css = function(inputFile, outputFile, minify) {
         
        fs.unlink(
            outputFile,
            function() {
                
                fs.readFile(
                    inputFile,
                    function(error, data) {
                        
                        if(error) {
                            
                            util.log('Error reading stylus input: ' + error);
                        } else {
                            
                            stylus(data.toString('utf8'))
                            .set('compress', minify)
                            .render(
                                function(error, css) {
                                    
                                    if(error) {
                                        
                                        util.log(error)
                                    } else {
                                        
                                        fs.writeFile(
                                            outputFile,
                                            css,
                                            function(error) {
                                                
                                                if(error) {
                                                    
                                                    util.log('Error writing ' + (minify ? 'normal' : 'minified') + ' css!');
                                                } else {
                                                    
                                                    util.log('Wrote ' + (minify ? 'normal' : 'minified') + ' css!');
                                                }
                                            }
                                        );
                                    }
                                }
                            );
                        }
                    }
                );
            }
        );
        
        
    },
    minify = function(input, outputFile, callback) {
    
        var minified = uglifyProcessor.gen_code(uglifyProcessor.ast_squeeze(uglifyParser.parse(input)));
        
        fs.writeFile(
            outputFile,
            minified,
            function(error) {
                
                if(error) {
                    
                    until.error('Error writing minified file: ' + error);
                } else {
                    
                    callback();
                }
            }
        );
    },
    library = [
        
        "./lib/libraryprefix.js",
        "./vendor/htmlparser/lib/htmlparser.js",
        "./lib/dominate.js",
        "./lib/librarysuffix.js"
    ];

task(
    'js',
    [],
    function() {
        
        
        concatenate(
            library,
            './dist/dominate.js',
            function(output) {
                
                util.log('Wrote normal js!');
                
                minify(
                    
                    output,
                    './dist/dominate.min.js',
                    function() {
                        
                        util.log('Wrote minified js!');
                    }
                );
            }
        );
    }
);

task(
    'default',
    ['js'],
    function() {
        
    }
);

