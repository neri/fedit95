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
        this.mainCanvas = new GlyphEditor('#mainCanvas');
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
        
        const base64_to_buffer = (base64) => {
            const str = atob(base64)
            const array = new ArrayBuffer(str.length)
            const u8v = new Uint8Array(array)
            for (let i = 0; i < str.length; i++) {
                u8v[i] = str.charCodeAt(i)
            }
            return u8v
        }

        $('#exportFontXButton').addEventListener('click', () => {
            const blob = new Blob([base64_to_buffer(this.fontData.exportFontX2())], {type: 'application/octet-stream'})
            const url = URL.createObjectURL(blob)
            const tag = document.createElement('a')
            tag.href = url
            tag.download = (this.fontData.fontName || 'font').toLowerCase() + '.fnt'
            tag.click()
            console.log(tag)
        })

        $('#exportImageButton').addEventListener('click', () => {
            const canvas = document.createElement('canvas')
            this.fontData.exportImage(canvas, 16)
            this.closeDialog($('#exportMenu'))
            this.showDialog($('#exportImageDialog'))
            const img = $('#exportImageMain')
            img.src = canvas.toDataURL('image/png')
        })

        $('#saveExportImageButton').addEventListener('click', () => {
            const tag = document.createElement('a')
            tag.href = $('#exportImageMain').src
            tag.download = (this.fontData.fontName || 'font').toLowerCase() + '.png'
            tag.click()
        })

        $('#closeExportImageDialogButton').addEventListener('click', () => {
            this.closeDialog($('#exportImageDialog'))
        })
        
        $('#closeImportImageDialogButton').addEventListener('click', () => {
            this.closeDialog($('#importImageDialog'))
        }, false)

        $('#importImageWidth').addEventListener('input', () => this.resizeImport(), false)
        $('#importImageHeight').addEventListener('input', () => this.resizeImport(), false)
        $('#importImageOffsetX').addEventListener('input', () => this.resizeImport(), false)
        $('#importImageOffsetY').addEventListener('input', () => this.resizeImport(), false)
        
        $('#importImageButton').addEventListener('click', () => {
            this.setFontData(this.importFont)
            this.importFont = null
            this.importImgCanvas = null
            this.closeDialog($('#importImageDialog'))
        }, false)

        document.querySelectorAll('#penToolGroup input[type=radio]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.mainCanvas.penStyle = parseInt($('#penToolGroup').pen.value)
            })
        });
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
        const fontWidth = parseInt($('#fontWidth').value)
        const fontHeight = parseInt($('#fontHeight').value)
        if (!fontWidth || !fontHeight) return;
        if (this.mainCanvas.resize(fontWidth, fontHeight)) {
            this.fontData.resize(fontWidth, fontHeight)
            $('#fontWidth').value = fontWidth
            $('#fontHeight').value = fontHeight
        }
    }
    
    showDialog (dialog) {
        if (dialog.style.display === 'block') return
        this.dimWindow(1);
        $('#dialogBackground').style.display = 'block';
        dialog.style.display = 'block';
    }
    
    closeDialog (dialog) {
        if (dialog.style.display === 'none') return
        this.dimWindow(-1);
        $('#dialogBackground').style.display = 'none';
        dialog.style.display = 'none';
    }
    
    refreshPreview () {
        const str = $('#previewText').value;
        const canvas = $('#previewCanvas');
        canvas.setAttribute('height', $('#previewText').clientHeight);
        this.fontData.drawText(str, canvas)
    }
    
    setFontData(fontData) {
        this.fontData = fontData
        localStorage.setItem(FontEdit.LS_WORKSPACE_KEY, this.fontData.export());
        this.mainCanvas.resize(this.fontData.fontWidth, this.fontData.fontHeight);
        $('#fontName').value = this.fontData.fontName;
        $('#fontWidth').value = this.fontData.fontWidth;
        $('#fontHeight').value = this.fontData.fontHeight;
        this.refreshGlyphSelector();
        this.refreshPreview();
    }

    loadData (blob) {
        if (blob.startsWith('\x89PNG\x0D\x0A\x1A\x0A')) {
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
                this.importFont = new FontData()
                this.importImgCanvas = document.createElement('canvas')
                this.importImgCanvas.width = width
                this.importImgCanvas.height = height
                const ctx = this.importImgCanvas.getContext('2d')
                ctx.drawImage(img, 0, 0)
                this.showDialog($('#importImageDialog'))
                this.resizeImport()
            })
            img.src = "data:image/png;base64," + btoa(blob)
            return true;
        } else if (this.fontData.import(blob)) {
            this.setFontData(this.fontData)
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
        canvas2.height = fontHeight;
        this.importFont.drawText('ABCD abcd 1234', canvas2)
    }
    
}


class GlyphEditor {
    constructor(selector) {
        this.canvas = $(selector)
        this.margin = 8
        this.glyph = new GlyphData()
        this.penStyle = -1
        
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
            const baseChar = 0x20
            const charCount = 0x80 - baseChar
            canvas.width = fontWidth * cols
            canvas.height = Math.floor((fontHeight * charCount + cols - 1) / cols)
            for (let i = 0; i < charCount; i++) {
                const x = fontWidth * (i % cols)
                const y = fontHeight * Math.floor(i / cols)
                this.drawChar(baseChar + i, ctx, x, y, 0)
            }
        }
        importImage(canvas, fontWidth, fontHeight, offsetX, offsetY) {
            const baseChar = 0x20
            this.fontWidth = fontWidth
            this.fontHeight = fontHeight
            const ctx = canvas.getContext('2d')
            const maxWidth = canvas.width
            const cols = Math.floor(maxWidth / fontWidth)
            const charCount = 0x80
            this.data = new Array(256);
            const leftTopData = ctx.getImageData(0, 0, 1, 1)
            let baseColor = 0
            if (leftTopData.data[3] == 255) {
                baseColor = new Uint32Array(leftTopData.data.buffer)[0]
            }
            for (let i = 0; i < charCount; i++) {
                const x = offsetX + (i % cols * fontWidth)
                const y = offsetY + (Math.floor(i / cols) * fontHeight)
                const imageData = ctx.getImageData(x, y, fontWidth, fontHeight)
                const buffer = new Uint32Array(imageData.data.buffer)
                let index = 0
                let glyph = new GlyphData()
                for (let j = 0; j < fontHeight; j++) {
                    let rawData = 0
                    for (let k = 0; k < fontWidth; k++) {
                        if (buffer[index] != baseColor) {
                            rawData |= (GlyphData.BIT_LEFT >>> k)
                        }
                        index ++
                    }
                    glyph.rawData[j] = rawData
                }
                this.data[baseChar + i] = glyph
            }
        }
    }
    