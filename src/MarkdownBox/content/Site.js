/// <reference path="~/Libraries/jquery-1.8.2.min.js"/>
/// <reference path="~/Libraries/dropbox.0.6.1.min.js"/>
/// <reference path="~/Libraries/pagedown/Markdown.Converter.js"/>
/// <reference path="~/Libraries/pagedown/Markdown.Editor.js"/>
/// <reference path="~/Libraries/pagedown/Markdown.Sanitizer.js"/>

(function(window, document, undefined) {
    var markdownBox = {
        appFolderName: 'MarkdownBoxFiles',
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
                $('#entries-refresh').click(function() {
                    markdownBox.listEntries();
                });
                $('#entries').on('click', '.entry', function () {
                    var path = $(this).attr('data-path');
                    markdownBox.populateEditor(path);
                });

                $('#save-button').click(function () {
                    var path = $('#wmd-input').attr('data-path');
                    var content = $('#wmd-input').val();
                    
                    markdownBox.saveEditor(path, content);
                });

                markdownBox.listEntries();
            });
        },

        showError: function (error) {
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
                    message = '403:  OAuth request.';
                    break;
                case 405:
                    message = '405: Request method not expected.';
                    break;
                default:
                    message = 'An unknown error occurred.';
            }

            $('#error-message').text(message);
        },
        
        initEditor: function () {
            $('#wmd').show();

            markdownBox.converter = markdownBox.converter || Markdown.getSanitizingConverter();
            markdownBox.editor = markdownBox.editor || new Markdown.Editor(markdownBox.converter);
            markdownBox.editor.run();
        },

        listEntries: function () {
            markdownBox.client.readdir('/', function (error, entryTitles, data, entries) {
                if (error) {
                    markdownBox.showError(error);
                    return;
                }

                var $entries = $('#entries').empty();
                if (!entries.length) {
                    $entries.text('No entries found').addClass('no-entries');
                    return;
                }

                for (var i = entries.length - 1; i >= 0; i--) {
                    var entry = entries[i];
                    if (entry.isFolder) {
                        continue;
                    }
                    
                    $entries.append('<div class="entry" data-path="' + entry.path + '">' + entry.name + ' (' + entry.humanSize + ')</div>');
                }
            });
        },
        
        populateEditor: function(path) {
            markdownBox.client.readFile(path, function (error, data) {
                if (error) {
                    return showError(error);
                }

                $('#wmd-input').val(data).attr('data-path', path);
                
                markdownBox.initEditor();
                
                console.log(data);
            });
        },
        
        saveEditor: function(path, content) {
            markdownBox.client.writeFile(path, content, function (error, stat) {
                if (error) {
                    return showError(error);
                }

                console.log("File saved as revision " + stat.versionTag);
            });
        }
    };

    markdownBox.init();
}(window, document));