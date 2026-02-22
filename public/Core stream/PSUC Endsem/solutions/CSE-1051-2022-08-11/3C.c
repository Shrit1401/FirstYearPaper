#include<stdio.h>
int isFib(int x) {
    int fib1=0, fib2=1, fib3=1;
    while(fib3<=x) {
        fib3 = fib1 + fib2;
        fib1 = fib2;
        fib2 = fib3;
    }
    if(x == fib1)
        return 1;
    else
        return 0;
}

int main() {
    int a[100][100], n, m, i, j;
    printf("enter dimensions of matrix: ");
    scanf("%d%d",&n,&m);
    printf("enter elements of the matrix row-wise: ");
    for(i=0;i<n;i++) {
        for(j=0;j<m;j++) {
            scanf("%d",&a[i][j]);
        }
    }
    for(i=0;i<n;i++) { //n = m since it has to be a square matrix
        if(isFib(a[i][i])) {
            for(j=1;j<=a[i][i];j*=10);
            j/=10;
            a[i][i]/=j;
        }
    }
    printf("updated matrix: \n");
    for(i=0;i<n;i++) {
        for(j=0;j<m;j++) {
            printf("%d\t",a[i][j]);
        }
        printf("\n");
    }
    return 0;
}