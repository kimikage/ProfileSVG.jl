using ProfileSVG
using Test

using FlameGraphs
using Base.StackTraces: StackFrame

function stackframe(func, file, line; C=false, inlined=false)
    StackFrame(Symbol(func), Symbol(file), line, nothing, C, inlined, 0)
end

backtraces = UInt[0, 4, 3, 2, 1,
                  0, 4, 3, 2, 1,
                  0,    6, 5, 1,
                  0,       8, 7,
                  0]

lidict = Dict{UInt64,StackFrame}(1=>stackframe(:f1, :file1, 1),
                                 2=>stackframe(:jl_f, :filec, 55; C=true),
                                 3=>stackframe(:jl_invoke, :file2, 1; C=true),
                                 4=>stackframe(:_ZL, Symbol("libLLVM-8.0.so"), 15),
                                 5=>stackframe(:f4, :file1, 20),
                                 6=>stackframe(:copy, Symbol(".\\expr.jl"), 1),
                                 7=>stackframe(:f1, :file1, 2),
                                 8=>stackframe(:typeinf, Symbol("./compiler/typeinfer.jl"), 10))

function profile_test(n)
    for i = 1:n
        A = randn(100,100,20)
        m = maximum(A)
        Am = mapslices(sum, A; dims=2)
        B = A[:,:,5]
        Bsort = mapslices(sort, B; dims=1)
        b = rand(100)
        C = B.*b
    end
end

function count_element(pattern::Regex, svg::AbstractString)
    n = 0
    i = firstindex(svg)
    while true
        r = findnext(pattern, svg, i)
        r === nothing && return n
        n += 1
        i = last(r)
    end
end

@test detect_ambiguities(ProfileSVG) == []

@testset "showable" begin
    fg = ProfileSVG.view(backtraces, lidict=lidict)
    @test Base.showable(MIME"image/svg+xml"(), fg)
    @test Base.showable(MIME"text/html"(), fg)

    @test !Base.showable(MIME"image/svg+xml"(), ProfileSVG.default_config)
    @test !Base.showable(MIME"text/html"(), ProfileSVG.default_config)
end

@testset "view" begin
    sfc = StackFrameCategory()

    fg = ProfileSVG.view(sfc, backtraces,
                          C=true, lidict=lidict, width=123.4, unknown=nothing)
    @test FlameGraphs.depth(fg.g) == 5
    @test fg.fcolor isa StackFrameCategory
    @test fg.graph_options[:C] == true
    @test fg.graph_options[:lidict] == lidict
    @test fg.width == 123.4
    @test fg.height == 0
    @test fg.roundradius == 2
    @test fg.font == "inherit"
    @test fg.fontsize == 12
    @test fg.notext == false

    fg = ProfileSVG.view(backtraces,
                          C=true, lidict=lidict, fontsize=12.34, unknown=missing)
    @test FlameGraphs.depth(fg.g) == 5
    @test fg.fcolor isa FlameColors
    @test fg.graph_options[:C] == true
    @test fg.graph_options[:lidict] == lidict
    @test fg.width == 960
    @test fg.height == 0
    @test fg.roundradius == 2
    @test fg.font == "inherit"
    @test fg.fontsize == 12.34
    @test fg.notext == false

    g = flamegraph(backtraces, lidict=lidict)

    fg = ProfileSVG.view(sfc, g, C=true, height=123.4, roundradius=0, unknown=true)
    @test FlameGraphs.depth(fg.g) == 4 # `C` option does not affect the graph
    @test fg.fcolor isa StackFrameCategory
    @test fg.graph_options[:C] == true
    @test fg.width == 960
    @test fg.height == 123.4
    @test fg.roundradius == 0
    @test fg.font == "inherit"
    @test fg.fontsize == 12
    @test fg.notext == false

    fg = ProfileSVG.view(g, C=true, font="serif", notext=true, unknown=false)
    @test FlameGraphs.depth(fg.g) == 4 # `C` option does not affect the graph
    @test fg.fcolor isa FlameColors
    @test fg.graph_options[:C] == true
    @test fg.width == 960
    @test fg.height == 0
    @test fg.roundradius == 2
    @test fg.font == "serif"
    @test fg.fontsize == 12
    @test fg.notext == true
end

@testset "save" begin
    io = IOBuffer()
    sfc = StackFrameCategory()

    function svg_size(str)
        m = match(Regex("""<svg version="1.1" width="([^"]+)" height="([^"]+)" """), str)
        m === nothing && error("svg size is unknown")
        (m.captures[1], m.captures[2])
    end
    function has_filled_rect(str, color)
        occursin(Regex("""<rect[^/]+fill="$color" """), str)
    end
    function has_filled_path(str, color)
        occursin(Regex("""<path[^/]+fill="$color" """), str)
    end

    ProfileSVG.save(sfc, io, backtraces,
                    C=true, lidict=lidict, width=123.4, unknown=nothing)
    str = String(take!(io))
    @test svg_size(str) == ("123.4", "147")
    @test has_filled_rect(str, "#FF0000")
    @test !has_filled_path(str, "#FF0000")
    filename = tempname()
    ProfileSVG.save(sfc, filename, backtraces,
                    C=true, lidict=lidict, width=123.4, unknown=nothing)
    str = read(filename, String)
    rm(filename)
    @test svg_size(str) == ("123.4", "147")
    @test has_filled_rect(str, "#FF0000")
    @test !has_filled_path(str, "#FF0000")

    ProfileSVG.save(io, backtraces,
                    C=true, lidict=lidict, fontsize=12.34, unknown=missing)
    str = String(take!(io))
    @test svg_size(str) == ("960", "151")
    @test !has_filled_rect(str, "#FF0000")
    @test !has_filled_path(str, "#FF0000")
    filename = tempname()
    ProfileSVG.save(filename, backtraces,
                    C=true, lidict=lidict, fontsize=12.34, unknown=missing)
    str = read(filename, String)
    rm(filename)
    @test svg_size(str) == ("960", "151")
    @test !has_filled_rect(str, "#FF0000")
    @test !has_filled_path(str, "#FF0000")


    g = flamegraph(backtraces, lidict=lidict)

    ProfileSVG.save(sfc, io, g, C=true, height=123.4, roundradius=0, unknown=true)
    str = String(take!(io))
    @test svg_size(str) == ("960", "123.4")
    @test !has_filled_rect(str, "#FF0000")
    @test has_filled_path(str, "#FF0000")
    filename = tempname()
    ProfileSVG.save(sfc, filename, g, C=true, height=123.4, roundradius=0, unknown=true)
    str = read(filename, String)
    rm(filename)
    @test svg_size(str) == ("960", "123.4")
    @test !has_filled_rect(str, "#FF0000")
    @test has_filled_path(str, "#FF0000")

    ProfileSVG.save(io, g, C=true, font="serif", notext=true, unknown=false)
    str = String(take!(io))
    @test svg_size(str) == ("960", "136")
    @test !has_filled_rect(str, "#FF0000")
    @test !has_filled_path(str, "#FF0000")
    filename = tempname()
    ProfileSVG.save(filename, g, C=true, font="serif", notext=true, unknown=false)
    str = read(filename, String)
    rm(filename)
    @test svg_size(str) == ("960", "136")
    @test !has_filled_rect(str, "#FF0000")
    @test !has_filled_path(str, "#FF0000")
end

@testset "size limitation" begin
    io = IOBuffer()

    @test_logs(
        (:warn, r"The depth of this graph is 5, exceeding the `maxdepth` \(=4\)"),
        (:warn, r"The maximum number of frames \(`maxframes`=8\) is reached"),
        ProfileSVG.save(io, backtraces, C=true, lidict=lidict, maxdepth=4, maxframes=8))
    str = String(take!(io))
    @test occursin("""height="136" """, str)
    @test count_element(r"<rect x=[^/]+/>", str) == 8
end

@testset "show as html" begin
    io = IOBuffer()
    fg = ProfileSVG.view(backtraces, lidict=lidict)
    show(io, "text/html", fg)
    str = String(take!(io))
    @test occursin(r"<html>.+(?=</html>)"s, str)
end

@testset "set_default" begin
    sfc = StackFrameCategory()

    ProfileSVG.set_default(sfc, C=true, height=567.8)

    fgc = ProfileSVG.view(sfc, backtraces,
                          C=false, lidict=lidict, width=123.4, unknown=nothing)
    @test FlameGraphs.depth(fgc.g) == 4
    @test fgc.fcolor isa StackFrameCategory
    @test fgc.graph_options[:C] == false
    @test fgc.graph_options[:lidict] == lidict
    @test fgc.width == 123.4
    @test fgc.height == 567.8
    @test fgc.roundradius == 2
    @test fgc.font == "inherit"
    @test fgc.fontsize == 12
    @test fgc.notext == false

    ProfileSVG.set_default(fontsize=9)
    fgc = ProfileSVG.view(backtraces,
                          lidict=lidict, width=123.4, unknown=nothing)
    @test FlameGraphs.depth(fgc.g) == 5
    @test fgc.fcolor isa StackFrameCategory
    @test fgc.graph_options[:C] == true
    @test fgc.graph_options[:lidict] == lidict
    @test fgc.width == 123.4
    @test fgc.height == 567.8
    @test fgc.roundradius == 2
    @test fgc.font == "inherit"
    @test fgc.fontsize == 9
    @test fgc.notext == false

    ProfileSVG.init()
    fgc = ProfileSVG.view(backtraces,
                          C=true, lidict=lidict, width=123.4, unknown=nothing)
    @test FlameGraphs.depth(fgc.g) == 5
    @test fgc.fcolor isa FlameColors
    @test fgc.graph_options[:C] == true
    @test fgc.graph_options[:lidict] == lidict
    @test fgc.width == 123.4
    @test fgc.height == 0
    @test fgc.roundradius == 2
    @test fgc.font == "inherit"
    @test fgc.fontsize == 12
    @test fgc.notext == false
end

# For these tests to work you need `rsvg-convert` installed.
# On Ubuntu this is `sudo apt install librsvg2-bin`.
@testset "profview" begin
    profile_test(1)   # to compile
    @profview profile_test(10)

    mktemp() do path, io
        ProfileSVG.save(io)
        flush(io)
        try
            # Validate the file by converting to PNG
            str = read(`rsvg-convert $path`, String)
            @test codeunits(str)[1:8] == UInt8[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
        catch e
            e isa Base.IOError || rethrow()
        end
    end
end
