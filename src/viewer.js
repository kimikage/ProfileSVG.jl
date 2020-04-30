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
    var ProfileSVG = {};

    var avgcharwidth = 6;
    var default_transition_time = 300;
    var viewport_scale = 0.9;

    var format_text = function (text, available_len) {
        if (available_len < 3 * avgcharwidth) {
            return "";
        } else if (text.length * avgcharwidth > available_len) {
            var nchars = Math.round(available_len / avgcharwidth) - 2;
            return text.slice(0, nchars) + "..";
        }
        return text;
    };

    // Shift the view port to center on xc, then scale in the x direction
    ProfileSVG.move_and_zoom = function (xc, xs, xScale, fig, delta_t) {
        if (typeof delta_t === 'undefined') {
            delta_t = default_transition_time;
        }
        if (typeof xs === 'undefined') {
            xs = xc;
        }

        var oldScale = fig.scale;
        var oldShift = fig.shift;

        fig.scale = xScale;
        fig.shift = xc;

        xScale *= viewport_scale;

        var oldxshift = -(oldShift - 0.5 * fig.clip_width);
        var xshift = -(xc - 0.5 * fig.clip_width);

        fig.texts.forEach(function (text) {
            text.node.textContent = "";
        });

        if (delta_t != 0) {
            Snap.animate(0, 1, function (step) {

                var scale = oldScale + (xScale - oldScale) * step;
                var rMatrix = new Snap.Matrix;
                rMatrix.translate(oldxshift + (xshift - oldxshift) * step, 0);
                rMatrix.scale(scale, 1, xs, fig.clip_middle);
                fig.viewport.attr({
                    transform: rMatrix
                });
                fig.rects.forEach(function (rect) {
                    rect.attr({
                        rx: 2 / scale,
                        ry: 2 / scale
                    });
                });

            }, delta_t, null, function () {
                fig.rects.forEach(function (rect, i) {
                    var bbox = rect.getBBox();
                    var text = fig.texts[i];
                    var shortinfo = rect.node.getAttribute("data-shortinfo");

                    var tMatrix = new Snap.Matrix;
                    tMatrix.scale(1.0 / xScale, 1, bbox.x, bbox.y);

                    text.node.textContent = format_text(shortinfo, bbox.w * xScale);
                    text.transform(tMatrix);
                });
            });
        } else {
            var rMatrix = new Snap.Matrix;
            rMatrix.translate(xshift, 0);
            rMatrix.scale(xScale, 1, xs, fig.clip_middle);

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

                text.node.textContent = format_text(shortinfo, bbox.w * xScale);
                text.transform(tMatrix);
            });
        }

    };

    ProfileSVG.reset = function (fig) {
        ProfileSVG.move_and_zoom(fig.viewport_cx, fig.viewport_cx, viewport_scale, fig);
    };

    ProfileSVG.initialize = function (figId) {

        var svg = Snap.select('#' + figId);
        var pt = svg.node.createSVGPoint();

        var fig = {};

        fig.viewport = svg.select('#' + figId + '-viewport');
        fig.frame = svg.select('#' + figId + '-frame');

        fig.viewport_cx = fig.viewport.getBBox().cx;

        fig.rects = fig.viewport.selectAll('rect');
        fig.texts = fig.viewport.selectAll('text');
        fig.clip = svg.select('#' + figId + '-clip-rect');
        fig.clip_width = fig.clip.getBBox().w;
        fig.clip_middle = fig.clip.getBBox().cy;
        fig.details = svg.select('#' + figId + '-details').node.firstChild;

        fig.scale = 1.0;
        fig.shift = fig.viewport_cx;

        ProfileSVG.reset(fig);

        fig.rects.forEach(function (rect) {
            rect.dblclick(function () {
                    var bbox = rect.getBBox();
                    ProfileSVG.move_and_zoom(bbox.cx, bbox.cx, fig.clip_width / bbox.w, fig);
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
                    ProfileSVG.move_and_zoom(bbox.cx, bbox.cx, fig.clip_width / bbox.w, fig);
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

        function throttle(delay, callback) {
            var previousCall = new Date().getTime();
            return function () {
                var time = new Date().getTime();

                if ((time - previousCall) >= delay) {
                    previousCall = time;
                    callback.apply(null, arguments);
                } else {
                    arguments[0].preventDefault();
                }
            };
        }

        var MouseWheelHandler = throttle(400, function (e) {
            e.preventDefault();
            var e = window.event || e;
            var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
            pt.x = e.clientX;
            pt.y = e.clientY;

            pt.matrixTransform(fig.viewport.node.getScreenCTM().inverse());
            var targetScale = fig.scale + 0.2 * delta;
            ProfileSVG.move_and_zoom(fig.shift, pt.x, targetScale, fig, 400);
            return false;
        });
        var frameNode = fig.frame.node;
        if (frameNode.addEventListener) {
            frameNode.addEventListener("mousewheel", MouseWheelHandler, false);
            frameNode.addEventListener("DOMMouseScroll", MouseWheelHandler, false);
        } else {
            frameNode.attachEvent("onmousewheel", MouseWheelHandler);
        }

        fig.viewport.drag();
    };

    return ProfileSVG;
}));
