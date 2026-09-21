from pathlib import Path
import subprocess,tempfile,json,itertools,math
import numpy as np
P=Path(__file__).resolve().parent;C=P/'code'
report=[]
def test_c(name,main):
    with tempfile.TemporaryDirectory() as d:
        src=Path(d)/'test.c';exe=Path(d)/'test'
        src.write_text('#include <assert.h>\n#include <string.h>\n#include '+json.dumps(str(C/name))+'\n'+main)
        subprocess.run(['clang','-std=c11','-Wall','-Wextra','-Werror',str(src),'-o',str(exe)],check=True)
        subprocess.run([str(exe)],check=True)
    report.append(name+': behavioral assertions passed')
for f in C.glob('*.c'):
    subprocess.run(['clang','-std=c11','-Wall','-Wextra','-Werror','-fsyntax-only',str(f)],check=True)
report.append(f'All {len(list(C.glob(chr(42)+chr(46)+chr(99))))} C source files compile with C11 and strict warnings.')
def run_program(name,stdin,expected):
 with tempfile.TemporaryDirectory() as d:
  exe=Path(d)/'a';subprocess.run(['clang','-std=c11',str(C/name),'-o',str(exe)],check=True)
  p=subprocess.run([str(exe)],input=stdin,text=True,capture_output=True,check=True)
  assert p.stdout==expected,(name,p.stdout,expected)
 report.append(name+': sample execution passed')
run_program('ds-ensemble-1.c','7 Ana 1 2 2024\n','7 Ana 01/02/2024\n')
run_program('ds-ensemble-2.c','2\n10 20 30\n50 60 70\n','Student 1 average: 20.00\nStudent 2 average: 60.00\n')
run_program('ds-ensemble-3.c','hello \nworld\n','hello world\n')
run_program('ds-ensemble-4.c','180\n','2 Evening 240\n')
test_c('ds-ensemble-6.c','''int main(void) {
assert(!undo()); assert(!redo()); assert(edit("A")); assert(edit("AB"));
assert(undo()); assert(!strcmp(document,"A")); assert(redo());
assert(!strcmp(document,"AB")); assert(undo()); assert(edit("AC"));
assert(!redo()); assert(!strcmp(document,"AC")); return 0;
}''')
test_c('ds-ensemble-7.c','''int main(void) { char out[100];
char a[]="A+B*(C-D)^E^F"; Infix_Postfix(a,out); assert(!strcmp(out,"ABCD-EF^^*+"));
char b[]="A-B-C"; Infix_Postfix(b,out); assert(!strcmp(out,"AB-C-"));
char c[]="A^B^C"; Infix_Postfix(c,out); assert(!strcmp(out,"ABC^^")); return 0;}''')
test_c('ds-ensemble-8.c','''int main(void) {
char a[]="((a+b))", b[]="(a+b)", c[]="(a)",d[]="(a+(b*c))";
assert(isDuplicate(a)); assert(!isDuplicate(b)); assert(isDuplicate(c));
assert(!isDuplicate(d)); return 0;}''')
test_c('ds-original-2ab.c','''int main(void) {
Node *h=NULL; deleteAll(&h,1); assert(!h); assert(!reverse(h));
int vals[]={1,1,2,1,3,1}; Node **tail=&h;
for (int i=0;i<6;i++){*tail=malloc(sizeof **tail); assert(*tail);
(*tail)->value=vals[i]; (*tail)->next=NULL; tail=&(*tail)->next;}
deleteAll(&h,1); assert(h->value==2 && h->next->value==3 && !h->next->next);
h=reverse(h); assert(h->value==3 && h->next->value==2);
deleteAll(&h,3); deleteAll(&h,2); assert(!h); return 0;}''')
test_c('ds-original-3b.c','''int main(void) {assert(balanced(""));assert(balanced("([])[]"));
assert(!balanced("([)]"));assert(!balanced("]"));assert(!balanced("(("));return 0;}''')
test_c('ds-original-1b.c','''int main(void) {assert(!makeMatrix(0,2));int *p=makeMatrix(2,3);
assert(p);*(p+1*3+2)=42;assert(p[5]==42);free(p);return 0;}''')
# Exhaustive truth tables, including specified don't-cares.
zeros={0,3,5,6,8,10};dc={2,13,14}
for m in range(16):
 a,b,c,d=map(int,f'{m:04b}')
 f=(b or d) and ((not c) or d) and (a or b or not c) and ((not b) or c or not d)
 if m not in dc:assert bool(f)==(m not in zeros)
 assert bool((b and d) or ((not b) and (not d)))==(m in {0,2,5,7,8,10,13,15})
for a,b in itertools.product(range(8),repeat=2):
 aa=[(a>>i)&1 for i in range(3)];bb=[(b>>i)&1 for i in range(3)];eq=[aa[i]==bb[i] for i in range(3)]
 g=(aa[2] and not bb[2]) or (eq[2] and aa[1] and not bb[1]) or (eq[2] and eq[1] and aa[0] and not bb[0])
 assert bool(g)==(a>b)
for a,b,e,f in itertools.product(range(2),repeat=4):
 next_b=b^e;next_a=a^(e & int(b==f));state=2*a+b
 assert 2*next_a+next_b==(state if not e else (state+(1 if f else -1))%4)
report.append('K-map/NOR, NAND-XNOR, comparator and JK up/down equations passed exhaustive truth-table checks.')
# Both CRC codewords have zero syndrome.
for data,g,rem in [('1010001101','11011','0111'),('1101011011','10011','1110')]:
 def mod(bits):
  r=list(map(int,bits))
  for i in range(len(r)-len(g)+1):
   if r[i]:
    for j,b in enumerate(g):r[i+j]^=int(b)
  return ''.join(map(str,r[-4:]))
 assert mod(data+'0000')==rem;assert mod(data+rem)=='0000'
report.append('Both CRC remainders and zero-syndrome codewords verified.')
# Fike enumeration: all 120 unique; original arrangement is first.
fike=[]
for ds in itertools.product(range(2,0,-1),range(3,0,-1),range(4,0,-1),range(5,0,-1)):
 a=list('01234')
 for k,d in enumerate(ds,2):a[k-1],a[d-1]=a[d-1],a[k-1]
 fike.append(''.join(a))
assert len(set(fike))==120 and fike[0]=='01234' and fike[74]=='43201'
assert ''.join(list(itertools.permutations('01234'))[41])=='13420'
assert sum(a+b+c==15 for a in range(1,5) for b in range(3,8) for c in range(5,11))==18
assert sum(x+y<=12 for x in range(1,6) for y in range(2,7))==25
report.append('Fike/lexicographic ranks and both bounded-selection counts verified by exhaustive enumeration.')
# Independent all-pairs shortest-path checks.
def distance(n,edges):
 d=np.full((n,n),np.inf);np.fill_diagonal(d,0)
 for a,b,w in edges:d[a,b]=w
 for k in range(n):d=np.minimum(d,d[:,k,None]+d[None,k,:])
 return d[0].tolist()
e=[(0,1,4),(0,2,5),(1,0,6),(1,2,4),(1,4,8),(2,1,6),(2,3,2),(2,5,3),(3,4,7),(4,0,3),(4,3,2),(5,2,5),(5,3,4)]
assert distance(6,e)==[0,4,5,7,12,8]
e=[(0,1,4),(0,2,1),(1,2,2),(1,3,1),(2,3,5),(2,4,8),(3,4,3)];e=e+[(b,a,w) for a,b,w in e]
assert distance(5,e)==[0,3,1,4,7]
report.append('Both Dijkstra final vectors verified independently with Floyd-Warshall.')
x=np.array([78,91,68,54,82,47,60,78,97,58,62,50,50,63,92,75,79,63,42,61])
assert np.isclose(x.mean(),67.5) and np.isclose(x.var(),238.35)
o=np.array([[31,469],[185,1315]]);e=o.sum(1)[:,None]*o.sum(0)[None,:]/o.sum()
assert np.isclose(((o-e)**2/e).sum(),14.64319326800642)
y=np.array([[[8,9],[9,8],[6,7],[10,11]],[[7,6],[8,9],[5,4],[9,10]],[[10,9],[11,12],[8,7],[12,13]]])
g=y.mean();a=y.mean((1,2));b=y.mean((0,2));c=y.mean(2)
ss=[8*sum((a-g)**2),6*sum((b-g)**2),2*((c-a[:,None]-b[None,:]+g)**2).sum(),((y-c[:,:,None])**2).sum()]
assert np.allclose(ss,[109/3,214/3,11/3,6])
assert np.isclose(sum(ss),((y-g)**2).sum())
o=np.array([[48,12],[22,18]]);e=o.sum(1)[:,None]*o.sum(0)[None,:]/o.sum()
assert np.isclose(((o-e)**2/e).sum(),50/7)
report.append('Descriptive statistics, both chi-square tables, and replicated ANOVA sums of squares recomputed and checked.')
( P/'verification-results.json').write_text(json.dumps(report,indent=2))
print('\n'.join(report))
