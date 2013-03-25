/// <reference path="~/Libraries/pagedown/Markdown.Converter.js"/>
/// <reference path="~/Libraries/pagedown/Markdown.Editor.js"/>
/// <reference path="~/Libraries/pagedown/Markdown.Sanitizer.js"/>
/// <reference path="~/Libraries/google-prettify/prettify.js"/>

var WmdController = function ($scope, $rootScope) {
    var $wmdInput = $('#wmd-input'),
        $wmdPanel = $('#wmd-panel'),
        $wmdPreview = $('#wmd-preview'),
        $wmdPrettyPreview = $('#wmd-pretty-preview'),
        $wmdHtml = $('#wmd-html');

    $scope.autoSave = {
        isActivated: false,
        change: function () {
            if ($scope.autoSave.isActivated) {
                $wmdInput.on('keyup', autoSave.startTimeout);
            } else {
                $wmdInput.off('keyup', autoSave.startTimeout);
            }
        }
    };

    $scope.wmd = {
        showHtml: false,
        content: '',
        prettyPreview: '',
        preview: '',
        html: '',
        
        save: function () {
            $rootScope.$broadcast('file-save', $rootScope.filePath, $scope.wmd.content);
        },
        reset: function () {
            if (!$rootScope.isFileDirty) {
                return;
            }
            var result = $rootScope.confirmChangesLost('Are you sure you want to reset?');
            if (result) {
                $rootScope.$broadcast('file-reset');
            }
        },

        toggleShowHtml: function () {
            $scope.wmd.showHtml = !$scope.wmd.showHtml;
        }
    };

    var wmd = {
        converter: null,
        editor: null,

        init: function () {
            wmd.converter = wmd.converter || Markdown.getSanitizingConverter();
            wmd.editor = wmd.editor || new Markdown.Editor(wmd.converter);
            wmd.editor.run();
            wmd.editor.refreshPreview();

            setTimeout(function () {
                wmd.updatePretty();
                wmd.initPretty();
                wmd.initBoxHeights();
                $wmdInput.keydown();
                
                $scope.$digest();
            }, 500);
        },
        
        clear: function () {
            $rootScope.filePath = '';
            $rootScope.fileTitle = '';
            
            $scope.wmd.content = '';
            $scope.wmd.prettyPreview = '';
            $scope.wmd.preview = '';
            $scope.wmd.html = '';
        },

        isHeightInit: false,
        initBoxHeights: function () {
            if (wmd.isHeightInit) {
                return;
            }
            wmd.isHeightInit = true;

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
        
        initPretty: function () {
            wmd.lazyPrettify(1);
        },
        updatePretty: function () {
            $wmdPrettyPreview.html($wmdPreview.html());
            $wmdHtml.val($wmdPrettyPreview.html());

            wmd.lazyPrettify();
        },
        lazyPrettifyTimeoutId: 0,
        lazyPrettify: function (timeout) {
            timeout = timeout || 3000;

            clearTimeout(wmd.lazyPrettifyTimeoutId);
            wmd.lazyPrettifyTimeoutId = setTimeout(function () {
                $('pre:not(".no-prettyprint"), code:not(".no-prettyprint")', $wmdPrettyPreview).addClass('prettyprint');
                prettyPrint();
            }, timeout);
        }
    };

    var autoSave = {
        timeout: 10000,
        timeoutId: 0,
        startTimeout: function () {
            clearTimeout(autoSave.timeoutId);

            autoSave.timeoutId = setTimeout(function () {
                $scope.wmd.save();
            }, autoSave.timeout);
        }
    };
    
    $scope.$on('app-init', function () {
        // Event handlers
        $wmdInput.keyup(function () {
            $rootScope.$broadcast('file-content-change');
        });
        $wmdHtml.click(function () {
            $rootScope.$wmdHtml.select();
        });
        $wmdHtml.keydown(function (e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });
        $wmdInput.bind('keydown.ctrl_s keydown.cmd_s keydown.alt_s', function (e) {
            $scope.wmd.save();
            
            e.preventDefault();
            return false;
        });
    });
    
    $scope.$on('file-content-change', function () {
        wmd.updatePretty();
    });
    $scope.$on('file-remove-success', function() {
        wmd.clear();
    });
    $scope.$on('file-save-start', function() {
        $scope.wmd.isSaving = true;
    });
    $scope.$on('file-save-end', function () {
        $scope.wmd.isSaving = false;
    });
    $scope.$on('file-load-success', function (e, content) {
        $scope.wmd.content = content;
        wmd.init();
        
        $('html, body').animate({
            scrollTop: $wmdPanel.offset().top
        }, 500, function () {
            $wmdInput.focus();
        });
    });
};

WmdController.$inject = ['$scope', '$rootScope'];