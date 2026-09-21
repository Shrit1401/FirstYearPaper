#include <stdio.h>
#include <stdlib.h>
#include <string.h>
int main(void) {
    /* Two rows of up to 99 characters, including spaces. */
    char (*s)[100] = malloc(2 * sizeof *s);
    if (!s) return 1;
    if (!fgets(*s, 100, stdin) || !fgets(*(s + 1), 100, stdin)) {
        free(s); return 1;
    }
    *(*s + strcspn(*s, "\n")) = '\0';
    *(*(s + 1) + strcspn(*(s + 1), "\n")) = '\0';
    char *result = malloc(strlen(*s) + strlen(*(s + 1)) + 1);
    if (!result) { free(s); return 1; }
    char *dst = result;
    for (int row = 0; row < 2; ++row)
        for (const char *src = *(s + row); *src; ++src)
            *dst++ = *src;
    *dst = '\0';
    puts(result);
    free(result); free(s);
    return 0;
}
