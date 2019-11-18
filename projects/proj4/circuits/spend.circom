include "./mimc.circom";

/*
 * IfThenElse sets `out` to `true_value` if `condition` is 1 and `out` to
 * `false_value` if `condition` is 0.
 *
 * It enforces that `condition` is 0 or 1.
 *
 */
template IfThenElse() {
    signal input condition;
    signal input true_value;
    signal input false_value;
    signal output out;

    // Condition must be either 0 or 1.
    condition * (1 - condition) === 0;

    // Intermediate signal value since we must have constraints be of the form
    // ab + c = 0.
    signal diff <-- true_value - false_value;

    // Constraint the output. This makes sense because if we expand it out we
    // know that condition is either 1 or 0.
    //
    // In the case of 1, we have:
    //  out = 1 * (true_value - false_value) + false_value = true_value
    //
    // In the case of 0, we have:
    //  out = 0 * (true_value - false_value) + false_value = false_value
    out <== condition * diff + false_value;
}

/*
 * SelectiveSwitch takes two data inputs (`in0`, `in1`) and produces two ouputs.
 * If the "select" (`s`) input is 1, then it inverts the order of the inputs
 * in the ouput. If `s` is 0, then it preserves the order.
 *
 * It enforces that `s` is 0 or 1.
 */
template SelectiveSwitch() {
    signal input in0;
    signal input in1;
    signal input s;
    signal output out0;
    signal output out1;

    // Enforce s is 0 or 1.
    s * (1 - s) === 0;

    // Use two if statements to determine output values.

    // If (s == 1) Then in1 Else in0
    component firstOutput = IfThenElse();
    firstOutput.condition <== s;
    firstOutput.true_value <== in1;
    firstOutput.false_value <== in0;

    // If (s == 1) Then in0 else in 1
    component secondOutput = IfThenElse();
    secondOutput.condition <== s;
    secondOutput.true_value <== in0;
    secondOutput.false_value <== in1;

    // Output signals must equal the results of the if statements.
    out0 <== firstOutput.out;
    out1 <== secondOutput.out;
}

/*
 * Verifies the presence of H(`nullifier`, `nonce`) in the tree of depth
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
    signal input digest;
    signal input nullifier;
    signal private input nonce;
    signal private input sibling[depth];
    signal private input direction[depth];

    // This stores our computed proof hash at each level in it's out signal.
    // The +1 is needed to hold the root.
    component computed_hash[depth + 1];

    // The 0-th level is just H(`nullifier`, `digest`).
    computed_hash[0] = Mimc2();
    computed_hash[0].in0 <== nullifier; 
    computed_hash[0].in1 <== nonce;

    // Stores the switches along the path.
    component switches[depth];

    // Set-up constraints along the proof path.
    for (var i = 0; i < depth; ++i) {
        switches[i] = SelectiveSwitch();
        // If directions[i] is true, we'll compute H(sibling[i], computed_hash[i]).
        // If false, we don't swap and computed H(computed_hash[i], sibling[i]).
        switches[i].in0 <== computed_hash[i].out;
        switches[i].in1 <== sibling[i];
        switches[i].s <== direction[i];

        // Compute the hash for the next level.
        computed_hash[i + 1] = Mimc2();
        computed_hash[i + 1].in0 <== switches[i].out0;
        computed_hash[i + 1].in1 <== switches[i].out1;
    }

    // Verify that digest matches the final hash.
    computed_hash[depth].out === digest;
}
