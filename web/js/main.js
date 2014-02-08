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
                    $(this).find('#markdown > pre').html(data);
                },
                204: function() {
                    $(this).find('#markdown > pre').html('');
                },
                400: function() {
                    
                },
                405: function() {

                },
                500: function() {

                }
            }
        });
    })
});