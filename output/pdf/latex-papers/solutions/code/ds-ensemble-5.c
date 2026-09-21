#include <stdio.h>
#include <stdlib.h>
typedef struct Contact {
    int id;
    char name[40];
    struct Contact *next;
} Contact;
int addRecent(Contact **head, int id, const char *name) {
    Contact *p = malloc(sizeof *p);
    if (!p) return 0;
    p->id = id;
    snprintf(p->name, sizeof p->name, "%s", name);
    p->next = *head; *head = p;
    return 1;
}
void forward(const Contact *p) {
    for (; p; p = p->next) printf("%d %s\n", p->id, p->name);
}
void reversePrint(const Contact *p) {
    if (!p) return;
    reversePrint(p->next);
    printf("%d %s\n", p->id, p->name);
}
