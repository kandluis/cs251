Name: [Luis A. Perez]

## Question 1

In the following code-snippet from `Num2Bits`, it looks like `sum_of_bits`
might be a sum of products of signals, making the subsequent constraint not
rank-1. Explain why `sum_of_bits` is actually a _linear combination_ of
signals.

```
        sum_of_bits += (2 ** i) * bits[i];
```

## Answer 1

It appears that it might be the sum of products of signals, but in fact it is a linear combination of powers of 2 of the input signal bits. As such, this is an appropriate rank-1 constraint. 

## Question 2

Explain, in your own words, the meaning of the `<==` operator.

## Answer 2

The `<==` operator is basically a combination of the `<--` and the `===` operators, where we both assing a value to the signal as well as imply that the contract derived from the assignment holds. It's basically just shorhand that allows us to avoid two operators when we're assigning values that are linear combinations of the signals.


## Question 3

Suppose you're reading a `circom` program and you see the following:

```
    signal input a;
    signal input b;
    signal input c;
    (a & 1) * b === c;
```

Explain why this is invalid.

## Answer 3

This is invalid because the constraint is not simplifiable to the form `a*b + c = 0` (rank-1) due to the & operator.

