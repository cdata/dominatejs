(function(window, $) {
    
    $(function() {
        
        var normalView = $('#NormalView iframe'),
            normalViewLink = $('#NormalView .test-link'),
            djsView = $('#DJSView iframe'),
            djsViewLink = $('#DJSView .test-link'),
            lastTarget;
        
        normalView.attr('src', '/tests/blank.html');
        djsView.attr('src', '/tests/blank.html');
        
        $('#TestNavigation a').bind(
            'click',
            function(event) {
                
                var target = $(event.currentTarget),
                    test = target.attr('rel');
                
                normalView.attr('src', '/tests/' + test + '.html');
                normalViewLink.attr('href', '/tests/' + test + '.html');

                djsView.attr('src', '/tests/' + test + '-djs.html');
                djsViewLink.attr('href', '/tests/' + test + '-djs.html');
                
                if(lastTarget) {
                    
                    lastTarget.removeClass('active');
                }
                
                lastTarget = target.addClass('active');

                $('#TestContainer').addClass('active');
            }
        );
    });
})(window, jQuery);
