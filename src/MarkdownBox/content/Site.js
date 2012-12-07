/// <reference path="~/Libraries/jquery-1.8.3.min.js"/>
/// <reference path="~/Libraries/dropbox.0.6.1.min.js"/>
/// <reference path="~/Libraries/pagedown/Markdown.Converter.js"/>
/// <reference path="~/Libraries/pagedown/Markdown.Editor.js"/>
/// <reference path="~/Libraries/pagedown/Markdown.Sanitizer.js"/>

(function (window, document, undefined) {
    'use strict';

    var isDirty, $main, $directory, $directoryContent, $directoryContentHeaderText, $directoryContentRefresh, $directoryContentEntries,
        $wmd, $wmdPanel, $wmdInput, $wmdPreview, $wmdHtml, $wmdHtmlToggle, $wmdSpinnerArea;
    $main = $('#main');
    $directory = $('#directory');
    $directoryContent = $('#directory-content');
    $directoryContentHeaderText = $('#directory-content-header-text');
    $directoryContentRefresh = $('#directory-content-refresh');
    $directoryContentEntries = $('#directory-content-entries');
    $wmd = $('#wmd');
    $wmdPanel = $('#wmd-panel');
    $wmdInput = $('#wmd-input');
    $wmdPreview = $('#wmd-preview');
    $wmdHtml = $('#wmd-html');
    $wmdHtmlToggle = $('#wmd-html-toggle');
    $wmdSpinnerArea = $('#wmd-spinner-area');

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

            $main.show();
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

                $directory.show();

                html.directory.load();
            });
        },

        saveFile: function (path, content, callback) {
            dropboxClient.client.writeFile(path, content, function (error, stat) {
                if (error) {
                    html.messageBox.showError(error);
                } else {
                    html.messageBox.showMessage("File saved as revision " + stat.versionTag);
                }

                if (typeof (callback) === 'function') {
                    callback();
                }
            });
        }
    };

    var getFilePath = function (fileName) {
        return '/' + fileName + '.txt';
    };
    var getFileName = function (filePath) {
        var trimmed = $.trim(filePath);
        if (!trimmed) {
            return '';
        }

        return trimmed.slice(1, trimmed.length - 4);
    };

    var html = {
        initListeners: function () {
            //$('#user-logout').click(function () {
            //    dropboxClient.client.signOut();
            //});

            $directoryContentHeaderText.click(function () {
                html.directory.toggleExpand();
            });
            $directoryContentRefresh.click(function () {
                html.directory.load();
            });
            $directoryContentEntries.on('click', '.entry', function () {
                var $this = $(this);
                var path = $this.attr('data-path');
                var isDirectory = !!$(this).attr('data-is-directory');

                if (isDirectory) {
                    var lastIndex = path.lastIndexOf('/');
                    var parentDirectory = path.slice(0, lastIndex) || '/';
                    $directory.attr('data-parent', parentDirectory);

                    $directory.attr('data-path', path);
                    html.directory.load(path);
                    return;
                }

                if (isDirty) {
                    var result = html.confirmChangesLost('Are you sure you want to change file?');
                    if (!result) {
                        return;
                    }
                }

                var title = $('.filename', this).text();
                wmd.load(path, title);
            });

            $('#save-button').click(function () {
                wmd.saveFile();
            });
            $('#reset-button').click(function () {
                if (!isDirty) {
                    return;
                }
                var result = html.confirmChangesLost('Are you sure you want to reset?');
                if (result) {
                    wmd.load();
                }
            });
            $('#auto-save').click(function () {
                var isChecked = $(this).is(':checked');
                if (isChecked) {
                    wmd.autoSave.enable();
                } else {
                    wmd.autoSave.disable();
                }
            });

            $('#file-add a').fancybox({
                autoCenter: true,
                maxWidth: '400px',
                height: '60px',
                beforeLoad: function () {
                    if (isDirty) {
                        var result = html.confirmChangesLost('Are you sure you want to add new file?');
                        if (!result) {
                            return;
                        }
                    }

                    $('#modal-textbox-add input').val('');
                },
                afterLoad: function () {
                    $('#modal-textbox-add input').focus().select();
                }
            });

            $wmdInput.keyup(function () {
                isDirty = true;
            });

            $('#file-rename').fancybox({
                autoCenter: true,
                maxWidth: '400px',
                height: '60px',
                beforeLoad: function () {
                    if (isDirty) {
                        var result = html.confirmChangesLost('Are you sure you want to rename this file?');
                        if (!result) {
                            return false;
                        }
                    }

                    var filePath = $wmdInput.attr('data-path');
                    var fileName = getFileName(filePath);
                    $('#rename-title').text(fileName);
                    $('#modal-textbox-rename input').val(fileName);
                },
                afterLoad: function () {
                    $('#modal-textbox-rename input').focus().select();
                }
            });
            $('#file-delete').click(function (e) {
                e.preventDefault();

                var result = html.confirmChangesLost('Are you sure you want to delete this file?');
                if (!result) {
                    return;
                }
                wmd.loadStart();
                html.directory.setCollapsed();

                var filePath = $wmdInput.attr('data-path');
                dropboxClient.client.delete(filePath, function (error, stat) {
                    if (error) {
                        html.messageBox.showError(error);
                    } else {
                        html.messageBox.showMessage("File moved as revision " + stat.versionTag);
                        html.directory.load();
                    }

                    wmd.loadEnd();
                    wmd.hide();
                });
            });

            var validateModalInput = function (fileName) {
                if (!fileName) {
                    alert('File must have a name!');
                    return false;
                }
                return true;
            };
            $('#modal-textbox-add button').click(function () {
                var fileName = $('#modal-textbox-add input').val();
                var isValid = validateModalInput(fileName);
                if (!isValid) {
                    return;
                }

                html.directory.setCollapsed();
                wmd.loadStart();

                var path = getFilePath(fileName);
                dropboxClient.client.writeFile(path, '', function (error, stat) {
                    if (error) {
                        html.messageBox.showError(error);
                    } else {
                        html.messageBox.showMessage("File added as revision " + stat.versionTag);
                        html.directory.load();
                    }

                    wmd.loadEnd();
                });

                $.fancybox.close();
            });

            $('#modal-textbox-rename button').click(function () {
                var fileName = $('#modal-textbox-rename input').val();
                var isValid = validateModalInput(fileName);
                if (!isValid) {
                    return;
                }

                html.directory.setCollapsed();
                wmd.loadStart();

                var fromPath = $wmdInput.attr('data-path');
                var toPath = getFilePath(fileName);
                dropboxClient.client.move(fromPath, toPath, function (error, stat) {
                    if (error) {
                        html.messageBox.showError(error);
                    } else {
                        html.messageBox.showMessage("File moved as revision " + stat.versionTag);
                        html.directory.load();
                        wmd.load(toPath, fileName);
                    }

                    wmd.loadEnd();
                });

                $.fancybox.close();
            });

            $wmdHtml.click(function () {
                $wmdHtml.select();
            });
            $wmdHtml.keydown(function (e) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            });

            $wmdHtmlToggle.click(function () {
                var isExpanded = $(this).hasClass('expanded');
                if (isExpanded) {
                    wmd.setHtmlCollapsed();
                } else {
                    wmd.setHtmlExpanded();
                }
            });

            $('.click-once').click(function () {
                $(this).attr('disabled', 'disabled');
            });
        },

        confirmChangesLost: function (customText) {
            customText = $.trim(customText + '\n\nAll changes will be lost!');

            var result = confirm(customText);
            return result;
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
            removeMessage: function ($element) {
                $element.animate({ height: '0px' }, 300, 'linear', function () {
                    $(this).remove();
                });
            }
        },

        directory: {
            load: function (path) {
                path = path || $directory.attr('data-path');

                var $entries = $directoryContentEntries.empty();

                html.directory.loadStart();

                dropboxClient.client.readdir(path, function (error, entryTitles, data, entries) {
                    if (error) {
                        html.messageBox.showError(error);

                        html.directory.loadEnd();
                        return;
                    }

                    var isDirectory = path !== '/';
                    if (isDirectory) {
                        var parent = $directory.attr('data-parent');
                        html.directory.addItem('..', parent, '', $entries, true);
                    }

                    if (!entries.length) {
                        $entries.text('No entries found').addClass('no-entries');
                        return;
                    }

                    entries.sort(function (a, b) {
                        var d = (+a.isFolder) - (+b.isFolder);
                        if (d !== 0) {
                            return d;
                        }

                        return a.name.toLowerCase() < b.name.toLowerCase();
                    });

                    for (var i = entries.length - 1; i >= 0; i--) {
                        var entry = entries[i];
                        if (entry.isFolder) {
                            html.directory.addItem(entry.name, entry.path, '', $entries, true);
                        } else {
                            html.directory.addItem(entry.name, entry.path, entry.humanSize, $entries);
                        }
                    }

                    html.directory.loadEnd();
                });
            },
            addItem: function (name, path, size, $entries, isDirectory) {
                $entries = $entries || $directoryContentEntries;

                name = isDirectory ? '[' + name + ']' : name;
                var directoryHtml = isDirectory ? ' data-is-directory="1"' : '';
                var sizeHtml = size ? ' <span class="filesize">(' + size + ')</span>' : '';
                var navClass = isDirectory ? ' nav' : '';

                $entries.append('<div class="entry clickable' + navClass + '" data-path="' + path + '" ' + directoryHtml +
                    '><span class="filename">' + name + '</span>' +
                    sizeHtml + ' </div><div class="clearfix"></div>');
            },
            toggleExpand: function () {
                var isExpanded = $directoryContentHeaderText.hasClass('expanded');
                if (isExpanded) {
                    html.directory.setCollapsed();
                } else {
                    html.directory.setExpanded();
                }
            },
            setExpanded: function () {
                $directoryContentHeaderText.html('&#x25B2; Files').addClass('expanded'); // ▲
                $directoryContent.show();
            },
            setCollapsed: function () {
                $directoryContentHeaderText.html('&#x25BC; Files').removeClass('expanded'); // ▼
                $directoryContent.hide();
            },

            loadStart: function () {
                html.directory.setCollapsed();
                $directoryContentRefresh.hide();
                $('#directory-content-spinner').show();
            },

            loadEnd: function () {
                html.directory.setExpanded();
                $directoryContentRefresh.show();
                $('#directory-content-spinner').hide();
            }
        }
    };

    var wmd = {
        converter: null,
        editor: null,

        init: function () {
            $wmd.show();

            wmd.converter = wmd.converter || Markdown.getSanitizingConverter();
            wmd.editor = wmd.editor || new Markdown.Editor(wmd.converter);
            wmd.editor.run();
            wmd.editor.refreshPreview();

            wmd.initBoxHeights();
        },

        load: function (path, title) {
            $wmdInput.show();

            path = path || $wmdInput.attr('data-path');
            if (title) {
                $('#wmd-file-title').text(title);
            }

            html.directory.setCollapsed();
            wmd.loadStart();
            wmd.setHtmlCollapsed();
            $wmdHtml.val('');

            dropboxClient.client.readFile(path, function (error, data) {
                if (error) {
                    html.messageBox.showError(error);
                    wmd.loadEnd();
                    return;
                }

                isDirty = false;

                $wmdInput.val(data).attr('data-path', path);
                $wmdPreview.html('&nbsp;');

                wmd.init();

                wmd.loadEnd();

                $('html, body').animate({
                    scrollTop: $wmdPanel.offset().top
                }, 500, function () {
                    $wmdInput.focus();
                });
            });
        },

        loadStart: function () {
            $wmdSpinnerArea.show();
            $wmd.hide();
        },
        loadEnd: function () {
            $wmdSpinnerArea.hide();
            $wmd.show();
        },
        isHeightInit: false,
        initBoxHeights: function () {
            if (wmd.isHeightInit) {
                return;
            }
            wmd.isHeightInit = true;

            var wmdBoxHeightCss = $('.wmd-box').css('height').replace('px', '');
            var wmdBoxHeight = parseInt(wmdBoxHeightCss, 10);

            var windowHeight = $(window).height();
            if (wmdBoxHeight > windowHeight) {
                var boxHeight = (windowHeight - 2);
                $('.wmd-box').height(boxHeight);
                var buttonBarHeight = $('#wmd-button-bar').height();
                $wmdInput.height((boxHeight - buttonBarHeight));
            }
        },

        hide: function () {
            $wmd.hide();
        },

        saveFile: function () {
            var path = $wmdInput.attr('data-path');
            var content = $wmdInput.val();

            var $buttons = $('#wmd button, #wmd input').hide();
            var $navigation = $('#directory, #file-rename, #file-delete').hide();
            var $saveSpinner = $('#save-spinner').removeClass('no-display');

            dropboxClient.saveFile(path, content, function () {
                $buttons.show();
                $navigation.show();
                $saveSpinner.addClass('no-display');
            });
        },

        preview: {
            update: function() {
                $wmdHtml.val($wmdPreview.html());
            },
            setExpanded: function () {
                $wmdInput.on('keyup', wmd.html.update);
                wmd.html.update();

                $wmdHtmlToggle.html('&#x25B2; Hide HTML').addClass('expanded'); // ▲
                $wmdHtml.show();
            },
            setCollapsed: function () {
                $wmdInput.off('keyup', wmd.html.update);

                $wmdHtmlToggle.html('&#x25BC; Show HTML').removeClass('expanded'); // ▼
                $wmdHtml.hide();
            }
        },

        html: {
            update: function() {
                $wmdHtml.val($wmdPreview.html());
            },
            setExpanded: function () {
                $wmdInput.on('keyup', wmd.html.update);
                wmd.html.update();

                $wmdHtmlToggle.html('&#x25B2; Hide HTML').addClass('expanded'); // ▲
                $wmdHtml.show();
            },
            setCollapsed: function () {
                $wmdInput.off('keyup', wmd.html.update);

                $wmdHtmlToggle.html('&#x25BC; Show HTML').removeClass('expanded'); // ▼
                $wmdHtml.hide();
            }
        },
        
        autoSave: {
            timeoutId: 0,
            perform: function () {
                clearTimeout(wmd.autoSave.timeoutId);

                wmd.autoSave.timeoutId = setTimeout(function () {
                    wmd.saveFile();
                }, 15000);
            },
            enable: function () {
                $wmdInput.on('keyup', wmd.autoSave.perform);
            },
            disable: function () {
                $wmdInput.off('keyup', wmd.autoSave.perform);
            }
        }
    };

    if ($('html').hasClass('lt-ie10')) {
        return;
    }

    //html.messageBox.showMessage('Friendly message here');
    //html.messageBox.showError({ status: 401 });
    //html.messageBox.showError();

    //dropboxClient.directory.addItem('TestName1', 'TestPath1', '5000 GB');
    //dropboxClient.directory.addItem('TestName2', 'TestPath2', '5000 GB');
    //dropboxClient.directory.addItem('TestName3', 'TestPath3', '5000 GB');

    html.initListeners();
    html.messageBox.initMessagebox();

    dropboxClient.init();

    window.scrollTo(0, 1);
    setTimeout(function () {
        if ($(document).scrollTop() < 1) {
            window.scrollTo(0, 1);
        }
    }, 1000);
}(window, document));