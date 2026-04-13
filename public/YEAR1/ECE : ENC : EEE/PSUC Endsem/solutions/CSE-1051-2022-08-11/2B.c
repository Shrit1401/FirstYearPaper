#include<stdio.h>
int main() {
    int num, i, divSum=0;
    printf("enter number: ");
    scanf("%d",&num);
    for(i=1;i<=num/2;i++) {
        if(num%i==0)
            divSum += i;
    }
    if(divSum == num)
        printf("the number is perfect");
    else printf("the number is not perfect");
    return 0;
}