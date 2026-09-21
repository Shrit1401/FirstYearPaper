#include <stdio.h>
#include <stdlib.h>
typedef struct Song {
    int id, duration;
    char title[80];
    struct Song *next;
} Song;
int append(Song **head, int id, const char *title, int duration) {
    Song *node = malloc(sizeof *node);
    if (!node) return 0;
    node->id = id; node->duration = duration; node->next = NULL;
    snprintf(node->title, sizeof node->title, "%s", title);
    Song **link = head;
    while (*link) link = &(*link)->next;
    *link = node;
    return 1;
}
void removeShort(Song **head, int limit) {
    Song **link = head;
    while (*link) {
        if ((*link)->duration < limit) {
            Song *old = *link;
            *link = old->next;
            free(old);
        } else link = &(*link)->next;
    }
}
void display(const Song *p) {
    for (; p; p = p->next)
        printf("%d %s %d\n", p->id, p->title, p->duration);
}
void clear(Song **head) {
    while (*head) {
        Song *old = *head; *head = old->next; free(old);
    }
}
int main(void) {
    Song *head = NULL;
    if (!append(&head, 1, "Dawn", 120) ||
        !append(&head, 2, "Evening", 240) ||
        !append(&head, 3, "Night", 150)) {
        clear(&head); return 1;
    }
    int limit;
    if (scanf("%d", &limit) != 1) { clear(&head); return 1; }
    removeShort(&head, limit);
    display(head);
    clear(&head);
    return 0;
}
