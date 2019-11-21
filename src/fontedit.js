/*
Bitmap Font Editor
Copyright (C) 2019 Nerry, https://nerry.jp/
LICENSE: GPL
*/
'use strict';

const $ = x => document.querySelector(x);

let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new FontEdit();
    if (location.hash.startsWith('#https://'))
    {
        app.loadAjax(location.hash.slice(1), () => {
            location.hash = '';
        });
    }
});


class FontEdit {
    static get LS_WORKSPACE_KEY() { return "workSpace"; }
    static get LS_PREVIEW_KEY() { return "preview"; }
    static get MIN_UNICHAR() { return 0x20 }
    static get MAX_UNICHAR() { return 0x7F }
    
    constructor() {
        this.currentEditCode = 0x41;
        this.fontDriver = new FontDriver();
        this.mainCanvas = new GlyphEditor('#mainCanvas');
        this.bgDimmingCount = 0;
        
        $('#previewText').value = localStorage.getItem(FontEdit.LS_PREVIEW_KEY) ||
        [
            "The quick brown fox jumps over the lazy dog.",
            "ETAOIN SHRDLU CMFWYP VBGKQJ XZ 1234567890",
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
        ].join('\n');
        this.loadData(localStorage.getItem(FontEdit.LS_WORKSPACE_KEY) || "Rk9OVFgyICAgICAgICAIEAA=", false);
        
        $('#fontWidth').addEventListener('input', () => this.resizeDOM());
        $('#fontHeight').addEventListener('input', () => this.resizeDOM());
        
        $('#glyphChar').addEventListener('input', () => {
            const c = $('#glyphChar').value;
            if (c.length > 0) {
                this.currentEditCode = c.slice(-1).charCodeAt(0);
                this.refreshGlyphSelector();
            }
        });
        
        $('#glyphCode').addEventListener('input', () => {
            const c = parseInt($('#glyphCode').value, 16);
            if (c > 0) {
                this.currentEditCode = c;
                this.refreshGlyphSelector();
            }
        });
        
        $('#glyphLt').addEventListener('click', () => {
            if (this.currentEditCode > FontEdit.MIN_UNICHAR) {
                this.currentEditCode--;
                this.refreshGlyphSelector();
            }
        });
        $('#glyphGt').addEventListener('click', () => {
            this.currentEditCode++;
            this.refreshGlyphSelector();
        });
        
        $('#clearButton').addEventListener('click', () => this.mainCanvas.clear());
        $('#reverseButton').addEventListener('click', () => this.mainCanvas.reverse());
        $('#shiftLButton').addEventListener('click', () => this.mainCanvas.shiftL());
        $('#shiftRButton').addEventListener('click', () => this.mainCanvas.shiftR());
        $('#shiftUButton').addEventListener('click', () => this.mainCanvas.shiftU());
        $('#shiftDButton').addEventListener('click', () => this.mainCanvas.shiftD());
        $('#undoButton').addEventListener('click', () => this.mainCanvas.undo());
        $('#redoButton').addEventListener('click', () => this.mainCanvas.redo());
        $('#yankButton').addEventListener('click', () => this.mainCanvas.yank());
        $('#pasteButton').addEventListener('click', () => this.mainCanvas.paste());
        
        $('#applyButton').addEventListener('click', () => {
            this.fontDriver.setGlyph(this.currentEditCode, this.mainCanvas.glyph);
            this.refreshPreview();
            localStorage.setItem(FontEdit.LS_WORKSPACE_KEY, this.fontDriver.export());
        });
        
        $('#importButton').addEventListener('click', () => {
            if (this.loadData($('#base64Console').value)) {
                new SaveLoadDialog().dismiss()
            }
        });
        
        $('#ajaxForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const url = $('#urlInputField').value;
            if (url.length == 0) return;
            this.loadAjax(url, () => {
                Dialog.dismissTop();
            });
        }, false);
        
        $('#previewText').addEventListener('input', () => this.refreshPreview());
        
        $('#previewText').addEventListener('change', () => {
            localStorage.setItem(FontEdit.LS_PREVIEW_KEY, $('#previewText').value);
        })
        
        $('#saveLoadButton').addEventListener('click', () => {
            $('#base64Console').value = this.fontDriver.export();
            new SaveLoadDialog().show()
        })
        
        $('#ajaxDialogButton').addEventListener('click', () => {
            new SaveLoadDialog().dismiss();
            new AjaxDialog().show();
        });
        $('#exportMenuButton').addEventListener('click', () => {
            new SaveLoadDialog().dismiss();
            new ExportDialog().show();
        });
        
        $('#fontName').addEventListener('input', () => {
            this.fontDriver.fontName = $('#fontName').value;
        })
        
        $('html').addEventListener('dragover', (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (!this.nowDragging) {
                this.nowDragging = true;
                this.dimWindow(1);
            }
        }, false);
        
        $('html').addEventListener('dragleave', (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (this.nowDragging) {
                this.nowDragging = false;
                this.dimWindow(-1);
            }
        }, false);
        
        $('html').addEventListener('drop', (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (this.nowDragging) {
                this.nowDragging = false;
                this.dimWindow(-1);
            }
            const reader = new FileReader();
            reader.addEventListener('load', (e) => {
                this.loadData(e.target.result);
            });
            reader.readAsBinaryString(e.dataTransfer.files[0]);
        }, false);
        
        $('#loadButton').addEventListener('click', () => $('#loadFile').click(), false);
        
        $('#loadFile').addEventListener('change', (e) => {
            const reader = new FileReader();
            reader.addEventListener('load', (e) => {
                if (this.loadData(e.target.result)) {
                    new SaveLoadDialog().dismiss()
                }
            });
            reader.readAsBinaryString(e.target.files[0]);
        }, false);
        
        $('#exportImageButton').addEventListener('click', () => {
            const canvas = document.createElement('canvas')
            this.fontDriver.exportImage(canvas, 16)
            new ExportImageDialog().show()
            const img = $('#exportImageMain')
            img.src = canvas.toDataURL('image/png')
        })
        
        $('#saveExportImageButton').addEventListener('click', () => {
            const tag = document.createElement('a')
            tag.href = $('#exportImageMain').src
            tag.download = (this.fontDriver.fontName || 'font').toLowerCase() + '.png'
            tag.click()
        })
        
        $('#importImageWidth').addEventListener('input', () => this.resizeImport(), false)
        $('#importImageHeight').addEventListener('input', () => this.resizeImport(), false)
        $('#importImageOffsetX').addEventListener('input', () => this.resizeImport(), false)
        $('#importImageOffsetY').addEventListener('input', () => this.resizeImport(), false)
        
        $('#importImageButton').addEventListener('click', () => {
            this.setFontDriver(this.importFont)
            new ImportImageDialog().dismiss()
        }, false)
        
        const base64_to_buffer = (base64) => {
            const str = atob(base64)
            const array = new ArrayBuffer(str.length)
            const u8v = new Uint8Array(array)
            for (let i = 0; i < str.length; i++) {
                u8v[i] = str.charCodeAt(i)
            }
            return u8v
        }
        
        $('#exportTextButton').addEventListener('click', () => {
            let blob;
            if (this.exportDriver.binary) {
                blob = new Blob([base64_to_buffer($('#exportTextArea').value)], {type: 'application/octet-stream'});
            } else {
                blob = new Blob([$('#exportTextArea').value], {type: 'text/plain'});
            }
            const url = URL.createObjectURL(blob);
            const tag = document.createElement('a');
            tag.href = url;
            tag.download = (this.fontDriver.fontName || 'font').toLowerCase() + this.exportDriver.extension;
            tag.click();
        })
        
        const ph = $('#exportMenuPlaceholder');
        for (const provider in FontDriver.driverList) {
            const driver = FontDriver.driverList[provider];
            if (!driver.export) continue;
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.className = 'button';
            a.addEventListener('click', (e) => {
                this.exportDriver = FontDriver.driverList[provider];
                $('#exportTextArea').value = this.fontDriver.exportAs(provider);
                $('#exportTextDialog h2').innerText = `Export as ${provider}`;
                new ExportTextDialog().show()
            });
            a.appendChild(document.createTextNode(provider));
            li.appendChild(a);
            ph.appendChild(li);
        }
        
        document.querySelectorAll('#penToolGroup input[type=radio]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.mainCanvas.penStyle = parseInt($('#penToolGroup').pen.value)
            })
        });
        
        document.querySelectorAll('.dialogCloseButton').forEach(button => {
            button.addEventListener('click', () => {
                Dialog.dismissTop()
            })
        });
        
        window.alert = (x) => {
            this.showMessage(x);
        }
        
    }
    
    dimWindow (x = 1) {
        this.bgDimmingCount += x;
        if (this.bgDimmingCount > 0) {
            $('#mainScreen').classList.add('blur');
        } else {
            $('#mainScreen').classList.remove('blur');
        }
    }
    
    refreshGlyphSelector () {
        if (this.currentEditCode > FontEdit.MAX_UNICHAR) this.currentEditCode = FontEdit.MAX_UNICHAR;
        $('#glyphCode').value = this.currentEditCode.toString(16);
        let c = String.fromCharCode(this.currentEditCode);
        $('#glyphChar').value = c;
        this.mainCanvas.loadGlyph(this.fontDriver.getGlyph(this.currentEditCode));
    }
    
    resizeDOM () {
        const fontWidth = parseInt($('#fontWidth').value)
        const fontHeight = parseInt($('#fontHeight').value)
        if (!fontWidth || !fontHeight) return;
        if (this.mainCanvas.resize(fontWidth, fontHeight)) {
            this.fontDriver.resize(fontWidth, fontHeight)
            $('#fontWidth').value = fontWidth
            $('#fontHeight').value = fontHeight
        }
    }
    
    refreshPreview () {
        const str = $('#previewText').value;
        const canvas = $('#previewCanvas');
        canvas.setAttribute('height', $('#previewText').clientHeight);
        this.fontDriver.drawText(str, canvas)
    }
    
    setFontDriver(fontDriver, save = true) {
        this.fontDriver = fontDriver
        if (save) {
            localStorage.setItem(FontEdit.LS_WORKSPACE_KEY, this.fontDriver.export());
        }
        this.mainCanvas.resize(this.fontDriver.fontWidth, this.fontDriver.fontHeight);
        $('#fontName').value = this.fontDriver.fontName;
        $('#fontWidth').value = this.fontDriver.fontWidth;
        $('#fontHeight').value = this.fontDriver.fontHeight;
        this.refreshGlyphSelector();
        this.refreshPreview();
    }
    
    loadData (blob, save = true) {
        let imageType = null;
        if (blob.startsWith('\x89PNG\x0D\x0A\x1A\x0A')) {
            imageType = 'image/png';
        } else if (blob.startsWith('\xFF\xD8')) {
            imageType = 'image/jpeg';
        }
        if (imageType) {
            const img = new Image()
            img.addEventListener('load', () => {
                const { width, height } = img
                if (width > 512 || height > 256) {
                    alert('ERROR: Image too large')
                    return
                }
                let fontWidth = 8, fontHeight = 16, offsetX = 0, offsetY = 0
                if ((width & 0xF) == 0) {
                    if ((height % 6) == 0) {
                        fontWidth = width / 16
                        fontHeight = height / 6
                    } else if ((height % 8) == 0) {
                        fontWidth = width / 16
                        fontHeight = height / 8
                        offsetY = fontHeight * 2
                    }
                }
                $('#importImageWidth').value = fontWidth
                $('#importImageHeight').value = fontHeight
                $('#importImageOffsetX').value = offsetX
                $('#importImageOffsetY').value = offsetY
                this.importFont = new FontDriver()
                this.importImgCanvas = document.createElement('canvas')
                this.importImgCanvas.width = width
                this.importImgCanvas.height = height
                const ctx = this.importImgCanvas.getContext('2d')
                ctx.drawImage(img, 0, 0)
                new ImportImageDialog().show()
                this.resizeImport()
            })
            img.src = "data:" + imageType + ";base64," + btoa(blob)
            return true;
        } else if (this.fontDriver.import(blob)) {
            this.setFontDriver(this.fontDriver, save)
            return true;
        } else {
            alert('ERROR: Cannot import data');
            return false;
        }
    }
    
    resizeImport() {
        const fontWidth = parseInt($('#importImageWidth').value) || 0
        const fontHeight = parseInt($('#importImageHeight').value) || 0
        const offsetX = parseInt($('#importImageOffsetX').value) || 0
        const offsetY = parseInt($('#importImageOffsetY').value) || 0
        if (fontWidth == 0 || fontHeight == 0) return;
        
        const canvas0 = this.importImgCanvas
        const ctx0 = canvas0.getContext('2d')
        const { width, height } = canvas0
        
        const canvas1 = $('#importImageCanvas')
        canvas1.width = width + 1
        canvas1.height = height + 1
        const ctx1 = canvas1.getContext('2d')
        ctx1.putImageData(ctx0.getImageData(0, 0, width, height), 0, 0)
        const cols = Math.floor(width / fontWidth)
        const rows = Math.floor(96 / cols)
        const preferredWidth = fontWidth * cols
        const preferredHeight = fontHeight * rows
        ctx1.lineWidth = 1
        ctx1.strokeStyle = 'rgba(127, 127, 255, 0.25)'
        for (let i = 0; i <= cols; i++) {
            ctx1.moveTo(offsetX + i * fontWidth, offsetY)
            ctx1.lineTo(offsetX + i * fontWidth, offsetY + preferredHeight)
            ctx1.stroke()
        }
        ctx1.strokeStyle = 'rgba(255, 127, 127, 0.25)'
        for (let i = 0; i <= rows; i++) {
            ctx1.moveTo(offsetX, offsetY + i * fontHeight)
            ctx1.lineTo(offsetX + preferredWidth, offsetY + i * fontHeight)
            ctx1.stroke()
        }
        
        this.importFont.importImage(canvas0, fontWidth, fontHeight, offsetX, offsetY)
        
        const canvas2 = $('#importPreviewCanvas')
        canvas2.width = Math.max(256, this.importImgCanvas.width)
        canvas2.height = fontHeight
        this.importFont.drawText('ABCD abcd 1234', canvas2)
    }
    
    loadAjax(url, onsuccess = undefined) {
        this.showMessage('Loading...', {noTitle: true});
        fetch(url)
        .then(res => {
            if (res.ok) {
                return res.blob();
            } else {
                throw 'HTTP Error';
            }
        })
        .then(blob => {
            Dialog.dismissTop();
            const reader = new FileReader();
            reader.onloadend = () => {
                const success = this.loadData(reader.result);
                if (success && onsuccess) {
                    onsuccess();
                }
            }
            reader.readAsBinaryString(blob);
        })
        .catch(err => {
            Dialog.dismissTop();
            alert(err);
        });
    }
    
    showMessage(message, options = {}) {
        new AlertDialog(message, options).show();
    }
}


class Dialog {
    constructor (selector) {
        this.selector = selector
        this.element = $(selector)
    }
    
    onclose () {}
    
    show () {
        Dialog.show(this)
    }
    dismiss () {
        Dialog.dismiss(this)
    }
    static show (dialog) {
        if (dialog.element.style.display === 'block') return;
        app.dimWindow(1);
        
        if (Dialog._stack.length == 0) Dialog._lastIndex = 100;
        Dialog._stack.push(dialog)
        dialog.element.style.zIndex = (++Dialog._lastIndex)
        dialog.element.style.display = 'block';
    }
    static dismiss (dialog) {
        Dialog._stack = Dialog._stack.filter(value => {
            if (value.selector === dialog.selector) {
                this.close(value)
                return false;
            } else {
                return true;
            }
        })
    }
    static dismissAll () {
        while (Dialog._stack.length > 0) {
            this.dismissTop()
        }
    }
    static dismissTop () {
        if (Dialog._stack.length > 0) {
            this.close(Dialog._stack.pop())
        }
    }
    static close(dialog) {
        app.dimWindow(-1);
        dialog.element.style.display = 'none';
        dialog.onclose()
    }
}
Dialog._lastIndex = 0;
Dialog._stack = [];


class AlertDialog extends Dialog {
    constructor (message, options) {
        super('#alertDialog');
        const title = options.title || '';
        if (options.noTitle) {
            $('#alertTitle').style.display = 'none';
            $('#alertDialog .dialogCloseButton').style.display = 'none';
        } else {
            $('#alertTitle').style.display = 'block';
            $('#alertDialog .dialogCloseButton').style.display = 'inline-block';
            $('#alertTitle').innerText = `\u274F ${title}`;
        }
        $('#alertMessage').innerText = message;
    }
}


class ExportDialog extends Dialog {
    constructor () {
        super('#exportMenu');
    }
}

class SaveLoadDialog extends Dialog {
    constructor () {
        super('#saveLoadDialog');
    }
}

class ExportTextDialog extends Dialog {
    constructor () {
        super('#exportTextDialog');
    }
    onclose () {
        this.exportDriver = null;
    }
}

class ExportImageDialog extends Dialog {
    constructor () {
        super('#exportImageDialog');
    }
}

class ImportImageDialog extends Dialog {
    constructor () {
        super('#importImageDialog');
    }
    onclose () {
        app.importFont = null;
        app.importImgCanvas = null;
    }
}

class AjaxDialog extends Dialog {
    constructor () {
        super('#ajaxDialog');
    }
}


class GlyphEditor {
    constructor(selector) {
        this.canvas = $(selector);
        this.margin = 8;
        this.glyph = new GlyphModel();
        this.penStyle = -1;
        this.resetCheckPoint();
        
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouseDown = true;
            const { ex, ey } = this.convertMouseEvent(e);
            this.currentColor = this.penStyle < 0 ? !this.getPixel(ex, ey) : this.penStyle
            this.setPixel(ex, ey, this.currentColor);
            e.preventDefault();
            e.stopPropagation();
        }, false);
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.mouseDown) {
                const { ex, ey } = this.convertMouseEvent(e);
                this.setPixel(ex, ey, this.currentColor);
                e.preventDefault();
                e.stopPropagation();
            }
        }, false);
        this.canvas.addEventListener('mouseup', (e) => {
            this.mouseDown = false;
            const { ex, ey } = this.convertMouseEvent(e);
            this.setPixel(ex, ey, this.currentColor);
            this.setCheckPoint();
            e.preventDefault();
            e.stopPropagation();
        }, false);
        
        this.canvas.addEventListener('touchstart', (e) => {
            const { ex, ey } = this.convertTouchEvent(e);
            this.currentColor = this.penStyle < 0 ? !this.getPixel(ex, ey) : this.penStyle
            this.setPixel(ex, ey, this.currentColor);
            e.preventDefault();
        }, false);
        this.canvas.addEventListener('touchmove', (e) => {
            const { ex, ey } = this.convertTouchEvent(e);
            this.setPixel(ex, ey, this.currentColor);
            e.preventDefault();
        }, false);
        this.canvas.addEventListener('touchend', (e) => {
            this.setCheckPoint();
            e.preventDefault();
        }, false);
        this.canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
        }, false);
        
    }
    convertMouseEvent(e) {
        const tr = e.target.getBoundingClientRect();
        const ex = ((e.clientX - tr.left - this.margin) / this.scale) | 0;
        const ey = ((e.clientY - tr.top - this.margin) / this.scale) | 0;
        return {ex, ey};
    }
    convertTouchEvent(e) {
        const tr = e.target.getBoundingClientRect();
        const t = e.touches[0];
        const ex = (((t.clientX - tr.left - this.margin)) / this.scale) | 0;
        const ey = (((t.clientY - tr.top - this.margin)) / this.scale) | 0;
        return {ex, ey};
    }
    resize(width, height) {
        if (width > 0 && width <= GlyphModel.MAX_WIDTH && height > 0 && height <= GlyphModel.MAX_HEIGHT)
        {} else return false;
        
        this.width = width;
        this.height = height;
        const long = Math.max(width, height);
        if (long <= 16) {
            this.scale = 16;
        } else if (long <= 24) {
            this.scale = 10;
        } else if (long <= 32) {
            this.scale = 8;
        } else if (long < 42) {
            this.scale = 6;
        } else {
            this.scale = 4;
        }
        const { canvas, margin, scale } = this;
        canvas.setAttribute('width', margin * 2 + width * scale);
        canvas.setAttribute('height', margin * 2 + height * scale);
        this.redraw();
        return true;
    }
    clear() {
        this.glyph = new GlyphModel();
        this.setCheckPoint();
        this.redraw();
    }
    getPixel(x, y) {
        return this.glyph.getPixel(x | 0, y | 0);
    }
    setPixel(x, y, color) {
        const cx = x | 0;
        const cy = y | 0;
        this.glyph.setPixel(cx, cy, color)
        const { canvas, width, height, scale, margin } = this;
        if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = color ? "#000" : "#FFF";
            ctx.fillRect(margin + cx * scale, margin + cy * scale, scale, scale);
            ctx.fillStyle = "#888";
            ctx.lineWidth = 1;
            ctx.fillRect(margin + cx * scale + scale - 1, margin + cy * scale + scale - 1, 1, 1);
        }
    }
    redraw() {
        const { width, height } = this;
        for (let i = 0; i < width; i++) {
            for (let j = 0; j < height; j++) {
                this.setPixel(i, j, this.getPixel(i, j));
            }
        }
    }
    reverse() {
        this.glyph.reverse();
        this.setCheckPoint();
        this.redraw();
    }
    shiftL() {
        this.glyph.shiftL(this.width);
        this.setCheckPoint();
        this.redraw();
    }
    shiftR() {
        this.glyph.shiftR(this.width);
        this.setCheckPoint();
        this.redraw();
    }
    shiftU() {
        this.glyph.shiftU(this.height);
        this.setCheckPoint();
        this.redraw();
    }
    shiftD() {
        this.glyph.shiftD(this.height);
        this.setCheckPoint();
        this.redraw();
    }
    yank() {
        this.yankBuffer = this.glyph.clone();
    }
    paste() {
        if (this.yankBuffer) {
            this.glyph = this.yankBuffer.clone();
            this.setCheckPoint();
            this.redraw();
        }
    }
    loadGlyph(glyph) {
        this.glyph = glyph.clone();
        this.resetCheckPoint();
        this.redraw();
    }
    resetCheckPoint() {
        this.undoList = [this.glyph.clone()];
        this.redoList = [];
    }
    setCheckPoint() {
        this.undoList.push(this.glyph.clone());
        this.redoList = [];
    }
    get canUndo() {
        return this.undoList.length > 1;
    }
    get canRedo() {
        return this.redoList.length > 0;
    }
    undo() {
        if (this.canUndo) {
            this.redoList.push(this.undoList.pop());
            this.glyph = this.undoList.slice(-1)[0].clone();
            this.redraw();
        }
    }
    redo() {
        if (this.canRedo) {
            const glyph = this.redoList.pop();
            this.glyph = glyph.clone();
            this.undoList.push(glyph);
            this.redraw();
        }
    }
}


class GlyphModel {
    static get MAX_WIDTH() { return 32 }
    static get MAX_HEIGHT() { return 32 }
    static get BIT_LEFT() { return 0x80000000 }
    
    constructor(rawData = null) {
        if (rawData) {
            this.rawData = new Uint32Array(rawData);
        } else {
            this.rawData = new Uint32Array(GlyphModel.MAX_HEIGHT);
        }
    }
    getPixel(x, y) {
        const row = this.rawData[y] | 0;
        return (row & (GlyphModel.BIT_LEFT >>> x)) != 0;
    }
    setPixel(x, y, color = 1) {
        let row = this.rawData[y] | 0;
        if (color) {
            row |= (GlyphModel.BIT_LEFT >>> x);
        } else {
            row &= ~(GlyphModel.BIT_LEFT >>> x);
        }
        this.rawData[y] = row;
    }
    get isWhite() {
        return !this.rawData.reduce((a, b) => a | b);
    }
    equals(obj) {
        if (typeof obj !== typeof this) return false;
        return this.rawData.reduce((a, v, i) => {
            return a && (obj.rawData[i] == v)
        }, true);
    }
    clone() {
        return new GlyphModel(this.rawData)
    }
    reverse() {
        this.rawData = this.rawData.map(value => ~value);
    }
    shiftL(width = GlyphModel.MAX_WIDTH) {
        this.rawData = this.rawData.map(value => value << 1);
    }
    shiftR(width = GlyphModel.MAX_WIDTH) {
        this.rawData = this.rawData.map(value => value >>> 1);
    }
    shiftU(height = GlyphModel.MAX_HEIGHT) {
        const data = this.rawData[0];
        this.rawData.copyWithin(0, 1, height);
        this.rawData[height - 1] = data;
    }
    shiftD(height = GlyphModel.MAX_HEIGHT) {
        const data = this.rawData[height - 1];
        this.rawData.copyWithin(1, 0, height);
        this.rawData[0] = data;
    }
    draw(ctx, x, y, width, height, color = 0x000000) {
        let imageData = ctx.getImageData(x, y, width, height)
        const R = (color & 0xFF0000) >> 16
        const G = (color & 0x00FF00) >> 8
        const B = (color & 0x0000FF)
        const A = 0xFF
        let index = 0
        for (let i = 0; i < height; i++) {
            const rawData = this.rawData[i]
            for (let j = 0; j < width; j++) {
                if (rawData & (GlyphModel.BIT_LEFT >>> j)) {
                    imageData.data[index++] = R
                    imageData.data[index++] = G
                    imageData.data[index++] = B
                    imageData.data[index++] = A
                } else {
                    index += 4
                }
            }
        }
        ctx.putImageData(imageData, x, y)
    }
    
    static get SERIALIZE_FONTX () { return 0; }
    static get SERIALIZE_ARRAY () { return 1; }
    static get SERIALIZE_B64A () { return 2; }
    static deserialize(blob, width, height, type = 0) {
        let data = new Uint32Array(this.MAX_HEIGHT);
        const w8 = Math.floor((width + 7) / 8);
        switch (type) {
        case this.SERIALIZE_ARRAY:
            for (let i = 0; i < height; i++) {
                let rawValue = 0;
                for (let j = 0; j < w8; j++) {
                    const byte = blob[i * w8 + j];
                    rawValue |= (byte << (24 - j * 8));
                }
                data[i] = rawValue;
            }
            break;
        default:
            for (let i = 0; i < height; i++) {
                let rawValue = 0;
                for (let j = 0; j < w8; j++) {
                    const byte = blob.charCodeAt(i * w8 + j);
                    rawValue |= (byte << (24 - j * 8));
                }
                data[i] = rawValue;
            }
        }
        return new GlyphModel(data)
    }
    serialize(width, height, type = 0) {
        let result = [];
        switch (type) {
        case GlyphModel.SERIALIZE_B64A:
            const w6 = Math.floor((width + 5) / 6);
            for (let i = 0; i < height; i++) {
                const rawData = this.rawData[i] || 0;
                for (let j = 0; j < w6; j++) {
                    const byte = (rawData >>> (26 - j * 6)) & 0x3F;
                    result.push(byte);
                }
            }
            return result;
        default:
            const w8 = Math.floor((width + 7) / 8);
            for (let i = 0; i < height; i++) {
                const rawData = this.rawData[i] || 0;
                for (let j = 0; j < w8; j++) {
                    const byte = (rawData >>> (24 - j * 8)) & 0xFF;
                    result.push(byte);
                }
            }
            switch (type) {
                case GlyphModel.SERIALIZE_ARRAY:
                return result;
            default:
                return String.fromCharCode.apply(String, result);
            }
        }
    }
}


class FontDriver {
    constructor() {
        this.beginImport(8, 16);
    }
    beginImport(fontWidth, fontHeight, fontName = null, type = 0) {
        this.fontWidth = fontWidth;
        this.fontHeight = fontHeight;
        this.fontName = this.validateFontName(fontName).trim();
        this.data = new Array(256);
    }
    validateFontName(fontName = this.fontName) {
        const safeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_";
        let result = (fontName || '').trim().split('').reduce((a, v) => {
            if (safeChars.indexOf(v) >= 0) {
                return a + v;
            } else {
                return a + '_';
            }
        }, '');
        return (result + '        ').slice(0, 8);
    }
    
    static get driverList() {
        if (!FontDriver._driverList) {
            FontDriver._driverList = {};
        }
        return FontDriver._driverList;
    }
    static register(driverName, classDef) {
        FontDriver.driverList[driverName] = classDef;
    }
    import(data) {
        for (const name in FontDriver.driverList) {
            const driver = FontDriver.driverList[name];
            if (driver.import && driver.import.call(this, data)) {
                return true;
            }
        }
        return false;
    }
    export() {
        const name = Object.keys(FontDriver.driverList)[0]
        return this.exportAs(name);
    }
    exportAs(provider) {
        const def = FontDriver.driverList[provider];
        if (!def) throw `PROVIDER ${provider}: NOT FOUND`;
        if (!def.export) throw `PROVIDER ${provider}: CANNOT EXPORT`;
        return def.export.call(this);
    }
    
    getGlyph(code) {
        return this.data[code] || new GlyphModel();
    }
    setGlyph(code, glyph) {
        this.data[code] = glyph.clone();
    }
    resize(fontWidth, fontHeight) {
        this.fontWidth = fontWidth
        this.fontHeight = fontHeight
    }
    drawChar(code, ctx, x, y, color = 0x000000) {
        const glyph = this.getGlyph(code)
        glyph.draw(ctx, x, y, this.fontWidth, this.fontHeight, color)
    }
    drawText(str, canvas, x = 0, y = 0, w = null, h = null, color = 0x000000) {
        let cursorX = x, cursorY = y
        const maxWidth = w || canvas.width
        const maxHeight = h || canvas.height
        const {fontWidth, fontHeight} = this
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, maxWidth, maxHeight);
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            switch (char) {
                case 0x0A: // LF
                cursorX = 0;
                cursorY += fontHeight;
                break;
                default:
                if (cursorX + fontWidth > maxWidth) {
                    cursorX = 0;
                    cursorY += fontHeight;
                }
                this.drawChar(char, ctx, cursorX, cursorY, color)
                cursorX += fontWidth;
            }
            if (cursorY >= maxHeight) break;
        }
    }
    
    exportImage(canvas, cols) {
        const { fontWidth, fontHeight } = this;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(255, 255, 255, 0.0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const baseChar = 0x20;
        const charCount = 0x80 - baseChar;
        canvas.width = fontWidth * cols;
        canvas.height = Math.floor((fontHeight * charCount + cols - 1) / cols);
        for (let i = 0; i < charCount; i++) {
            const x = fontWidth * (i % cols);
            const y = fontHeight * Math.floor(i / cols);
            this.drawChar(baseChar + i, ctx, x, y, 0);
        }
    }
    importImage(canvas, fontWidth, fontHeight, offsetX, offsetY) {
        this.beginImport(fontWidth, fontHeight);
        const baseChar = 0x20;
        const charCount = 0x80 - baseChar;
        const ctx = canvas.getContext('2d');
        const maxWidth = canvas.width;
        const cols = Math.floor(maxWidth / fontWidth);
        const leftTopPixel = ctx.getImageData(0, 0, 1, 1);
        const isOpacity = (leftTopPixel.data[3] == 255);
        for (let i = 0; i < charCount; i++) {
            const x = offsetX + (i % cols * fontWidth);
            const y = offsetY + (Math.floor(i / cols) * fontHeight);
            const imageData = ctx.getImageData(x, y, fontWidth, fontHeight);
            let index = 0;
            let glyph = new GlyphModel();
            for (let j = 0; j < fontHeight; j++) {
                for (let k = 0; k < fontWidth; k++) {
                    let color;
                    if (isOpacity) {
                        let colors = 0;
                        for (let l = 0; l < 3; l++) {
                            colors += Math.abs(imageData.data[index + l] - leftTopPixel.data[l])
                        }
                        color = colors / (3 * 255.0);
                    } else {
                        color = imageData.data[index + 3] / 255.0;
                    }
                    if (color > 0.5) {
                        glyph.setPixel(k, j);
                    }
                    index += 4;
                }
            }
            this.data[baseChar + i] = glyph;
        }
    }
    
}


// FONTX2 Driver
(function(){
    FontDriver.register('FONTX2', {
        extension: '.fnt', binary: true,
        import: function(blob) {
            if (blob.startsWith('Rk9OVFgy')) {
                blob = atob(blob);
            } else if (!blob.startsWith('FONTX2')) {
                return false;
            }
            const fontName = blob.slice(6, 14);
            const fontWidth = blob.charCodeAt(14);
            const fontHeight = blob.charCodeAt(15);
            const type = blob.charCodeAt(16);
            if (type == 0 || fontWidth > 0 || fontWidth <= GlyphModel.MAX_WIDTH || fontHeight > 0 || fontHeight <= GlyphModel.MAX_HEIGHT)
            {} else return false;
            this.beginImport(fontWidth, fontHeight, fontName);
            const w8 = Math.floor((fontWidth + 7) / 8);
            const fontSize = w8 * fontHeight;
            for (let i = 0; i < 256; i++) {
                const base = 17 + fontSize * i;
                this.data[i] = GlyphModel.deserialize(blob.slice(base, base + fontSize), fontWidth, fontHeight);
            }
            return true;
        },
        export: function() {
            let output = [];
            let header = ["FONTX2"];
            header.push(this.validateFontName());
            const { fontWidth, fontHeight } = this;
            header.push(String.fromCharCode(fontWidth, fontHeight, 0));
            output.push(header.join(''));
            for (let i = 0; i < 256; i++) {
                const glyph = this.data[i] || new GlyphModel();
                output.push(glyph.serialize(fontWidth, fontHeight));
            }
            return btoa(output.join(''));
        }
    });
})();


// Export C Header
(function(){
    const toHex = (v, l) => `0x${('00000000' + v.toString(16)).slice(-l)}`;
    const validateFontName = (n) => (n || '').trim().replace(/\W/g, '_');
    FontDriver.register('C Header File', {
        extension: '.h', binary: false,
        export: function() {
            const { fontWidth, fontHeight } = this;
            const fontName = validateFontName(this.fontName) || 'font';
            let output = [];
            const baseChar = 0x20;
            const charCount = 0x80 - baseChar;
            const w8 = Math.floor((fontWidth + 7) / 8);
            const fontSize = w8 * fontHeight;
            output.push(`// GENERATED ${fontName}.h`);
            output.push(`static const int ${fontName}_width = ${fontWidth}, ${fontName}_height = ${fontHeight};`);
            output.push(`static const unsigned char ${fontName}_data[${charCount}][${fontSize}] = {`);
            for (let i = 0; i < charCount; i++) {
                const glyph = this.data[baseChar + i] || new GlyphModel();
                const array = glyph.serialize(fontWidth, fontHeight, GlyphModel.SERIALIZE_ARRAY);
                let line = [];
                for (let j = 0; j < array.length; j++) {
                    line.push(toHex(array[j], 2));
                }
                output.push(`{${line.join(',')}},`);
            }
            output.push('};');
            return output.join('\n');
        }
    })
})();


// Import haribote os hankaku.txt
(function(){
    class IStream {
        constructor (blob) {
            this.blob = blob;
            this.fp = 0;
        }
        getchar () {
            return this.blob[this.fp++];
        }
        gets () {
            let buffer = [];
            let cont = true;
            while (!this.isEOF && cont) {
                let c = this.getchar();
                if (c && c.length) {
                    switch (c) {
                    case '\r':
                        break;
                    case '\n':
                        cont = false;
                        break;
                    default:
                        buffer.push(c);
                        break;
                    }
                }
            }
            return buffer.join('');
        }
        get isEOF () {
            return !(this.blob.length > this.fp);
        }
    }
    FontDriver.register('hankaku.txt', {
        import: function(blob) {
            if (blob.indexOf('\0') >= 0) return false;
            const fontWidth = 8, fontHeight = 16, fontName = 'hankaku';
            const expectedMinCount = fontHeight * 128;
            const expectedMaxCount = fontHeight * 256;
            const is = new IStream(blob);
            let rawData = new Uint8ClampedArray(expectedMaxCount);
            let dataPtr = 0;
            while (!is.isEOF) {
                const line = is.gets();
                if (!line || (line[0] !== '.' && line[0] !== '*')) continue;
                if (dataPtr >= expectedMaxCount) {
                    console.log('exceeded', expectedMaxCount, dataPtr);
                    return false;
                }
                let rawValue = 0;
                for (let i = 0; i < 8; i++) {
                    rawValue <<= 1;
                    if (!line[i]) break;
                    if (line[i] === '.') continue;
                    if (line[i] !== '*') return false;
                    rawValue |= 1;
                }
                rawData[dataPtr++] = rawValue;
            }
            if (dataPtr < expectedMinCount) return false;
            this.beginImport(fontWidth, fontHeight, fontName);
            for (let i = 0; i < 256; i++) {
                const array = rawData.slice(i * fontHeight, i * fontHeight + fontHeight - 1);
                this.data[i] = GlyphModel.deserialize(array, fontWidth, fontHeight, GlyphModel.SERIALIZE_ARRAY);
            }
            return true;
        }
    });
})();
