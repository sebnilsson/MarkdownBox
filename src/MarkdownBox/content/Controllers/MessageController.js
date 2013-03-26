/// <reference path="~/Libraries/jquery-1.9.1.min.js"/>
/// <reference path="~/Libraries/angular-1.0.5.min.js"/>

var MessageController = function ($scope) {
    $scope.messages = [];
    $scope.removeMessage = function(message) {
        removeMessage(message);
    };

    var addError = function(error, timeout) {
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

        addMessage(text, true, timeout);
    };
    var addMessage = function (text, isError, timeout) {
        var message = { text: text, isError: isError };
        $scope.messages.push(message);
        $scope.$digest();

        if (timeout) {
            setTimeout(function () {
                removeMessage(message);
            }, timeout);
        }
    };
    var removeMessage = function(message) {
        var index = $scope.messages.indexOf(message);
        if (index >= 0) {
            $('#message-box .ng-binding').eq(index).animate({ height: '0px' }, 350, 'linear', function() {
                $scope.messages.splice(index, 1);
                $scope.$digest();
            });
        }
    };

    $scope.$on('message', function (e, text, timeout) {
        addMessage(text, false, timeout);
    });
    $scope.$on('error', function (e, error, timeout) {
        addError(error, timeout);
    });
};

MessageController.$inject = ['$scope', '$rootScope'];