include "./mimc.circom";

/*
 * IfThenElse sets `out` to `true_value` if `condition` is 1 and `out` to
 * `false_value` if `condition` is 0.
 *
 * It enforces that `condition` is 0 or 1.
 *
 */
template IfThenElse() {
    // TODO: complete this circuit.
}

/*
 * SelectiveSwitch takes two data inputs (`in0`, `in1`) and produces two ouputs.
 * If the "select" (`s`) input is 1, then it inverts the order of the inputs
 * in the ouput. If `s` is 0, then it preserves the order.
 *
 * It enforces that `s` is 0 or 1.
 */
template SelectiveSwitch() {
    // TODO: complete this circuit.
}

/*
 * Verifies the presence of H(`nullifier`, `digest`) in the tree of depth
 * `depth`, summarized by `digest`.
 * This presence is witnessed by the additional inputs `sibling` and
 * `direction`, which have the following meaning:
 *   sibling[i]: the sibling of the node on the path to this coin
 *               commitment at the i'th level from the bottom.
 *   direction[i]: whether that sibling is on the left.
 *       The "sibling" keys correspond directly to the siblings in the
 *       SparseMerkleTree path.
 *       The "direction" keys the boolean directions from the SparseMerkleTree
 *       path, casted to string-represented integers ("0" or "1").
 */
template Spend(depth) {
    // TODO: complete this circuit.
}
