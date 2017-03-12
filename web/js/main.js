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
    var $source = $('#source').find(' > textarea');

    /**
     * Replace tab by 4 spaces
     * @see http://stackoverflow.com/a/1738888
     */
    $source.on('keydown', function (event) {
        var key_code = event.keyCode || event.which;

        if (key_code === 9) { // tab character
            event.preventDefault();

            var value_tab = '    ';
            var start_pos = this.selectionStart;
            var end_pos = this.selectionEnd;
            var scroll_top = this.scrollTop;
            this.value = this.value.substring(0, start_pos) + value_tab + this.value.substring(end_pos, this.value.length);
            this.focus();
            this.selectionStart = start_pos + value_tab.length;
            this.selectionEnd = start_pos + value_tab.length;
            this.scrollTop = scroll_top;
        }
    });

    $source.on('keyup', function () {
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

    $(document).bind('keyup keydown', function (event) {
        if (in_print_mode === false && event.ctrlKey && event.keyCode == 80) {
            preparePrint();
            return false;
        }

        if (in_print_mode === true && event.keyCode == 27) {
            escapePrint();
            return false;
        }

        return true;
    });
});