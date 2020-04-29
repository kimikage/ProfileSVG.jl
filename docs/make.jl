using Documenter, ProfileSVG

makedocs(
    clean = false,
    modules=[ProfileSVG],
    format=Documenter.HTML(prettyurls = get(ENV, "CI", nothing) == "true"),
    sitename="ProfileSVG",
    pages=[
        "Home" => "index.md",
    ]
)

deploydocs(
    repo="github.com/kimikage/ProfileSVG.jl.git",
    push_preview = true
)
