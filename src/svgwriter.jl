const snapsvgjs = joinpath(@__DIR__, "..", "deps", "snap.svg-min.js")
const viewerjs = joinpath(@__DIR__, "viewer.js")

function escape_html(str::AbstractString)
    s = replace(str, '<' => "&lt;")
    s = replace(s, '>' => "&gt;")
    s = replace(s, '&' => "&amp;")
    s
end

function escape_script(js::AbstractString)
    s = replace(js, '\x0b' => "\\x0b")
    s = replace(s,  '\x0c' => "\\x0c")
    replace(s, "]]" => "] ]")
end

function modify_amd(js::AbstractString)
    replace(js, "define([" => "define('ProfileSVG/snap.svg', [")
end

function simplify(x::Real, digits=2)
    ra, rd = round(x), round(x, digits=digits)
    ra == rd ? Int(ra) : rd
end

isdarkcolor(c::Color) = gray(Gray(c)) < 0.65

function write_svgdeclaration(io::IO)
    println(io, """<?xml version="1.0" standalone="no"?>""")
    println(io, """<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">""")
end

function write_svgheader(io::IO, fig_id, width, height,
                         bgcolor, fontcolor, frameopacity,
                         font, fontsize, notext)
    w = simplify(width)
    h = simplify(height)
    caption_size = simplify(fontsize * 1.4)
    x_cap = simplify(width * 0.5)
    y_cap = simplify(fontsize * 2)
    x_msg = simplify(fontsize * 0.8)
    y_msg = height - caption_size
    textcolor = isempty(fontcolor) ? "black" : fontcolor
    caption_color = textcolor
    if isempty(fontcolor) && startswith(bgcolor, "#") && isdarkcolor(parse(Gray, bgcolor))
        caption_color = "white"
    end
    bg_fill = isempty(bgcolor) ? "url(#$fig_id-background)" : bgcolor
    details_bg_fill = isempty(bgcolor) ? "white" : bgcolor
    text_stroke_opacity = notext ? 0.0 : 0.35
    op = simplify(frameopacity)
    hover_opacity = simplify(op > 0.75 ? op - 0.25 : op + 0.25)
    print(io,
        """
        <svg version="1.1" width="$w" height="$h" viewBox="0 0 $w $h"
             xmlns="http://www.w3.org/2000/svg" id="$fig_id">
        <defs>
        """)
    isempty(bgcolor) && print(io,
        """
            <linearGradient id="$fig_id-background" y1="0" y2="1" x1="0" x2="0">
                <stop stop-color="#eeeeee" offset="5%" />
                <stop stop-color="#eeeeb0" offset="95%" />
            </linearGradient>
        """)
    print(io,
        """
            <clipPath id="$fig_id-clip">
                <rect x="0" y="0" width="$w" height="$h"/>
            </clipPath>
        </defs>
        <style type="text/css">
            #$fig_id text {
                pointer-events: none;
                font-family: $font;
                font-size: $(simplify(fontsize))px;
                fill: $textcolor;
            }
            text#$fig_id-caption {
                font-size: $(caption_size)px;
                fill: $caption_color;
                text-anchor: middle;
            }
            #$fig_id-bg {
                fill: $bg_fill;
            }
            #$fig_id-viewport rect, #$fig_id-viewport path {
                vector-effect: non-scaling-stroke;
                fill-opacity: $op;
            }
            #$fig_id-viewport text {
                stroke: $textcolor;
                stroke-width: 0;
                stroke-opacity: $text_stroke_opacity;
            }
            #$fig_id-viewport rect:hover, #$fig_id-viewport path:hover {
                fill-opacity: $hover_opacity;
                stroke: $textcolor;
                stroke-width: 0.5;
            }
            #$fig_id-viewport + rect {
                fill: $details_bg_fill;
                opacity: 0.8;
            }
            text#$fig_id-details{
                fill: $caption_color;
            }
        """)
    isempty(fontcolor) && print(io,
        """
            #$fig_id-viewport text.w {
                fill: white;
                stroke: white;
            }
        """)
    print(io,
        """
        </style>
        <g id="$fig_id-frame" clip-path="url(#$fig_id-clip)">
        <rect id="$fig_id-bg" x="0" y="0" width="$w" height="$h"/>
        <text id="$fig_id-caption" x="$x_cap" y="$y_cap">Profile results</text>
        <g id="$fig_id-viewport" transform="scale(1)">
        """)
end

function write_svgflamerect(io::IO, xstart, ystart, width, height, roundradius,
                            shortinfo, dirinfo, color, bw)
    x = simplify(xstart)
    y = simplify(ystart)
    yt = simplify(y + height * 0.75)
    w = simplify(simplify(width + xstart) - x)
    h = simplify(simplify(height + ystart) - y)
    r = simplify(roundradius)
    sinfo = escape_html(shortinfo)
    dinfo = escape_html(dirinfo)
    classw = (bw & isdarkcolor(color)) ? " class=\"w\"" : ""
    if r > zero(r)
        print(io, """<rect x="$x" y="$y" width="$w" height="$h" rx="$r" """)
    else
        print(io, """<path d="M$x,$(y)v$(h)h$(w)v-$(h)z" """)
    end
    println(io, """fill="#$(hex(color))" data-dinfo="$dinfo"/>""")
    println(io, """<text x="$x" dx="4" y="$yt"$classw>$sinfo</text>""")
end

function write_svgfooter(io::IO, fig_id)
    println(io, "</g></g>")
    println(io, "<script><![CDATA[")
    println(io, modify_amd(escape_script(read(snapsvgjs, String))))
    println(io, "]]></script>")
    println(io, "<script><![CDATA[")
    println(io, escape_script(read(viewerjs, String)))
    println(io, "]]></script>")
    print(io,
        """
        <script><![CDATA[
        if (typeof require === 'function' && define.amd) {
            require(['ProfileSVG'], function (ProfileSVG) {
                ProfileSVG.initialize("$fig_id");
            });
        } else {
            ProfileSVG.initialize("$fig_id");
        }
        ]]></script>
        """)
    println(io, "</svg>")
end
