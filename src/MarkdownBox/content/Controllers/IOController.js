/// <reference path="~/Libraries/angular-1.0.5.min.js"/>

var IOController = function ($scope, $rootScope, $location) {
    var getFullPath = function (directoryPath, path) {
        var fullPath = (directoryPath + '/' + path).replace('//', '/').replace('//', '/');
        return fullPath;
    };
    var getParentPath = function (path) {
        var lastIndex = path.lastIndexOf('/');
        var parent = path.slice(0, lastIndex) || '/';
        return parent;
    };
    var getFileName = function(path) {
        var lastIndex = path.lastIndexOf('/');
        return path.slice(lastIndex + 1);
    };
    var validateFileName = function (fileName) {
        if (!fileName) {
            alert('File must have a name!');
            return false;
        }
        return true;
    };
    
    $scope.directory = {
        folders: [],
        files: [],
        isHeaderExpanded: true,
        
        loadParent: function () {
            this.load(this.parentPath);
        },
        load: function (folderPath) {
            $scope.directory.folders = [];
            $scope.directory.files = [];

            var originalHeaderState = $scope.directory.isHeaderExpanded;

            $scope.directory.isHeaderExpanded = false;

            $rootScope.$broadcast('directory-path-change', folderPath);

            $rootScope.$broadcast('directory-load', $rootScope.directoryPath);

            $scope.directory.isHeaderExpanded = originalHeaderState;
        }
    };
    $rootScope.directoryPath = $location.path() || '/';
    $rootScope.directoryParentPath = getParentPath($rootScope.directoryPath);

    $scope.file = {
        load: function (filePath, title) {
            if ($rootScope.isFileDirty) {
                var result = $rootScope.confirmChangesLost('Are you sure you want to open another file?');
                if (!result) {
                    return;
                }
            }

            $scope.directory.isHeaderExpanded = false;

            filePath = filePath || $rootScope.filePath;
            $rootScope.$broadcast('file-path-change', filePath, title);

            $rootScope.$broadcast('file-load', filePath);
        },
        add: function () {
            var isValid = validateFileName($scope.file.addFilename);
            if (!isValid) {
                return;
            }

            var path = getFullPath($rootScope.directoryPath, $scope.file.addFilename);
            $rootScope.$broadcast('file-add', path);
        },
        cancelAdd: function () {
            $scope.file.isInAddFileMode = false;
            $scope.file.addFilename = '';
        },
        rename: function () {
            var isValid = validateFileName($scope.file.renameFilename);
            if (!isValid) {
                return;
            }

            var toPath = getFullPath($rootScope.directoryPath, $scope.file.renameFilename);
            $rootScope.$broadcast('file-rename', $rootScope.filePath, toPath);
        },
        cancelRename: function () {
            $scope.file.isInRenameFileMode = false;
            $scope.file.renameFilename = '';
        },
        remove: function () {
            var result = $rootScope.confirmChangesLost('Are you sure you want to delete this file?');
            if (!result) {
                return;
            }

            $rootScope.$broadcast('file-remove', $rootScope.filePath);
        }
    };

    $scope.$on('auth-login-success', function () {
        $scope.directory.load($rootScope.directoryPath);
    });

    $scope.$on('file-add-success', function (e, stat) {
        $rootScope.message('File added at "' + stat.path + '"', 5000);

        $scope.file.cancelAdd();

        $scope.directory.load();
    });
    $scope.$on('file-content-change', function () {
        $rootScope.isFileDirty = true;
    });
    $scope.$on('file-load-success', function () {
        $rootScope.isFileDirty = false;
        
        $scope.directory.load();
    });
    $scope.$on('file-remove-success', function () {
        $rootScope.message('File removed', 5000);

        $scope.directory.load();
        $scope.directory.isHeaderExpanded = true;
    });
    $scope.$on('file-rename-success', function (e, toPath, stat) {
        $rootScope.message('File renamed as revision ' + stat.versionTag, 5000);

        $rootScope.$broadcast('file-path-change', toPath);
        
        $scope.file.cancelRename();

        $scope.directory.load();
    });
    $scope.$on('file-load-start', function () {
        $rootScope.isFileLoading = true;
    });
    $scope.$on('file-load-end', function() {
        $rootScope.isFileLoading = false;
    });
    $scope.$on('file-path-change', function (e, path, title) {
        $rootScope.filePath = path;
        $rootScope.fileTitle = title || getFileName(path);
    });
    $scope.$on('file-reset', function () {
        $rootScope.isFileDirty = false;
        file.load();
    });
    $scope.$on('file-save-success', function (e, stat) {
        $rootScope.message('File saved as revision ' + stat.versionTag, 3000);

        $rootScope.isFileDirty = false;
        $rootScope.lastSave = stat.modifiedAt;

        if (!stat) {
            return;
        }

        for (var i = 0, len = $scope.directory.files.length; i < len; i++) {
            var item = $scope.directory.files[i];
            if (item.path === stat.path) {
                item.size = stat.humanSize;
                break;
            }
        }
    });

    $rootScope.$on('directory-path-change', function (e, path) {
        path = path || $rootScope.directoryPath || '/';
        
        $rootScope.directoryPath = path;
        $location.path(path);
    });
    $scope.$on('directory-load-success', function (e, titles, data, entries) {
        $scope.directory.isInSubDirectory = ($rootScope.directoryPath !== '/');
        if ($scope.directory.isInSubDirectory) {
            $scope.directory.parentPath = getParentPath($rootScope.directoryPath);
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
    });
    $scope.$on('directory-load-start', function () {
        $rootScope.isDirectoryLoading = true;
    });
    $scope.$on('directory-load-end', function () {
        $rootScope.isDirectoryLoading = false;
    });
};

IOController.$inject = ['$scope', '$rootScope', '$location'];