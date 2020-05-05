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

struct FGConfig
    g::FlameGraph
    fcolor
    fontsize::Int
end

include("svgwriter.jl")

"""
    ProfileSVG.view([fcolor], data=Profile.fetch(); fontsize=12, kwargs...)

View profiling results. See [FlameGraphs](https://github.com/timholy/FlameGraphs.jl)
for options for `kwargs` and the default value of `fcolor`.
"""
function view(fcolor, data::Vector{UInt64}=Profile.fetch(); fontsize::Integer=12, kwargs...)
    g = flamegraph(data; kwargs...)
    FGConfig(g, fcolor, fontsize)
end
function view(data::Vector{UInt64}=Profile.fetch(); fontsize::Integer=12, kwargs...)
    view(FlameGraphs.default_colors, data; fontsize=fontsize, kwargs...)
end

"""
    ProfileSVG.save([fcolor], io, g=flamegraph(); kwargs...)

Save profile results as an SVG file. See [FlameGraphs](https://github.com/timholy/FlameGraphs.jl)
for options for `kwargs` and the default value of `fcolor`.
"""
function save(fcolor, io::IO, g::FlameGraph; fontsize::Integer=12)
    show(io, MIME("image/svg+xml"), FGConfig(g, fcolor, fontsize))
end
function save(fcolor, filename::AbstractString, g::FlameGraph; kwargs...)
    open(filename, "w") do file
        save(fcolor, file, g; kwargs...)
    end
    return nothing
end
function save(fcolor, io::IO; fontsize::Integer=12, kwargs...)
    g = flamegraph(; kwargs...)
    save(fcolor, io, g; fontsize=fontsize)
end
function save(fcolor, filename::AbstractString; kwargs...)
    open(filename, "w") do file
        save(fcolor, file; kwargs...)
    end
    return nothing
end
save(io::IO, args...; kwargs...) = save(FlameGraphs.default_colors, io, args...; kwargs...)
save(filename::AbstractString, args...; kwargs...) = save(FlameGraphs.default_colors, filename, args...; kwargs...)


Base.showable(::MIME"image/svg+xml", fg::FGConfig) = true


function Base.show(io::IO, ::MIME"image/svg+xml", fg::FGConfig)
    g, fcolor, fontsize = fg.g, fg.fcolor, fg.fontsize
    ncols, nrows = length(g.data.span), FlameGraphs.depth(g)
    leftmargin = rightmargin = 10
    width = 1000
    topmargin = 30
    botmargin = 40
    rowheight = 15
    height = ceil(rowheight*nrows + botmargin + topmargin)
    xstep = (width - (leftmargin + rightmargin)) / ncols
    ystep = (height - (topmargin + botmargin)) / nrows

    function flamerects(fcolor, io::IO, g, j, nextidx)
        ndata = g.data
        sf = ndata.sf
        thiscolor = fcolor(nextidx, j, ndata)
        x = (first(ndata.span)-1) * xstep + leftmargin
        y = height - j*ystep - botmargin
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
        write_svgflamerect(io, x, y, w, ystep, shortinfo, dirinfo, thiscolor)

        for c in g
            flamerects(fcolor, io, c, j+1, nextidx)
        end
        return nothing
    end

    fig_id = string("fig-", replace(string(uuid4()), "-" => ""))

    write_svgdeclaration(io)

    write_svgheader(io, fig_id, width, height, "Verdana", fontsize)

    nextidx = fill(1, nrows)
    flamerects(fcolor, io, g, 1, nextidx)

    write_svgfooter(io, fig_id)
end

end # module
