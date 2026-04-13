#include<stdio.h>
int main() {
    int grade;
    float netSalary, basicSalary, HRA, IT=200, PF;
    printf("enter employee grade: ");
    scanf("%d",&grade);
    switch(grade) {
        case 1:
        basicSalary = 12000;
        break;
        case 2:
        basicSalary = 15000;
        break;
        case 3:
        basicSalary = 18000;
        break;
        case 4:
        basicSalary = 20000;
        break;
    }
    HRA = 0.1*basicSalary;
    PF = 0.12*basicSalary;
    netSalary = basicSalary + HRA - (IT + PF);
    printf("the net salary of the employee is rupees %.2f",netSalary);
    return 0;
}