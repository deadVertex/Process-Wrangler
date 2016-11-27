const {app, BrowserWindow} = require('electron')
const ffi = require('ffi');
const ref = require('ref');
const StructType = require('ref-struct');
const ArrayType = require('ref-array');

// Defined in libprocesswrangler header file
var PW_PROCESS_NAME_LENGTH = 260;

var ProcessNameType = ArrayType(ref.types.char, PW_PROCESS_NAME_LENGTH);
var ProcessType = StructType({
  'id' : ref.types.uint,
  'numThreads' : ref.types.uint,
  'workingSetSize' : ref.types.ulonglong,
  'name' : ProcessNameType
});

var ProcessListType = ArrayType(ProcessType);

var libprocesswrangler = ffi.Library('libprocesswrangler.dll', {
  'PW_UpdateProcessList': [ 'int', [] ],
  'PW_ClearProcessList': [ 'void', [] ],
  'PW_GetProcessList': [ 'int', [ ref.refType(ProcessListType), ref.types.uint ] ],
});

function updateProcessList() {

  var count = libprocesswrangler.PW_UpdateProcessList();

  if (count > 0) {
    var processList = new ProcessListType(count);

    libprocesswrangler.PW_GetProcessList(processList[0].ref(), processList.length);
    var processListMessage = new Array();
    for (var i = 0; i < count; ++i) {
      var name = "";
      for (var j = 0; j < processList[i].name.length; ++j) {
        if (processList[i].name[j] == 0) {
          break;
        }
        name = name + String.fromCharCode(processList[i].name[j]);
      }
      processListMessage[i] = {
        'pid' : processList[i].id,
        'name' : name,
        'numThreads' : processList[i].numThreads,
        'workingSetSize' : processList[i].workingSetSize
      };
    }
    mainWindow.webContents.send('processList_update', processListMessage );

  } else if (numProcesses < 0) {
    console.log("PW_UpdateProcessListFailed");
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
  })
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
