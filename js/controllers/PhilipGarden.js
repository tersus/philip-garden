function PhilipGarden($scope,$rootScope){
    $rootScope.current_path = [$rootScope.root]

    $scope.minibuffer = ace.edit("minibuffer")                   
    
    $scope.date = new Date();    

    $scope.notification = "no notification"

    //$scope.frame_document = $rootscope.buffers[0];

    $scope.minibuffer_document = "Document text"                    

    $scope.editor = ace.edit("editor");
    

    $scope.minibuffer.findFile = function(minibuffer){
        var filename = minibuffer.getValue();
        alert("findFile: "+filename);
        console.log(filename);
        $rootScope.$broadcast('setEditorBuffer',filename);
        $scope.editor.focus()
    }

    $scope.findFile = function(){
        $scope.minibuffer.focus();

        $scope.minibuffer.commands.addCommand(
            {name: 'onReturn', bindKey : {win: 'return', mac: 'return' },
             exec: $scope.minibuffer.findFile
            })
    }

    $scope.$on('setCurrentPath',function(e,path){
        $scope.current_path = path
    })
}
