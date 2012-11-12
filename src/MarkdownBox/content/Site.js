/// <reference path="~/Libraries/jquery-1.8.2.min.js"/>
/// <reference path="~/Libraries/dropbox.0.6.1.min.js"/>
/// <reference path="~/Libraries/pagedown/Markdown.Converter.js"/>
/// <reference path="~/Libraries/pagedown/Markdown.Editor.js"/>
/// <reference path="~/Libraries/pagedown/Markdown.Sanitizer.js"/>

(function(window, document, undefined) {
    var markdownBox = {
        converter: null,
        editor: null,
        encodedKey: 'kWWFk4v8E0A=|eLTWCRy1RDt8sJbVCXHYdHGAPrMWpBaGwgLkl6oPQg==',
        client: null,
            
        init: function() {
            markdownBox.client = new Dropbox.Client({
                key: markdownBox.encodedKey,
                sandbox: true
            });
            markdownBox.client.authDriver(new Dropbox.Drivers.Redirect());

            $('#main').show();

            markdownBox.initListeners();
            
            if (window.location.hash.indexOf('?_dropboxjs_scope') < 0) {
                $('#dropbox-login').show();
                $('#dropbox-login button').one('click', function() {
                    markdownBox.client.authenticate();
                });
                return;
            }

            markdownBox.client.authenticate(function (error, client) {
                if (error) {
                    markdownBox.showError(error);
                    return;
                }

                $('#directory-content').show();
                
                markdownBox.listEntries();
            });
        },
        
        initListeners: function () {
            $('#directory-content-header-text').click(function () {
                markdownBox.toggleEntriesExpand();
            });
            $('#directory-content-refresh').click(function () {
                markdownBox.listEntries();
            });
            $('#directory-content-entries').on('click', '.entry', function () {
                var path = $(this).attr('data-path');
                markdownBox.populateEditor(path);
            });

            $('#save-button').click(function () {
                var path = $('#wmd-input').attr('data-path');
                var content = $('#wmd-input').val();

                markdownBox.saveEditor(path, content);
            });
            $('#reset-button').click(function () {
                markdownBox.populateEditor();
            });
            $('#show-html').click(function () {
                var html = $('#wmd-preview').html();
                $('#wmd-html').val(html);
            });
        },
        
        initMessagebox: function () {
            $('#message-box').on('click', '.error, .message', function() {
                $(this).remove();
            });
        },

        showError: function (error) {
            error = error || { };
            var message;
            switch (error.status) {
                case 401:
                    message = '401: User token expired.';
                    break;
                case 404:
                    message = '404: The file or folder you tried to access is not in your Dropbox.';
                    break;
                case 507:
                    message = '507: Your Dropbox is full.';
                    break;
                case 503:
                    message = '503: Try again later.';
                    break;
                case 400:
                    message = '400: Bad input parameter.';
                    break;
                case 403:
                    message = '403: Bad OAuth request.';
                    break;
                case 405:
                    message = '405: Request method not expected.';
                    break;
                default:
                    message = 'An unknown error occurred.';
            }

            markdownBox.showMessage(message, true);
        },
        showMessage: function (message, isError) {
            var errorClass = isError ? 'class="error" ' : 'class="message" ';
            $('#message-box').append('<div ' + errorClass + 'title="Click to dismiss">' + message + '</div>');
        },
        
        initEditor: function () {
            $('#wmd').show();

            markdownBox.converter = markdownBox.converter || Markdown.getSanitizingConverter();
            markdownBox.editor = markdownBox.editor || new Markdown.Editor(markdownBox.converter);
            markdownBox.editor.run();
        },

        listEntries: function () {
            var $entries = $('#directory-content-entries').empty();
            
            markdownBox.client.readdir('/', function (error, entryTitles, data, entries) {
                if (error) {
                    markdownBox.showError(error);
                    return;
                }

                if (!entries.length) {
                    $entries.text('No entries found').addClass('no-entries');
                    return;
                }

                for (var i = entries.length - 1; i >= 0; i--) {
                    var entry = entries[i];
                    if (entry.isFolder) {
                        continue;
                    }

                    markdownBox.addEntry(entry.name, entry.path, entry.humanSize, $entries);
                }

                markdownBox.setEntriesContract();
            });
        },
        
        addEntry: function (name, path, size, $entries) {
            $entries = $entries || $('#directory-content-entries');
            
            $entries.append('<div class="entry" data-path="' + path + '"><span class="filename">' + name + '</span>' +
                ' <span class="filesize">(' + size + ')</span></div>');
        },
        
        populateEditor: function (path) {
            path = path || $('#wmd-input').attr('data-path');

            markdownBox.client.readFile(path, function (error, data) {
                if (error) {
                    return showError(error);
                }

                markdownBox.setEntriesExpand();

                $('#wmd-input').val(data).attr('data-path', path);
                $('#wmd-preview').html('&nbsp;');
                $('#wmd-html').val('');
                
                markdownBox.initEditor();
            });
        },
        
        saveEditor: function(path, content) {
            markdownBox.client.writeFile(path, content, function (error, stat) {
                if (error) {
                    return showError(error);
                }

                markdownBox.showMessage("File saved as revision " + stat.versionTag);
            });
        },
        
        toggleEntriesExpand: function () {
            var isExpanded = $('#directory-content-header-text').hasClass('expanded');
            if (isExpanded) {
                markdownBox.setEntriesExpand();
            } else {
                markdownBox.setEntriesContract();
            }
        },
        setEntriesExpand: function () {
            $('#directory-content-header-text').html('&#x25BC; Files').removeClass('expanded'); // ▼
            $('#directory-content-entries').hide();
        },
        setEntriesContract: function () {
            $('#directory-content-header-text').html('&#x25B2; Files').addClass('expanded'); // ▲
            $('#directory-content-entries').show();
        }
    };
    
    if ($('html').hasClass('lt-ie10')) {
        return;
    }

    //markdownBox.showMessage('Friendly message here');
    //markdownBox.showError({ status: 401 });
    //markdownBox.showError();

    //markdownBox.addEntry('TestName1', 'TestPath1', '5000 GB');
    //markdownBox.addEntry('TestName2', 'TestPath2', '5000 GB');
    //markdownBox.addEntry('TestName3', 'TestPath3', '5000 GB');
    
    markdownBox.initMessagebox();
    markdownBox.init();
}(window, document));