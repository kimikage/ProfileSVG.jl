# Coloration Schemes

The output color of ProfileSVG can be customized with the functions provided by
the [`FlameGraphs`](https://timholy.github.io/FlameGraphs.jl/stable/) package.
See the [FlameGraphs docmentation](https://timholy.github.io/FlameGraphs.jl/stable/#Rendering-a-flame-graph-1)
for details.

```@setup ex
using Profile, ProfileSVG
ProfileSVG.init()
include(joinpath("assets", "profile_test.jl"))
Profile.clear()
@profile (x -> log(x) * exp(x)).(fill(1.23, 10, 10))
ProfileSVG.set_default(width=800)
```

## Default scheme
```@example ex
ProfileSVG.view()
nothing # hide
```
or
```@example ex
using FlameGraphs
ProfileSVG.view(FlameColors())
ProfileSVG.view(FlameColors(), g) # hide
```
The default scheme uses cycling colors to distinguish different stack frames,
while coloring runtime dispatch "red" and garbage-collection "orange". The
run-time dispatch (aka, dynamic dispatch, run-time method lookup, or a virtual
call) often has a significant impact on performance.

## Stack frame category
You can colorize the stack frames based on their category, or module-of-origin.

```@example ex
using FlameGraphs
ProfileSVG.view(StackFrameCategory())
ProfileSVG.view(StackFrameCategory(), g) # hide
```
In the default `StackFrameCategory` scheme, "gray" indicates time spent in
`Core.Compiler` (mostly inference), "dark gray" in other `Core`, "yellow" in
LLVM, "orange" in other `ccalls`, "light blue" in `Base`, and "red" is
uncategorized (mostly package code).

## `bgcolor` and `fontcolor` options
[`ProfileSVG.view`](@ref) and [`ProfileSVG.save`](@ref) have optional keyword
arguments for specifying the SVG styles.

The `bgcolor` option specifies the background color style and the `fontcolor`
option specifies the font color style.

One of the following symbols is available for `bgcolor`:
- `:fcolor`
  - `fcolor(:bg)` (default)
- `:classic`
  - pale color gradation which comes from the original
    [Flame Graphs](http://www.brendangregg.com/flamegraphs.html)
- `:transparent`
  - fully transparent

One of the following symbols is available for `fontcolor`:
- `:fcolor`
  - `fcolor(:font)` (default)
- `:classic`
  - black
- `:currentcolor`
  - the [`currentcolor`](https://www.w3.org/TR/css-color-3/#currentcolor) CSS keyword
- `:bw`
  - black or white depending on the frame color

!!! info
    You cannot specify a `Color` or a color name directly to `bgcolor` or
    `fontcolor`. The `colorbg` and `colorfont` options of
    `FlameGraphs.FlameColors` and `FlameGraphs.StackFrameCategory` are
    available.

### `:fcolor` (default)
```@example ex
using FlameGraphs, Colors
fcolor = FlameColors(colorbg=colorant"steelblue", colorfont=colorant"lightyellow")

ProfileSVG.view(fcolor)
ProfileSVG.view(fcolor, g) # hide
```

### `:classic`
```@example ex
ProfileSVG.view(bgcolor=:classic, fontcolor=:classic)
ProfileSVG.view(g, bgcolor=:classic, fontcolor=:classic) # hide
```

### `:transparent` and `:currentcolor`
```@raw html
<div class="bg">
```
The contextual, i.e. parent, background here has a pattern, and the font color
depends on the theme (light or dark).

```@example ex
ProfileSVG.view(bgcolor=:transparent, fontcolor=:currentcolor)
ProfileSVG.view(g, bgcolor=:transparent, fontcolor=:currentcolor) # hide
```
```@raw html
</div>
```

### `:bw`
```@example ex
modcat(mod) = nothing
loccat(sf) = occursin("#", string(sf.func)) ? colorant"navy" : colorant"powderblue"

mysfc = StackFrameCategory(modcat, loccat, colorant"dimgray", colorant"red")

ProfileSVG.view(mysfc, fontcolor=:bw)
ProfileSVG.view(mysfc, g, fontcolor=:bw) # hide
```

!!! info
    The decision whether to use black or white is based on the assumption that
    the frames are opaque. If the [`frameopacity` option](@ref) is set to a low
    value, the texts may be hard to read.

## `frameopacity` option

The `frameopacity` option specifyies the opacity of frames in [0, 1]. This
option affects only the background of the frame, not the texts or the viewport
background.

```@raw html
<div class="bg">
```
The contextual background here has a pattern.

```@example ex
ProfileSVG.view(frameopacity=0.5, bgcolor=:transparent, fontcolor=:currentcolor)
ProfileSVG.view(g, frameopacity=0.5, bgcolor=:transparent, fontcolor=:currentcolor) # hide
```
```@raw html
</div>
```