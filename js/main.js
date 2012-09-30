//Philip Garden
//
//Liscence: BSD
//
//Emacs-like text editor for the web that runs on top of tersus. It has the ability
//to share files and syncronize updates

function saveText(){
    tersus.writeFile("/Monad.hs",editor.editor.getValue(),function(msg){alert(msg)});
}

function populateTextArea(content){ editor.editor.setValue(content); }

function loadText(){
    tersus.getFile("/Monad.hs",populateTextArea);
}

//$(document).ready(loadText);

//Array containing all the buffers
var buffers = [];

//Array containing all the Frames, they are indexed
//by the id of the div element of the ace editor
var editors = [];

//Represents a text buffer. The text in a buffer can be 
//asociated with a file.
function Buffer(name,file){

    //Name of the buffer (should be unique)
    this.name = getBufferName(name,buffers,0);
    //File from the buffer (can be undifined for no file)
    this.file = file;
    //The current content of the buffer
    this.content = "";
    //Used to create deltas when using differential synchronization
    this.shadow = "";
}

//Produce a new name for a buffer, this function ensures
//that the produced name dosen't exist within the existing
//buffers
function getBufferName(name,buffers,it){

    var tmpName = "";

    if(it < 1){

	tmpName = name;
    }else
	tmpName = name + " <"+it+">";

    for(var i=0;i<buffers.length;i++){

	if(buffers[i].name == tmpName){

	    return getBufferName(name,buffers,it+1);
	}
    }

    return tmpName;
}

//The main text editor
var editor = undefined;

//The small text editor used to run commands
var miniBuffer = undefined;

//Place to write messages
var nArea = undefined;

//Given a complete filename with path, extract the filename
function makeBufferNameFromFile(filename){

    var lastSlash = filename.lastIndexOf('/');

    if(lastSlash >= 0)
	return filename.substr(lastSlash+1);
    else
	return filename;
}

//Create a new buffer with the given file and content
function openBuffer(editor,filename,content){

    var buffName = makeBufferNameFromFile(filename);

    var buffer = new Buffer(buffName,filename);

    if(content)
	buffer.content = content;

    buffers.push(buffer);
    editor.setBuffer(buffer);

    nArea.html('Loaded file: '+filename);
    editor.editor.focus();
}

//Open a file and load it into a new buffer. This function uses
//the minibuffer to get the filename from the user and puts
//the contents of the file in the given editor.
function openFile(editor){

    miniBuffer.getInput(function(filename){

	tersus.getFile(filename
		       ,function(c){openBuffer(editor,filename,c);}
		       ,{'errorCallback' : function(e){openBuffer(editor,filename,"");}});
    });
}

//Write the contents of the given editor into the file pointed by it's
//buffer
function saveEditorFile(editor){
    editor.buffer.content = editor.editor.getValue();
    
    tersus.writeFile(editor.buffer.file,
		     editor.buffer.content,
		     function(msg){
			 nArea.html('Wrote file: '+editor.buffer.file);
			 editor.editor.focus();
			 });
}

//Try to save file, this function checks that the buffer
//has a file asociated with it. If not, the filename is requested
//through the mini-buffer
function saveFile(editor){

    if(!editor.buffer.file){
	miniBuffer.getInput(function(filename){
	    
	    editor.buffer.file = filename;
	    saveEditorFile(editor);
	});
    }else
	saveEditorFile(editor);
	
}

//Some emacs like shortcuts for the editor
var FRAME_KEY_ACTIONS = [
    {name: 'findFile',
     bindKey : {win: 'Ctrl-X-Ctrl-F', mac: 'Command-X-Command-F'},
     exec: openFile},
    {name: 'writeFile',
     bindKey : {win: 'Ctrl-X-Ctrl-S', mac: 'Command-X-Command-S'},
     exec: saveFile}
    ];

//A frame is asociated with a ace editor. The frame also knows which
//buffer it's currently opened in that editor. Also the html div element
//is saved if direct manipulation to the dom is required
//The id of the div that should become an editor is given
function Frame(id){

    //The ace editor
    this.editor = ace.edit(id);
    //Html div element for that Frame
    this.div = $('#'+id);
    //The buffer to which the frame points
    this.buffer = undefined;
    //Add the editor to the map by id. This is used 
    //for referencing the Frame
    editors[id] = this;
    this.id = id;

    for(var i = 0; i < FRAME_KEY_ACTIONS.length; i++){

	var cmd = new Object();
	cmd.name = FRAME_KEY_ACTIONS[i].name;
	cmd.bindKey = FRAME_KEY_ACTIONS[i].bindKey;
	cmd.editorId = id;
	cmd.i = i;
	cmd.exec = function(){

	    var obj = editors[this.editorId];
	    FRAME_KEY_ACTIONS[this.i].exec(obj);
	    };

	this.editor.commands.addCommand(cmd);
    }
}
    
//Utility function to hide a frame
Frame.prototype.setVisible = function(visibility){

    if(visibility)
	this.div.css('visibility','visible');
    else
	this.div.css('visibility','hidden');
};

//Utility function to set the current buffer which
//is being edited by the frame. This function
//saves the current contents in the current buffer,
//changes the buffer and loads the contents from
//that buffer
Frame.prototype.setBuffer= function(buffer){

    if(this.buffer){

	this.buffer.content = this.editor.getValue();
    }

    this.buffer = buffer;
    this.editor.session.doc.setValue(this.buffer.content);
};

//The minibuffer is the small text area below used to obtain
//user input for many of the commands. If the mini-buffer is
//invoked a specified function will be called with the user
//input as parameter before being closed
//The id of the div element that should be used as minibuffer
//should be specified
function MiniBuffer(id){

    this.editor = ace.edit(id);
    this.div = $('#'+id);

    //The function that will be called before closing
    //the buffer giving the buffers contents as parameter
    this.closeFunction = undefined;

    //Key binding to call the close Function
    var runBuffer = new Object();
    runBuffer.name = 'runBuffer';
    runBuffer.bindKey = {win: 'return',  mac: 'return'};
    runBuffer.exec = function(e){runClose();};

    this.editor.commands.addCommand(runBuffer);

    //Visibility changing utility function
    this.setVisible = function(visibility){

	if(visibility)
	    this.div.css('visibility','visible');
	else
	    this.div.css('visibility','hidden');
    };

    //Open a minibuffer using f as the 
    //collapse function
    this.getInput = function(f){

	this.setVisible(true);
	this.closeFunction = f;
	this.editor.focus();
    };

}

//Function used to close the mini buffer
function runClose(){
        
    if(miniBuffer.closeFunction)
	miniBuffer.closeFunction(miniBuffer.editor.getValue());
    
    miniBuffer.closeFunction = undefined;
    
    miniBuffer.editor.setValue("");

    miniBuffer.setVisible(false);
};

$(document).ready(function(){

    nArea = $('#notificationsArea');

    miniBuffer = new MiniBuffer('miniBuffer');
    miniBuffer.setVisible(false);

    editor = new Frame('editor');
    editor.editor.setTheme("ace/theme/monokai");
    
    var buffer = new Buffer("*scratch*",undefined);
    buffers.push(buffer);
    editor.setBuffer(buffer);

    document.tersus.initMessaging();
});
