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
    var VIEWPORT_MARGIN_X = 20;
    var ROUNDRECT_R = 2;

    var formatText = function (text, availableWidth) {
        if (availableWidth < 3 * AVERAGE_CHAR_WIDTH) {
            return "";
        } else if (text.length * AVERAGE_CHAR_WIDTH > availableWidth) {
            var nchars = Math.round(availableWidth / AVERAGE_CHAR_WIDTH) - 2;
            return text.slice(0, nchars) + "..";
        }
        return text;
    };

    var unescapeHtml = function (str) {
        return str
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
    };

    ProfileSVG.moveAndZoom = function (targetFocusX, targetScaleX, scaleOriginX, fig, deltaT) {
        if (typeof deltaT === 'undefined') {
            deltaT = DEFAULT_TRANSITION_TIME;
        }
        if (typeof scaleOriginX === 'undefined') {
            scaleOriginX = targetFocusX;
        }

        var oldFocusX = fig.focusX;
        var oldScaleX = fig.scaleX;

        fig.focusX = targetFocusX;
        fig.scaleX = targetScaleX;

        var rects = fig.viewport.selectAll('rect');

        if (deltaT != 0) {
            fig.viewport.selectAll('text').forEach(function (text) {
                text.attr({
                    display: 'none'
                });
            });
            Snap.animate(0, 1, function (step) {
                var focusX = oldFocusX + (targetFocusX - oldFocusX) * step;
                var scaleX = oldScaleX + (targetScaleX - oldScaleX) * step;
                var rMatrix = new Snap.Matrix;
                rMatrix.translate(fig.cx - focusX, 0);
                rMatrix.scale(scaleX, 1, scaleOriginX, fig.cy); // FIXME
                fig.viewport.transform(rMatrix);
                rects.forEach(function (rect) {
                    rect.attr({
                        rx: ROUNDRECT_R / scaleX,
                        ry: ROUNDRECT_R
                    });
                });

            }, deltaT, null, function () {
                rects.forEach(function (rect) {
                    var scaleX = targetScaleX;
                    var bbox = rect.getBBox();
                    var text = Snap(rect.node.nextElementSibling);
                    var shortinfo = rect.node.getAttribute("data-shortinfo");

                    var tMatrix = new Snap.Matrix;
                    tMatrix.scale(1.0 / scaleX, 1, bbox.x, bbox.y);

                    text.node.textContent = formatText(shortinfo, bbox.w * scaleX);
                    text.transform(tMatrix);
                    text.attr({
                        display: 'inherit'
                    });
                });
            });
        } else {
            var focusX = targetFocusX;
            var scaleX = targetScaleX;
            var rMatrix = new Snap.Matrix;
            rMatrix.translate(fig.cx - focusX, 0);
            rMatrix.scale(scaleX, 1, scaleOriginX, fig.cy);
            fig.viewport.transform(rMatrix);
            rects.forEach(function (rect) {
                rect.attr({
                    rx: ROUNDRECT_R / scaleX,
                    ry: ROUNDRECT_R
                });
                var bbox = rect.getBBox();
                var text = Snap(rect.node.nextElementSibling);
                var shortinfo = rect.node.getAttribute("data-shortinfo");

                var tMatrix = new Snap.Matrix;
                tMatrix.scale(1.0 / scaleX, 1, bbox.x, bbox.y);

                text.node.textContent = formatText(shortinfo, bbox.w * scaleX);
                text.transform(tMatrix);
                text.attr({
                    display: 'inherit'
                });
            });
        }

    };

    ProfileSVG.reset = function (fig) {
        var w = fig.width - VIEWPORT_MARGIN_X;
        var targetScaleX = fig.width / w * VIEWPORT_SCALE;
        ProfileSVG.moveAndZoom(fig.cx, targetScaleX, fig.cx, fig);
    };

    ProfileSVG.initialize = function (figId) {

        var svg = Snap.select('#' + figId);
        var fig = {};
        fig.id = figId;

        var bg = svg.select('#' + figId + '-bg');
        var bbox = bg.getBBox();
        fig.width = bbox.width;
        fig.height = bbox.height;
        fig.cx = fig.width / 2;
        fig.cy = fig.height / 2;

        fig.viewport = svg.select('#' + figId + '-viewport');

        fig.scaleX = 1.0;
        fig.scaleY = 1.0; // prepare for the future
        fig.focusX = fig.cx; // center x in the raw (scaleX=1) coordinate space
        fig.focusY = fig.cy; // center y in the raw (scaleY=1) coordinate space

        ProfileSVG.reset(fig);

        var rectDblClickHandler = function (e) {
            var bbox = e.target.getBBox();
            var cx = bbox.x + bbox.width / 2;
            var targetScaleX = fig.width / bbox.width * VIEWPORT_SCALE;
            ProfileSVG.moveAndZoom(cx, targetScaleX, cx, fig);
        };

        var rectMouseOverHandler = function (e) {
            var rect = e.target;
            var text = rect.nextElementSibling;
            var details = document.getElementById(fig.id + '-details');
            text.style.strokeWidth = '1';
            var sinfo = rect.getAttribute('data-shortinfo');
            var dir = rect.getAttribute('data-dinfo');
            var i = sinfo.indexOf(' in ');
            var func = sinfo.slice(0, i + 4);
            var file = sinfo.slice(i + 4);
            details.textContent = func + dir + file;
            details.style.display = 'inherit';
        };
        var rectMouseOutHandler = function (e) {
            var rect = e.target;
            var text = rect.nextElementSibling;
            var details = document.getElementById(fig.id + '-details');
            text.style.strokeWidth = '0';
            details.style.display = 'none';
        };

        fig.viewport.selectAll('rect').forEach(function (r) {
            var rect = r.node;
            var text = rect.nextElementSibling;
            rect.setAttribute('data-shortinfo', unescapeHtml(text.textContent));
            var dir = unescapeHtml(rect.getAttribute('data-dinfo'));
            rect.setAttribute('data-dinfo', dir);
            rect.addEventListener('dblclick', rectDblClickHandler, false);
            rect.addEventListener('mouseover', rectMouseOverHandler, false);
            rect.addEventListener('mouseout', rectMouseOutHandler, false);
        });

        bg.dblclick(function () {
            ProfileSVG.reset(fig);
        });

        var mouseWheelHandler = throttle(400, stopper, function (e) {
            var delta = Math.max(-1, Math.min(1, e.deltaY));
            var pt = svg.node.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            // Since the implementation of getScreenCTM() varies by browser and
            // version, it often doesn't work as expected.
            pt.matrixTransform(fig.viewport.node.getScreenCTM().inverse());
            var targetScaleX = fig.scaleX - 0.2 * delta; // FIXME: prevent the negative scale
            ProfileSVG.moveAndZoom(fig.focusX, targetScaleX, pt.x, fig, 400);
        });

        svg.node.addEventListener('wheel', mouseWheelHandler, supportsPassive ? {
            passive: false
        } : false);

        fig.viewport.drag();
    };

    return ProfileSVG;
}));
