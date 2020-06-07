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


!!! info
    The `colorbg` and `colorfont` options of `FlameGraphs.FlameColors` and
    `FlameGraphs.StackFrameCategory` are currently not supported and ignored.
