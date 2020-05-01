(function (glob, factory) {
    if (typeof define === 'function' && define.amd) {
        define('ProfileSVG', ['ProfileSVG/snap.svg'], function (Snap) {
            return factory(Snap);
        });
    } else {
        glob.ProfileSVG = factory(glob.Snap);
    }
}(this, function (Snap) {
    'use strict';

    var supportsPassive = false;
    try {
        var opts = Object.defineProperty({}, 'passive', {
            get: function () {
                supportsPassive = true;
            }
        });
        window.addEventListener("testPassive", null, opts);
        window.removeEventListener("testPassive", null, opts);
    } catch (e) { // not supported
    }

    var stopper = function (e) {
        e.preventDefault();
        e.stopPropagation();
    };

    var throttle = function (delay, filter, callback) {
        var previousCall = new Date().getTime();
        return function (e) {
            var time = new Date().getTime();
            if ((time - previousCall) >= delay) {
                previousCall = time;
                callback.apply(null, arguments);
            }
            filter(e);
        };
    };


    var ProfileSVG = {};

    var AVERAGE_CHAR_WIDTH = 6;
    var DEFAULT_TRANSITION_TIME = 300;
    var VIEWPORT_SCALE = 0.9;

    var formatText = function (text, availableWidth) {
        if (availableWidth < 3 * AVERAGE_CHAR_WIDTH) {
            return "";
        } else if (text.length * AVERAGE_CHAR_WIDTH > availableWidth) {
            var nchars = Math.round(availableWidth / AVERAGE_CHAR_WIDTH) - 2;
            return text.slice(0, nchars) + "..";
        }
        return text;
    };

    // Shift the view port to center on xc, then scale in the x direction
    ProfileSVG.moveAndZoom = function (xc, xs, xScale, fig, deltaT) {
        if (typeof deltaT === 'undefined') {
            deltaT = DEFAULT_TRANSITION_TIME;
        }
        if (typeof xs === 'undefined') {
            xs = xc;
        }

        var oldScale = fig.scale;
        var oldShift = fig.shift;

        fig.scale = xScale;
        fig.shift = xc;

        xScale *= VIEWPORT_SCALE;

        var oldXShift = -(oldShift - 0.5 * fig.clipWidth);
        var xShift = -(xc - 0.5 * fig.clipWidth);

        fig.texts.forEach(function (text) {
            text.node.textContent = "";
        });

        if (deltaT != 0) {
            Snap.animate(0, 1, function (step) {

                var scale = oldScale + (xScale - oldScale) * step;
                var rMatrix = new Snap.Matrix;
                rMatrix.translate(oldXShift + (xShift - oldXShift) * step, 0);
                rMatrix.scale(scale, 1, xs, fig.clipMiddle);
                fig.viewport.attr({
                    transform: rMatrix
                });
                fig.rects.forEach(function (rect) {
                    rect.attr({
                        rx: 2 / scale,
                        ry: 2 / scale
                    });
                });

            }, deltaT, null, function () {
                fig.rects.forEach(function (rect, i) {
                    var bbox = rect.getBBox();
                    var text = fig.texts[i];
                    var shortinfo = rect.node.getAttribute("data-shortinfo");

                    var tMatrix = new Snap.Matrix;
                    tMatrix.scale(1.0 / xScale, 1, bbox.x, bbox.y);

                    text.node.textContent = formatText(shortinfo, bbox.w * xScale);
                    text.transform(tMatrix);
                });
            });
        } else {
            var rMatrix = new Snap.Matrix;
            rMatrix.translate(xShift, 0);
            rMatrix.scale(xScale, 1, xs, fig.clipMiddle);

            fig.viewport.transform(rMatrix);
            fig.rects.forEach(function (rect, i) {
                rect.attr({
                    rx: 2 / xScale,
                    ry: 2 / xScale
                });
                var bbox = rect.getBBox();
                var text = fig.texts[i];
                var shortinfo = rect.node.getAttribute("data-shortinfo");

                var tMatrix = new Snap.Matrix;
                tMatrix.scale(1.0 / xScale, 1, bbox.x, bbox.y);

                text.node.textContent = formatText(shortinfo, bbox.w * xScale);
                text.transform(tMatrix);
            });
        }

    };

    ProfileSVG.reset = function (fig) {
        ProfileSVG.moveAndZoom(fig.viewportCx, fig.viewportCx, VIEWPORT_SCALE, fig);
    };

    ProfileSVG.initialize = function (figId) {

        var svg = Snap.select('#' + figId);
        var fig = {};

        fig.viewport = svg.select('#' + figId + '-viewport');
        fig.frame = svg.select('#' + figId + '-frame');

        fig.viewportCx = fig.viewport.getBBox().cx;

        fig.rects = fig.viewport.selectAll('rect');
        fig.texts = fig.viewport.selectAll('text');
        fig.clip = svg.select('#' + figId + '-clip-rect');
        fig.clipWidth = fig.clip.getBBox().w;
        fig.clipMiddle = fig.clip.getBBox().cy;
        fig.details = svg.select('#' + figId + '-details').node.firstChild;

        fig.scale = 1.0;
        fig.shift = fig.viewportCx;

        ProfileSVG.reset(fig);

        fig.rects.forEach(function (rect) {
            rect.dblclick(function () {
                    var bbox = rect.getBBox();
                    ProfileSVG.moveAndZoom(bbox.cx, bbox.cx, fig.clipWidth / bbox.w, fig);
                })
                .mouseover(function () {
                    fig.details.nodeValue = rect.node.getAttribute("data-info");
                })
                .mouseout(function () {
                    fig.details.nodeValue = "";
                });
        });
        fig.texts.forEach(function (text, i) {
            text.dblclick(function () {
                    var bbox = fig.rects[i].getBBox();
                    ProfileSVG.moveAndZoom(bbox.cx, bbox.cx, fig.clipWidth / bbox.w, fig);
                })
                .mouseover(function () {
                    fig.details.nodeValue = fig.rects[i].node.getAttribute("data-info");
                })
                .mouseout(function () {
                    fig.details.nodeValue = "";
                });
        });
        fig.frame.selectAll('.pvbackground').forEach(function (bg) {
            bg.dblclick(function () {
                ProfileSVG.reset(fig);
            });
        });

        var mouseWheelHandler = throttle(400, stopper, function (e) {
            var delta = Math.max(-1, Math.min(1, e.deltaY));
            var pt = svg.node.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            // Since the implementation of getScreenCTM() varies by browser and
            // version, it often doesn't work as expected.
            pt.matrixTransform(fig.viewport.node.getScreenCTM().inverse());
            var targetScale = fig.scale - 0.2 * delta; // FIXME: prevent the negative scale
            ProfileSVG.moveAndZoom(fig.shift, pt.x, targetScale, fig, 400);
        });

        svg.node.addEventListener('wheel', mouseWheelHandler, supportsPassive ? {
            passive: false
        } : false);

        fig.viewport.drag();
    };

    return ProfileSVG;
}));
