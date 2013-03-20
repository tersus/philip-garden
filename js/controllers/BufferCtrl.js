function BufferCtrl($scope){
    var scratch_buffer = {
        name: "*scratch*", 
        active: true
    }        

    $scope.buffers = [
        scratch_buffer,
        { name: "Buffer x", active: false }
    ]
    
    // finds current buffer (the one with active: true)
    $scope.current_buffer = prelude.find(function(b){ return b.active }, $scope.buffers);

    $scope.buffer_count = $scope.buffers.length;    

    // functions
    var findBuffer = function (buffer_name){
        var byName = function(buffer){ return buffer.name == buffer_name;}
        return prelude.find(byName, $scope.buffers)
    }

    // actions
    $scope.$on('setEditorBuffer', function(event,buffer_name){        
        $scope.current_buffer.active = false;
        
        buffer = findBuffer(buffer_name);
        if (!buffer){            
            buffer = {name : buffer_name, active: true}; //create new buffer 
            $scope.buffers.push(buffer);
        }
        console.log(buffer);
        console.log($scope.buffers);
        //$scope.current_buffer = buffer;
    })

    $scope.getActiveClass = function(buffer){ if (buffer.active){return 'active';} else return ''; }
}
