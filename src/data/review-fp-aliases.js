// Review fingerprints across a wording-only change (2026-11-11: American spelling and Title Case; no play, ability or look
// changed). A review fingerprint is a hash of the item's data, text included, so correcting spelling would have made every
// affected verdict look out of date. Each entry is [fingerprint before the wording pass, fingerprint right after it]: a saved
// verdict on the first is treated as a verdict on the second. If the item changes again, its fingerprint moves on from the
// second value, the alias no longer applies, and the item goes back to the owner for review as usual.
// Generated; do not edit by hand. Namespaces: play (Playbook Audit), fbability (Ability Reviewer), clashability (Clash Ability
// Reviewer).
export const REVIEW_FP_ALIASES = Object.freeze({"play":{"bear_front":["12rsb8z","bauoih"],"tight_zone":["1y4tts7","1mtbec9"],"wide_zone_rt":["120veg5","150sfvn"],"trips_weak_zone":["uu8qlk","xg11so"],"qb_sneak":["x4xdgc","10nvx7k"],"quick_outs":["1g309co","nf0xt4"],"twins_fade_out":["120yifs","1bi56nu"],"tight_stick_flat":["1v3glo8","vbcf5q"],"twins_corner_seam":["yjc5xv","qgjr19"],"nickel_bear":["2fcbob","qn6r1p"],"draw_squeeze":["1lc0cbs","1wboczm"],"bear_spy":["t2vpm3","8rvzol"]},"fbability":{},"clashability":{}});
