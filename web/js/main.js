var send = null;

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
            data: 'source=' + encodeURI(content),
            dataType: 'html',
            statusCode: {
                200: function(data) {
                    $(this).find('#alert').addClass('hide');
                    $(this).find('#alert-content').html('');
                    $(this).find('#markdown > pre').html(data);
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
    })
});