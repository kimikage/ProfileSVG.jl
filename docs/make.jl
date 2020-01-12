using Documenter, ProfileSVG

makedocs(;
    modules=[ProfileSVG],
    format=Documenter.HTML(),
    pages=[
        "Home" => "index.md",
    ],
    repo="https://github.com/timholy/ProfileSVG.jl/blob/{commit}{path}#L{line}",
    sitename="ProfileSVG.jl",
    authors="Tim Holy <tim.holy@gmail.com>",
    assets=String[],
)

deploydocs(;
    repo="github.com/timholy/ProfileSVG.jl",
)
