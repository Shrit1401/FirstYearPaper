#include <stdio.h>
typedef struct { int day, month, year; } Date;
typedef struct {
    int roll;
    char name[40];
    Date admitted;
} Student;
int readAndDisplay(void) {
    Student s;
    if (scanf("%d %39s %d %d %d", &s.roll, s.name,
              &s.admitted.day, &s.admitted.month,
              &s.admitted.year) != 5) return 0;
    printf("%d %s %02d/%02d/%04d\n", s.roll, s.name,
           s.admitted.day, s.admitted.month, s.admitted.year);
    return 1;
}
