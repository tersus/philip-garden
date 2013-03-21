function PhilipGarden($scope,$rootScope){
    $rootScope.current_path = [$rootScope.root]    
    
    $scope.minibuffer = ace.edit("minibuffer")
    $scope.minibuffer.hide = function(){
        $("#minibuffer").css('visibility','hidden')
    }
    $scope.minibuffer.show = function(){
        $("#minibuffer").css('visibility','visible')
    }

    $scope.minibuffer.onClose = '' // function to broadcast when minibuffer is closed

    $scope.minibuffer.onReturn = function(buf){
        console.log("on return");
        console.log(buf);
        console.log("broadcasting minibuffer value");
        console.log(buf.getValue());
        console.log("broadcasting to " + $scope.minibuffer.onClose)
        $rootScope.$broadcast($scope.minibuffer.onClose,buf.getValue())
    }

    $scope.minibuffer.completionfunction = undefined
//    $scope.minibuffer.cancelFunction = undefined

    $scope.minibuffer.clean = function(){
        $scope.minibuffer.setValue('');
        $scope.minibuffer.hide();
    }
    
    $scope.minibuffer.read = function(){
        console.log("read");
        $scope.minibuffer.show();
        $scope.minibuffer.focus();
    }

    $scope.date = new Date();

    $rootScope.notification = ""

    $scope.minibuffer_document = "Document text"                    

    $scope.editor = ace.edit("editor");   

    /*
     * A function that asks the minibuffer for input
     * @params - settings is an object with fields:
     *    'settings.onReturn' takes the string value of the minibuffer
     *    'settings.autocomplete' takes the string value of the minibuffer and returns a list of autocompletions
     */ 
    $scope.minibuffer.takeInput = function(settings){
        $scope.minibuffer.read()        
        $scope.minibuffer.setOnReturn(settings.onReturn)
    }
        
    /*
     * Sets the function to be called after the minibuffer takes input
     * see function takeInput 
     * @param fun - a Function that takes the string value of the minibuffer
     */ 
    $scope.minibuffer.setOnReturn = function(fun){
        cmd = {
            name: 'onReturn'
            , bindKey : {win: 'return', mac: 'return' }
            , exec: function(minibuf){ fun(minibuf.getValue()) }
        }
        $scope.minibuffer.commands.addCommand(cmd);
    }

    /*
     * Activates the minibuffer, takes input and opens a buffer with that input
     */ 
    $scope.findFile = function(){
        openBuffer = function(filename){
            $rootScope.$broadcast('openBuffer',filename); 
            $scope.minibuffer.clean()
            $scope.editor.focus()
        }
        $scope.minibuffer.takeInput({onReturn: openBuffer});
    }

    /*
     * Initializates the minibuffer (hides it for future use)
     */ 
    $scope.mkMiniBuffer = function(){ $scope.minibuffer.hide(); }
}
