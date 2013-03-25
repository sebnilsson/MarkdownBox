var AuthController = function ($scope, $rootScope, dropbox) {
    $scope.user = {};

    $scope.loginDropbox = function () {
        dropbox.authenticate();
    };
    $scope.logoutDropbox = function () {
        dropbox.client.signOut(function () {
            document.location = '/';
        });
    };

    $scope.$on('app-init', function() {
        dropbox.init();
    });

    $scope.$on('auth-login-success', function (e, userInfo) {
        $rootScope.isUserAuthenticated = true;

        $scope.user = userInfo;
        $scope.$digest();

        $rootScope.$broadcast('message', 'You are logged in as <strong>' + $scope.user.name + '</strong>', 3000);
    });
};

AuthController.$inject = ['$scope', '$rootScope', 'dropboxClient'];