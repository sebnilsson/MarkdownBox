/// <reference path="~/Libraries/angular-1.1.3.min.js"/>
/// <reference path="~/Libraries/dropbox.0.9.1.min.js"/>

markdownBoxModule.factory('dropboxClient', ['$rootScope', function ($rootScope) {
    var dropboxClient = {
        encodedKey: 'kWWFk4v8E0A=|eLTWCRy1RDt8sJbVCXHYdHGAPrMWpBaGwgLkl6oPQg==',
        client: null,

        init: function() {
            dropboxClient.client = new Dropbox.Client({
                key: dropboxClient.encodedKey,
                sandbox: true
            });
            dropboxClient.client.authDriver(new Dropbox.Drivers.Redirect({ rememberUser: true }));
            dropboxClient.autoLogin();
        },

        authenticateCallback: function (error) {
            $rootScope.handleError(error, function () {
                if (dropboxClient.client.isAuthenticated()) {
                    dropboxClient.populateUserInfo();
                } else {
                    $rootScope.$broadcast('auth-error');
                }
            });
        },
        authenticate: function() {
            dropboxClient.client.authenticate(dropboxClient.authenticateCallback);
        },

        autoLogin: function() {
            dropboxClient.client.authenticate({ interactive: false }, dropboxClient.authenticateCallback);
        },
        
        populateUserInfo: function() {
            dropboxClient.client.getUserInfo(function (getUserError, userInfo) {
                $rootScope.handleError(getUserError, function() {
                    $rootScope.$broadcast('auth-login-success', userInfo);
                    $rootScope.$digest();
                });
            });
        },
        
        addFile: function (path, callback) {
            $rootScope.$broadcast('file-load-start');
            
            dropboxClient.client.writeFile(path, '', function (error, stat) {
                $rootScope.handleError(error, function () {
                    if (typeof (callback) === 'function') {
                        callback();
                    }

                    $rootScope.$broadcast('file-add-success', stat);
                },
                function () {
                    $rootScope.$broadcast('file-load-end');
                    $rootScope.$digest();
                });
            });
        },
        
        loadDirectory: function(path, callback) {
            $rootScope.$broadcast('directory-load-start');

            dropboxClient.client.readdir(path, function (error, titles, data, entries) {
                $rootScope.handleError(error, function () {
                    if (typeof (callback) === 'function') {
                        callback();
                    }

                    $rootScope.$broadcast('directory-load-success', titles, data, entries);
                },
                function () {
                    $rootScope.$broadcast('directory-load-end');
                    $rootScope.$digest();
                });
            });
        },
        
        loadFile: function (path, callback) {
            $rootScope.$broadcast('file-load-start');
            
            dropboxClient.client.readFile(path, function (error, data) {
                $rootScope.handleError(error, function () {
                    if (typeof (callback) === 'function') {
                        callback();
                    }
                    
                    $rootScope.$broadcast('file-load-success', data);
                },
                function () {
                    $rootScope.$broadcast('file-load-end');
                    $rootScope.$digest();
                });
            });
        },
        
        removeFile: function (path, callback) {
            $rootScope.$broadcast('file-load-start');
            
            dropboxClient.client['delete'](path, function (error, stat) {
                $rootScope.handleError(error, function () {
                    if (typeof (callback) === 'function') {
                        callback();
                    }
                    
                    $rootScope.$broadcast('file-remove-success');
                },
                function () {
                    $rootScope.$broadcast('file-load-end');
                    $rootScope.$digest();
                });
            });
        },
        
        renameFile: function (fromPath, toPath, callback) {
            $rootScope.$broadcast('file-load-start');
            
            dropboxClient.client.move(fromPath, toPath, function (error, stat) {
                $rootScope.handleError(error, function () {
                    if (typeof (callback) === 'function') {
                        callback();
                    }

                    $rootScope.$broadcast('file-rename-success', toPath, stat);
                },
                function () {
                    $rootScope.$broadcast('file-load-end');
                    $rootScope.$digest();
                });
            });
        },
        
        saveFile: function (path, content, callback) {
            $rootScope.$broadcast('file-load-start');
            $rootScope.$broadcast('file-save-start');

            dropboxClient.client.writeFile(path, content, function (error, stat) {
                $rootScope.handleError(error, function () {
                    if (typeof (callback) === 'function') {
                        callback();
                    }

                    $rootScope.$broadcast('file-save-success', stat);
                },
                function () {
                    $rootScope.$broadcast('file-load-end');
                    $rootScope.$broadcast('file-save-end');
                    $rootScope.$digest();
                });
            });
        }
    };

    $rootScope.$on('directory-load', function (e, path, callback) {
        dropboxClient.loadDirectory(path, callback);
    });
    $rootScope.$on('file-add', function (e, path, callback) {
        dropboxClient.addFile(path, callback);
    });
    $rootScope.$on('file-load', function (e, path, callback) {
        dropboxClient.loadFile(path, callback);
    });
    $rootScope.$on('file-remove', function (e, path, callback) {
        dropboxClient.removeFile(path, callback);
    });
    $rootScope.$on('file-rename', function (e, path, fromPath, toPath, callback) {
        dropboxClient.renameFile(path, fromPath, toPath, callback);
    });
    $rootScope.$on('file-save', function (e, path, content, callback) {
        dropboxClient.saveFile(path, content, callback);
    });

    return dropboxClient;
}]);