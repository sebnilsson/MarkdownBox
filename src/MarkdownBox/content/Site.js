/// <reference path="~/Libraries/jquery-1.8.2.min.js"/>
/// <reference path="~/Libraries/dropbox.0.6.1.min.js"/>
/// <reference path="~/Libraries/pagedown/Markdown.Converter.js"/>
/// <reference path="~/Libraries/pagedown/Markdown.Editor.js"/>
/// <reference path="~/Libraries/pagedown/Markdown.Sanitizer.js"/>

(function (window, document, undefined) {
    'use strict';
    
    var dropboxClient = {
        encodedKey: 'kWWFk4v8E0A=|eLTWCRy1RDt8sJbVCXHYdHGAPrMWpBaGwgLkl6oPQg==',
        client: null,

        init: function () {
            dropboxClient.client = new Dropbox.Client({
                key: dropboxClient.encodedKey,
                sandbox: true
            });
            dropboxClient.client.authDriver(new Dropbox.Drivers.Redirect({ rememberUser: true }));

            dropboxClient.authenticate();
            
            $('#main').show();
        },

        authenticate: function () {
            dropboxClient.client.authenticate(function (error) {
                if (error) {
                    html.messageBox.showError(error);
                    return;
                }
                
                dropboxClient.client.getUserInfo(function (error, userInfo) {
                    if (error) {
                        html.messageBox.showError(error);
                        return;
                    }

                    html.messageBox.showMessage('You are logged in as <strong>' + userInfo.name + '</strong>', false, 3000);
                });

                $('#directory-content').show();

                html.directory.load();
            });
        },

        saveFile: function (path, content) {
            dropboxClient.client.writeFile(path, content, function (error, stat) {
                if (error) {
                    html.messageBox.showError(error);
                    return;
                }

                html.messageBox.showMessage("File saved as revision " + stat.versionTag);
            });
        }
    };

    var html = {
        initListeners: function () {
            $('#user-logout').click(function () {
                dropboxClient.client.signOut();
            });

            $('#directory-content-header-text').click(function () {
                html.directory.toggleExpand();
            });
            $('#directory-content-refresh').click(function () {
                html.directory.load();
            });
            $('#directory-content-entries').on('click', '.entry', function () {
                var path = $(this).attr('data-path');
                var title = $('.filename', this).text();
                var currentPath = $('#wmd-input').attr('data-path');
                if (currentPath) {
                    var result = confirm('Are you sure you want to change file? All changes will be lost.');
                    if (!result) {
                        return;
                    }
                }

                wmd.load(path, title);
            });

            $('#save-button').click(function () {
                var path = $('#wmd-input').attr('data-path');
                var content = $('#wmd-input').val();

                dropboxClient.saveFile(path, content);
            });
            $('#reset-button').click(function () {
                var result = confirm('Are you sure you want to reset? All changes will be lost.');
                if (result) {
                    wmd.load();
                }
            });

            var $wmdHtml = $('#wmd-html');
            var $wmdInput = $('#wmd-input');
            var $wmdPreview = $('#wmd-preview');
            $wmdInput.on('keyup', function () {
                $wmdHtml.val($wmdPreview.html());
            });

            $wmdHtml.click(function () {
                $wmdHtml.select();
            });
            $wmdHtml.keydown(function (e) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            });

            $('.click-once').click(function() {
                $(this).attr('disabled', 'disabled');
            });
        },

        messageBox: {
            initMessagebox: function () {
                $('#message-box').on('click', '.error, .message', function () {
                    html.messageBox.removeMessage($(this));
                });
            },
            showError: function (error) {
                error = error || {};
                var text;
                switch (error.status) {
                    case 401:
                        text = '401: User token expired.';
                        break;
                    case 404:
                        text = '404: The file or folder you tried to access is not in your Dropbox.';
                        break;
                    case 507:
                        text = '507: Your Dropbox is full.';
                        break;
                    case 503:
                        text = '503: Try again later.';
                        break;
                    case 400:
                        text = '400: Bad input parameter.';
                        break;
                    case 403:
                        text = '403: Bad OAuth request.';
                        break;
                    case 405:
                        text = '405: Request method not expected.';
                        break;
                    default:
                        text = 'An unknown error occurred.';
                }

                html.messageBox.showMessage(text, true);
            },
            showMessage: function (text, isError, timeout) {
                var errorClass = isError ? 'class="error" ' : 'class="message" ';
                var $message = $('#message-box').append('<div ' + errorClass + 'title="Click to dismiss">' + text + '</div>');

                if (timeout) {
                    setTimeout(function () {
                        html.messageBox.removeMessage($message);
                    }, timeout);
                }
            },
            removeMessage: function($element) {
                $element.animate({ height: '0px' }, 300, 'linear', function() {
                    $(this).remove();
                });
            }
        },
        
        directory: {
            load: function (path) {
                path = path || '/';
                
                var $entries = $('#directory-content-entries').empty();

                html.directory.loadStart();

                dropboxClient.client.readdir(path, function (error, entryTitles, data, entries) {
                    if (error) {
                        html.messageBox.showError(error);
                        
                        html.directory.loadEnd();
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

                        html.directory.addFile(entry.name, entry.path, entry.humanSize, $entries);
                    }

                    html.directory.loadEnd();
                });
            },
            addFile: function (name, path, size, $entries) {
                $entries = $entries || $('#directory-content-entries');

                $entries.append('<div class="entry clickable" data-path="' + path + '"><span class="filename">' + name + '</span>' +
                    ' <span class="filesize">(' + size + ')</span></div><div class="clearfix"></div>');
            },
            toggleExpand: function () {
                var isExpanded = $('#directory-content-header-text').hasClass('expanded');
                if (isExpanded) {
                    html.directory.setCollapsed();
                } else {
                    html.directory.setExpanded();
                }
            },
            setExpanded: function () {
                $('#directory-content-header-text').html('&#x25B2; Files').addClass('expanded'); // ▲
                $('#directory-content-entries').show();
            },
            setCollapsed: function () {
                $('#directory-content-header-text').html('&#x25BC; Files').removeClass('expanded'); // ▼
                $('#directory-content-entries').hide();
            },
            
            loadStart: function () {
                html.directory.setCollapsed();
                $('#directory-content-refresh').hide();
                $('#directory-content-spinner').show();
            },
            
            loadEnd: function () {
                html.directory.setExpanded();
                $('#directory-content-refresh').show();
                $('#directory-content-spinner').hide();
            }
        }
    };

    var wmd = {
        converter: null,
        editor: null,
        
        init: function () {
            $('#wmd').show();

            wmd.converter = wmd.converter || Markdown.getSanitizingConverter();
            wmd.editor = wmd.editor || new Markdown.Editor(wmd.converter);
            wmd.editor.run();
            wmd.editor.refreshPreview();
        },
        
        load: function (path, title) {
            path = path || $('#wmd-input').attr('data-path');
            if (title) {
                $('#wmd-file-title').text(title);
            }

            html.directory.setCollapsed();
            wmd.loadStart();

            dropboxClient.client.readFile(path, function (error, data) {
                if (error) {
                    html.messageBox.showError(error);
                    
                    wmd.loadEnd();
                    return;
                }

                var $wmdInput = $('#wmd-input');
                $wmdInput.val(data).attr('data-path', path);
                var $wmdPreview = $('#wmd-preview').html('&nbsp;');

                wmd.init();

                $('#wmd-html').val($wmdPreview.html());
                
                wmd.loadEnd();
                
                $('html, body').animate({
                    scrollTop: $('#wmd').offset().top
                }, 500, function () {
                    $wmdInput.focus();
                });
            });
        },
        
        loadStart: function () {
            $('#wmd-spinner-area').show();
            $('#wmd').hide();
        },
        loadEnd: function () {
            $('#wmd-spinner-area').hide();
            $('#wmd').show();
        }
    };

    if ($('html').hasClass('lt-ie10')) {
        return;
    }

    //html.messageBox.showMessage('Friendly message here');
    //html.messageBox.showError({ status: 401 });
    //html.messageBox.showError();

    //dropboxClient.directory.addFile('TestName1', 'TestPath1', '5000 GB');
    //dropboxClient.directory.addFile('TestName2', 'TestPath2', '5000 GB');
    //dropboxClient.directory.addFile('TestName3', 'TestPath3', '5000 GB');

    html.initListeners();
    html.messageBox.initMessagebox();

    dropboxClient.init();

    window.scrollTo(0, 1);
}(window, document));