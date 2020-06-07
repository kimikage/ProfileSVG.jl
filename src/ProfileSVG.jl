module ProfileSVG

using FlameGraphs, Colors, UUIDs, Profile
using Base.StackTraces: StackFrame
const FlameGraph = FlameGraphs.Node{FlameGraphs.NodeData}

export @profview

"""
    @profview f(args...)

Clear the Profile buffer, profile `f(args...)`, and view the result graphically.
"""
macro profview(ex)
    return quote
        Profile.clear()
        @profile $(esc(ex))
        view()
    end
end

function flamegraph_kwargs(kwargs)
    gopts = copy(default_config.graph_options)

    keywords = (:lidict, :C, :combine, :recur, :norepl, :pruned, :filter)
    for (k, v) in kwargs
        if k in keywords
            gopts[k] = v
        end
    end
    gopts
end

struct FGConfig
    g::Union{FlameGraph, Nothing}
    graph_options::Dict{Symbol, Any}
    fcolor
    width::Real
    height::Real
    font::AbstractString
    fontsize::Real
end

function FGConfig(g::Union{FlameGraph, Nothing} = nothing,
                  graph_options = nothing,
                  fcolor               = default_config.fcolor;
                  width::Real          = default_config.width,
                  height::Real         = default_config.height,
                  font::AbstractString = default_config.font,
                  fontsize::Real       = default_config.fontsize,
                  kwargs...)

    gopts = graph_options === nothing ? flamegraph_kwargs(kwargs) : graph_options
    FGConfig(g, gopts, fcolor, width, height, font, fontsize)
end


"""
    ProfileSVG.init()

Initialize the settings.
"""
function init()
    global default_config = FGConfig(nothing,
                                     Dict{Symbol, Any}(),
                                     FlameGraphs.default_colors,
                                     width=960,
                                     height=0,
                                     font="inherit",
                                     fontsize=12)
    nothing
end


"""
    ProfileSVG.set_default([fcolor]; kwargs...)

Set defult configurations of profiling results. See [`ProfileSVG.view`](@ref)
for details of `kwargs`.

# Examples
```julia
ProfileSVG.set_default(width=600, fontsize=9)
```
"""
function set_default(fcolor=default_config.fcolor; kwargs...)
    global default_config = FGConfig(nothing, nothing, fcolor; kwargs...)
end

include("svgwriter.jl")

"""
    ProfileSVG.view([fcolor,] data=Profile.fetch(); kwargs...)
    ProfileSVG.view([fcolor,] g::FlameGraph; kwargs...)

View profiling results.

# keywords for SVG style
- `width` (default: `960`)
  - The width of output SVG image in pixels.
- `height` (default: `0`)
  - The height of output SVG image in pixels. If you set the height to `0`, it
    will be calculated automatically according to the graph.
- `font` (default: `"inherit"`)
  - The font family names for texts. This setting is used as the CSS
    `font-family` property, i.e. you can use a comma-separated list.
- `fontsize` (default: `12`)
  - The font size of texts for function information, in pixels (not points).

# keywords for `flamegraph`
- `lidict`
- `C`
- `combine`
- `recur`
- `pruned`
- `filter`
See [FlameGraphs](https://timholy.github.io/FlameGraphs.jl/stable/reference/#FlameGraphs.flamegraph)
for details.
"""
function view(fcolor, data::Vector{<:Unsigned}=Profile.fetch(); kwargs...)
    gopts = flamegraph_kwargs(kwargs)
    g = flamegraph(data; gopts...)
    FGConfig(g, gopts, fcolor; kwargs...)
end
function view(data::Vector{<:Unsigned}=Profile.fetch(); kwargs...)
    gopts = flamegraph_kwargs(kwargs)
    g = flamegraph(data; gopts...)
    FGConfig(g, gopts; kwargs...)
end
function view(fcolor, g::FlameGraph; kwargs...)
    FGConfig(g, nothing, fcolor; kwargs...)
end
function view(g::FlameGraph; kwargs...)
    FGConfig(g; kwargs...)
end

"""
    ProfileSVG.save([fcolor,] io::IO, data=Profile.fetch(); kwargs...)
    ProfileSVG.save([fcolor,] io::IO, g::FlameGraph; kwargs...)
    ProfileSVG.save([fcolor,] filename, data=Profile.fetch(); kwargs...)
    ProfileSVG.save([fcolor,] filename, g::FlameGraph; kwargs...)

Save profile results as an SVG file. See [`ProfileSVG.view`](@ref) for details
of `kwargs`.
"""
function save(fcolor, io::IO, data::Vector{<:Unsigned}=Profile.fetch(); kwargs...)
    gopts = flamegraph_kwargs(kwargs)
    g = flamegraph(data; gopts...)
    show(io, MIME("image/svg+xml"), FGConfig(g, gopts, fcolor; kwargs...))
end
function save(fcolor, io::IO, g::FlameGraph; kwargs...)
    show(io, MIME("image/svg+xml"), FGConfig(g, nothing, fcolor; kwargs...))
end
function save(io::IO, data::Vector{<:Unsigned}=Profile.fetch(); kwargs...)
    gopts = flamegraph_kwargs(kwargs)
    g = flamegraph(data; gopts...)
    show(io, MIME("image/svg+xml"), FGConfig(g, gopts; kwargs...))
end
function save(io::IO, g::FlameGraph; kwargs...)
    show(io, MIME("image/svg+xml"), FGConfig(g; kwargs...))
end

function save(fcolor, filename::AbstractString, data::Vector{<:Unsigned}=Profile.fetch(); kwargs...)
    open(filename, "w") do file
        save(fcolor, file, data; kwargs...)
    end
    return nothing
end
function save(fcolor, filename::AbstractString, g::FlameGraph; kwargs...)
    open(filename, "w") do file
        save(fcolor, file, g; kwargs...)
    end
    return nothing
end
function save(filename::AbstractString, data::Vector{<:Unsigned}=Profile.fetch(); kwargs...)
    open(filename, "w") do file
        save(file, data; kwargs...)
    end
    return nothing
end
function save(filename::AbstractString, g::FlameGraph; kwargs...)
    open(filename, "w") do file
        save(file, g; kwargs...)
    end
    return nothing
end


Base.showable(::MIME"image/svg+xml", fg::FGConfig) = true


function Base.show(io::IO, ::MIME"image/svg+xml", fg::FGConfig)
    g, fcolor = fg.g, fg.fcolor
    ncols, nrows = length(g.data.span), FlameGraphs.depth(g)
    width = fg.width
    leftmargin = rightmargin = round(Int, width * 0.01)
    topmargin = botmargin = round(Int, max(width * 0.04, fg.fontsize * 3))

    xstep = (width - (leftmargin + rightmargin)) / ncols
    ystep = round(Int, fg.fontsize * 1.25)

    if fg.height <= 0
        height = ceil(ystep * nrows + botmargin + topmargin)
    else
        height = fg.height
    end

    function flamerects(io::IO, g, j, nextidx)
        ndata = g.data
        sf = ndata.sf
        color = fcolor(nextidx, j, ndata)
        x = (first(ndata.span)-1) * xstep + leftmargin
        y = height - j * ystep - botmargin
        w = length(ndata.span) * xstep
        file = string(sf.file)
        m = match(r"[^\\/]+$", file)
        if m !== nothing
            dirinfo = SubString(file, firstindex(file), m.offset - 1)
            basename = m.match
        else
            dirinfo = ""
            basename = file
        end
        shortinfo = "$(sf.func) in $basename:$(sf.line)"
        write_svgflamerect(io, x, y, w, ystep, shortinfo, dirinfo, color)

        for c in g
            flamerects(io, c, j + 1, nextidx)
        end
        return nothing
    end

    fig_id = string("fig-", replace(string(uuid4()), "-" => ""))

    write_svgdeclaration(io)

    write_svgheader(io, fig_id, width, height, fg.font, fg.fontsize)

    nextidx = fill(1, nrows)
    flamerects(io, g, 1, nextidx)

    write_svgfooter(io, fig_id)
end

__init__() = init()

end # module
