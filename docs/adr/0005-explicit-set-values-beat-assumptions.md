# Explicit set values beat assumptions

Prompt explicit values override referenced or imported set values, and set values override meta, species, benchmark baseline, or bulk assumptions. When defender bulk is known from an explicit set, Exact Bulk should take priority over Min/Mid/Max bulk assumptions because calculations should respect user-provided set data rather than presenting assumptions as if they represented a known set.
