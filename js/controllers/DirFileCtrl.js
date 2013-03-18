function DirFileCtrl($scope){
    $scope.dir_name = "/dir/"

    //files in dir_name
    $scope.dirfiles = [
        { name: "Monad.hs" }, 
        { name: "Functor.hs" },
        { name: "Applicative.hs" }
    ]

    $scope.date = "Date"
}
