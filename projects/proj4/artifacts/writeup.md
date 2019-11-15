Name: []

## Question 1

In the following code-snippet from `Num2Bits`, it looks like `sum_of_bits`
might be a sum of products of signals, making the subsequent constraint not
rank-1. Explain why `sum_of_bits` is actually a _linear combination_ of
signals.

```
        sum_of_bits += (2 ** i) * bits[i];
```

## Answer 1

While `sum_of_bits` is a sum of products and the right factor in each product
is a signal, the left factor is a scalar, **not** a signal, so this is
actually a linear combination.

## Question 2

Explain, in your own words, the meaning of the `<==` operator.

## Answer 2

It simultaneously expresses a constraint and expresses how to compute the
signal to the left of the operator.

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

The sub-expression `(a & 1)` uses the `&` operator, which is neither field
multiplication nor addition, so it cannot be used in the constraint of an
arithmetic circuit.
