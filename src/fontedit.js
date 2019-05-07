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
});


class FontEdit {
    static get LS_WORKSPACE_KEY() { return "workSpace"; }
    static get LS_PREVIEW_KEY() { return "preview"; }
    static get MIN_UNICHAR() { return 0x20 }
    static get MAX_UNICHAR() { return 0x7F }
    
    constructor() {
        this.currentEditCode = 0x41;
        this.fontData = new FontData();
        this.mainCanvas = new GlyphEditor('#mainCanvas', this.fontData);
        this.mainBgDimming = 0;

        $('#previewText').value = localStorage.getItem(FontEdit.LS_PREVIEW_KEY) ||
        "The quick brown fox jumps over the lazy dog.\nETAOIN SHRDLU CMFWYP VBGKQJ XZ 1234567890";
        this.loadData(localStorage.getItem(FontEdit.LS_WORKSPACE_KEY) || "Rk9OVFgyICAgICAgICAIEAA=");
        
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
        
        $('#applyButton').addEventListener('click', () => {
            this.fontData.setGlyph(this.currentEditCode, this.mainCanvas.glyph);
            this.refreshPreview();
            localStorage.setItem(FontEdit.LS_WORKSPACE_KEY, this.fontData.export());
        });
        
        $('#importButton').addEventListener('click', () => {
            if (this.loadData($('#base64Console').value)) {
                this.closeDialog($('#saveLoadDialog'));
            }
        });
        
        $('#previewText').addEventListener('input', () => this.refreshPreview());
    
        $('#previewText').addEventListener('change', () => {
            localStorage.setItem(FontEdit.LS_PREVIEW_KEY, $('#previewText').value);
        })
    
        $('#saveLoadButton').addEventListener('click', () => {
            $('#base64Console').value = this.fontData.export();
            this.showDialog($('#saveLoadDialog'));
            $('#base64Console').select();
        })
        
        $('#closeSaveLoadDialogButton').addEventListener('click', () => {
            this.closeDialog($('#saveLoadDialog'));
        })
    
        $('#exportMenuButton').addEventListener('click', () => {
            this.showDialog($('#exportMenu'))
        })

        $('#closeExportMenuButton').addEventListener('click', () => {
            this.closeDialog($('#exportMenu'))
        })

        $('#fontName').addEventListener('input', () => {
            this.fontData.fontName = $('#fontName').value;
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
                    this.closeDialog($('#saveLoadDialog'));
                }
            });
            reader.readAsBinaryString(e.target.files[0]);
        }, false);

        $('#exportImageButton').addEventListener('click', () => {
            const canvas = document.createElement('canvas')
            this.fontData.exportImage(canvas, 16)
            const tag = $('#downloadLink')
            tag.href = canvas.toDataURL('image/png')
            tag.download = (this.fontData.fontName || 'font') + '.png'
            tag.click()
        })

    }

    dimWindow (x = 1) {
        this.mainBgDimming += x;
        if (this.mainBgDimming > 0) {
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
        this.mainCanvas.loadGlyph(this.fontData.getGlyph(this.currentEditCode));
    }
    
    resizeDOM () {
        const fontWidth = parseInt($('#fontWidth').value) | 0;
        const fontHeight = parseInt($('#fontHeight').value) | 0;
        if (fontWidth == 0 || fontHeight == 0) return;
        if (!this.mainCanvas.resize(fontWidth, fontHeight)) {
            $('#fontWidth').value = this.mainCanvas.width;
            $('#fontHeight').value = this.mainCanvas.height;
        }
    }

    showDialog (dialog) {
        this.dimWindow(1);
        $('#dialogBackground').style.display = 'block';
        dialog.style.display = 'block';
    }

    closeDialog (dialog) {
        this.dimWindow(-1);
        $('#dialogBackground').style.display = 'none';
        dialog.style.display = 'none';
    }

    refreshPreview () {
        const str = $('#previewText').value;
        const canvas = $('#previewCanvas');
        const maxWidth = canvas.clientWidth;
        const maxHeight = $('#previewText').clientHeight;
        canvas.setAttribute('width', maxWidth);
        canvas.setAttribute('height', maxHeight);
        let cursorX = 0, cursorY = 0;
        const fontWidth = this.mainCanvas.width;
        const fontHeight = this.mainCanvas.height;
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
                this.fontData.drawChar(char, ctx, cursorX, cursorY, 0)
                cursorX += fontWidth;
            }
            if (cursorY >= maxHeight) break;
        }
    }
    
    loadData (blob) {
        if (this.fontData.import(blob)) {
            localStorage.setItem(FontEdit.LS_WORKSPACE_KEY, this.fontData.export());
            this.mainCanvas.resize(this.fontData.fontWidth, this.fontData.fontHeight);
            $('#fontName').value = this.fontData.fontName;
            $('#fontWidth').value = this.fontData.fontWidth;
            $('#fontHeight').value = this.fontData.fontHeight;
            this.refreshGlyphSelector();
            this.refreshPreview();
            return true;
        } else {
            alert('ERROR: Cannot import data');
            return false;
        }
    }

}


class GlyphEditor {
    constructor(selector, fontData) {
        this.canvas = $(selector);
        this.fontData = fontData;
        this.margin = 8;
        this.glyph = new GlyphData();
        
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouseDown = true;
            const { ex, ey } = this.convertMouseEvent(e);
            this.currentColor = !this.getPixel(ex, ey);
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
            e.preventDefault();
            e.stopPropagation();
        }, false);
        
        this.canvas.addEventListener('touchstart', (e) => {
            const { ex, ey } = this.convertTouchEvent(e);
            this.currentColor = !this.getPixel(ex, ey);
            this.setPixel(ex, ey, this.currentColor);
            e.preventDefault();
        }, false);
        this.canvas.addEventListener('touchmove', (e) => {
            const { ex, ey } = this.convertTouchEvent(e);
            this.setPixel(ex, ey, this.currentColor);
            e.preventDefault();
        }, false);
        this.canvas.addEventListener('touchend', (e) => {
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
        console.log(e.touches, t, ex, ey);
        return {ex, ey};
    }
    resize(width, height) {
        if (width > 0 && width <= GlyphData.MAX_WIDTH && height > 0 && height <= GlyphData.MAX_HEIGHT)
        {} else return false;

        this.width = width;
        this.height = height;
        this.fontData.fontWidth = width;
        this.fontData.fontHeight = height;
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
        this.glyph = new GlyphData();
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
        this.redraw();
    }
    shiftL() {
        this.glyph.shiftL();
        this.redraw();
    }
    shiftR() {
        this.glyph.shiftR();
        this.redraw();
    }
    shiftU() {
        this.glyph.shiftU();
        this.redraw();
    }
    shiftD() {
        this.glyph.shiftD();
        this.redraw();
    }
    loadGlyph(glyph) {
        this.glyph = glyph.clone();
        this.redraw();
    }
}


class GlyphData {
    static get MAX_WIDTH() { return 32 }
    static get MAX_HEIGHT() { return 32 }
    static get BIT_LEFT() { return 0x80000000 }
    constructor(rawData = []) {
        this.rawData = [].concat(rawData);
    }
    getPixel(x, y) {
        const row = this.rawData[y] || 0;
        return (row & (GlyphData.BIT_LEFT >>> x)) != 0;
    }
    setPixel(x, y, color) {
        let row = this.rawData[y] || 0;
        if (color) {
            row |= (GlyphData.BIT_LEFT >>> x);
        } else {
            row &= ~(GlyphData.BIT_LEFT >>> x);
        }
        this.rawData[y] = row;
    }
    clone() {
        return new GlyphData(this.rawData)
    }
    reverse() {
        this.rawData = this.rawData.map(value => ~value);
    }
    shiftL() {
        this.rawData = this.rawData.map(value => value << 1);
    }
    shiftR() {
        this.rawData = this.rawData.map(value => value >>> 1);
    }
    shiftU() {
        this.rawData.shift();
    }
    shiftD() {
        this.rawData.unshift(0);
    }
    draw(ctx, x, y, width, height, color) {
        let imageData = ctx.getImageData(x, y, width, height)
        const R = (color & 0xFF0000) >> 16
        const G = (color & 0x00FF00) >> 8
        const B = (color & 0x0000FF)
        const A = 0xFF
        let index = 0
        for (let i = 0; i < height; i++) {
            const rawData = this.rawData[i]
            for (let j = 0; j < width; j++) {
                if (rawData & (GlyphData.BIT_LEFT >>> j)) {
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
}


class FontData {
    static get BASE64URL_TABLE() {
        return "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    }
    constructor() {
        this.data = [];
        this.fontWidth = 8;
        this.fontHeight = 16;
        this.fontName = "";
    }
    getGlyph(code) {
        return this.data[code] || new GlyphData();
    }
    setGlyph(code, glyph) {
        this.data[code] = glyph.clone();
    }
    drawChar(code, ctx, x, y, color) {
        const glyph = this.getGlyph(code)
        glyph.draw(ctx, x, y, this.fontWidth, this.fontHeight, color)
    }
    validateFontName(fontName = this.fontName) {
        let result = fontName.trim().split('').reduce((a, v) => {
            if (FontData.BASE64URL_TABLE.indexOf(v) >= 0) {
                return a + v;
            } else {
                return a + '_';
            }
        }, '');
        return (result + '        ').slice(0, 8);
    }
    import(data) {
        // TODO: original format
        if (data.startsWith("Rk9OVFgy")) {
            // FONTX2 (base64)
            const blob = atob(data);
            return this.importFontX2(blob);
        } else if (data.startsWith('FONTX2')) {
            // FONTX2 (blob)
            return this.importFontX2(data);
        } else {
            return false;
        }
    }
    export() {
        // TODO: original format
        return this.exportFontX2();
    }
    importFontX2(blob) {
        const fontWidth = blob.charCodeAt(14);
        const fontHeight = blob.charCodeAt(15);
        const type = blob.charCodeAt(16);
        if (type != 0 ||
            fontWidth < 1 || fontWidth > GlyphData.MAX_WIDTH ||
            fontHeight < 1 || fontHeight > GlyphData.MAX_HEIGHT) {
            return false;
        }
        this.fontWidth = fontWidth;
        this.fontHeight = fontHeight;
        this.fontName = blob.slice(6, 14).trim();
        const w8 = Math.floor((fontWidth + 7) / 8);
        const fontSize = w8 * fontHeight;
        this.data = new Array(256);
        for (let i = 0; i <= 255; i++) {
            const base = 17 + fontSize * i;
            let glyph = new GlyphData();
            for (let j = 0; j < fontHeight; j++) {
                let rawData = 0;
                for (let k = 0; k < w8; k++) {
                    const byte = blob.charCodeAt(base + j * w8 + k);
                    rawData |= (byte << (24 - k * 8));
                }
                glyph.rawData[j] = rawData;
            }
            this.data[i] = glyph;
        }
        return true;
    }
    exportFontX2() {
        let output = [];
        let header = ["FONTX2"];
        header.push(this.validateFontName());
        const { fontWidth, fontHeight } = this;
        header.push(String.fromCharCode(fontWidth, fontHeight, 0));
        output.push(header.join(''));
        const w8 = Math.floor((fontWidth + 7) / 8);
        for (let i = 0; i < 256; i++) {
            let rep = [];
            const glyph = this.data[i] || new GlyphData();
            for (let j = 0; j < fontHeight; j++) {
                const rawData = glyph.rawData[j] || 0;
                for (let k = 0; k < w8; k++) {
                    const byte = (rawData >>> (24 - k * 8)) & 0xFF;
                    rep.push(String.fromCharCode(byte));
                }
            }
            output.push(rep.join(''));
        }
        return btoa(output.join(''));
    }
    exportImage(canvas, cols) {
        const { fontWidth, fontHeight } = this
        const ctx = canvas.getContext('2d')
        canvas.width = fontWidth * cols
        canvas.height = (fontHeight * this.data.length + cols - 1)/ cols
        for (let i = 0; i < this.data.length; i++) {
            const x = fontWidth * (i % cols)
            const y = fontHeight * Math.floor(i / cols)
            this.drawChar(i, ctx, x, y, 0)
        }
    }
}
