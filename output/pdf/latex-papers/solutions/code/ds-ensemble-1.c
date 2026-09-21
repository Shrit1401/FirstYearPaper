#include <stdio.h>
typedef struct { int day, month, year; } Date;
typedef struct {
    int id;
    char name[40];
    Date joined;
} Employee;
int main(void) {
    Employee e;
    /* Input: id, one-word name, day, month, year. */
    if (scanf("%d %39s %d %d %d", &e.id, e.name,
              &e.joined.day, &e.joined.month,
              &e.joined.year) != 5) return 1;
    printf("%d %s %02d/%02d/%04d\n", e.id, e.name,
           e.joined.day, e.joined.month, e.joined.year);
    return 0;
}
