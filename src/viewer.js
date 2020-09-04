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

    var NS_SVG = 'http://www.w3.org/2000/svg';
    var DEFAULT_TRANSITION_TIME = 300;
    var ZOOM_STEP = 1.4;
    var VIEWPORT_SCALE = 0.9;
    var VIEWPORT_MARGIN_X = 20;
    var ROUNDRECT_R = 2;

    var formatText = function (fig, text, availableWidth) {
        if (availableWidth < 3 * fig.charWidthM) {
            return '';
        }
        var w = availableWidth;
        var m = fig.charWidthM;
        var n = fig.charWidthN;
        var m2 = m * m;
        var n2 = n * n;
        var nc = 0.5 / n2 * (
            (n - m) * Math.sqrt(n2 + (4 * w - 2 * m) * n + m2) + n2 + 2 * (w - m) * n + m2);
        var nchars = Math.ceil(nc);
        if (text.length <= nchars) {
            return text;
        }
        return text.slice(0, nchars - 2) + '..';
    };

    var unescapeHtml = function (str) {
        return str
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
    };

    ProfileSVG.moveAndZoom = function (targetFocusX, targetScaleX, fig, deltaT) {
        if (typeof deltaT === 'undefined') {
            deltaT = DEFAULT_TRANSITION_TIME;
        }

        var targetFocusY = fig.cy;
        var targetScaleY = 1;

        // TODO: dynamically update the transformation while dragging
        var mat = fig.viewport.node.transform.baseVal.consolidate().matrix;

        var oldScaleX = mat.a;
        var oldScaleY = mat.d;
        var oldE = mat.e;
        var oldF = mat.f;

        var targetE = fig.cx - targetScaleX * targetFocusX;
        var targetF = fig.cy - targetScaleY * targetFocusY;

        fig.focusX = targetFocusX;
        fig.focusY = targetFocusY;
        fig.scaleX = targetScaleX;
        fig.scaleY = targetScaleY;

        var rects = fig.viewport.selectAll('rect');

        var scaleViewport = function (step) {
            var scaleX = oldScaleX + (targetScaleX - oldScaleX) * step;
            var scaleY = oldScaleY + (targetScaleY - oldScaleY) * step;

            var rMatrix = fig.viewport.node.transform.baseVal.consolidate().matrix;
            rMatrix.a = scaleX;
            rMatrix.d = scaleY;
            rMatrix.e = oldE + (targetE - oldE) * step; // TransX
            rMatrix.f = oldF + (targetF - oldF) * step; // TransY

            rects.forEach(function (r) {
                var rect = r.node;
                rect.setAttribute('rx', Math.max(0.0, ROUNDRECT_R / scaleX));
                rect.setAttribute('ry', Math.max(0.0, ROUNDRECT_R / scaleY));
            });
        };

        var finish = function () {
            scaleViewport(1);
            var scaleXt = 1.0 / targetScaleX;
            var scaleYt = 1.0 / targetScaleY;
            rects.forEach(function (r) {
                var rect = r.node;
                var rectx = rect.x.baseVal.value;
                var recty = rect.y.baseVal.value;
                var rectw = rect.width.baseVal.value;
                var text = rect.nextElementSibling;
                var shortinfo = rect.getAttribute("data-shortinfo");

                var tMatrix = text.transform.baseVal.getItem(0).matrix;
                tMatrix.a = scaleXt;
                tMatrix.d = scaleYt;
                tMatrix.e = (1.0 - scaleXt) * rectx;
                tMatrix.f = (1.0 - scaleYt) * recty;

                text.textContent = formatText(fig, shortinfo, rectw / scaleXt);
                text.style.display = 'inherit';
            });
        };

        if (deltaT != 0) {
            if (!fig.notext) {
                fig.viewport.selectAll('text').forEach(function (text) {
                    text.node.style.display = 'none';
                });
            }
            Snap.animate(0, 1, scaleViewport, deltaT, null, fig.notext ? null : finish);
        } else {
            if (!fig.notext) {
                finish();
            }
        }

    };

    ProfileSVG.reset = function (fig) {
        var w = fig.width - VIEWPORT_MARGIN_X;
        var targetScaleX = fig.width / w * VIEWPORT_SCALE;
        ProfileSVG.moveAndZoom(fig.cx, targetScaleX, fig);
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

        var texts = fig.viewport.selectAll('text');
        fig.notext = false;
        if (texts[0]) {
            fig.notext = getComputedStyle(texts[0].node).strokeOpacity == 0.0;
            texts.forEach(function (text) {
                text.node.style.display = 'none';
            });
        }
        texts = null;

        fig.scaleX = 1.0;
        fig.scaleY = 1.0; // prepare for the future
        fig.focusX = fig.cx; // center x in the raw (scaleX=1) coordinate space
        fig.focusY = fig.cy; // center y in the raw (scaleY=1) coordinate space

        var textBg = document.createElementNS(NS_SVG, 'rect');
        var detail = document.createElementNS(NS_SVG, 'text');
        detail.style.visibility = 'hidden';
        detail.textContent = 'MOw';
        fig.viewport.node.parentNode.appendChild(textBg);
        fig.viewport.node.parentNode.appendChild(detail);
        var mBBox = detail.getBBox();
        fig.charWidthM = mBBox.width / 3;
        detail.textContent = 'night';
        var nBBox = detail.getBBox();
        fig.charWidthN = nBBox.width / 5;
        fig.textHeight = nBBox.height;
        detail.style.display = 'none';
        detail.style.visibility = 'visible';

        detail.setAttribute('x', fig.charWidthM);
        detail.setAttribute('id', figId + '-details');
        detail.setAttribute('y', fig.height - fig.textHeight * 0.75);

        textBg.setAttribute('fill', 'white'); // FIXME
        textBg.setAttribute('fill-opacity', '0.8');
        textBg.setAttribute('x', 0);
        textBg.setAttribute('y', fig.height - fig.textHeight * 2);
        textBg.setAttribute('width', fig.width);
        textBg.setAttribute('height', fig.textHeight * 2);
        textBg.style.display = 'none';

        ProfileSVG.reset(fig);

        var rectDblClickHandler = function (e) {
            var bbox = e.target.getBBox();
            var cx = bbox.x + bbox.width / 2;
            var targetScaleX = fig.width / bbox.width * VIEWPORT_SCALE;
            ProfileSVG.moveAndZoom(cx, targetScaleX, fig);
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
            details.textContent = 'Function: ' + func + dir + file;
            details.style.display = 'inherit';
            details.previousElementSibling.style.display = 'inherit';
        };
        var rectMouseOutHandler = function (e) {
            var rect = e.target;
            var text = rect.nextElementSibling;
            var details = document.getElementById(fig.id + '-details');
            text.style.strokeWidth = '0';
            details.style.display = 'none';
            details.previousElementSibling.style.display = 'none';
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
            var transform = svg.node.createSVGTransform();
            text.transform.baseVal.initialize(transform); // matrix(1, 0, 0, 1, 0, 0)
        });

        bg.dblclick(function () {
            ProfileSVG.reset(fig);
        });

        var mouseWheelHandler = throttle(400, stopper, function (e) {
            var delta = Math.round(e.deltaY * 100);
            if (delta == 0) {
                return;
            }
            var scale = delta < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;

            var clientRect = svg.node.getBoundingClientRect();
            var mx = e.clientX - clientRect.left;
            //var my = e.clientY - clientRect.top;
            var ctm = svg.node.getCTM();
            var x = ctm ? (mx - ctm.e) / ctm.a : mx;
            //var y = ctm ? (my - ctm.f) / ctm.d : my;
            var px = (x - fig.cx) / fig.scaleX + fig.focusX;
            var targetScaleX = Math.max(fig.scaleX * scale, 0.01);
            var targetFocusX = fig.scaleX / targetScaleX * (fig.focusX - px) + px;
            ProfileSVG.moveAndZoom(targetFocusX, targetScaleX, fig, 400);
        });

        svg.node.addEventListener('wheel', mouseWheelHandler, supportsPassive ? {
            passive: false
        } : false);

        fig.viewport.drag();
    };

    return ProfileSVG;
}));
