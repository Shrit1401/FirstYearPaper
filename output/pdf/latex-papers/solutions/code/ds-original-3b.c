int balanced(const char *s) {
    char stack[100];
    int top = 0;
    for (; *s; ++s) {
        if (*s == '(' || *s == '[') {
            if (top == 100) return 0;
            stack[top++] = *s;
        } else if (*s == ')' || *s == ']') {
            if (!top) return 0;
            char open = stack[--top];
            if ((*s == ')' && open != '(') ||
                (*s == ']' && open != '[')) return 0;
        } else return 0;
    }
    return top == 0;
}
