#include <ctype.h>
#include <stddef.h>
#include <string.h>
int InStackPrecedence(char op) {
    switch (op) {
        case '+': case '-': return 1;
        case '*': case '/': return 3;
        case '^': return 5;
        case '(': return 0;
        default: return -1;
    }
}
int IncomingPrecedence(char op) {
    switch (op) {
        case '+': case '-': return 1;
        case '*': case '/': return 3;
        case '^': return 6; /* Do not pop an existing '^'. */
        case '(': return 7;
        default: return -1;
    }
}
/* Valid expressions, single-character operands; output has
   space for strlen(infix)+1 bytes. Parentheses are supported. */
void Infix_Postfix(char infix[], char postfix[]) {
    char stack[strlen(infix) + 1];
    size_t top = 0, out = 0;
    for (size_t i = 0; infix[i]; ++i) {
        char c = infix[i];
        if (isspace((unsigned char)c)) continue;
        if (isalnum((unsigned char)c)) postfix[out++] = c;
        else if (c == '(') stack[top++] = c;
        else if (c == ')') {
            while (top && stack[top - 1] != '(')
                postfix[out++] = stack[--top];
            if (top) --top;
        } else {
            while (top && stack[top - 1] != '(' &&
                   InStackPrecedence(stack[top - 1]) >=
                   IncomingPrecedence(c))
                postfix[out++] = stack[--top];
            stack[top++] = c;
        }
    }
    while (top) postfix[out++] = stack[--top];
    postfix[out] = '\0';
}
