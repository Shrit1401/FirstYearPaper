#include <string.h>
#define HISTORY 50
#define TEXT 256
/* Each stack entry stores a complete prior document state. */
char document[TEXT] = "";
char undoStack[HISTORY][TEXT], redoStack[HISTORY][TEXT];
int nu = 0, nr = 0;
int edit(const char *next) {
    if (strlen(next) >= TEXT || nu == HISTORY) return 0;
    strcpy(undoStack[nu++], document);
    strcpy(document, next);
    nr = 0; /* New edits invalidate the redo branch. */
    return 1;
}
int undo(void) {
    if (nu == 0 || nr == HISTORY) return 0;
    strcpy(redoStack[nr++], document);
    strcpy(document, undoStack[--nu]);
    return 1;
}
int redo(void) {
    if (nr == 0 || nu == HISTORY) return 0;
    strcpy(undoStack[nu++], document);
    strcpy(document, redoStack[--nr]);
    return 1;
}
