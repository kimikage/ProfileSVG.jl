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

function write_svgdeclaration(io::IO)
    println(io, """<?xml version="1.0" standalone="no"?>""")
    println(io, """<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">""")
end

function write_svgheader(io::IO, fig_id, width, height, font)
    y_msg = height - 17
    print(io, """
<svg version="1.1" width="$width" height="$height" viewBox="0 0 $width $height"
     xmlns="http://www.w3.org/2000/svg" id="$fig_id">
<defs>
    <linearGradient id="$fig_id-background" y1="0" y2="1" x1="0" x2="0" >
        <stop stop-color="#eeeeee" offset="5%" />
        <stop stop-color="#eeeeb0" offset="95%" />
    </linearGradient>
    <clipPath id="$fig_id-image-frame">
      <rect id="$fig_id-clip-rect" x="0" y="0" width="$(width)" height="$(height)" />
    </clipPath>
</defs>
<style type="text/css">
    #$fig_id rect[rx]:hover {
        stroke:black;
        stroke-width:1;
    }
    #$fig_id text:hover {
        stroke:black;
        stroke-width:1;
        stroke-opacity:0.35;
    }
</style>
<g id="$fig_id-frame" clip-path="url(#$fig_id-image-frame)">
<rect class="pvbackground" x="0.0" y="0" width="$(width).0" height="$(height).0" fill="url(#$fig_id-background)"  />
<text class="pvbackground" text-anchor="middle" x="600" y="24" font-size="17" font-family="$(font)" fill="rgb(0,0,0)"  >Profile results</text>
<text text-anchor="left" x="10" y="$y_msg" font-size="12" font-family="$(font)" fill="rgb(0,0,0)"  >Function:</text>
<text text-anchor="" x="70" y="$y_msg" font-size="12" font-family="$(font)" fill="rgb(0,0,0)" id="$fig_id-details" > </text>
<g id="$fig_id-viewport" transform="scale(1)">
""")
end

function write_svgflamerect(io::IO, xstart, ystart, w, h, sf::StackFrame, rgb, fontsize)
    x = xstart
    y = ystart
    info = escape_html("$(sf.func) in $(sf.file):$(sf.line)")
    shortinfo = escape_html("$(sf.func) in $(basename(string(sf.file))):$(sf.line)")
    r = round(Integer, 255*red(rgb))
    g = round(Integer, 255*green(rgb))
    b = round(Integer, 255*blue(rgb))
    print(io, """<rect vector-effect="non-scaling-stroke" x="$x" y="$y" width="$w" height="$h" fill="rgb($r,$g,$b)" rx="2" ry="2" data-shortinfo="$shortinfo" data-info="$info"/>\n""")
    println(io, """\n<text text-anchor="" x="$x" dx="4" y="$(y+11.5)" font-size="$fontsize" font-family="Verdana" fill="rgb(0,0,0)" ></text>""")
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
