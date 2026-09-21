#include <stdbool.h>
#include <ctype.h>
#include <string.h>
/* Input is a syntactically valid, balanced expression.
   Redundant pair means a pair enclosing no operator at its
   own nesting level: (a), ((a+b)), and () are detected. */
bool isDuplicate(char s[]) {
    char stack[strlen(s) + 1];
    size_t top = 0;
    for (size_t i = 0; s[i]; ++i) {
        char c = s[i];
        if (isspace((unsigned char)c)) continue;
        if (c != ')') stack[top++] = c;
        else {
            bool hasOperator = false;
            while (top && stack[top - 1] != '(') {
                char v = stack[--top];
                if (strchr("+-*/^", v)) hasOperator = true;
            }
            if (top) --top;
            if (!hasOperator) return true;
            stack[top++] = 'x'; /* One reduced subexpression. */
        }
    }
    return false;
}
