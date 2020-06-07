# Other Options
[`ProfileSVG.view`](@ref) and [`ProfileSVG.save`](@ref) have optional keyword
arguments for specifying the SVG styles.

```@setup ex
using Profile, ProfileSVG
ProfileSVG.init()
include(joinpath("assets", "profile_test.jl"))
Profile.clear()
@profile (x -> log(x) * exp(x)).(fill(1.23, 10, 10))
ProfileSVG.set_default(width=800)
```

## `maxdepth` and `maxframes`
The `maxdepth` option limits the maximum number of the rendered rows of graph.
The frames deeper than `maxdepth` (i.e. away from the root) will be truncated.

The `maxframes` option limits the maximum number of the rendered frames. Since
the frames are rendered in order of depth-first search, the frames to the right
tend to be omitted.

When `maxdepth` and/or `maxframes` are reached, warnings will be displayed.

```@example ex
ProfileSVG.view(maxdepth=7, maxframes=12)
ProfileSVG.view(g, maxdepth=7, maxframes=12) # hide
```

!!! warning
    The graphs with many frames require a lot of memory and CPU resources,
    especially when using interactive features. Instead of raising the
    `maxframes` option, consider reducing the graph size using the `filter`
    option etc.


## `width` and `height`
The `width` and `height` options specify the size of the SVG image in pixels.
However, the actual display scale depends on the viewer.

If you set the `height` to `0`, it will be calculated automatically according to
the graph. As shown below, cropping can occur when the height of the graph
exceeds the manually specified `height`. When the interactive feature is
available, you can display the cropped area by dragging the graph.

```@example ex
ProfileSVG.view(width=400, height=200)
ProfileSVG.view(g, width=400, height=200) # hide
```

## `font` and `fontsize`

The `font` option specifies the font family names for texts. This setting is
used as the CSS font-family property, i.e. you can use a comma-separated list
and quotes are required around the names which are not valid CSS identifiers.

The `fontsize` option specifies the font size in pixels.

Note that the actual rendering results depend on the viewer.

```@example ex
ProfileSVG.view(font="'Times New Roman', serif", fontsize=16)
ProfileSVG.view(g, font="'Times New Roman', serif", fontsize=16) # hide
```

## Setting options as default
You can specify the default values for options with
[`ProfileSVG.set_default`](@ref).

You can also reset the settings with [`ProfileSVG.init`](@ref).

```@example ex
ProfileSVG.set_default(StackFrameCategory(), fontsize=8)
ProfileSVG.view(width=300)
ProfileSVG.view(g, width=300) # hide
```
