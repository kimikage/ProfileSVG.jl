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
                return supportsPassive = true;
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

    var isDarkColor = function (c) {
        var m = c.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
        if (m) {
            return m[1] * 299 + m[2] * 587 + m[3] * 114 < 255 * 650;
        }
        m = c.match(/^#([\dA-F]{2})([\dA-F]{2})([\dA-F]{2})/i);
        if (m) {
            var r = parseInt(m[1], 16);
            var g = parseInt(m[2], 16);
            var b = parseInt(m[3], 16);
            return r * 299 + g * 587 + b * 114 < 255 * 650;
        }
        return true;
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

        var rects = undefined;
        var pathrects = undefined;
        if (fig.roundradius > 0) {
            rects = fig.viewport.selectAll('rect');
        } else {
            pathrects = fig.viewport.selectAll('path');
        }

        var scaleViewport = function (step) {
            var scaleX = oldScaleX + (targetScaleX - oldScaleX) * step;
            var scaleY = oldScaleY + (targetScaleY - oldScaleY) * step;

            var rMatrix = fig.viewport.node.transform.baseVal.consolidate().matrix;
            rMatrix.a = scaleX;
            rMatrix.d = scaleY;
            rMatrix.e = oldE + (targetE - oldE) * step; // TransX
            rMatrix.f = oldF + (targetF - oldF) * step; // TransY

            if (rects) {
                rects.forEach(function (r) {
                    var rect = r.node;
                    rect.setAttribute('rx', Math.max(0.0, fig.roundradius / scaleX));
                    rect.setAttribute('ry', Math.max(0.0, fig.roundradius / scaleY));
                });
            }
        };

        var finish = function () {
            scaleViewport(1);
            var scaleXt = 1.0 / targetScaleX;
            var scaleYt = 1.0 / targetScaleY;
            var updateText = function (text, x, y, w, shortinfo) {
                var tMatrix = text.transform.baseVal.getItem(0).matrix;
                tMatrix.a = scaleXt;
                tMatrix.d = scaleYt;
                tMatrix.e = (1.0 - scaleXt) * x;
                tMatrix.f = (1.0 - scaleYt) * y;

                text.firstChild.nodeValue = formatText(fig, shortinfo, w / scaleXt);
                text.style.display = 'inherit';
            };
            if (rects) {
                rects.forEach(function (r) {
                    var rect = r.node;
                    var x = rect.x.baseVal.value;
                    var y = rect.y.baseVal.value;
                    var w = rect.width.baseVal.value;
                    var shortinfo = rect.getAttribute('data-shortinfo');
                    updateText(rect.nextElementSibling, x, y, w, shortinfo);
                });
            }
            if (pathrects) {
                pathrects.forEach(function (p) {
                    var path = p.node;
                    // The API compatibility of path segments is problematic.
                    var d = path.getAttribute('d');
                    var values = d.match(/^M\s*([\d.]+)[\s,]+(-?[\d.]+)[^h]+h\s*([\d.]+)/);
                    var x = Number(values[1]);
                    var y = Number(values[2]);
                    var w = Number(values[3]);
                    var shortinfo = path.getAttribute('data-shortinfo');
                    updateText(path.nextElementSibling, x, y, w, shortinfo);
                });
            }
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

        fig.xstep = fig.viewport.node.getAttribute('data-xstep');
        fig.tunit = fig.viewport.node.getAttribute('data-tunit');
        fig.delay = fig.viewport.node.getAttribute('data-delay');

        var texts = fig.viewport.selectAll('text');
        fig.notext = false;
        if (texts[0]) {
            fig.notext = getComputedStyle(texts[0].node).strokeOpacity == 0.0;
            texts.forEach(function (text) {
                text.node.style.display = 'none';
            });
        }
        texts = null;

        fig.roundradius = 0.0;
        var rect = fig.viewport.select('rect');
        if (rect) {
            fig.roundradius = rect.node.rx.baseVal.value;
        }

        fig.scaleX = 1.0;
        fig.scaleY = 1.0; // prepare for the future
        fig.focusX = fig.cx; // center x in the raw (scaleX=1) coordinate space
        fig.focusY = fig.cy; // center y in the raw (scaleY=1) coordinate space

        var textBg = document.createElementNS(NS_SVG, 'rect');
        var detail = document.createElementNS(NS_SVG, 'text');
        var time = document.createElementNS(NS_SVG, 'text');
        detail.style.visibility = 'hidden';
        detail.textContent = 'MOw';
        fig.viewport.node.parentNode.appendChild(textBg);
        fig.viewport.node.parentNode.appendChild(detail);
        fig.viewport.node.parentNode.appendChild(time);
        var mBBox = detail.getBBox();
        fig.charWidthM = mBBox.width / 3;
        detail.textContent = 'night';
        var nBBox = detail.getBBox();
        fig.charWidthN = nBBox.width / 5;
        fig.textHeight = nBBox.height;
        detail.style.display = 'none';
        detail.style.visibility = 'visible';

        detail.setAttribute('id', figId + '-details');
        detail.setAttribute('x', fig.charWidthM);
        detail.setAttribute('y', fig.height - fig.textHeight * 0.75);

        time.setAttribute('x', fig.width - fig.charWidthM * 10);
        time.setAttribute('y', fig.height - fig.textHeight * 0.75);

        textBg.setAttribute('x', 0);
        textBg.setAttribute('y', fig.height - fig.textHeight * 2);
        textBg.setAttribute('width', fig.width);
        textBg.setAttribute('height', fig.textHeight * 2);
        var textBgFill = getComputedStyle(textBg).fill;
        if (textBgFill == "rgba(0, 0, 0, 0)" || textBgFill == "transparent") {
            var isDark = isDarkColor(getComputedStyle(detail).fill);
            textBg.style.fill = isDark ? 'white' : 'black';
        }
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
            var time = details.nextElementSibling;
            details.textContent = 'Function: ' + func + dir + file;
            details.style.display = 'inherit';
            if (fig.delay) {
                var count = Math.round(rect.width.baseVal.value / fig.xstep);
                var t = count * (fig.tunit === 's' ? fig.delay :
                    fig.tunit === 'ms' ? fig.delay * 1e3 :
                        fig.tunit === 'us' || fig.tunit === 'μs' ? fig.delay * 1e6 : 1);
                var tp = Math.round(t * 1000) / 1000;
                time.textContent = 'Time: ' + tp + ' ' + fig.tunit;
                time.style.display = 'inherit';
            }
            details.previousElementSibling.style.display = 'inherit';
        };
        var rectMouseOutHandler = function (e) {
            var rect = e.target;
            var text = rect.nextElementSibling;
            var details = document.getElementById(fig.id + '-details');
            text.style.strokeWidth = '0';
            details.style.display = 'none';
            details.previousElementSibling.style.display = 'none';
            details.nextElementSibling.style.display = 'none';
        };

        var rects = fig.viewport.selectAll(fig.roundradius > 0 ? 'rect' : 'path');
        rects.forEach(function (r) {
            var rect = r.node;
            var text = rect.nextElementSibling;
            rect.setAttribute('data-shortinfo', text.textContent);
            var dir = rect.getAttribute('data-dinfo');
            rect.setAttribute('data-dinfo', dir);
            rect.addEventListener('dblclick', rectDblClickHandler, false);
            rect.addEventListener('mouseover', rectMouseOverHandler, false);
            rect.addEventListener('mouseout', rectMouseOutHandler, false);
            var transform = svg.node.createSVGTransform();
            text.transform.baseVal.initialize(transform); // matrix(1, 0, 0, 1, 0, 0)
        });
        rects = null;

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
