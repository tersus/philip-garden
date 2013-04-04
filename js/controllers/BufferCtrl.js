function BufferCtrl($scope,$rootScope,$tersus){
    $rootScope.scratch_buffer = {
        name: "*scratch*",
        active: true,
        contents: 'Hello! \n\tYou should try opening a file. :-)\n Philip Garden'
    }

    $scope.buffers = [$scope.scratch_buffer, {name:"?",active:false,contents:'$'}]

    // finds current buffer (the one with active: true)
    $scope.getCurrentBuffer = function(){
        current = prelude.find(function(b){ return b.active==true }, $scope.buffers);
        $rootScope.current_buffer = current;
        return current;
    }

    $scope.buffer_count = $scope.buffers.length;    
    
    $scope.getActiveClass = function(buffer){ if (buffer.active){return 'active';} else return ''; }
    
    /*
     * Opens a buffer, if it doesn't exist, opens the file path represented by the buffer name
     * @param buffer_name - the buffer name
     */     
    $scope.openBuffer = function(buffer_name){ 
        console.log("Openning buffer: "+buffer_name);

        $scope.getCurrentBuffer().active = false;        
        buffer = prelude.find(function(buffer){ return buffer.name == buffer_name;}, $scope.buffers)
        if (!buffer){
            buffer = {name : $tersus.pathToFilename(buffer_name), active: true}; //create new buffer
            $scope.$apply($scope.buffers.push(buffer));
            fullpath = buffer_name

            // get the contents of the file
            $tersus.getFileContents(fullpath,
                            function callback(file_content){
                                //when the file exists
                                console.log(file_content);
                                $scope.getCurrentBuffer().contents = file_content
                            },
                            function onError(e){ console.log(e)})
        } else
            buffer.active = true;
        
        $rootScope.$broadcast('setEditorValue',$scope.getCurrentBuffer().contents)
        $rootScope.$broadcast('notify',"Opened " + buffer_name);
    }

    $scope.$on('openBuffer', function(e,b){ $scope.openBuffer(b)});
}
