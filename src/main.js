const { app, Menu, BrowserWindow } = require('electron');

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

  mainWindow.setAutoHideMenuBar(true);
  // mainWindow.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  const template = [
    {
      label: "Main",
      submenu: [
        {label: "About", role: "about"},
        {type: "separator"},
        {label: "DevTool", role: "toggledevtools"},
        {type: "separator"},
        {label: "Quit", role: "quit"},
      ]
    }
  ]
  
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  createWindow()
});

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
