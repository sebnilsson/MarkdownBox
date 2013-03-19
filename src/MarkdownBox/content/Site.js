/// <reference path="~/Libraries/jquery-1.9.1.min.js"/>
/// <reference path="~/Libraries/angular-1.1.3.min.js"/>
/// <reference path="~/Libraries/dropbox.0.9.1.min.js"/>
/// <reference path="~/Libraries/pagedown/Markdown.Converter.js"/>
/// <reference path="~/Libraries/pagedown/Markdown.Editor.js"/>
/// <reference path="~/Libraries/pagedown/Markdown.Sanitizer.js"/>
/// <reference path="~/Libraries/google-prettify/prettify.js"/>
/// <reference path="~/Libraries/jquery.ba-bbq.js"/>
/// <reference path="~/Libraries/jquery.hotkeys.js"/>

MarkdownBox = (function (window, document, undefined) {
    'use strict';

    var cookies = {
        setItem: function(name, value, days) {
            var date = new Date();
            date.setDate(date.getDate() + days);
            var cookieValue = escape(value) + ((days == null) ? '' : '; expires=' + date.toUTCString());
            document.cookie = name + "=" + cookieValue;
        },
        getItem: function(name) {
            var i, key, value, cookieList = document.cookie.split(";");
            for (i = 0; i < cookieList.length; i++) {
                key = cookieList[i].substr(0, cookieList[i].indexOf("="));
                value = cookieList[i].substr(cookieList[i].indexOf("=") + 1);
                key = key.replace(/^\s+|\s+$/g, "");
                if (key == name) {
                    return unescape(value);
                }
            }
        }
    };

    var validateFileName = function (fileName) {
        if (!fileName) {
            alert('File must have a name!');
            return false;
        }
        return true;
    };
    var getParentPath = function(path) {
        var lastIndex = path.lastIndexOf('/');
        var parent = path.slice(0, lastIndex) || '/';
        return parent;
    };
    var getFullPath = function(directory, path) {
        var fullPath = (directory + '/' + path).replace('//', '/').replace('//', '/');
        return fullPath;
    };

    var MarkdownBox = function ($scope) {
        var $wmdInput = $('#wmd-input'),
            $wmdPanel = $('#wmd-panel'),
            $wmdPreview = $('#wmd-preview'),
            $wmdPrettyPreview = $('#wmd-pretty-preview'),
            $wmdHtml = $('#wmd-html');
        
        var dropboxClient = {
            encodedKey: 'kWWFk4v8E0A=|eLTWCRy1RDt8sJbVCXHYdHGAPrMWpBaGwgLkl6oPQg==',
            client: null,

            init: function () {
                dropboxClient.client = new Dropbox.Client({
                    key: dropboxClient.encodedKey,
                    sandbox: true
                });
                dropboxClient.client.authDriver(new Dropbox.Drivers.Redirect({ rememberUser: true }));
                dropboxClient.autoLogin();
            },

            authenticateCallback: function(error) {
                if (error) {
                    $scope.messageBox.addError(error);
                    return;
                }

                if (dropboxClient.client.isAuthenticated()) {
                    dropboxClient.populateUserInfo();
                } else {
                    $scope.user.isAuthenticated = false;
                }
            },
            authenticate: function () {
                dropboxClient.client.authenticate(dropboxClient.authenticateCallback);
            },
            
            autoLogin: function() {
                dropboxClient.client.authenticate({ interactive: false }, dropboxClient.authenticateCallback);
            },
            
            populateUserInfo: function() {
                dropboxClient.client.getUserInfo(function (getUserError, userInfo) {
                    if (getUserError) {
                        $scope.messageBox.addError(getUserError);
                        return;
                    }

                    $scope.user = userInfo;
                    $scope.user.isAuthenticated = true;
                    $scope.$digest();
                    
                    $scope.messageBox.addMessage('You are logged in as <strong>' + $scope.user.name + '</strong>', false, 3000);

                    $scope.directory.load($scope.directory.path);
                });
            },

            saveFile: function (path, content, callback) {
                dropboxClient.client.writeFile(path, content, function (error, stat) {
                    if (error) {
                        $scope.messageBox.addError(error);
                    } else {
                        $scope.messageBox.addMessage("File saved as revision " + stat.versionTag);
                        for (var i = 0, len = $scope.directory.files.length; i < len; i++) {
                            var file = $scope.directory.files[i];
                            if (file.path === stat.path) {
                                file.size = stat.humanSize;
                                break;
                            }
                        }
                    }

                    if (typeof (callback) === 'function') {
                        callback();
                    }
                });
            }
        };

        $scope.loginDropbox = function() {
            dropboxClient.authenticate();
        };
        $scope.logoutDropbox = function () {
            dropboxClient.client.signOut(function() {
                document.location = '/';
            });
        };

        $scope.user = {};
        
        $scope.messageBox = {
            messages: [],
            addError: function(error, timeout) {
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

                $scope.messageBox.addMessage(text, true, timeout);
            },
            addMessage: function (text, isError, timeout) {
                var message = { text: text, isError: isError };
                $scope.messageBox.messages.push(message);
                
                if (timeout) {
                    setTimeout(function () {
                        $scope.messageBox.removeMessage(message);
                    }, timeout);
                }
            },
            removeMessage: function (message) {
                var index = $scope.messageBox.messages.indexOf(message);
                if (index >= 0) {
                    $('#message-box .ng-binding').eq(index).animate({ height: '0px' }, 350, 'linear', function () {
                        $scope.messageBox.messages.splice(index, 1);
                        $scope.$digest();
                    });
                }
            }
        };
        
        $scope.directory = {
            isHeaderExpanded: false,
            isLoading: false,
            isInSubDirectory: false,
            folders: [],
            files: [],
            path: '',
            parentPath: '',
            
            
            loadParent: function () {
                $scope.directory.load($scope.directory.parentPath);
            },
            load: function(folderPath) {
                $scope.directory.isLoading = true;
                $scope.directory.isHeaderExpanded = false;
                $scope.directory.folders = [];
                $scope.directory.files = [];

                $scope.directory.path = folderPath || $scope.directory.path || '/';
                cookies.setItem('path', $scope.directory.path, 300);
                
                dropboxClient.client.readdir($scope.directory.path, function (error, entryTitles, data, entries) {
                    if (error) {
                        $scope.messageBox.addError(error);
                        $scope.directory.isLoading = false;
                        $scope.directory.isHeaderExpanded = true;
                        return;
                    }

                    $scope.directory.isInSubDirectory = ($scope.directory.path !== '/');
                    if ($scope.directory.isInSubDirectory) {
                        $scope.directory.parentPath = getParentPath($scope.directory.path);
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
                            $scope.directory.folders.push({ text: entry.name, path: entry.path });
                        } else {
                            $scope.directory.files.push({ text: entry.name, path: entry.path, size: entry.humanSize });
                        }
                    }

                    $scope.directory.isLoading = false;
                    $scope.directory.isHeaderExpanded = true;
                    $scope.$digest();
                });
            },
            add: function() {
                // TODO?
            }
        };
        $scope.directory.path = cookies.getItem('path') || '/';
        $scope.directory.parentPath = getParentPath($scope.directory.path);

        $scope.file = {
            isDirty: false,
            isLoading: false,
            isSaving: false,
            isInAddFileMode: false,
            isInRenameFileMode: false,

            path: '',
            
            clearFile: function() {
                $scope.wmd.title = '';
                $scope.wmd.content = '';
                $scope.wmd.prettyPreview = '';
                $scope.wmd.preview = '';
                $scope.wmd.html = '';
            },
            load: function (filePath, title) {
                $scope.file.isLoading = true;
                
                if ($scope.file.isDirty) {
                    var result = $scope.file.confirmChangesLost('Are you sure you want to open another file?');
                    if (!result) {
                        return;
                    }
                }
                
                $scope.file.path = filePath || $scope.file.path;
                $scope.directory.isHeaderExpanded = false;

                $scope.file.clearFile();
                $scope.wmd.title = title || $scope.wmd.title;
                
                dropboxClient.client.readFile($scope.file.path, function (error, data) {
                    if (error) {
                        $scope.messageBox.addError(error);
                        $scope.file.isLoading = false;
                        return;
                    }
                    
                    $scope.file.isDirty = false;
                    $scope.wmd.content = data;
                    
                    $scope.file.isLoading = false;
                    $scope.$digest();

                    $scope.wmd.init();

                    $('html, body').animate({
                        scrollTop: $wmdPanel.offset().top
                    }, 500, function () {
                        $wmdInput.focus();
                    });
                });
            },
            save: function () {
                $scope.file.isSaving = true;
                dropboxClient.saveFile($scope.file.path, $scope.wmd.content, function (error) {
                    if (error) {
                        $scope.messageBox.addError(error);
                    }

                    $scope.file.isDirty = false;
                    $scope.file.isSaving = false;
                    $scope.$digest();
                });
            },
            reset: function() {
                if (!$scope.file.isDirty) {
                    return;
                }
                var result = $scope.file.confirmChangesLost('Are you sure you want to reset?');
                if (result) {
                    $scope.file.isDirty = false;
                    $scope.file.load();
                }
            },
            showAddModal: function () {
                $scope.file.isInAddFileMode = true;
                $('#modal-textbox-add').click();
            },
            add: function() {
                var isValid = validateFileName($scope.file.addFilename);
                if (!isValid) {
                    return;
                }
                
                $scope.file.isLoading = true;

                var path = getFullPath($scope.directory.path, $scope.file.addFilename);
                dropboxClient.client.writeFile(path, '', function (error, stat) {
                    if (error) {
                        $scope.messageBox.addError(error);
                    } else {
                        $scope.messageBox.addMessage('File added at "' + stat.path + '"');
                        
                        $scope.file.addFileText = '';
                        $scope.directory.load();
                    }

                    $scope.file.isInAddFileMode = false;
                    $scope.file.addFilename = '';
                    
                    $scope.file.isLoading = false;
                });
            },
            rename: function () {
                var isValid = validateFileName($scope.file.renameFilename);
                if (!isValid) {
                    return;
                }

                $scope.file.isLoading = true;

                var fromPath = $scope.file.path;
                var toPath = getFullPath($scope.directory.path, $scope.file.renameFilename);
                dropboxClient.client.move(fromPath, toPath, function (error, stat) {
                    if (error) {
                        $scope.messageBox.addError(error);
                    } else {
                        $scope.messageBox.addMessage('File renamed as revision ' + stat.versionTag);

                        $scope.wmd.title = $scope.file.renameFilename;
                        $scope.file.path = toPath;
                        $scope.file.renameFilename = '';
                        
                        $scope.directory.load();
                    }

                    $scope.file.cancelRename();
                    $scope.file.isLoading = false;
                });
            },
            cancelRename: function () {
                $scope.file.isInRenameFileMode = false;
                $scope.file.renameFilename = '';
            },
            remove: function() {
                var result = $scope.file.confirmChangesLost('Are you sure you want to delete this file?');
                if (!result) {
                    return;
                }

                $scope.file.isLoading = true;
                
                dropboxClient.client['delete']($scope.file.path, function (error, stat) {
                    if (error) {
                        $scope.messageBox.addError(error);
                    } else {
                        $scope.messageBox.addMessage('File removed');
                        $scope.directory.load();
                    }

                    $scope.file.clearFile();
                    $scope.file.isLoading = false;
                    $scope.$digest();
                });
            },
            confirmChangesLost: function (message) {
                message = $.trim(message + '\n\nAll changes will be lost!');
                var result = confirm(message);
                return result;
            }
        };
        
        $scope.autoSave = {
            isActivated: false,
            timeout: 10000,
            change: function () {
                if ($scope.autoSave.isActivated) {
                    $wmdInput.on('keyup', $scope.autoSave.startTimeout);
                } else {
                    $wmdInput.off('keyup', $scope.autoSave.startTimeout);
                }
            },
            timeoutId: 0,
            startTimeout: function () {
                clearTimeout($scope.autoSave.timeoutId);

                $scope.autoSave.timeoutId = setTimeout(function () {
                    $scope.file.save();
                }, $scope.autoSave.timeout);
            }
        };
        
        $scope.wmd = {
            showHtml: false,
            title: '',
            content: '',
            prettyPreview: '',
            preview: '',
            html: '',
            
            converter: null,
            editor: null,
            
            init: function() {
                $scope.wmd.converter = $scope.wmd.converter || Markdown.getSanitizingConverter();
                $scope.wmd.editor = $scope.wmd.editor || new Markdown.Editor($scope.wmd.converter);
                $scope.wmd.editor.run();
                $scope.wmd.editor.refreshPreview();

                setTimeout(function() {
                    $scope.wmd.updatePretty();
                    $scope.wmd.initPretty();
                    $scope.wmd.initBoxHeights();
                    $wmdInput.keydown();
                    $scope.$digest();
                }, 500);
            },

            isHeightInit: false,
            initBoxHeights: function() {
                if ($scope.wmd.isHeightInit) {
                    return;
                }
                $scope.wmd.isHeightInit = true;

                var $wmdBox = $('.wmd-box');
                var wmdBoxHeight = +$wmdBox.css('height').replace('px', '') || 0;
                var windowHeight = $(window).height();
                
                if (wmdBoxHeight > windowHeight) {
                    var boxHeight = (windowHeight - 2);
                    $wmdBox.height(boxHeight);
                    var buttonBarHeight = $('#wmd-button-bar').height();
                    $wmdInput.height((boxHeight - buttonBarHeight));
                }
            },
            
            toggleShowHtml: function() {
                $scope.wmd.showHtml = !$scope.wmd.showHtml;
            },
            
            initPretty: function() {
                $scope.wmd.lazyPrettify(1);
            },
            updatePretty: function () {
                $wmdPrettyPreview.html($wmdPreview.html());
                $wmdHtml.val($wmdPrettyPreview.html());

                $scope.wmd.lazyPrettify();
            },
            lazyPrettifyTimeoutId: 0,
            lazyPrettify: function (timeout) {
                timeout = timeout || 3000;

                clearTimeout($scope.wmd.lazyPrettifyTimeoutId);
                $scope.wmd.lazyPrettifyTimeoutId = setTimeout(function () {
                    $('pre:not(".no-prettyprint"), code:not(".no-prettyprint")', $wmdPrettyPreview).addClass('prettyprint');
                    prettyPrint();
                }, timeout);
            }
        };
        
        // Event handlers
        $wmdInput.keyup(function () {
            $scope.file.isDirty = true;
            $scope.wmd.updatePretty();
        });
        $wmdHtml.click(function () {
            $wmdHtml.select();
        });
        $wmdHtml.keydown(function (e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });
        $wmdInput.bind('keydown.ctrl_s keydown.cmd_s keydown.alt_s', function (e) {
            $scope.file.save();
            e.preventDefault();
            return false;
        });
        
        if ($('html').hasClass('lt-ie10')) {
            return;
        }

        //$scope.messageBox.addMessage('Friendly message here');
        //$scope.messageBox.addError({ status: 401 });
        //$scope.messageBox.addError();

        dropboxClient.init();

        window.scrollTo(0, 1);
        setTimeout(function () {
            if ($(document).scrollTop() < 1) {
                window.scrollTo(0, 1);
            }
        }, 1000);
    };

    return MarkdownBox;
}(window, document));