function DirFileCtrl($scope,$rootScope,$tersus){
    $rootScope.root = {
        filename: $tersus.getUser().username,
        is_directory: true,
        path: "/"
    }
    
    /*
     * temporal variables used when calling tersus
     * they _should_ only be used internally
     */ 
    $scope.current_dir_path = "/"
    $scope.current_dir_contents = []
    $scope.current_dir_name = "/"
    $scope.current_dir_is_directory = true

    /*
     * Lists files contained in current_dir
     * @param fullpath - a String, the full path of the directory to get the contents from
     */ 
    $scope.getDirectoryFiles = function(fullpath){
        console.log("Getting directory files of : " + fullpath)

        //get file, a file has fields 'name', 'is_directory' and 'content', content may be an array of files
        $tersus.getFileContents(fullpath,
                                function callback(response){
                                    console.log(response.contents);
//                                    $scope.current_dir = response
                                    $scope.current_dir_contents = response.contents
                                    $scope.current_dir_is_directory = response.is_directory
                                    $scope.current_dir_path = response.path                                    
                                },
                                function onError(e){console.log(e)})
        
        //console.log($scope.current_dir.contents[0]);
        if ($scope.current_dir_is_directory)
            return $scope.current_dir_contents;
        else
            return []; 
    } 

    $rootScope.current_dir = {
        filename: $scope.current_dir_name // its name
        , path: $scope.current_dir_path //fullpath string
        , contents: $scope.getDirectoryFiles($scope.current_dir_name ) //an array of files 
        , is_directory: $scope.current_dir_is_directory // bool
    }    
    
    /* 
     * Called from the sidebar where the list of files of the current directory lies
     * @param file - an object with fields name, contents and 
     */ 
    $scope.openFile = function(file){
        console.log("Opening: "+file.path)
        $scope.current_dir.path = file.path

        if (file.is_directory){
            $scope.current_dir_path = file.path
            $scope.current_dir.contents = $scope.getDirectoryFiles(file.path)                                    
            index = $rootScope.current_path.indexOf(file);

            console.log("index: " + index)
            if (index < 0) // file is not in the path
                $rootScope.current_path.push(file)
            else
                //file is in the path, shorten
                $rootScope.current_path = $rootScope.current_path.slice(0,index+1);
            
            console.log($rootScope.current_path);
            $scope.current_filepath = file.path
            console.log($scope.current_dir.path)            
        }
        else
            console.log("TODO");
                            
        //console.log("openFile#newPath" + $scope.mkCurrentPath());        
    }
    
    /*
     * Breadcrumb class
     */ 
    $scope.getActiveClass = function(file){
        if (file.filename === $rootScope.current_path[$rootScope.current_path.length-1].filename)
            return 'active';
        else
            return '';
    }
}
