#include<stdio.h>
int main() {
    int a, n, i, result=1;
    printf("enter a and n: ");
    scanf("%d%d",&a,&n);
    for(i=0;i<n;i++) {
        result *= a;
    }
    printf("result is %d",result);
    return 0;
}