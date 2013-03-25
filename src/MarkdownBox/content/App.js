/// <reference path="~/Libraries/jquery-1.9.1.min.js"/>
/// <reference path="~/Libraries/angular-1.1.3.min.js"/>

var markdownBoxModule = angular.module('MarkdownBoxModule', []);

var App = function ($scope, $rootScope) {
    $rootScope.handleError = function (error, successCallback, postCallback, timeout) {
        if (error) {
            $rootScope.$broadcast('error', error, timeout);
        } else {
            if (typeof successCallback === "function") {
                successCallback();
            }
        }
        
        if (typeof postCallback === "function") {
            postCallback();
        }
    };
    
    $rootScope.directoryPath = '';
    $rootScope.filePath = '';
    $rootScope.fileTitle = '';
    $rootScope.isDirectoryLoading = false;
    $rootScope.isFileDirty = false;
    $rootScope.isFileLoading = false;

    $rootScope.confirmChangesLost = function(message) {
        message = $.trim(message + '\n\nAll changes will be lost!');
        var result = confirm(message);
        return result;
    };
    
    $rootScope.$broadcast('app-init');
    
    $scope.init = function() {
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
};

App.$inject = ['$scope', '$rootScope'];