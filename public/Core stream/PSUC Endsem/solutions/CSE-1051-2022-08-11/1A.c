#include<stdio.h>
int main() {
    int dec, oct[100], i, ans, j, k;
    printf("enter decimal number: ");
    scanf("%d",&dec);
    for(i=0;dec>0;dec/=8,i++) {
        oct[i] = dec%8;
    }
    for(ans=0,j=1,k=0;k<i;j*=10,k++) {  //'cause they said "convert to octal"
        ans += oct[k]*j;
    }
    printf("converted to octal: %d", ans);

    //if they said "print octal" then print reverse array
    // for(j=i-1;j>=0;j--)
    //     printf("%d",oct[j]);
    
    return 0;
}