#include <stdlib.h>
typedef struct Node {
    int value;
    struct Node *next;
} Node;
void deleteAll(Node **head, int key) {
    if (!head) return;
    Node **link = head;
    while (*link) {
        if ((*link)->value == key) {
            Node *old = *link;
            *link = old->next;
            free(old);
        } else link = &(*link)->next;
    }
}
Node *reverse(Node *head) {
    Node *prev = NULL, *cur = head;
    while (cur) {
        Node *next = cur->next;
        cur->next = prev;
        prev = cur;
        cur = next;
    }
    return prev;
}
