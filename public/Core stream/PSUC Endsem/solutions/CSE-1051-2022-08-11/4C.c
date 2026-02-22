#include<stdio.h>
struct student {
    char name[100];
    float marks;
};

void find_names(struct student s[100], float avg, int n) {
    int i;
    printf("Students with marks below average:\n");
    for(i=0;i<n;i++) {
        if(s[i].marks<avg) {
            puts(s[i].name);
            printf("%.2f marks",s[i].marks);
        }
    }
}

int main() {
    struct student s[100];
    int n, i;
    float avg, sum=0;
    printf("enter number of students: ");
    scanf("%d",&n);
    for(i=0;i<n;i++) {
        printf("enter name of student %d: ",i+1);
        fflush(stdin);
        gets(s[i].name);
        printf("enter marks of student %d: ",i+1);
        scanf("%f",&s[i].marks);
        sum += s[i].marks;
    }
    avg = sum/n;
    find_names(s, avg, n);
    return 0;
}