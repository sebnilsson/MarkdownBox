/// <reference path="~/Libraries/jquery-1.9.1.min.js"/>
/// <reference path="~/Libraries/angular-1.0.5.min.js"/>

var MarkdownBox = angular.module('MarkdownBox', []);

MarkdownBox.run(['$rootScope', function ($rootScope) {
    $rootScope.handleError = function(error, successCallback, postCallback, timeout) {
        if (error) {
            $rootScope.error(error, timeout);
        } else {
            if (typeof successCallback === "function") {
                successCallback();
            }
        }

        if (typeof postCallback === "function") {
            postCallback();
        }
    };

    $rootScope.directoryParentPath = '';
    $rootScope.directoryPath = '';
    $rootScope.filePath = '';
    $rootScope.fileTitle = '';
    $rootScope.isDirectoryLoading = false;
    $rootScope.isFileDirty = false;
    $rootScope.isFileLoading = false;

    $rootScope.message = function(text, timeout) {
        $rootScope.$broadcast('message', text, timeout);
    };
    $rootScope.error = function (text, timeout) {
        $rootScope.$broadcast('error', text, timeout);
    };
    
    $rootScope.confirmChangesLost = function(message) {
        message = $.trim(message + '\n\nAll changes will be lost!');
        var result = confirm(message);
        return result;
    };

    $rootScope.initApp = function () {
        $rootScope.$broadcast('app-init');
        
        $(function() {
            if ($('html').hasClass('lt-ie10')) {
                return;
            }

            window.scrollTo(0, 1);
            setTimeout(function() {
                if ($(document).scrollTop() < 1) {
                    window.scrollTo(0, 1);
                }
            }, 1000);
        });
    };
}]);