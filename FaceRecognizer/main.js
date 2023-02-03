const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const url = require('url');
const path = require('path');
let counter = 0
let master = false;
// app launch and exit handle
app.on('ready', () => {
    const mainWindow = new BrowserWindow({
      width: 1200,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    const childWindow = new BrowserWindow({
      width: 1200,
      height: 900,
      webPreferences: {
        enableRemoteMobule: true,
        nodeIntegration: true,
        contextIsolation: false
      },
      parent: mainWindow,
      modal: true, 
      show: false
    });
    const mainFileName = path.join(app.getAppPath(), './test.html');
    const childFileName = path.join(app.getAppPath(), './index.html');
    mainWindow.loadFile(mainFileName);
    childWindow.loadFile(childFileName);
    childWindow.once('ready-to-show', () => {
      childWindow.show();
      childWindow.webContents.openDevTools();
    });
    childWindow.on('close', function (){
      if(master===false){
        if (process.platform !== 'darwin') app.quit();
      }
    })
  });

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
})
// ipc response handle
ipcMain.on("userFound", ()=>{
    console.warn("welcome back");
    master = true;
    (BrowserWindow.getFocusedWindow()).close();

})

ipcMain.on("unknown", ()=>{
    counter +=1;
    if(counter>=10){
      console.warn("unknown person");
      app.quit();
    }
})