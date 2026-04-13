#include<stdio.h>
struct distance_t {
    int inch, feet;
};

int main() {
    struct distance_t d1, d2;
    printf("enter first distance in feet and inches: ");
    scanf("%d%d",&d1.feet,&d1.inch);
    printf("enter second distance in feet and inches: ");
    scanf("%d%d",&d2.feet,&d2.inch);
    int feet, inch;
    feet = d1.feet + d2.feet;
    inch = d1.inch + d2.inch;
    feet += inch/12;
    inch = inch%12;
    printf("final length = %d feet and %d inches",feet,inch);
    return 0;
}