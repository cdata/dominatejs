(function(window, $) {
    
    $(function() {
        
        var normalView = $('#NormalView'),
            djsView = $('#DJSView'),
            lastTarget;
        
        normalView.attr('src', '/tests/blank.html');
        djsView.attr('src', '/tests/blank.html');
        
        $('#TestNavigation a').bind(
            'click',
            function(event) {
                
                var target = $(event.currentTarget),
                    test = target.attr('rel');
                
                normalView.attr('src', '/tests/html5/' + test + '.html');
                djsView.attr('src', '/tests/html5/' + test + '-djs.html');
                
                if(lastTarget) {
                    
                    lastTarget.removeClass('active');
                }
                
                lastTarget = target.addClass('active');
            }
        );
    });
})(window, jQuery);