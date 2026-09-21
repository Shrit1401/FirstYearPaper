#include <stdlib.h>
int *makeMatrix(int r, int c) {
    if (r <= 0 || c <= 0) return NULL;
    /* The question guarantees that this size fits size_t. */
    return malloc((size_t)r * (size_t)c * sizeof(int));
}
/* Access (i,j) as *(base + (size_t)i * c + j).
   Valid indices satisfy 0 <= i < r and 0 <= j < c.
   Caller checks the returned pointer and eventually frees it. */
