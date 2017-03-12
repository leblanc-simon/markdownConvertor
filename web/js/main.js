/*
 Copyright © 2014 Simon Leblanc <contact@leblanc-simon.eu>
 This work is free. You can redistribute it and/or modify it under the
 terms of the Do What The Fuck You Want To Public License, Version 2,
 as published by Sam Hocevar. See http://www.wtfpl.net/ for more details.
 */
var send = null;
var in_print_mode = false;

function preparePrint()
{
    in_print_mode = true;
    $('body').addClass('print');
}


function escapePrint()
{
    in_print_mode = false;
    $('body').removeClass('print');
}

$(document).ready(function(){
    $('#source > textarea').on('keyup', function(){
        var content = $(this).val();

        if (send !== null) {
            send.abort();
        }

        send = $.ajax({
            url: './convert.php',
            type: 'POST',
            context: document.body,
            data: 'source=' + encodeURIComponent(content),
            dataType: 'html',
            statusCode: {
                200: function(data) {
                    $(this).find('#alert').addClass('hide');
                    $(this).find('#alert-content').html('');
                    $(this).find('#markdown > pre').html(data);
                    $('#markdown > pre pre code').each(function(i, e) {hljs.highlightBlock(e)});
                },
                204: function() {
                    $(this).find('#alert').addClass('hide');
                    $(this).find('#alert-content').html('');
                    $(this).find('#markdown > pre').html('');
                },
                400: function() {
                    $(this).find('#alert').removeClass('hide');
                    $(this).find('#alert-content').html('Bad request : no content send in the server');
                },
                405: function() {
                    $(this).find('#alert').removeClass('hide');
                    $(this).find('#alert-content').html('Bad request : content no send with POST method');
                },
                500: function() {
                    $(this).find('#alert').removeClass('hide');
                    $(this).find('#alert-content').html('Big error : contact administrator');
                }
            }
        });
    });

    $(document).bind('keyup keydown', function(e){
        if (in_print_mode === false && e.ctrlKey && e.keyCode == 80) {
            preparePrint();
            return false;
        }

        if (in_print_mode === true && e.keyCode == 27) {
            escapePrint();
            return false;
        }

        return true;
    })
});