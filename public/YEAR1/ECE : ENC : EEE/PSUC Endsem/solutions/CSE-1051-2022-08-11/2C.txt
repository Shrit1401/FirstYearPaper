#include<stdio.h>
int main() {
    int i;
    char s[100];
    printf("enter a sentence: ");
    gets(s);
    for(i=0;s[i]!='\0';i++)
        if(s[i]=='a' || s[i]=='e' || s[i]=='i' || s[i]=='o' || s[i]=='u')
            s[i] = ' ';
    printf("updated sentence: ");
    puts(s);
    return 0;
}