jQuery.extend({
    handleError: function( s, xhr, status, e ) {
        // If a local callback was specified, fire it
        if ( s.error ) {
            s.error.call( s.context || s, xhr, status, e );
        }

        // Fire the global callback
        if ( s.global ) {
            (s.context ? jQuery(s.context) : jQuery.event).trigger( "ajaxError", [xhr, s, e] );
        }
    },

    createUploadIframe: function(id, uri) {
        // Create frame
        var frameId = 'jUploadFrame' + id;
        var frameHtml = '<iframe id="' + frameId + '" name="' + frameId + '" style="position:absolute; top:-9999px; left:-9999px"';
        if(window.ActiveXObject) {
            if (typeof uri === 'boolean') {
                frameHtml += ' src="' + 'javascript:false' + '"';
            } else if (typeof uri === 'string') {
                frameHtml += ' src="' + uri + '"';
            }
        }
        frameHtml += ' />';
        jQuery(frameHtml).appendTo(document.body);

        return jQuery('#' + frameId);
    },
    createUploadForm: function(form, id, fileElementIds, data) {
        // Create form
        var formId = 'jUploadForm' + id,
            $form;
        if (!!form) {
            $form = jQuery(form).clone(true);
            $form.attr("id", formId);
        } else {
            $form = jQuery('<form action="" method="POST" name="' + formId + '" id="' + formId + '" enctype="multipart/form-data"></form>');
            if (data) {
                jQuery.each(data, function (key, val) {
                    jQuery('<input type="hidden" name="' + key + '" value="' + val + '" />').appendTo($form);
                });
            }
            // 多文件上传
            if (typeof(fileElementIds) === 'string') {
                fileElementIds = [fileElementIds];
            }

            jQuery.each(fileElementIds, function (_, id) {
                var $oldElement = jQuery('#' + id);
                var newElement = $oldElement.clone();
                $oldElement.attr('id', "jUploadFile" + id);
                $oldElement.before(newElement);
                $oldElement.appendTo($form);
            });
        }

        // set attributes
        $form.css('position', 'absolute');
        $form.css('top', '-1200px');
        $form.css('left', '-1200px');
        $form.appendTo('body');
        return $form;
    },

    ajaxWhirl: function(s) {
        // introduce global settings, allowing the client to modify them for all requests, not only timeout
        s = jQuery.extend({}, jQuery.ajaxSettings, s);
        var id = new Date().getTime(),
            $form = jQuery.createUploadForm(s.form, id, s.fileElementIds || s.fileElementId, (typeof(s.data) === 'undefined' ? false : s.data)),
            frameId = 'jUploadFrame' + id;
        jQuery.createUploadIframe(id, s.secureuri);
        // Watch for a new set of requests
        if ( s.global && ! jQuery.active++ ) {
            jQuery.event.trigger( "ajaxStart" );
        }
        var requestDone = false;
        // Create the request object
        var xml = {};
        if ( s.global )
            jQuery.event.trigger("ajaxSend", [xml, s]);
        // Wait for a response to come back
        var uploadCallback = function(isTimeout) {
            var io = document.getElementById(frameId);
            try {
                if (io.contentWindow) {
                    xml.responseText = io.contentWindow.document.body?io.contentWindow.document.body.innerHTML:null;
                    xml.responseXML = io.contentWindow.document.XMLDocument?io.contentWindow.document.XMLDocument:io.contentWindow.document;
                } else if(io.contentDocument) {
                    xml.responseText = io.contentDocument.document.body?io.contentDocument.document.body.innerHTML:null;
                    xml.responseXML = io.contentDocument.document.XMLDocument?io.contentDocument.document.XMLDocument:io.contentDocument.document;
                }
            } catch(e) {
                jQuery.handleError(s, xml, null, e);
            }
            if ( xml || isTimeout === "timeout") {
                requestDone = true;
                var status;
                try {
                    status = isTimeout !== "timeout" ? "success" : "error";
                    // Make sure that the request was successful or notmodified
                    if ( status !== "error" ) {
                        // process the data (runs the xml through httpData regardless of callback)
                        var data = jQuery.uploadHttpData( xml, s.dataType );
                        // If a local callback was specified, fire it and pass it the data
                        if ( s.success )
                            s.success( data, status );

                        // Fire the global callback
                        if ( s.global )
                            jQuery.event.trigger( "ajaxSuccess", [xml, s] );
                    } else {
                        jQuery.handleError(s, xml, status);
                    }
                } catch(e) {
                    status = "error";
                    jQuery.handleError(s, xml, status, e);
                }

                // The request was completed
                if ( s.global )
                    jQuery.event.trigger( "ajaxComplete", [xml, s] );

                // Handle the global AJAX counter
                if ( s.global && ! --jQuery.active )
                    jQuery.event.trigger( "ajaxStop" );

                // Process result
                if ( s.complete )
                    s.complete(xml, status);

                jQuery(io).unbind();

                setTimeout(function() {
                    try {
                        jQuery(io).remove();
                        jQuery($form).remove();
                    } catch(e) {
                        jQuery.handleError(s, xml, null, e);
                    }
                }, 100);
                xml = null;
            }
        };
        // Timeout checker
        if ( s.timeout > 0 ) {
            setTimeout(function(){
                // Check to see if the request is still happening
                if( !requestDone ) uploadCallback( "timeout" );
            }, s.timeout);
        }
        try {
            $form.attr('action', s.url);
            $form.attr('method', 'POST');
            $form.attr('target', frameId);
            if ($form.encoding) {
                $form.attr('encoding', 'multipart/form-data');
            } else {
                $form.attr('enctype', 'multipart/form-data');
            }
            $form.submit();
        } catch(e) {
            jQuery.handleError(s, xml, null, e);
        }

        jQuery('#' + frameId).load(uploadCallback);
        return {abort: function () {}};
    },

    uploadHttpData: function( r, type ) {
        var data = !type;
        data = type === "xml" || data ? r.responseXML : r.responseText;
        // If the type is "script", eval it in global context
        if ( type === "script" )
            jQuery.globalEval( data );
        // Get the JavaScript object, if JSON is used.
        if ( type === "json" )
            data = jQuery.parseJSON(data);
        // evaluate scripts within html
        if ( type === "html" )
            jQuery("<div>").html(data).evalScripts();

        return data;
    }
});

