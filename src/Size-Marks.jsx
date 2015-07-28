/**
 * Size Marks 1.1
 *
 * Copyright (c) 2014 Roman Shamin https://github.com/romashamin
 * and licenced under the MIT licence. All rights not explicitly
 * granted in the MIT license are reserved. See the included
 * LICENSE file for more details.
 *
 * https://github.com/romashamin
 * https://twitter.com/romanshamin
 *
 * Converts rectangular selection to labeled measurement mark.
 * Landscape selection → horizontal mark. Portrait or square
 * selection → vertical mark.
 */


var doc = null,
    docIsExist = false,
    selBounds = null,
    selIsExist = false;

var store = {
    activeLayer: null,
    rulerUnits: app.preferences.rulerUnits,
    typeUnits: app.preferences.typeUnits,
    font: null
};

app.preferences.rulerUnits = Units.PIXELS;
app.preferences.typeUnits = TypeUnits.POINTS;


try {
    doc = app.activeDocument;
    docIsExist = true;
} catch (e) {
    alert('Size Marks Script: no document\n' +
        'Use File → New... to create one');
}


if (docIsExist) {
    try {
        selBounds = doc.selection.bounds;
        selIsExist = true;
    } catch (e) {
        alert('Size Marks Script: no selection\n' +
            'Use Rectangular Marquee Tool (M) to create one');
    }
}


if (docIsExist && selIsExist) {
    doc.suspendHistory("Add SizeMark", "makeSizeMark()");
}


function makeSizeMark() {
    var halfMark = 3,
        txtMargin = 5,
        baseRes = 72,
        decimPlaces = 1,
        layerOpacity = 65,
        docRes = doc.resolution,
        scaleRatio = docRes / baseRes,
        scale = setScaleF(scaleRatio),
        realUnits = 'px',
        scaledUnits = 'pt',
        charThinSpace = '\u200A'; /* Thin space: \u2009, hair space: \u200A */

    var selX1 = selBounds[0].value,
        selX2 = selBounds[2].value - 1,
        selY1 = selBounds[1].value,
        selY2 = selBounds[3].value - 1;

    var selWidth = selX2 - selX1,
        selHeight = selY2 - selY1;

    var val = 0,
        txtLayerPos = [0, 0],
        layerNamePrefix = 'MSRMNT',
        txtJ11n = Justification.LEFT;

    store.activeLayer = doc.activeLayer;
    doc.selection.deselect();
    var markLayer = doc.artLayers.add();

    setPenToolSize(1.0);

    if (selWidth > selHeight) {
        // Draw Main Line
        drawLine([selX1, selY1], [selX2, selY1]);

        // Draw Edge Marks
        drawLine([selX1, selY1 - halfMark], [selX1, selY1 + halfMark]);
        drawLine([selX2, selY1 - halfMark], [selX2, selY1 + halfMark]);

        // Set some values for text layer
        layerNamePrefix = 'W';
        val = selWidth + 1;
        txtLayerPos = [selX1 + val / 2, selY1 - txtMargin];
        txtJ11n = Justification.CENTER;

    } else {

        // Draw Main Line
        drawLine([selX1, selY1], [selX1, selY2]);

        // Draw Edge Marks
        drawLine([selX1 - halfMark, selY1], [selX1 + halfMark, selY1]);
        drawLine([selX1 - halfMark, selY2], [selX1 + halfMark, selY2]);

        // Set some values for text layer
        layerNamePrefix = 'H';
        val = selHeight + 1;
        txtLayerPos = [selX1 + txtMargin, selY1 + val / 2 + 4];
        txtJ11n = Justification.LEFT;
    }

    markLayer.opacity = 85;
    markLayer.move(store.activeLayer, ElementPlacement.PLACEBEFORE);

    // Draw label
    var txtLayer = makeTextLayer(),
        txtLayerItem = txtLayer.textItem;

    store.font = txtLayerItem.font;

    txtLayerItem.font = 'ArialMT';
    txtLayerItem.autoKerning = AutoKernType.OPTICAL;

    txtLayer.translate(txtLayerPos[0], txtLayerPos[1]);

    txtLayerItem.justification = txtJ11n;
    txtLayerItem.color = app.foregroundColor;

    var label = '';

    if (baseRes !== docRes) {
        label = formatValueWithUnits(scale(val).toFixed(decimPlaces),
                scaledUnits,
                charThinSpace) +
            ' / ';
    }
    label += formatValueWithUnits(val, realUnits, charThinSpace);
    txtLayerItem.contents = label;

    // Finish
    txtLayer.rasterize(RasterizeType.TEXTCONTENTS);
    txtLayer.move(markLayer, ElementPlacement.PLACEBEFORE);
    txtLayer.opacity = layerOpacity;

    // FIXME: name layer with scale( val )
    txtLayer.merge().name = layerNamePrefix + val;

    app.preferences.rulerUnits = store.rulerUnits;
    app.preferences.typeUnits = store.typeUnits;

    pickTool('marqueeRectTool');
    
    // HELPERS

    function makePoint(pnt) {

        for (var i = 0; i < pnt.length; i++) {
            pnt[i] = scale(pnt[i]);
        }

        var point = new PathPointInfo();

        point.anchor = pnt;
        point.leftDirection = pnt;
        point.rightDirection = pnt;
        point.kind = PointKind.CORNERPOINT;

        return point;
    }

    function setScaleF(ratio) {
        return function (value) {
            return value / ratio;
        }
    }


    function formatValueWithUnits(v, u, space) {
        space = space || '';
        return '' + v + space + u;
    }


    function drawLine(start, stop) {

        var startPoint = makePoint(start),
            stopPoint = makePoint(stop);

        var spi = new SubPathInfo();
        spi.closed = false;
        spi.operation = ShapeOperation.SHAPEXOR;
        spi.entireSubPath = [startPoint, stopPoint];

        var line = doc.pathItems.add('Line', [spi]);
        line.strokePath(ToolType.PENCIL);
        line.remove();
    }
    

    function pickTool(toolName) {
        var idslct = charIDToTypeID('slct');
        var desc4 = new ActionDescriptor();
        var idnull = charIDToTypeID('null');
        var ref2 = new ActionReference();
        var idmarqueeRectTool = stringIDToTypeID(toolName);
        ref2.putClass(idmarqueeRectTool);
        desc4.putReference(idnull, ref2);
        executeAction(idslct, desc4, DialogModes.NO);
    }


    function makeTextLayer() {
        var desc = new ActionDescriptor();
        var ref = new ActionReference();
        ref.putClass(app.charIDToTypeID('TxLr'));
        desc.putReference(app.charIDToTypeID('null'), ref);
        var desc2 = new ActionDescriptor();
        desc2.putString(app.charIDToTypeID('Txt '), "text");
        var list2 = new ActionList();
        desc2.putList(app.charIDToTypeID('Txtt'), list2);
        desc.putObject(app.charIDToTypeID('Usng'), app.charIDToTypeID('TxLr'), desc2);
        executeAction(app.charIDToTypeID('Mk  '), desc, DialogModes.NO);
        return doc.activeLayer
    }


    /**
     * Source: https://forums.adobe.com/thread/962285?start=0&tstart=0
     * Comment for Feb 16, 2012 7:18 AM
     */
    function setPenToolSize(dblSize) {
        var idslct = charIDToTypeID('slct');
        var desc3 = new ActionDescriptor();
        var idnull = charIDToTypeID('null');
        var ref2 = new ActionReference();
        var idPcTl = charIDToTypeID('PcTl');
        ref2.putClass(idPcTl);
        desc3.putReference(idnull, ref2);
        executeAction(idslct, desc3, DialogModes.NO);

        var idsetd = charIDToTypeID('setd');
        var desc2 = new ActionDescriptor();
        var ref1 = new ActionReference();
        var idBrsh = charIDToTypeID('Brsh');
        var idOrdn = charIDToTypeID('Ordn');
        var idTrgt = charIDToTypeID('Trgt');
        ref1.putEnumerated(idBrsh, idOrdn, idTrgt);
        desc2.putReference(idnull, ref1);
        var idT = charIDToTypeID('T   ');
        var idmasterDiameter = stringIDToTypeID('masterDiameter');
        var idPxl = charIDToTypeID('#Pxl');
        desc3.putUnitDouble(idmasterDiameter, idPxl, dblSize);
        desc2.putObject(idT, idBrsh, desc3);
        executeAction(idsetd, desc2, DialogModes.NO);
    }
}
