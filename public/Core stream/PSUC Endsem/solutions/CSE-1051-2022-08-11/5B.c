#include<stdio.h>
int main() {
    int *p;
    int n, sum=0, a[100], i;
    printf("enter number of elements: ");
    scanf("%d",&n);
    printf("enter elements: ");
    for(i=0;i<n;i++) {
        scanf("%d",&a[i]);
    }
    for(p=a;p-a<n;p++) {
        sum += *p;
    }
    printf("sum of the elements is %d",sum);
    return 0;
}