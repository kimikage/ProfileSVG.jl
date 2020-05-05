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

        var rects = fig.viewport.selectAll('rect');

        if (deltaT != 0) {
            fig.viewport.selectAll('text').forEach(function (text) {
                text.attr({
                    display: 'none'
                });
            });
            Snap.animate(0, 1, function (step) {

                var scale = oldScale + (xScale - oldScale) * step;
                var rMatrix = new Snap.Matrix;
                rMatrix.translate(oldXShift + (xShift - oldXShift) * step, 0);
                rMatrix.scale(scale, 1, xs, fig.clipMiddle);
                fig.viewport.attr({
                    transform: rMatrix
                });
                rects.forEach(function (rect) {
                    rect.attr({
                        rx: 2 / scale,
                        ry: 2 / scale
                    });
                });

            }, deltaT, null, function () {
                rects.forEach(function (rect) {
                    var bbox = rect.getBBox();
                    var text = Snap(rect.node.nextElementSibling);
                    var shortinfo = rect.node.getAttribute("data-shortinfo");

                    var tMatrix = new Snap.Matrix;
                    tMatrix.scale(1.0 / xScale, 1, bbox.x, bbox.y);

                    text.node.textContent = formatText(shortinfo, bbox.w * xScale);
                    text.transform(tMatrix);
                    text.attr({
                        display: 'inherit'
                    });
                });
            });
        } else {
            var rMatrix = new Snap.Matrix;
            rMatrix.translate(xShift, 0);
            rMatrix.scale(xScale, 1, xs, fig.clipMiddle);

            fig.viewport.transform(rMatrix);
            rects.forEach(function (rect) {
                rect.attr({
                    rx: 2 / xScale,
                    ry: 2 / xScale
                });
                var bbox = rect.getBBox();
                var text = Snap(rect.node.nextElementSibling);
                var shortinfo = rect.node.getAttribute("data-shortinfo");

                var tMatrix = new Snap.Matrix;
                tMatrix.scale(1.0 / xScale, 1, bbox.x, bbox.y);

                text.node.textContent = formatText(shortinfo, bbox.w * xScale);
                text.transform(tMatrix);
                text.attr({
                    display: 'inherit'
                });
            });
        }

    };

    ProfileSVG.reset = function (fig) {
        ProfileSVG.moveAndZoom(fig.viewportCx, fig.viewportCx, VIEWPORT_SCALE, fig);
    };

    ProfileSVG.initialize = function (figId) {

        var svg = Snap.select('#' + figId);
        var fig = {};
        fig.id = figId;

        fig.viewport = svg.select('#' + figId + '-viewport');
        fig.viewportCx = fig.viewport.getBBox().cx;

        var clip = svg.select('#' + figId + '-clip-rect');
        fig.clipWidth = clip.getBBox().w;
        fig.clipMiddle = clip.getBBox().cy;

        fig.scale = 1.0;
        fig.shift = fig.viewportCx;

        ProfileSVG.reset(fig);

        var rectDblClickHandler = function (e) {
            var bbox = e.target.getBBox();
            var cx = bbox.x + bbox.width / 2;
            ProfileSVG.moveAndZoom(cx, cx, fig.clipWidth / bbox.width, fig);
        };

        var rectMouseOverHandler = function (e) {
            var rect = e.target;
            var text = rect.nextElementSibling;
            var details = document.getElementById(fig.id + '-details');
            text.style.strokeWidth = '1';
            details.textContent = rect.getAttribute("data-info");
            details.style.display = 'inherit';
        };
        var rectMouseOutHandler = function (e) {
            var rect = e.target;
            var text = rect.nextElementSibling;
            var details = document.getElementById(fig.id + '-details');
            text.style.strokeWidth = '0';
            details.style.display = 'none';
        };

        fig.viewport.selectAll('rect').forEach(function (rect) {
            rect.node.addEventListener('dblclick', rectDblClickHandler, false);
            rect.node.addEventListener('mouseover', rectMouseOverHandler, false);
            rect.node.addEventListener('mouseout', rectMouseOutHandler, false);
        });

        svg.selectAll('.pvbackground').forEach(function (bg) {
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
