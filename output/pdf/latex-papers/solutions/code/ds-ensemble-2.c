#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 1;
    if ((size_t)n > SIZE_MAX / (3 * sizeof(double))) return 1;
    double (*marks)[3] = malloc((size_t)n * sizeof *marks);
    if (!marks) return 1;
    for (int i = 0; i < n; ++i) {
        double sum = 0;
        for (int j = 0; j < 3; ++j) {
            if (scanf("%lf", *(marks + i) + j) != 1) {
                free(marks); return 1;
            }
            sum += *(*(marks + i) + j);
        }
        printf("Student %d average: %.2f\n", i + 1, sum / 3);
    }
    free(marks);
    return 0;
}
