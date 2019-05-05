/*
    Bitmap Font Editor
    Copyright (C) 2019 Nerry, https://nerry.jp/
    LICENSE: GPL
*/
'use strict';

const $ = x => document.querySelector(x);

const LS_WORKSPACE_KEY = "workSpace";
const LS_PREVIEW_KEY = "preview";
const MIN_UNICHAR = 0x20;
const MAX_UNICHAR = 0x7F;

document.addEventListener('DOMContentLoaded', () => {

    window.currentEditNumber = 0x41;
    window.mainCanvas = new GlyphEditor('#mainCanvas', '#fontWidth', '#fontHeight');
    window.fontData = new FontData();
    
    const GlyphSelectorRefresh = () => {
        if (currentEditNumber > MAX_UNICHAR) currentEditNumber = MAX_UNICHAR;
        $('#glyphCode').value = currentEditNumber.toString(16);
        let c = String.fromCharCode(currentEditNumber);
        $('#glyphChar').value = c;
        window.mainCanvas.loadGlyph(window.fontData.getGlyph(currentEditNumber));
    }
    
    $('#glyphChar').addEventListener('input', () => {
        const c = $('#glyphChar').value;
        if (c.length > 0) {
            currentEditNumber = c.slice(-1).charCodeAt(0);
            GlyphSelectorRefresh();
        }
    });
    
    $('#glyphCode').addEventListener('input', () => {
        const c = parseInt($('#glyphCode').value, 16);
        if (c > 0) {
            currentEditNumber = c;
            GlyphSelectorRefresh();
        }
    });
    
    $('#glyphLt').addEventListener('click', () => {
        if (currentEditNumber > MIN_UNICHAR) {
            currentEditNumber--;
            GlyphSelectorRefresh();
        }
    });
    $('#glyphGt').addEventListener('click', () => {
        currentEditNumber++;
        GlyphSelectorRefresh();
    });
    
    $('#clearButton').addEventListener('click', () => {
        window.mainCanvas.clear();
    });
    
    $('#reverseButton').addEventListener('click', () => {
        window.mainCanvas.reverse();
    });
    
    $('#shiftLButton').addEventListener('click', () => {
        window.mainCanvas.shiftL();
    });
    
    $('#shiftRButton').addEventListener('click', () => {
        window.mainCanvas.shiftR();
    });
    
    $('#shiftUButton').addEventListener('click', () => {
        window.mainCanvas.shiftU();
    });
    
    $('#shiftDButton').addEventListener('click', () => {
        window.mainCanvas.shiftD();
    });
    
    $('#applyButton').addEventListener('click', () => {
        window.fontData.setGlyph(currentEditNumber, window.mainCanvas.data);
        RefreshPreview();
        localStorage.setItem(LS_WORKSPACE_KEY, fontData.export());
    });
    
    $('#importButton').addEventListener('click', () => {
        if (ImportFunction()) {
            closeDialog($('#saveLoadDialog'));
        }
    });
    
    // $('#base64Console').addEventListener('focus', () => {
    //     $('#base64Console').select();
    // })
    
    $('#previewText').addEventListener('input', () => {
        localStorage.setItem(LS_PREVIEW_KEY, $('#previewText').value);
        RefreshPreview();
    });

    $('#saveLoadButton').addEventListener('click', () => {
        $('#base64Console').value = fontData.export();
        showDialog($('#saveLoadDialog'));
        $('#base64Console').select();
    });
    
    $('#closeSaveLoadDialogButton').addEventListener('click', () => {
        closeDialog($('#saveLoadDialog'));
    })

    $('#fontName').addEventListener('input', () => {
        fontData.fontName = $('#fontName').value;
    })

    const RefreshPreview = () => {
        const str = $('#previewText').value;
        const canvas = $('#previewCanvas');
        const maxWidth = canvas.clientWidth;
        const maxHeight = $('#previewText').clientHeight;
        canvas.setAttribute('width', maxWidth);
        canvas.setAttribute('height', maxHeight);
        let cursorX = 0, cursorY = 0;
        const fontWidth = mainCanvas.width;
        const fontHeight = mainCanvas.height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, maxWidth, maxHeight);
        ctx.fillStyle = "#000";
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            switch (char) {
                case 0x0A: // LF
                cursorX = 0;
                cursorY += fontHeight;
                break;
                default:
                const font = fontData.getGlyph(char);
                if (cursorX + fontWidth > maxWidth) {
                    cursorX = 0;
                    cursorY += fontHeight;
                }
                for (let j = 0; j < fontWidth; j++) {
                    for (let k = 0; k < fontHeight; k++) {
                        if (font.getPixel(j ,k)) {
                            ctx.fillRect(cursorX + j, cursorY + k, 1, 1);
                        }
                    }
                }
                cursorX += fontWidth;
            }
            if (cursorY >= maxHeight) break;
        }
    }
    
    const ImportFunction = () => {
        if (fontData.import($('#base64Console').value)) {
            localStorage.setItem(LS_WORKSPACE_KEY, $('#base64Console').value);
            mainCanvas.resize(fontData.fontWidth, fontData.fontHeight);
            $('#fontName').value = fontData.fontName;
            GlyphSelectorRefresh();
            RefreshPreview();
            return true;
        } else {
            alert('ERROR: Cannot import data');
            return false;
        }
    }
    $('#previewText').value = localStorage.getItem(LS_PREVIEW_KEY) || "The quick brown fox jumps over the lazy dog.";
    $('#base64Console').value = localStorage.getItem(LS_WORKSPACE_KEY) || "Rk9OVFgyRk9OVE5BTUUIEAA=";
    ImportFunction();
    
    const showDialog = (dialog) => {
        $('#mainScreen').classList.add('blur');
        $('#dialogBackground').style.display = 'block';
        dialog.style.display = 'block';
    }

    const closeDialog = (dialog) => {
        $('#mainScreen').classList.remove('blur');
        $('#dialogBackground').style.display = 'none';
        dialog.style.display = 'none';
    }

});


class GlyphEditor {
    static get MAX_WIDTH() { return 32 }
    static get MAX_HEIGHT() { return 32 }
    constructor(selector, widthSelector, heightSelector) {
        this.canvas = $(selector);
        this.widthSelector = $(widthSelector);
        this.heightSelector = $(heightSelector);
        this.margin = 8;
        this.data = new GlyphData();
        
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
        
        this.widthSelector.addEventListener('input', () => this.resizeDOM());
        this.heightSelector.addEventListener('input', () => this.resizeDOM());
        
    }
    convertMouseEvent(e) {
        const tr = e.target.getBoundingClientRect();
        const ex = ((e.clientX - tr.left - this.margin) / this.scale) | 0;
        const ey = ((e.clientY - tr.top - this.margin) / this.scale) | 0;
        return {ex, ey}
    }
    resizeDOM() {
        this.resize(parseInt(this.widthSelector.value) | 0, parseInt(this.heightSelector.value) | 0);
    }
    resize(w, h) {
        let width = Math.min(Math.max(w, 1), GlyphEditor.MAX_WIDTH) | 0;
        let height = Math.min(Math.max(h, 1), GlyphEditor.MAX_HEIGHT) | 0;
        this.width = width;
        this.height = height;
        this.widthSelector.value = width;
        this.heightSelector.value = height;
        fontData.fontWidth = width;
        fontData.fontHeight = height;
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
    }
    clear() {
        this.data = new GlyphData();
        
        const { canvas, width, height, scale, margin } = this;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, -1, -1);
        ctx.fillStyle = "#FFF";
        ctx.fillRect(margin, margin, width * scale, height * scale);
        
        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.fillStyle = "#888";
        for (let i = 0; i < width; i++) {
            for (let j = 0; j < height; j++) {
                ctx.rect(margin + i * scale + scale - 1, margin + j * scale + scale - 1, 1, 1);
            }
        }
        ctx.fill();
        ctx.restore();
    }
    getPixel(x, y) {
        return this.data.getPixel(x | 0, y | 0);
    }
    setPixel(x, y, color) {
        const cx = x | 0;
        const cy = y | 0;
        this.data.setPixel(cx, cy, color)
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
                const color = this.getPixel(i, j);
                this.setPixel(i, j, color);
            }
        }
    }
    reverse() {
        this.data.reverse();
        this.redraw();
    }
    shiftL() {
        this.data.shiftL();
        this.redraw();
    }
    shiftR() {
        this.data.shiftR();
        this.redraw();
    }
    shiftU() {
        this.data.shiftU();
        this.redraw();
    }
    shiftD() {
        this.data.shiftD();
        this.redraw();
    }
    loadGlyph(data) {
        this.data = data.clone();
        this.redraw();
    }
}


class GlyphData {
    static get BIT_LEFT() { return 0x80000000 }
    constructor(data = []) {
        this.data = [].concat(data);
    }
    getPixel(x, y) {
        const row = this.data[y] || 0;
        return row & (GlyphData.BIT_LEFT >>> x);
    }
    setPixel(x, y, data) {
        let row = this.data[y] || 0;
        if (data) {
            row |= (GlyphData.BIT_LEFT >>> x);
        } else {
            row &= ~(GlyphData.BIT_LEFT >>> x);
        }
        this.data[y] = row;
    }
    clone() {
        return new GlyphData(this.data)
    }
    reverse() {
        this.data = this.data.map(value => ~value);
    }
    shiftL() {
        this.data = this.data.map(value => value << 1);
    }
    shiftR() {
        this.data = this.data.map(value => value >>> 1);
    }
    shiftU() {
        this.data.shift();
    }
    shiftD() {
        this.data.unshift(0);
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
    setGlyph(code, data) {
        this.data[code] = data.clone();
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
        if (data.startsWith("Rk9OVFgy")) {
            // FONTX2
            const blob = atob(data);
            const fontWidth = blob.charCodeAt(14);
            const fontHeight = blob.charCodeAt(15);
            this.fontWidth = fontWidth;
            this.fontHeight = fontHeight;
            this.fontName = blob.slice(6, 14).trimEnd();
            const type = blob.charCodeAt(16);
            if (type != 0 ||
                fontWidth < 1 || fontWidth > GlyphEditor.MAX_WIDTH ||
                fontHeight < 1 || fontHeight > GlyphEditor.MAX_HEIGHT) {
                return false;
            }
            const w8 = Math.floor((fontWidth + 7) / 8);
            const fontSize = w8 * fontHeight;
            this.data = new Array(256);
            for (let i = MIN_UNICHAR; i <= MAX_UNICHAR; i++) {
                const base = 17 + fontSize * i;
                let glyph = new GlyphData();
                for (let j = 0; j < fontHeight; j++) {
                    let rawData = 0;
                    for (let k = 0; k < w8; k++) {
                        const byte = blob.charCodeAt(base + j * w8 + k);
                        rawData |= (byte << (24 - k * 8));
                    }
                    glyph.data[j] = rawData;
                }
                this.data[i] = glyph;
            }
            return true;
        } else {
            // TODO: original format
            return false;
        }
    }
    export() {
        // TODO: original format
        return this.exportFontX2();
    }
    exportFontX2() {
        let output = [];
        let header = ["FONTX2"];
        header.push(this.validateFontName());
        const { fontWidth, fontHeight } = this;
        header.push(String.fromCharCode(fontWidth));
        header.push(String.fromCharCode(fontHeight));
        header.push(String.fromCharCode(0));
        output.push(header.join(''));
        const w8 = Math.floor((fontWidth + 7) / 8);
        for (let i = 0; i < 256; i++) {
            let rep = [];
            const glyph = this.data[i] || new GlyphData();
            for (let j = 0; j < fontHeight; j++) {
                const lineData = glyph.data[j] || 0;
                for (let k = 0; k < w8; k++) {
                    const byte = (lineData >>> (24 - k * 8)) & 0xFF;
                    rep.push(String.fromCharCode(byte));
                }
            }
            output.push(rep.join(''));
        }
        return btoa(output.join(''));
    }
}

