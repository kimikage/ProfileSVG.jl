using ProfileSVG
using Test

# For these tests to work you need `rsvg-convert` installed.
# On Ubuntu this is `sudo apt install librsvg2-bin`.

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

@testset "ProfileSVG.jl" begin
    profile_test(1)   # to compile
    @profview profile_test(10)
    mktemp() do path, io
        ProfileSVG.save(io)
        flush(io)
        # Validate the file by converting to PNG
        str = read(`rsvg-convert $path`, String)
        @test codeunits(str)[1:8] == UInt8[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    end
end
