function EditorCtrl($scope,buffers){        
    $scope.minibuffer = {
        editor: ace.edit("minibuffer");
        visible: true
    }

    $scope.frame = {
        editor: ace.edit("*scratch*")
        visible: true
    }

    $scope.init = function(){
        $scope.frame.editor.setTheme("ace/theme/monokai");
    }

    $scope.setFrameBuffer(frame_name, buffer_name){
        $scope.frame.setBuffer
    }
}
