/*
 Copyright © 2014 Simon Leblanc <contact@leblanc-simon.eu>
 This work is free. You can redistribute it and/or modify it under the
 terms of the Do What The Fuck You Want To Public License, Version 2,
 as published by Sam Hocevar. See http://www.wtfpl.net/ for more details.
 */
let controller, signal;
let inPrintMode = false;
let contentJustSaved = false;
const sourceInput = document.querySelector('#source > textarea');

/**
 * Show print mode.
 */
const preparePrint = () => {
    inPrintMode = true;
    document.querySelector('body').classList.add('print');
};

/**
 * Return to edit mode.
 */
const escapePrint = () => {
    inPrintMode = false;
    document.querySelector('body').classList.remove('print');
};

/**
 * Check if we must go or escape print mode.
 *
 * @param {object} event
 * @returns {boolean}
 */
const printMode = event => {
    if (inPrintMode === false && event.ctrlKey && 'p' === event.key) {
        event.preventDefault();
        preparePrint();
        return false;
    }

    if (inPrintMode === true && 'Escape' === event.key) {
        event.preventDefault();
        escapePrint();
        return false;
    }

    return true;
};

/**
 * Replace Tab by 4 spaces.
 *
 * @param event
 * @see http://stackoverflow.com/a/1738888
 */
const manageTabulation = event => {
    if ('Tab' !== event.key) {
        return;
    }

    event.preventDefault();

    const valueTab = '    ';
    const startPosition = sourceInput.selectionStart;
    const endPosition = sourceInput.selectionEnd;
    const scrollTop = sourceInput.scrollTop;

    sourceInput.value = sourceInput.value.substring(0, startPosition) +
        valueTab + sourceInput.value.substring(endPosition, sourceInput.value.length);
    sourceInput.focus();
    sourceInput.selectionStart = startPosition + valueTab.length;
    sourceInput.selectionEnd = startPosition + valueTab.length;
    sourceInput.scrollTop = scrollTop;
};

/**
 * Display an error message.
 *
 * @param msg
 */
const displayError = msg => {
    document.getElementById('alert').classList.remove('hide');
    document.getElementById('alert-content').innerHTML = msg;
};

/**
 * Hide error messages.
 */
const hideError = () => {
    document.getElementById('alert').classList.add('hide');
    document.getElementById('alert-content').innerHTML = '';
};

/**
 * Display the content converted to HTML.
 *
 * @param content
 */
const showContent = content => {
    hideError();
    document.querySelector('#markdown > pre').innerHTML = content;
    if (content) {
        document.querySelectorAll('#markdown > pre pre code').forEach(element => {
            hljs.highlightBlock(element)
        });
    }
};

/**
 * Convert Markdown code to HTML.
 */
const convertMarkdownToHTML = () => {
    const content = sourceInput.value;

    if (undefined !== controller) {
        controller.abort();
    }

    controller = new AbortController();
    signal = controller.signal;
    fetch('./convert.php', {
        signal: signal,
        method: 'POST',
        body: 'source=' + encodeURIComponent(content),
        headers: {
            'Content-Type':'application/x-www-form-urlencoded',
        },
        credentials: 'same-origin',
        mode: 'cors',
    }).then(response => {
        if (response.ok) {
            return response.text();
        }

        const errors = {
            400: 'Bad request : no content send in the server',
            405: 'Bad request : content no send with POST method',
            500: 'Big error : contact administrator',
        };

        if (response.status in errors) {
            throw errors[response.status];
        }

        throw 'Unknown error';
    }).then(content => {
        showContent(content);
    }).catch(error => {
        if (error && error.name && 'AbortError' === error.name) {
            return;
        }

        displayError(error);
    });
};

/**
 * Save the content into a revision.
 *
 * @param event
 */
const saveContent = event => {
    if (!event.ctrlKey || 's' !== event.key) {
        return;
    }

    event.preventDefault();

    const regexp = new RegExp('^#([a-z0-9]+)(/([0-9]+))?');
    let body = 'content=' + encodeURIComponent(sourceInput.value);
    if (window.location.hash && true === regexp.test(window.location.hash)) {
        const matches = window.location.hash.match(regexp);
        body += '&directory=' + encodeURIComponent(matches[1]);
    }

    fetch('./app.php', {
        method: 'POST',
        body: body,
        headers: {
            'Content-Type':'application/x-www-form-urlencoded',
        },
        credentials: 'same-origin',
        mode: 'cors',
    }).then(response => {
        if (false === response.ok) {
            throw 'Unknown error';
        }

        return response.json();
    }).then(json => {
        contentJustSaved = true;
        window.location.hash = '#' + json.directory + '/' + json.revision;
    }).catch(error => {
        displayError(error);
    })
};

/**
 * Load the content from a revision.
 */
const loadContent = () => {
    if (!window.location.hash || true === contentJustSaved) {
        contentJustSaved = false;
        return;
    }

    const regexp = new RegExp('^#([a-z0-9]+)(/([0-9]+))?');
    if (false === regexp.test(window.location.hash)) {
        // Bad hash
        return;
    }

    const matches = window.location.hash.match(regexp);
    let url = './app.php?directory=' + encodeURIComponent(matches[1]);

    if (4 === matches.length && undefined !== matches[3]) {
        url += '&revision=' + encodeURIComponent(matches[3]);
    }

    fetch(url, {
        method: 'GET',
        credentials: 'same-origin',
        mode: 'cors',
    }).then(response => {
        if (false === response.ok) {
            throw 'Unknow error';
        }

        return response.text();
    }).then(content => {
        sourceInput.value = content;
        convertMarkdownToHTML();
    }).catch(error => {
        displayError(error);
    })
};

(() => {
    sourceInput.addEventListener('keydown', manageTabulation, false);
    sourceInput.addEventListener('keyup', convertMarkdownToHTML, false);

    document.addEventListener('keyup', printMode, false);
    document.addEventListener('keydown', printMode, false);
    document.addEventListener('keydown', saveContent, false);

    loadContent();

    window.addEventListener('hashchange', loadContent, false);
})();
