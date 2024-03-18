using Documenter, ProfileSVG

if :size_threshold in fieldnames(Documenter.HTML)
    size_th = (
        example_size_threshold = nothing,
        size_threshold = nothing,
    )
else
    size_th = ()
end

makedocs(
    clean = false,
    modules=[ProfileSVG],
    format=Documenter.HTML(;prettyurls = get(ENV, "CI", nothing) == "true",
                           size_th...,
                           assets = ["assets/profilesvg.css"]),
    sitename="ProfileSVG",
    pages=[
        "Introduction" => "index.md",
        "Coloration Schemes" => "coloration-schemes.md",
        "Other Options" => "other-options.md",
        "Reference" => "reference.md",
    ]
)

deploydocs(
    repo="github.com/kimikage/ProfileSVG.jl.git",
    push_preview = true
)
