function BufferCtrl($scope){
    $scope.buffers = [
        {name: "Buffer 1", active: false},
        {name: "Buffer 2", active: true}
    ]
    
    $scope.buffer_count = $scope.buffers.length;
}
