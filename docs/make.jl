using Documenter, ProfileSVG

makedocs(
    clean = false,
    modules=[ProfileSVG],
    format=Documenter.HTML(prettyurls = get(ENV, "CI", nothing) == "true",
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
