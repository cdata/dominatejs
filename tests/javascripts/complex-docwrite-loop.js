window.dwriteLoopCounter = window.dwriteLoopCounter || 1;

(function (counter) {
    var nextScriptToken = counter > 4 ? 'terminal' : 'loop';
    document.write(
        '<script>document.write("<script src=\\"/tests/javascripts/complex-docwrite-' + 
        nextScriptToken + '.js\\"><\\/script>");</script>');
})(window.dwriteLoopCounter++);
