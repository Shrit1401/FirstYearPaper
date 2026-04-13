#include<stdio.h>
int product(int a, int b) {
    if(b>=0) {
        if(a==0||b==0)
            return 0;
        else if(b==1)
            return a;
        else
            return a + product(a,b-1);
    }
    else if(a>=0)
        return product(b,a);
    else
        return product(-a,-b);
}

int main() {
    int x, y, z;
    printf("enter two numbers: ");
    scanf("%d%d",&x,&y);
    z = product(x,y);
    printf("product is %d",z);
    return 0;
}