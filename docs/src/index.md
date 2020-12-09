# ProfileSVG

ProfileSVG allows you to export profiling data as an SVG file. It can be used to
display profiling results in Jupyter/[IJulia](https://github.com/JuliaLang/IJulia.jl)
notebooks, [Pluto](https://github.com/fonsp/Pluto.jl) or any other SVG viewer.

## Installation
The package can be installed with the Julia package manager. Run:
```julia
import Pkg
Pkg.add("ProfileSVG")
```
or, from the Julia REPL, type `]` to enter the Pkg REPL mode and run:
```julia
pkg> add ProfileSVG
```

## Usage
### Displaying profiles

```julia
using ProfileSVG
@profview f(args...)
```
where `f(args...)` is the operation you want to profile.

For example:
```@example ex
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

profile_test(1)   # run once to compile

using Profile, ProfileSVG
ProfileSVG.init() # hide

@profview profile_test(10)
nothing # hide
```
Then, you can get something like this:
```@example ex
include(joinpath("assets", "profile_test.jl")) # hide
ProfileSVG.view(backtraces, lidict=lidict) # hide
```
Note that collected profiles can vary from run-to-run, so don't be alarmed if
you get something different.

[`@profview f(args...)`](@ref) is just shorthand for
```julia
Profile.clear()
@profile f(args...)
ProfileSVG.view()
```
If you've already collected profiling data with `@profile`, or if you want to
customize the output, you can call [`ProfileSVG.view`](@ref) directly.

!!! info "Using ProfileSVG within VSCode"
    VS Code with Julia Extension has a
    [profile viewing feature](https://www.julia-vscode.org/docs/stable/release-notes/v0_17/#Profile-viewing-support-1).
    On the other hand, you can also display the SVG output of ProfileSVG in the
    Plot Pane in VS Code. Since `@profview` has a name collision with the
    Julia extension for VS Code, you need to explicitly specify
    [`ProfileSVG.@profview`](@ref) or use [`ProfileSVG.view`](@ref).

### Exporting to SVG file

Even if you don't use graphical front-ends such as Jupyter, you might want to
export a flame graph as an SVG file as a convenient way to share the results
with others. The [`ProfileSVG.save`](@ref) function provides the exporting
feature.
```@example ex
using FlameGraphs # hide
Profile.clear()
@profile profile_test(10);

# Save a graph that looks like the Jupyter example above
ProfileSVG.save(joinpath("assets", "prof.svg"))
ProfileSVG.save(joinpath("assets", "prof.svg"), flamegraph(backtraces, lidict=lidict)) # hide
```
![Exported Profile](assets/prof.svg)
Note that the exported SVG files include the script for interactive features,
but some viewers (browsers) do not support the script. In particular, when
loading the SVG image from an HTML `<img>` element (as above), the interactive
features are usually disabled.

## Other tools for displaying profiles
- VS Code with [Julia extension](https://www.julia-vscode.org/), a development
  environment, which supports
  [profile visualization](https://www.julia-vscode.org/docs/stable/release-notes/v0_17/#Profile-viewing-support-1).
- [PProf](https://github.com/JuliaPerf/PProf.jl), a web-based profile GUI
  explorer, implemented as a wrapper around
  [google/pprof](https://github.com/google/pprof).
- [ProfileView](https://github.com/timholy/ProfileView.jl), a GUI based on
  [Gtk](https://github.com/JuliaGraphics/Gtk.jl).
- [ProfileVega](https://github.com/davidanthoff/ProfileVega.jl), a
  [Vega-Lite](https://vega.github.io/vega-lite/) front-end, which supports
  exporting profiling data as a Vega-Lite figure.
