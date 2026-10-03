
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: true }
  });

  await win.loadFile('C:/Users/siddharth gupta/.gemini/antigravity/scratch/invoicewise/temp_blueprint.html');

  const pdfData = await win.webContents.printToPDF({
    pageSize: 'A4',
    printBackground: true,
    margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 }
  });

  fs.writeFileSync('C:/Users/siddharth gupta/.gemini/antigravity/scratch/invoicewise/InvoiceWise_v2.0_Technical_Blueprint.pdf', pdfData);
  try {
    fs.writeFileSync('E:/one drive data/Desktop/InvoiceWise_v2.0_Technical_Blueprint.pdf', pdfData);
  } catch(e) {
    console.log('Could not write to Desktop path:', e.message);
  }

  console.log('PDF Generated Successfully at:', 'C:/Users/siddharth gupta/.gemini/antigravity/scratch/invoicewise/InvoiceWise_v2.0_Technical_Blueprint.pdf');
  app.quit();
});
