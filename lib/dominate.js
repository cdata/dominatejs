    var slaveDocument = new DJSDocument(document),
        slaveWindow = new DJSWindow(window),
        slaveScripts = new DJSScriptManager();

    slaveWindow.dominate();

    DJSUtil.log('Window dominated, moving on to all appropriate scripts!');
    slaveScripts.dominate();

    slaveWindow.whenLoaded(

        function() {

            DJSUtil.log('Show time. Dominating the document and executing scripts!');
            
            slaveDocument.dominate();

            slaveScripts.execute(

                function() {

                    
                    // Flushing the document.write buffer can insert new
                    // script nodes to the document, which won't execute
                    // until well after this javascript block completes.
                    // Ideally, window.onload shouldn't fire until those
                    // scripts and their subscripts terminate.
                    //
                    // Once those scripts are done, we can fire the load
                    // events and restore the native methods.
                    // 
                    // readwriteweb.com hits this use case.
                    // news.yahoo.com hits this use case.
                    // news.yahoo.com/video/ hits this use case.
                    //
                    // I've also seen some sites flash to blank, probably
                    // due to d.write calls after we've hit .restore().
                    slaveDocument.flush();
                    DJSUtil.log('Finished executing. Simulating load, ready and readystatechange events!');

                    slaveDocument.ready();
                    slaveWindow.load();

                    DJSUtil.log('Restoring native DOM methods!');

                    slaveWindow.restore();

                    DJSUtil.log('Took ' + (((new Date()).getTime()) - DJSUtil.epoch) + 'ms for total domination!');
                    DJSUtil.log('Fin.');
                }
            );
        }
    );
