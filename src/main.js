const { app, BrowserWindow } = require('electron');

const path = require('path');
const url = require('url');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow(
    {
      title: "jp.nerry.fedit95",
      width: 640, 
      height: 480,
      minWidth: 640,
      maxWidth: 640,
      minHeight: 480
    });

  mainWindow.loadURL(url.format({
      pathname: path.join(__dirname, '/index.html'),
      protocol: 'file:',
      slashes: true
  }));

  // mainWindow.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  // if (process.platform !== 'darwin') {
    app.quit();
  // }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
