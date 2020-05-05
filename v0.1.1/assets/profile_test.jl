using Base.StackTraces: StackFrame

function stackframe(func, file, line; C=false, inlined=false)
    if func === :eval
        mi = first(Base.method_instances(eval, Tuple{Expr}))
        mi.def.module = Core
    else
        mi = nothing
    end
    StackFrame(Symbol(func), Symbol(file), line, mi, C, inlined, 0)
end

backtraces = UInt64[
    0,                                     39, 30, 32, 33, 21, 13,
    0,     12, 15, 38, 26, 25, 24, 25, 34, 31, 30, 32, 33, 21, 13,
    0,     16, 19, 38, 26, 25, 24, 25, 34, 31, 30, 32, 33, 21, 13,
    0,     16, 19, 38, 26, 25, 24, 25, 34, 31, 30, 32, 33, 21, 13,
    0,  7, 20, 28, 29, 27, 25, 24, 25, 34, 31, 30, 32, 33, 21, 13,
    0,  7, 20, 28, 29, 27, 25, 24, 25, 34, 31, 30, 32, 33, 21, 13,
    0,                          4,  5, 35, 31, 30, 32, 33, 21, 13,
    0,                      6, 14, 37, 36, 31, 30, 32, 33, 21, 13,
    0,                                     31, 30, 32, 33, 21, 13,
    0,                                         17,  2,  3, 22, 13,
    0,                         99, 18, 11, 10, 17,  2,  3, 22, 13,
    0,                             18, 11, 10, 17,  2,  3, 22, 13,
    0,                             98, 11, 10, 17,  2,  3, 22, 13,
    0,                                 11, 10, 17,  2,  3, 22, 13,
    0,                                 98, 10, 17,  2,  3, 22, 13,
    0,                                     10, 17,  2,  3, 22, 13,
    0,                                     10, 17,  2,  3, 22, 13,
    0,                                     10, 17,  2,  3, 22, 13,
    0,                                     98, 17,  2,  3, 22, 13,
    0,                         99,  8,  9, 41, 40,  1,  3, 23, 13,
    0,                              8,  9, 41, 40,  1,  3, 23, 13,
    0,                              8,  9, 41, 40,  1,  3, 23, 13,
    0,                              8,  9, 41, 40,  1,  3, 23, 13,
    0,                              8,  9, 41, 40,  1,  3, 23, 13,
    0]

lidict = Dict{UInt64,StackFrame}(
    1  => stackframe("#mapslices#115", ".\\abstractarray.jl", 2018),
    2  => stackframe("#mapslices#115", ".\\abstractarray.jl", 2029),
    3  => stackframe("mapslices##kw", ".\\abstractarray.jl", 1972),
    4  => stackframe(:*, ".\\float.jl", 405),
    5  => stackframe(:*, ".\\promotion.jl", 312),
    6  => stackframe(:-, ".\\float.jl", 403),
    7  => stackframe(:+, ".\\int.jl", 53),
    8  => stackframe(:Array, ".\\boot.jl", 407),
    9  => stackframe(:Array, ".\\boot.jl", 415),
    10 => stackframe(:concatenate_setindex!, ".\\abstractarray.jl", 2058),
    11 => stackframe(:dotview, ".\\broadcast.jl", 1138),
    12 => stackframe(:dsfmt_fill_array_close1_open2!, "D:\\buildbot\\worker\\package_win64\\build\\usr\\share\\julia\\stdlib\\v1.4\\Random\\src\\DSFMT.jl", 86),
    13 => stackframe(:eval, ".\\boot.jl", 331),
    14 => stackframe(:exp, ".\\special\\exp.jl", 136),
    15 => stackframe(:gen_rand, "D:\\buildbot\\worker\\package_win64\\build\\usr\\share\\julia\\stdlib\\v1.4\\Random\\src\\RNGs.jl", 186, inlined=true),
    16 => stackframe(:getproperty, ".\\Base.jl", 33, inlined=true),
    17 => stackframe(:inner_mapslices!, ".\\abstractarray.jl", 2039),
    18 => stackframe(:maybeview, ".\\views.jl", 124),
    19 => stackframe(:mt_empty, "D:\\buildbot\\worker\\package_win64\\build\\usr\\share\\julia\\stdlib\\v1.4\\Random\\src\\RNGs.jl", 180, inlined=true),
    20 => stackframe(:mt_pop!, "D:\\buildbot\\worker\\package_win64\\build\\usr\\share\\julia\\stdlib\\v1.4\\Random\\src\\RNGs.jl", 183),
    21 => stackframe(:profile_test, ".\\REPL[2]", 3),
    22 => stackframe(:profile_test, ".\\REPL[2]", 5),
    23 => stackframe(:profile_test, ".\\REPL[2]", 7),
    24 => stackframe(:rand, "D:\\buildbot\\worker\\package_win64\\build\\usr\\share\\julia\\stdlib\\v1.4\\Random\\src\\generation.jl", 119, inlined=true),
    25 => stackframe(:rand, "D:\\buildbot\\worker\\package_win64\\build\\usr\\share\\julia\\stdlib\\v1.4\\Random\\src\\Random.jl", 253, inlined=true),
    26 => stackframe(:rand, "D:\\buildbot\\worker\\package_win64\\build\\usr\\share\\julia\\stdlib\\v1.4\\Random\\src\\RNGs.jl", 370, inlined=true),
    27 => stackframe(:rand, "D:\\buildbot\\worker\\package_win64\\build\\usr\\share\\julia\\stdlib\\v1.4\\Random\\src\\RNGs.jl", 371, inlined=true),
    28 => stackframe(:rand_inbounds, "D:\\buildbot\\worker\\package_win64\\build\\usr\\share\\julia\\stdlib\\v1.4\\Random\\src\\RNGs.jl", 362),
    29 => stackframe(:rand_inbounds, "D:\\buildbot\\worker\\package_win64\\build\\usr\\share\\julia\\stdlib\\v1.4\\Random\\src\\RNGs.jl", 366, inlined=true),
    30 => stackframe(:randn!, "D:\\buildbot\\worker\\package_win64\\build\\usr\\share\\julia\\stdlib\\v1.4\\Random\\src\\normal.jl", 173),
    31 => stackframe(:randn, "D:\\buildbot\\worker\\package_win64\\build\\usr\\share\\julia\\stdlib\\v1.4\\Random\\src\\normal.jl", 167),
    32 => stackframe(:randn, "D:\\buildbot\\worker\\package_win64\\build\\usr\\share\\julia\\stdlib\\v1.4\\Random\\src\\normal.jl", 184),
    33 => stackframe(:randn, "D:\\buildbot\\worker\\package_win64\\build\\usr\\share\\julia\\stdlib\\v1.4\\Random\\src\\normal.jl", 190, inlined=true),
    34 => stackframe(:randn, "D:\\buildbot\\worker\\package_win64\\build\\usr\\share\\julia\\stdlib\\v1.4\\Random\\src\\normal.jl", 40, inlined=true),
    35 => stackframe(:randn, "D:\\buildbot\\worker\\package_win64\\build\\usr\\share\\julia\\stdlib\\v1.4\\Random\\src\\normal.jl", 43),
    36 => stackframe(:randn, "D:\\buildbot\\worker\\package_win64\\build\\usr\\share\\julia\\stdlib\\v1.4\\Random\\src\\normal.jl", 45),
    37 => stackframe(:randn_unlikely, "D:\\buildbot\\worker\\package_win64\\build\\usr\\share\\julia\\stdlib\\v1.4\\Random\\src\\normal.jl", 58),
    38 => stackframe(:reserve_1, "D:\\buildbot\\worker\\package_win64\\build\\usr\\share\\julia\\stdlib\\v1.4\\Random\\src\\RNGs.jl", 190, inlined=true),
    39 => stackframe(:setindex!, ".\\array.jl", 826, inlined=true),
    40 => stackframe(:similar, ".\\abstractarray.jl", 626),
    41 => stackframe(:similar, ".\\array.jl", 361),
    98 => stackframe(:jl_apply_generic, "gf.c", 2318, C=true),
    99 => stackframe(:jl_gc_collect, "gc.c", 3105, C=true))
