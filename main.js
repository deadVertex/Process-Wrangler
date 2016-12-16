const {app, BrowserWindow, ipcMain} = require('electron')
const ffi = require('ffi');
const ref = require('ref');
const StructType = require('ref-struct');
const ArrayType = require('ref-array');

// Defined in libprocesswrangler header file
var PW_PROCESS_NAME_LENGTH = 260;
var PW_ERROR_MESSAGE_LENGTH = 320;

var ProcessNameType = ArrayType(ref.types.char, PW_PROCESS_NAME_LENGTH);
var ProcessType = StructType({
  'id' : ref.types.uint,
  'numThreads' : ref.types.uint,
  'workingSetSize' : ref.types.ulonglong,
  'name' : ProcessNameType
});

var ErrorMessageType = ArrayType(ref.types.char, PW_ERROR_MESSAGE_LENGTH);
var ErrorType = StructType({
  'code' : ref.types.uint32,
  'line' : ref.types.uint32,
  'file' : ref.types.CString,
  'function' : ref.types.CString,
  'message' : ErrorMessageType
});

var ProcessListType = ArrayType(ProcessType);
var ProcessIdListType = ArrayType(ref.types.uint32);

var libprocesswrangler = ffi.Library('libprocesswrangler.dll', {
  'PW_UpdateProcessList': [ 'int', [] ],
  'PW_ClearProcessList': [ 'void', [] ],
  'PW_GetProcessList': [ 'int', [ ProcessListType, ref.types.uint ] ],
  'PW_KillProcesses': [ 'int', [ ProcessIdListType, ref.types.uint ] ],
  'PW_GetErrorCount': [ ref.types.uint, [] ],
  'PW_ClearErrors' : [ 'void', [] ],
  'PW_GetError' : [ 'int', [ ref.refType(ErrorType) ] ]
});

function convertCString(input) {
  var result = "";
  for (var i = 0; i < input.length; ++i) {
    if (input[i] == 0) {
      break;
    }
    result = result + String.fromCharCode(input[i]);
  }

  return result;
}
function updateProcessList() {

  var count = libprocesswrangler.PW_UpdateProcessList();

  if (count > 0) {
    var processList = new ProcessListType(count);

    libprocesswrangler.PW_GetProcessList(processList, processList.length);
    var processListMessage = new Array();
    for (var i = 0; i < count; ++i) {
      processListMessage[i] = {
        'pid' : processList[i].id,
        'name' : convertCString(processList[i].name),
        'numThreads' : processList[i].numThreads,
        'workingSetSize' : processList[i].workingSetSize
      };
    }
    mainWindow.webContents.send('processList_update', processListMessage );

  } else if (numProcesses < 0) {
    console.log("PW_UpdateProcessListFailed");
  }
}

function killProcesses(event, pids) {
  if (pids.length > 0) {
    var pidList = new ProcessIdListType(pids.length);
    for (var i = 0; i < pids.length; ++i) {
      pidList[i] = pids[i];
    }

    console.log(pidList[i]);
    console.log("Killing processes: " + pids);
    console.log("Before: " + libprocesswrangler.PW_GetErrorCount());
    libprocesswrangler.PW_ClearErrors();
    var result = libprocesswrangler.PW_KillProcesses(pidList, pidList.length);
    if (result < pidList.length) {
      var error = new ErrorType();
      if (libprocesswrangler.PW_GetError(error.ref()) == 0) {
        console.log("Error:");
        console.log("\tCode: " + error.code);
        console.log("\tFile: " + error.file);
        console.log("\tFunction: " + error.function);
        console.log("\tLine: " + error.line);
        console.log("\tMessage: " + convertCString(error.message));
      }
    }
    console.log("Result: " + result + " length: " + pidList.length);
    console.log("After: " + libprocesswrangler.PW_GetErrorCount());
  }
}

function createWindow () {
  mainWindow = new BrowserWindow({width: 800, height: 600})

  mainWindow.loadURL(`file://${__dirname}/index.html`)

  mainWindow.webContents.on('did-finish-load', () => {
    updateProcessList();
    setInterval(updateProcessList, 1000);
  })

  mainWindow.on('closed', function () {
    mainWindow = null
  });

  ipcMain.on('killProcesses', killProcesses);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})
