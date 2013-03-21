function BufferCtrl($scope,$rootScope){
    $scope.scratch_buffer = {
        name: "*scratch*",
        active: true,
        contents: 'Hello! \n\tYou should try opening a file. :-)\n Philip Garden'
    }

    $scope.buffers = [$scope.scratch_buffer, {name:"?",active:false,contents:'$'}]

    // finds current buffer (the one with active: true)
    $scope.getCurrentBuffer = function(){
        return prelude.find(function(b){ return b.active==true }, $scope.buffers);
    }

    $scope.buffer_count = $scope.buffers.length;    
    
    $scope.getActiveClass = function(buffer){ if (buffer.active){return 'active';} else return ''; }
    
    /*
     * Opens a buffer, if it doesn't exist, opens the file path represented by the buffer name
     * @param buffer_name - the buffer name
     */     
    $scope.openBuffer = function(buffer_name){ 
        console.log("current");
        console.log($scope.getCurrentBuffer());
        $scope.getCurrentBuffer().active = false;
        
        buffer = prelude.find(function(buffer){ return buffer.name == buffer_name;}, $scope.buffers)        
        console.log(buffer);

        if (!buffer){
            buffer = {name : buffer_name, active: true}; //create new buffer
            $scope.$apply($scope.buffers.push(buffer));
        } else{
            buffer.active = true;
        }
        $rootScope.notification = "Opened " + buffer_name
    }
    $scope.$on('openBuffer', function(e,b){ $scope.openBuffer(b)});
}
