from pathlib import Path
import json,runpy
OUT=Path(__file__).resolve().parent
S={}
def add(p,label,title,body):S.setdefault(p,[]).append((label,title,body))
def fig(name,width='.85'):
 return r'\begin{center}\includegraphics[width='+width+r'\linewidth]{figures/'+name+r'.pdf}\end{center}'
def code(name):return r'\VerbatimInput[fontsize=\footnotesize]{code/'+name+'}\n'
def table(headers,rows):
 cols='l'*len(headers)
 return r'\begin{center}\renewcommand{\arraystretch}{1.2}\begin{tabular}{'+cols+'}'+r'\hline '+' & '.join(headers)+r'\\\hline'+'\n'+'\n'.join(' & '.join(map(str,row))+r'\\' for row in rows)+r'\hline\end{tabular}\end{center}'
# DATA ANALYTICS, ENSEMBLE
add('da-ensemble','1','Descriptive statistics, preparation and ANOVA',r'''
(i) $N=20$, $\sum x_i=1350$, $\bar x=67.5$, and the median is 63. Using the population denominator,
\[\sigma^2=\frac{\sum(x_i-67.5)^2}{20}=238.35,
\qquad \sigma=15.4386.\]
Pearson's second coefficient is $3(67.5-63)/15.4386=\boxed{0.8744}$, indicating positive skewness.

(ii) Combine quantity and unit price to create revenue: $\mathrm{revenue}=\mathrm{quantity}\times\mathrm{unit\ price}$. This gives a useful derived variable from two existing columns.

(iii) Test $H_0:\mu_A=\mu_B=\mu_C$ against at least one unequal mean. The group means are 3, 5 and 7; the grand mean is 5.
\[SS_B=4[(3-5)^2+(5-5)^2+(7-5)^2]=32,\quad SS_W=4+2+4=10.\]
'''+table(['Source','SS','df','MS','F'],[['Between','32','2','16','14.4'],['Within','10','9','1.1111',''],['Total','42','11','','']])+r'''Since $14.4>4.256$, reject $H_0$ at 5\%. Mean flavour ratings differ. The test alone does not identify which pairs differ.''')
add('da-ensemble','2','Box plot and Spearman correlation',r'''
(i) Sorted observations:
\[42,47,50,50,54,58,60,61,62,63,63,68,75,78,78,79,82,91,92,97.\]
The five-number summary is $\boxed{(42,56,63,78.5,97)}$.
Here $Q_1=(54+58)/2=56$, $Q_3=(78+79)/2=78.5$, and $IQR=22.5$.
The fences are $22.25$ and $112.25$, so there are no outliers.
'''+fig('box-source','.75')+r'''
(ii) Subsets support analysis of relevant cohorts, reduce computational load, and allow separate training and validation sets. Select them appropriately to avoid introducing bias.

(iii) The first two ranks agree. The other ten items have rank differences $\pm1$, so $\sum d_i^2=10$.
\[r_s=1-\frac{6(10)}{12(12^2-1)}=\boxed{0.9650}.\]
The interviewers have strong positive rank agreement.''')
add('da-ensemble','3','Two-sided normal test',r'''
Take the question's supplied known-standard-deviation model for kit accuracy measurements. $H_0:\mu=0.95$ and $H_1:\mu\ne0.95$.
\[z=\frac{0.947-0.95}{0.02/\sqrt{36}}=\boxed{-0.90}.\]
Since $|z|<1.96$, fail to reject $H_0$ at 5\%. These data do not provide sufficient evidence that the mean differs from 95\%. This does not prove the claimed mean. The two-sided $p$-value is about 0.368.''')
add('da-ensemble','4','Left-tailed normal test',r'''
Under the supplied model, $H_0:\mu=0.95$ and $H_1:\mu<0.95$.
\[z=\frac{0.93-0.95}{0.04/\sqrt{50}}=\boxed{-3.5355}.\]
Since $-3.5355<-1.645$, reject $H_0$. The evidence supports a mean accuracy below 95\% under this model ($p\approx0.000203$). The supplied standard deviation is treated as that of accuracy measurements, not inferred as a Bernoulli standard deviation from individual positive/negative results.''')
add('da-ensemble','5','Vaccination and disease: chi-square test',r'''
$H_0$: vaccination status and disease status are independent. $H_1$: they are associated. Compute each expected count as row total times column total divided by 2000.
'''+table(['Group','Attacked: observed / expected','Not attacked: observed / expected'],[['Vaccinated','31 / 54','469 / 446'],['Not vaccinated','185 / 162','1315 / 1338']])+r'''
\[\chi^2=\frac{23^2}{54}+\frac{23^2}{446}+\frac{23^2}{162}+\frac{23^2}{1338}
=\boxed{14.6432}.\]
There is one degree of freedom. Since $14.6432>3.841$, reject independence. The observed attack rates are $31/500=6.2\%$ and $185/1500=12.33\%$. Vaccination is associated with a lower attack rate in this sample; the table alone does not establish causation.''')
add('da-ensemble','6','Two-factor ANOVA with replication',r'''
There are $a=3$ varieties, $b=4$ fertilizers and $r=2$ replicates per cell. The grand mean is $8.6667$. Variety means are $(8.5,7.25,10.25)$ and fertilizer means are $(8.1667,9.5,6.1667,10.8333)$.
Use
\begin{align*}
SS_A&=br\sum_i(\bar y_{i..}-\bar y)^2,\quad
SS_B=ar\sum_j(\bar y_{.j.}-\bar y)^2,\\
SS_{AB}&=r\sum_{i,j}(\bar y_{ij.}-\bar y_{i..}-\bar y_{.j.}+\bar y)^2,\\
SS_E&=\sum_{i,j,k}(y_{ijk}-\bar y_{ij.})^2.
\end{align*}
'''+table(['Source','SS','df','MS','F'],[['Variety','36.3333','2','18.1667','36.3333'],['Fertilizer','71.3333','3','23.7778','47.5556'],['Interaction','3.6667','6','0.6111','1.2222'],['Error','6','12','0.5',''],['Total','117.3333','23','','']])+r'''
Reject equal variety means because $36.3333>3.885$. Reject equal fertilizer means because $47.5556>3.490$. Both factors have significant effects at 5\% under the supplied assumptions. The interaction is retained in the model; its statistic is shown for completeness. The residual error mean square, rather than the interaction mean square, is the denominator for these fixed-factor tests.''')
add('da-ensemble','7','Income binning',r'''
Range $=480-180=300$, so three equal-width bins have width 100.
'''+table(['Method','Bin 1','Bin 2','Bin 3'],[['Equal width','[180,280): 8','[280,380): 2','[380,480]: 2'],['Equal frequency','180,200,210,215','220,230,250,270','300,320,400,480']])+r'''
Equal-frequency bins contain four observations each. Valid boundaries are 180, 217.5, 285 and 480. The equal-width histogram directly exposes the concentration at lower incomes and the right tail. Equal frequency is useful when balanced bin counts matter, but equal-height bars would conceal the different bin widths. For unequal-width histogram bins, plot count divided by width so area represents count.
'''+fig('bins-income'))
add('da-ensemble','8','Cholesterol binning',r'''
Range $=260-145=115$, so width $=115/3=38.3333$.
'''+table(['Method','Bin 1','Bin 2','Bin 3'],[['Equal width','[145,183.333): 7','[183.333,221.667): 3','[221.667,260]: 2'],['Equal frequency','145,155,160,162','165,172,180,190','200,220,240,260']])+r'''
For equal frequency, use boundaries 145, 163.5, 195 and 260. Equal width better displays the declining concentration across these data and the upper tail. Equal frequency gives balanced groups but requires density heights to make its unequal-width histogram meaningful.
'''+fig('bins-cholesterol'))
# DATA ANALYTICS, ORIGINAL
add('da-original','1A','Mean, spread and skewness',r'''
$\bar x=48/6=8$, median $=(6+8)/2=7$. The sum of squared deviations is
$16+4+4+0+4+36=64$.
\[\sigma=\sqrt{64/6}=3.2660,\qquad \mathrm{Sk}=\frac{3(8-7)}{3.2660}=\boxed{0.9186}.\]
The positive value indicates right skewness.''')
add('da-original','1B','Five-number summary and outlier',r'''
The median is 9. Excluding it gives lower half $(3,5,7,8)$ and upper half $(11,13,16,30)$.
Thus $Q_1=6$, $Q_3=14.5$, and the five-number summary is $\boxed{(3,6,9,14.5,30)}$.
$IQR=8.5$; the fences are $-6.75$ and $27.25$. Therefore 30 is an outlier. The modified box plot has whiskers at 3 and 16, with 30 plotted separately.
'''+fig('box-original','.75'))
add('da-original','1C','Missing and inconsistent data',r'''
Impute missing ages with the median of a relevant, sufficiently large customer group and retain a missingness flag. Estimate imputation values from training data only if building a predictive model. Flag rows where annual income differs materially from $12\times$ monthly income after aligning currency, units, gross/net definitions and time period. Investigate such rows rather than automatically overwriting them.''')
add('da-original','2A','Filling-machine mean test',r'''
$H_0:\mu=500$ ml, $H_1:\mu\ne500$ ml. The standard error is $12/\sqrt{36}=2$ ml.
\[z=\frac{496-500}{2}=\boxed{-2.00}.\]
Since $|-2|>1.96$, reject $H_0$ at 5\%. There is evidence that the machine's mean fill differs from 500 ml; the sample suggests underfilling. The two-sided $p$-value is about 0.0455.''')
add('da-original','2B','Rank correlation',r'''
The six rank differences are $(-1,1,-1,1,-1,1)$, giving $\sum d_i^2=6$.
\[r_s=1-\frac{6(6)}{6(6^2-1)}=\boxed{\frac{29}{35}=0.8286}.\]
There is strong positive rank agreement, although each adjacent pair is reversed.''')
add('da-original','2C','Equal-frequency smoothing',table(['Bin','Observations','Mean'],[['1','10,12,15,18','55/4 = 13.75'],['2','20,22,25,28','95/4 = 23.75'],['3','30,32,35,40','137/4 = 34.25']])+r'''The smoothed sequence is four copies of 13.75, followed by four copies of 23.75 and four copies of 34.25.''')
add('da-original','3A','Training and passing',r'''
$H_0$: training and passing are independent. Row totals are 60 and 40; column totals are 70 and 30. Expected counts are
\[E=\begin{pmatrix}42&18\\28&12\end{pmatrix}.\]
\[\chi^2=\frac{(48-42)^2}{42}+\frac{(12-18)^2}{18}
+\frac{(22-28)^2}{28}+\frac{(18-12)^2}{12}
=\boxed{7.1429}.\]
With one degree of freedom, $7.1429>3.841$, so reject independence. Training and passing are associated. The pass rates are 80\% and 55\%; causation requires an appropriate study design.''')
add('da-original','3B','One-way ANOVA',table(['Source','SS','df','MS','F'],[['Between','54','2','27','27'],['Within','6','6','1',''],['Total','60','8','','']])+r'''Test $H_0:\mu_A=\mu_B=\mu_C$. Since $F=27>5.143$, reject $H_0$ at 5\%. At least one population mean differs. Pairwise differences require further testing.''')
add('da-original','3C','Type I and Type II errors',r'''
A Type I error is rejecting $\mu=500$ when the machine's true mean is 500 ml. A Type II error is failing to reject $\mu=500$ when the true mean differs from 500 ml. The 5\% significance level controls the Type I error probability under the test assumptions; it does not specify the Type II probability.''')
# DATA STRUCTURES, ENSEMBLE
add('ds-ensemble','1','Nested employee structure',r'''The outer structure stores employee details and the nested Date stores joining date. This program assumes a valid calendar date and a one-word name of at most 39 characters. The input-conversion count is checked.'''+code('ds-ensemble-1.c'))
add('ds-ensemble','2','Dynamic matrix and pointer arithmetic',r'''A pointer to an array of three doubles provides contiguous dynamic storage for the three subjects. The expression $*(*(marks+i)+j)$ accesses one mark using pointer arithmetic. Time is $O(n)$ for three subjects and storage is $O(n)$.'''+code('ds-ensemble-2.c'))
add('ds-ensemble','3','Dynamic string array and concatenation',r'''Allocate two fixed-capacity rows dynamically, then allocate the exact combined length plus one byte for the null terminator. The pointer dst advances through the result as each character is copied. Inputs must each fit in 99 characters before their newline.'''+code('ds-ensemble-3.c'))
add('ds-ensemble','4','Playlist insertion and deletion',r'''Append preserves insertion order. A pointer to the current link permits deletion of the head and consecutive short songs without a separate head special case. Deletion and display take $O(n)$ time; this simple append scans to the tail and takes $O(n)$ per insertion. Enter 180 in the demonstration to retain only Evening.'''+code('ds-ensemble-4.c'))
add('ds-ensemble','5','Recent contacts and traversal',r'''Insert at the head in $O(1)$ time. Forward and reverse printing take $O(n)$ time. The recursive reverse printer uses $O(n)$ call-stack space and does not change the list. Each call adds a contact record; moving an already present contact would additionally require locating and unlinking its previous node.'''+code('ds-ensemble-5.c'))
add('ds-ensemble','6','Undo and redo using two stacks',r'''The most recent action must be reversed first, so both histories use LIFO order. This implementation stores complete document snapshots. Before an edit, push the current state on undo and clear redo. Undo pushes the current state on redo and restores the top undo snapshot. Redo performs the reverse transfer. It rejects an operation if the required stack is empty or full.'''+code('ds-ensemble-6.c')+r'''For edit(``A''), edit(``AB''), undo(), redo(), the document states are A, AB, A, AB. An edit after undo discards the abandoned redo branch. Snapshot operations take $O(L)$ time per document of length $L$; an operation-based editor can store inverse edits instead.''')
add('ds-ensemble','7','Infix to postfix with precedence functions',r'''Pop while in-stack precedence is at least incoming precedence. Giving incoming exponentiation precedence 6 and in-stack exponentiation precedence 5 keeps equal exponentiation operators on the stack, producing right associativity. Equal-precedence addition, subtraction, multiplication and division pop, producing left associativity. This C99 implementation handles valid expressions with single-character operands and optional parentheses.'''+code('ds-ensemble-7.c')+r'''For \texttt{A\^{}B\^{}C}, the output is \texttt{ABC\^{}\^{}}. For \texttt{A-B-C}, it is \texttt{AB-C-}. Each token is pushed and popped at most once, so time and auxiliary space are $O(n)$.''')
add('ds-ensemble','8','Duplicate parentheses',r'''Here duplicate means a redundant pair enclosing no operator at its own nesting level, including an extra wrapper around a parenthesized expression. The input is assumed syntactically valid and balanced. Pop a closed group, check whether an operator occurred, and reduce a useful group to one operand marker. Time and stack space are $O(n)$.'''+code('ds-ensemble-8.c')+r'''Examples: \texttt{((a+b))} returns true; \texttt{(a+b)} returns false; \texttt{(a)} returns true under the stated convention.''')
add('ds-ensemble','9','Activation records and LIFO',r'''Calls push frames in this order: main, fun2, fun1. Returns remove frames in the reverse order: fun1, fun2, main. The output is:
\begin{verbatim}
Inside fun1
Inside fun2
Inside main
\end{verbatim}
A frame holds the return address, parameters, local variables and saved execution state as required by the calling convention. A queue would remove the oldest caller first, although that caller is suspended awaiting its callee, so it does not represent normal nested call/return order.''')
# DATA STRUCTURES, ORIGINAL
add('ds-original','1A','Student with nested admission date',r'''Date is a value embedded in Student. The function returns 0 on invalid input conversion and 1 after successful display. The question's one-word name convention permits a width-limited \texttt{\%39s} conversion.'''+code('ds-original-1a.c'))
add('ds-original','1B','Contiguous dynamic matrix',code('ds-original-1b.c')+r'''Rows are adjacent in memory, so row i starts at offset $ic$ and column j adds j. Allocation requests $rc\,\mathrm{sizeof(int)}$ bytes. A non-null result must be initialized before its elements are read and released with free when no longer needed.''')
add('ds-original','1C','Dangling pointer and memory leak',r'''
A dangling pointer refers to storage whose lifetime has ended:
\begin{verbatim}
int *p = malloc(sizeof *p);
free(p);       /* p now dangles; do not dereference it. */
p = NULL;      /* Clear this pointer after releasing storage. */
\end{verbatim}
Any aliases must also stop using that storage. A memory leak loses the final reference to allocated storage:
\begin{verbatim}
int *p = malloc(sizeof *p);
p = NULL;      /* Wrong: allocated storage can no longer be freed. */
\end{verbatim}
Keep an owning pointer and free the allocation before overwriting that final reference. These examples illustrate errors; they are not code to copy into a working implementation.''')
add('ds-original','2A','Delete all matching nodes',r'''The pointer link always addresses the pointer that leads to the current node. On deletion, update that pointer and keep link in place so the next node is checked. On retention, advance to the next link. This covers head, consecutive and all-node matches, and releases each removed allocation. Time is $O(n)$; auxiliary space is $O(1)$. The following shared listing also contains the reversal for 2B.'''+code('ds-original-2ab.c'))
add('ds-original','2B','Reverse a singly linked list',r'''Use the reverse function in the listing for 2A. Save the original successor before changing cur's next pointer; move prev and cur forward. The loop invariant is that prev heads the reversed processed prefix and cur heads the untouched suffix. At termination, prev is the new head. Assign \texttt{head = reverse(head)}. Empty and one-node lists work unchanged. Time is $O(n)$ and auxiliary space is $O(1)$.''')
add('ds-original','2C','List trace',r'''
\[
10\to20\to30
\quad\longrightarrow\quad5\to10\to20\to30
\]
\[
\longrightarrow\quad5\to10\to20\to25\to30
\quad\longrightarrow\quad\boxed{5\to10\to20\to25}.
\]
Starting at the final head, follow three next links to reach tail 25. Checking that the tail's next pointer is NULL does not traverse another node-to-node link.''')
add('ds-original','3A','Stack trace for infix conversion',r'''The stack is listed bottom to top. Exponentiation is right-associative, so the second exponentiation does not pop the first.'''+table(['Token','Operator stack','Output'],[['A','empty','A'],['+','+','A'],['B','+','AB'],['*','+ *','AB'],['(','+ * (','AB'],['C','+ * (','ABC'],['-','+ * ( -','ABC'],['D','+ * ( -','ABCD'],[')','+ *','ABCD-'],[r'$\wedge$',r'$+\ *\ \wedge$','ABCD-'],['E',r'$+\ *\ \wedge$','ABCD-E'],[r'$\wedge$',r'$+\ *\ \wedge\ \wedge$','ABCD-E'],['F',r'$+\ *\ \wedge\ \wedge$','ABCD-EF'],['End','empty',r'\texttt{ABCD-EF\^{}\^{}*+}']])+r'''Thus the final postfix form is \boxed{\texttt{ABCD-EF\^{}\^{}*+}}. The two exponentiations encode $(C-D)^{(E^F)}$.''')
add('ds-original','3B','Balanced brackets',r'''Push each opening bracket. For a closing bracket, require a nonempty stack and matching opening type. Accept only if the stack is empty at the end. Time is $O(n)$; the fixed array uses capacity 100, as permitted by the question.'''+code('ds-original-3b.c'))
add('ds-original','3C','Undo/redo trace',table(['Operation','Undo: bottom to top','Redo: bottom to top'],[['Edits A, B, C','A, B, C','empty'],['Undo','A, B','C'],['Undo','A','C, B'],['Redo','A, B','C'],['New edit D','A, B, D','empty']])+r'''Undo transfers the newest applied action to redo; redo reapplies its newest undone action. New edit D clears redo, since C belongs to the abandoned editing branch.''')
# NETWORKS, ENSEMBLE
modulation=r'''
ASK changes carrier amplitude, FSK changes carrier frequency, and PSK changes carrier phase. Binary FSK commonly uses two separated frequencies and needs more bandwidth than binary PSK under comparable simple pulse shaping. ASK and BPSK can have comparable nominal bandwidth for the same bit rate and shaping; exact occupied bandwidth depends on the implementation. ASK is directly vulnerable to amplitude disturbances. Constant-envelope FSK and PSK are less affected by such disturbances, although phase/frequency noise and receiver synchronization still matter.

For a coherent receiver in an approximately additive-noise, bandwidth-limited telephone channel, BPSK is a defensible choice: it uses antipodal signals, offers good bit-error performance at a given energy per bit, and avoids the tone separation of binary FSK. A noncoherent, very simple receiver could instead favor FSK. The noise model and implementation must be stated rather than claiming one scheme is always best.'''
add('dccn-ensemble','1','ASK, FSK and PSK',modulation)
add('dccn-ensemble','2','Data rate and bandwidth',r'''
Data rate is information bits transmitted per second. Here bandwidth means the span from the lowest to highest retained frequency. The three frequencies are 2, 6 and 10 MHz.
\[R_b=2f_0=2(2\ \mathrm{MHz})=\boxed{4\ \mathrm{Mbps}},\quad
B=10-2=\boxed{8\ \mathrm{MHz}}.\]
After tripling all frequencies, the components are 6, 18 and 30 MHz:
\[R_b'=\boxed{12\ \mathrm{Mbps}},\qquad B'=\boxed{24\ \mathrm{MHz}}.\]
For this fixed waveform model, both increase by a factor of three. A greater usable channel bandwidth permits faster signal changes, but achievable reliable data rate also depends on noise, signal levels and coding. The two-bits-per-cycle assumption is essential; it is not inferred from a sinusoid alone.''')
add('dccn-ensemble','3','Differential Manchester and AMI',r'''
Start at a negative level. For differential Manchester, a 0 causes a transition at the start of its bit, a 1 does not, and every bit has a mid-bit transition. For AMI, zeros have zero level and successive ones alternate positive and negative, starting positive because the prior nonzero pulse was negative. The diagram labels each bit boundary.
'''+fig('line-source-3'))
add('dccn-ensemble','4','Manchester and AMI',r'''
Use low-to-high for Manchester 1 and high-to-low for Manchester 0. AMI ones alternate polarity, with the first one positive; zeros are at zero level.
'''+fig('line-source-4'))
add('dccn-ensemble','5','Header fraction',r'''
There are $nh$ header bytes and $M+nh$ total bytes. Therefore
\[\boxed{\text{header fraction}=\frac{nh}{M+nh}}.\]
The useful-payload fraction is $M/(M+nh)$. This assumes exactly the n header additions described, without trailers or fragmentation.''')
add('dccn-ensemble','6','Hub, switch and router',r'''
The hub repeats the Sales signal out its other ports without inspecting a destination address. HR and the attached switch therefore see it. The switch learns the source MAC address on the ingress port and forwards the frame only to the known IT destination port. If that MAC is unknown, it floods within the VLAN except back to the ingress port. A destination learned on the ingress port is filtered.

If Sales and IT are in the same IP subnet and VLAN, their local traffic need not pass through the Internet router. If they are in different subnets/VLANs, the sender uses its default gateway and the router must route between those networks. A router forwards according to destination IP and installs a new link-layer header on the outgoing link. Merely being connected to the Internet does not make it part of every local transfer.''')
add('dccn-ensemble','7','CRC encoding',r'''
The generator 11011 has degree 4, so append four zeros to the data. Successive nontrivial XOR steps on the 14-bit working dividend are:
\begin{verbatim}
10100011010000  initial dividend
01111011010000
00010111010000
00001100010000
00000001110000
00000000011100
00000000000111
\end{verbatim}
The final four bits are $\boxed{0111}$. The transmitted codeword is $\boxed{10100011010111}$. Dividing that codeword by 11011 gives zero remainder. The XOR steps align the generator with the current leftmost 1 and never use carries or borrows.''')
add('dccn-ensemble','8','ARQ retransmission counts',r'''
Initially frames 0, 1 and 2 are transmitted, with frame 1 lost.
'''+table(['Protocol','Receiver handling of 2','Retransmitted','Total sends','Useful/total'],[['Go-back-N','Discard','1, 2','5','3/5 = 0.60'],['Selective repeat','Buffer','1','4','3/4 = 0.75']])+r'''Go-back-N has already accepted frame 0; on timeout it resends the outstanding suffix 1 and 2. Selective repeat acknowledges and buffers frame 2, then needs only frame 1 before delivering 1 and 2 in order. Counts use the clarified three-frame scenario printed in this paper, not the older ambiguous repeated-loss wording.''')
add('dccn-ensemble','9','Propagation-limited stop-and-wait time',r'''
Number of frames $=10^6/2000=500$.
\[t_p=\frac{5000\times10^3}{2\times10^8}=0.025\ \mathrm{s},\quad
RTT=0.05\ \mathrm{s}.\]
Counting one complete round trip for each frame, including the final ACK, gives
\[T=500(0.05)=\boxed{25\ \mathrm{s}}.\]
Transmission, ACK serialization and processing times are neglected as requested.''')
add('dccn-ensemble','10','Collision-detection frame length',r'''
\[t_p=\frac{1500}{3\times10^8}=5\ \mu\mathrm{s},\qquad
L_{\min}=R(2t_p)=10^8(10\times10^{-6})=\boxed{1000\ \mathrm{bits}}.\]
This is 125 bytes under the question's propagation-only model. The sender must still be transmitting when a far-end collision can propagate back.''')
# NETWORKS, ORIGINAL
add('dccn-original','1A','Nyquist and Shannon limits',r'''
For $B=3000$ Hz and $L=4$ levels,
\[R_N=2B\log_2L=2(3000)(2)=\boxed{12000\ \mathrm{bps}}.\]
For linear $S/N=31$,
\[C=B\log_2(1+S/N)=3000\log_2(32)=\boxed{15000\ \mathrm{bps}}.\]
Under the stated four-level ideal model, 12 kbps is the tighter bound. The Nyquist result constrains this level-limited signaling choice; Shannon's capacity bounds reliable communication over the specified noisy channel even with optimal coding.''')
add('dccn-original','1B','Modulation comparison',modulation)
add('dccn-original','1C','Header overhead',r'''
Header bytes $=5(20)=100$. Total bytes $=900+100=\boxed{1000}$.
Header percentage $=100/1000\times100=\boxed{10\%}$. Payload efficiency is 90\%.''')
add('dccn-original','2A','CRC division and receiver check',r'''
Append four zeros because the generator 10011 has degree four. The aligned XOR working dividends are:
\begin{verbatim}
11010110110000  initial dividend
01001110110000
00000010110000
00000000101000
00000000001110
\end{verbatim}
The remainder is $\boxed{1110}$ and the transmitted codeword is $\boxed{11010110111110}$. The receiver divides the whole received codeword by 10011. A zero remainder means no error was detected; it does not guarantee that no undetectable error occurred.''')
add('dccn-original','2B','Manchester and AMI waveforms',r'''Manchester half-bit pairs are $(-,+),(+,-),(-,+),(-,+),(+,-),(+,-),(-,+),(+,-)$. AMI levels are $+,0,-,+,0,0,-,0$. These use the conventions printed in the question.'''+fig('line-original'))
add('dccn-original','2C','Hub and learning switch',r'''A hub repeats the incoming physical signal on every other port. A learning switch records source MAC to ingress-port mappings. For a known destination on a different port, it forwards only there; for a known destination on the incoming port, it filters the frame. For an unknown destination it floods on other forwarding ports in the same VLAN. Broadcasts are also flooded within that VLAN.''')
add('dccn-original','3A','Stop-and-wait throughput',r'''
Frame length $L=1000(8)=8000$ bits. Serialization time:
\[t_t=8000/10^6=\boxed{8\ \mathrm{ms}}.\]
Cycle time from starting a frame until its ACK returns:
\[t_{cycle}=t_t+2t_p=8+20=\boxed{28\ \mathrm{ms}}.\]
\[U=\frac8{28}=\boxed{0.285714},\qquad
\mathrm{throughput}=\frac{8000}{0.028}=\boxed{285714.3\ \mathrm{bps}}.\]
Thus utilization is 28.57\% and useful throughput is approximately 285.7 kbps. There are no headers or losses in this calculation.''')
add('dccn-original','3B','Selective repeat versus go-back-N',r'''
Selective repeat accepts frame 0 and buffers frames 2 and 3 while waiting for 1. Only frame 1 remains unacknowledged and is retransmitted. After it arrives, the receiver delivers 1, 2 and 3, giving overall delivery order $0,1,2,3$. There are five data transmissions in total.

Go-back-N accepts 0, discards 2 and 3, and uses cumulative acknowledgements. After frame 1 times out, it retransmits the outstanding suffix 1, 2 and 3. There are seven data transmissions in total and the same final delivery order.''')
add('dccn-original','3C','Minimum collision-detection frame',r'''
\[L_{\min}=R(2t_p)=100\times10^6\times10\times10^{-6}
=\boxed{1000\ \mathrm{bits}=125\ \mathrm{bytes}}.\]
This is the propagation-only lower bound for the hypothetical link in the question.''')
# DIGITAL SYSTEMS, COMMON HELPERS
mux=r'''With A and B as select bits (A most significant), $AB=00,01,10,11$ produces $C,\bar C,\bar C,C$, respectively. Thus $\boxed{I_0=C,\ I_1=\bar C,\ I_2=\bar C,\ I_3=C}$. One inverter supplies both complemented-C inputs.'''+fig('mux','.65')
comparison3=r'''Define $e_i=a_i\operatorname{XNOR}b_i$. The most significant unequal bit decides the ordering:
\begin{align*}
G&=a_2\bar b_2+e_2a_1\bar b_1+e_2e_1a_0\bar b_0,\\
E_q&=e_2e_1e_0,\\
L&=\bar a_2b_2+e_2\bar a_1b_1+e_2e_1\bar a_0b_0.
\end{align*}
Generate each $e_i$ with an XNOR gate and each complemented input with NOT. The following AND-OR network implements G. Implement L with the same network after exchanging a and b. A three-input AND of the XNOR outputs implements $E_q$. These three networks together form the comparator.'''+fig('comparator3')
add('dsco-ensemble','1','Five-bit signed arithmetic',r'''The representable interval is $[-16,15]$. Discard a carry beyond the fifth bit, but assess overflow using signed operands and result.'''+table(['Operation','Operand encodings','5-bit result','Signed result','Overflow'],[['9+12','01001 + 01100','10101','-11','Yes'],['-8+(-9)','11000 + 10111','01111','15','Yes'],['10-(-5)','01010 + 00101','01111','15','No']])+r'''The true results 21 and -17 lie outside the representable interval. In the third case, $-5$ is 11011 and its negation is 00101, giving the representable result 15.''')
add('dsco-ensemble','2','POS minimization and NOR implementation',r'''Use a K-map with rows AB and columns CD in Gray order 00, 01, 11, 10. X denotes a don't-care.'''+table(['AB / CD','00','01','11','10'],[['00','0','1','0','X'],['01','1','0','1','0'],['11','1','X','1','X'],['10','0','1','1','0']])+r'''
Group zeros with useful don't-cares: $\{0,2,8,10\}$, $\{2,6,10,14\}$, $\{2,3\}$ and $\{5,13\}$. These give
\[\boxed{F=(B+D)(\bar C+D)(A+B+\bar C)(\bar B+C+\bar D)}.\]
Each first-level NOR gives the complement of one sum. A final NOR of those four outputs produces their uncomplemented product by De Morgan's law. Generate $\bar B,\bar C,\bar D$ with tied-input NOR gates: $\bar X=\operatorname{NOR}(X,X)$.
'''+fig('nor-source'))
add('dsco-ensemble','3','Three-bit magnitude comparator',comparison3)
add('dsco-ensemble','4','Three-input XOR using a multiplexer',mux)
add('dsco-ensemble','5','PLA product terms and output connections',r'''
(i) The four terms containing A cover both B and C values, so
\[F=A+\bar A BC=A+BC.\]
A two-product PLA uses $P_1=A$, $P_2=BC$, with both connected to output F.

(ii) Use four shared product lines:
'''+table(['Product','A literal','B literal','C literal','Connect to'],[[r'$P_1=\bar AB$','0','1','-','$F_1$'],[r'$P_2=B\bar C$','-','1','0','$F_1$'],[r'$P_3=A\bar B$','1','0','-','$F_2$'],[r'$P_4=\bar AC$','0','-','1','$F_2$']])+r'''
Here 1 means the true input, 0 the complemented input, and - no connection. The AND-plane product lines feed the OR plane as follows:
\[\begin{array}{ccc}
(A,BC)&\xrightarrow{\text{OR}}&F\\
(P_1,P_2)&\xrightarrow{\text{OR}}&F_1\\
(P_3,P_4)&\xrightarrow{\text{OR}}&F_2.
\end{array}\]
The literal table is the PLA connection diagram: each selected literal is connected into its product-line AND gate, and each named product is connected into the corresponding output OR gate.''')
add('dsco-ensemble','6','Enabled synchronous up/down counter',r'''Let A be the most significant state bit and B the least significant. The state table is:'''+table(['Present AB','E=0, either F','E=1,F=1','E=1,F=0'],[['00','00','01','11'],['01','01','10','00'],['10','10','11','01'],['11','11','00','10']])+r'''
A JK flip-flop toggles when $J=K=1$ and holds when $J=K=0$. B toggles whenever enabled. A toggles on an upward carry (B=1,F=1) or downward borrow (B=0,F=0).
\[\boxed{J_B=K_B=E},\qquad
\boxed{J_A=K_A=E(BF+\bar B\bar F)}.\]
Equivalently, the second excitation is E AND (B XNOR F). Connect both flip-flops to the same active clock edge and use the following excitation network.
'''+fig('jk-updown'))
add('dsco-ensemble','7','Three-bit synchronous T counter',r'''
For $q_2q_1q_0$, the least significant bit toggles every clock; bit 1 toggles when $q_0=1$; bit 2 toggles when $q_1q_0=11$.
\[\boxed{T_0=1,\quad T_1=q_0,\quad T_2=q_1q_0}.\]
All three T flip-flops use the same clock. Feed $q_1,q_0$ through an AND gate to $T_2$. The sequence is $000,001,010,011,100,101,110,111,000$.
'''+fig('counter3'))
add('dsco-ensemble','8','Four-bit asynchronous ripple counter',r'''Use four falling-edge-triggered JK flip-flops with J=K=1. Apply the external clock to stage 0 and connect each stage's Q to the next stage's clock, as shown. Clear all stages to 0 before counting.'''+fig('ripple')+r'''The output $q_3q_2q_1q_0$ counts 0000 through 1111 and repeats. Output frequencies are $f/2,f/4,f/8,f/16$. Since changes propagate stage by stage, transitions such as 0111 to 1000 pass through intermediate states. Decoding before the ripple settles can produce glitches. The falling-edge convention is necessary for this Q-to-clock up-counter connection.''')
add('dsco-ensemble','9','Eight-bit ring counter',r'''The question leaves reset details open; choose an active-high synchronous reset to load a single 1. This makes the initial state deterministic. Each clock rotates left, including the wrap from bit 7 to bit 0.'''+code('ring8.v')+r'''The cycle is 00000001, 00000010, 00000100, 00001000, 00010000, 00100000, 01000000, 10000000, then 00000001. Reset must be asserted to enter this one-hot cycle; an all-zero state would otherwise remain zero.''')
add('dsco-ensemble','10','Byte and word addressing',r'''A memory address identifies an addressable unit of storage. An ISA defines how effective addresses are formed and how load/store instructions interpret them. In byte addressing, consecutive addresses select consecutive bytes. A 32-bit word therefore spans four byte addresses, and consecutive aligned words differ by 4. In word addressing, consecutive addresses select entire words, so consecutive words differ by 1. For $2^a$ addressable units, capacity is $2^a$ bytes in the byte-addressed case and $2^a w$ bytes for w-byte word addressing. Word size and address width are separate concepts.''')
# DIGITAL SYSTEMS, ORIGINAL
add('dsco-original','1A','K-map and NAND-only circuit',table(['AB / CD','00','01','11','10'],[['00','1','0','0','1'],['01','0','1','1','0'],['11','0','1','1','0'],['10','1','0','0','1']])+r'''
Group $\{0,2,8,10\}$ to obtain $\bar B\bar D$, and $\{5,7,13,15\}$ to obtain $BD$. A and C disappear:
\[\boxed{F=\bar B\bar D+BD=B\operatorname{XNOR}D}.\]
Use $\bar B=\operatorname{NAND}(B,B)$ and $\bar D=\operatorname{NAND}(D,D)$, followed by
$u=\operatorname{NAND}(B,D)$, $v=\operatorname{NAND}(\bar B,\bar D)$ and $F=\operatorname{NAND}(u,v)$. This is a five-NAND realization including the two inverters.
'''+fig('nand-xnor'))
add('dsco-original','1B','Signed results and overflow',table(['Operation','Binary addition','Result','Interpretation','Overflow'],[['11+7','01011 + 00111','10010','-14','Yes'],['-9+5','10111 + 00101','11100','-4','No'],['6-13','00110 + 10011','11001','-7','No']])+r'''Only the true result 18 is outside $[-16,15]$. For subtraction, 13 is 01101 and its two's-complement negative is 10011. A carry out by itself is not the signed-overflow flag.''')
add('dsco-original','1C','MUX realization',mux)
add('dsco-original','2A','Enabled two-bit synchronous counter',table(['Present $q_1q_0$','Next when E=0','Next when E=1'],[['00','00','01'],['01','01','10'],['10','10','11'],['11','11','00']])+r'''
Use the T excitation equation $T_i=q_i\oplus q_i^+$. The low bit toggles exactly when E=1; the high bit toggles exactly when E=1 and the current low bit is 1.
\[\boxed{T_0=E,\qquad T_1=Eq_0}.\]
Feed E directly to $T_0$ and an AND of E and $q_0$ to $T_1$. The clock is common.
'''+fig('counter2'))
add('dsco-original','2B','Four-bit ring counter',code('ring4.v')+r'''On a positive clock edge with reset high, q becomes 0001. With reset low, successive states are 0010, 0100, 1000 and 0001. Concatenation moves bits 2:0 upward and puts old bit 3 into bit 0. Nonblocking assignments model sequential storage.''')
add('dsco-original','2C','Ripple delay and decoded glitches',r'''A ripple counter clocks stage 0 from the external clock and later stages from preceding flip-flop outputs. Propagation delays accumulate, so several output bits do not change simultaneously. During a transition such as 0111 to 1000, a decoder may briefly recognize an intermediate pattern. A synchronous counter drives all flip-flops from one shared clock and computes excitation logic from the old state. It avoids stage-by-stage clock ripple, although real output skew and combinational delays still require proper timing design.''')
add('dsco-original','3A','Two-bit magnitude comparator',r'''
Let $e_i=a_i\operatorname{XNOR}b_i$. Then
\[\boxed{G=a_1\bar b_1+e_1a_0\bar b_0},\qquad
\boxed{E_q=e_1e_0},\qquad
\boxed{L=\bar a_1b_1+e_1\bar a_0b_0}.\]
The upper bit decides unless equal; only then does the lower bit decide. Use XNOR gates for $e_1,e_0$, inverters for complements, AND gates for product terms and OR gates to combine them. The figure gives the G network. Swap a and b for L, and AND the two XNOR outputs for $E_q$.
'''+fig('comparator2')+r'''For A=10 and B=01, $e_1=0$, $a_1\bar b_1=1$, so $\boxed{G=1,E_q=0,L=0}$.''')
add('dsco-original','3B','Memory capacity and addresses',r'''
4 KiB $=4096$ bytes. Each 32-bit word occupies 4 bytes:
\[\text{words}=4096/4=\boxed{1024},\qquad
\text{byte-select bits}=\log_2(4096)=\boxed{12}.\]
The word at 0x1000 occupies 0x1000, 0x1001, 0x1002 and 0x1003. The next word starts at 0x1004. The 12 bits select an offset within the 4 KiB block; the full system may use more address bits to place that block at base 0x1000. Endianness changes byte significance, not these occupied addresses.''')
add('dsco-original','3C','Memory read and write',r'''
For a read: place the target address in MAR, assert the read control signal, wait until the memory interface indicates valid data, and latch the returned value into MDR. Transfer MDR to the destination register as required.

For a write: place the target address in MAR and outgoing data in MDR, assert write with the required timing, and wait for completion. Read moves data from memory to MDR; write moves data from MDR to memory. MAR selects the location in both cases.''')
# DISCRETE MATHEMATICS, ENSEMBLE
add('dms-ensemble','1','Divisibility poset and antichains',r'''
The cover relations are $(1,2),(1,3),(2,12),(2,18),(3,12),(3,18),(12,36),(18,36)$. They determine the Hasse diagram below; line crossings without a labelled vertex are not additional elements.
'''+fig('hasse-ensemble','.48')+r'''
This poset is \textbf{not a lattice}. The common upper bounds of 2 and 3 are 12, 18 and 36. The two minimal common upper bounds 12 and 18 are incomparable, so there is no least upper bound. Equivalently, 12 and 18 have no greatest lower bound in the set: 2 and 3 are incomparable maximal common lower bounds. It is not valid to import gcd 6 into the set, since 6 is absent.

The complete list of antichains with more than one element is $\boxed{\{2,3\},\ \{12,18\}}$. Every other distinct pair is comparable, so there are no larger antichains.''')
add('dms-ensemble','2','Unique complements and Boolean identities',r'''
(i) Suppose b and c are both complements of a. Then
\[
b=b\land1=b\land(a\lor c)=(b\land a)\lor(b\land c)=b\land c.
\]
Similarly $c=c\land(a\lor b)=c\land b$. Hence $b=c$, proving uniqueness.

(ii) Distributivity, complement and identity laws give
\[
a\lor(\neg a\land b)=(a\lor\neg a)\land(a\lor b)
=1\land(a\lor b)=a\lor b.
\]
The dual calculation is
\[
a\land(\neg a\lor b)=(a\land\neg a)\lor(a\land b)
=0\lor(a\land b)=a\land b.
\]''')
add('dms-ensemble','3','DNF and CNF',r'''
Use variable order $(x_1,x_2,x_3)$. Evaluating the supplied expression gives 1 on binary rows 010, 100, 101 and 111, and 0 on rows 000, 001, 011 and 110. Therefore
\[E=\Sigma m(2,4,5,7)=\Pi M(0,1,3,6).\]
A canonical DNF is
\begin{align*}
E={}&(\neg x_1\land x_2\land\neg x_3)
\lor(x_1\land\neg x_2\land\neg x_3)\\
&\lor(x_1\land\neg x_2\land x_3)
\lor(x_1\land x_2\land x_3).
\end{align*}
A canonical CNF is
\begin{align*}
E={}&(x_1\lor x_2\lor x_3)
\land(x_1\lor x_2\lor\neg x_3)\\
&\land(x_1\lor\neg x_2\lor\neg x_3)
\land(\neg x_1\lor\neg x_2\lor x_3).
\end{align*}
The expression in the question is itself a noncanonical DNF. The displayed canonical forms specify every variable in each term or clause.''')
add('dms-ensemble','4','Bounded item selection',r'''
Let $u=A-1$, $v=B-3$, $w=C-5$. Then $u+v+w=6$, with $0\le u\le3$, $0\le v\le4$, $0\le w\le5$. The unrestricted nonnegative count is $\binom82=28$.

Subtract violations: $u\ge4$ contributes $\binom42=6$, $v\ge5$ contributes $\binom32=3$, and $w\ge6$ contributes $\binom22=1$. Intersections are impossible because their minimum sums exceed 6. Thus
\[\boxed{28-6-3-1=18}.\]
Items of the same type are indistinguishable, so this counts feasible triples of quantities, not arrangements.''')
add('dms-ensemble','5','Partition bijection',r'''
For positive n, let $\lambda$ be a partition of n with every part at least 3. In its Ferrers diagram, the first three columns have the same height k. Its conjugate partition $\mu=\lambda'$ therefore satisfies $\mu_1=\mu_2=\mu_3=k$.

Define a new partition
\[\nu=(\mu_1+2,\mu_2+1,\mu_3,\mu_4,\ldots).
\]
Its total is $n+3$, and its three largest parts are $k+2,k+1,k$, which are consecutive.

Conversely, if a partition of $n+3$ has largest parts $k+2,k+1,k$, subtract 2 from the first part and 1 from the second. The resulting partition has three equal largest parts k and total n. Conjugating it gives a partition of n in which every row has at least three cells, hence every part is at least 3. These constructions undo each other, proving the claimed equality. For n=1 or 2, both sets are empty.''')
add('dms-ensemble','6','The 75th Fike permutation',r'''
Use the original descending-exchange Fike convention, with the original arrangement 01234 counted as permutation 1. Enumerate $(d_2,d_3,d_4,d_5)$ with $d_k=k,k-1,\ldots,1$, and $d_5$ varying fastest. For each tuple, start from 01234 and exchange positions k and $d_k$ in increasing k order, using one-based positions.

The zero-based index is $75-1=74$. The block weights for these four choices are 60, 20, 5 and 1:
\[74=1(60)+0(20)+2(5)+4(1).
\]
Thus $(d_2,d_3,d_4,d_5)=(2-1,3-0,4-2,5-4)=\boxed{(1,3,2,1)}$.
'''+table(['Exchange','Arrangement'],[['Start','01234'],['Positions 2 and 1','10234'],['Positions 3 and 3','10234'],['Positions 4 and 2','13204'],['Positions 5 and 1','43201']])+r'''
Hence the answer under this convention is $\boxed{43201}$.

{\small Convention reference: J. S. Rohl, ``Programming Improvements to Fike's Algorithm for Generating Permutations,'' The Computer Journal 19(2), 156--159 (1976), Figure 1 and recursive procedure. \url{https://doi.org/10.1093/comjnl/19.2.156}. The convention is stated explicitly because Fike order is not lexicographic order.}''')
add('dms-ensemble','7','Regular self-complementary graph',r'''
Assume a nonempty simple graph. If G is r-regular on n vertices, its complement is $(n-1-r)$-regular. Isomorphism to its complement implies
\[r=n-1-r,\qquad r=(n-1)/2.
\]
Therefore n is odd. The handshake lemma says $nr=2|E|$ is even. Since n is odd, r must be even; write $r=2t$. Substitution gives $n=2r+1=\boxed{4t+1}$, with $t\ge0$.''')
add('dms-ensemble','8','Minimum degree forces connectivity',r'''
Suppose G is disconnected, and a component has s vertices. A vertex in that component has degree at most $s-1$, so
\[s-1\ge\delta(G)\ge(p-1)/2,\quad s\ge(p+1)/2.
\]
Every component must satisfy this bound. Two components would already contain at least $p+1$ vertices, contradicting the total p. Hence G is connected. This argument assumes the usual simple-graph setting; a one-vertex graph is connected directly.''')
add('dms-ensemble','9','Dijkstra on the directed source network',r'''
Respect arrow direction. The outgoing edges are:
$v_1\to v_2:4$, $v_1\to v_3:5$;
$v_2\to v_1:6$, $v_2\to v_3:4$, $v_2\to v_5:8$;
$v_3\to v_2:6$, $v_3\to v_4:2$, $v_3\to v_6:3$;
$v_4\to v_5:7$;
$v_5\to v_1:3$, $v_5\to v_4:2$;
$v_6\to v_3:5$, $v_6\to v_4:4$.
The table records tentative distances after relaxing outgoing edges of each settled vertex.
'''+table(['Settled','$d_1$','$d_2$','$d_3$','$d_4$','$d_5$','$d_6$'],[['Initial','0',r'$\infty$',r'$\infty$',r'$\infty$',r'$\infty$',r'$\infty$'],['$v_1$','0','4','5',r'$\infty$',r'$\infty$',r'$\infty$'],['$v_2$','0','4','5',r'$\infty$','12',r'$\infty$'],['$v_3$','0','4','5','7','12','8'],['$v_4$','0','4','5','7','12','8'],['$v_6$','0','4','5','7','12','8'],['$v_5$','0','4','5','7','12','8']])+table(['Destination','Shortest path','Length'],[['$v_1$','$v_1$','0'],['$v_2$',r'$v_1\to v_2$','4'],['$v_3$',r'$v_1\to v_3$','5'],['$v_4$',r'$v_1\to v_3\to v_4$','7'],['$v_5$',r'$v_1\to v_2\to v_5$','12'],['$v_6$',r'$v_1\to v_3\to v_6$','8']]))
# DISCRETE MATHEMATICS, ORIGINAL
add('dms-original','1A','Divisor lattice and complements',fig('hasse-original','.48')+r'''
The positive divisors of 12 are closed under gcd and lcm. For any two divisors, their gcd is the greatest divisor below both and their lcm is the least divisor above both. Therefore every pair has a meet and join:
\[a\wedge b=\gcd(a,b),\quad a\vee b=\operatorname{lcm}(a,b).
\]
In particular, $\boxed{4\wedge6=2}$ and $\boxed{4\vee6=12}$. The bottom is 1 and the top is 12.

The lattice is not complemented. For a complement c of 2, we would need $\gcd(2,c)=1$ and $\operatorname{lcm}(2,c)=12$. The only odd divisors are 1 and 3, whose lcms with 2 are 2 and 6, so neither works. Some elements do have complements: 1 and 12 complement each other, as do 3 and 4. One missing complement suffices to disprove complementedness.''')
add('dms-original','1B','Truth table and canonical forms',table(['x','y','z',r'$\neg y$',r'$x\land\neg y$','F'],[['0','0','0','1','0','0'],['0','0','1','1','0','1'],['0','1','0','0','0','0'],['0','1','1','0','0','1'],['1','0','0','1','1','1'],['1','0','1','1','1','1'],['1','1','0','0','0','0'],['1','1','1','0','0','1']])+r'''
Thus $F=\Sigma m(1,3,4,5,7)=\Pi M(0,2,6)$.
\begin{align*}
\text{Canonical DNF: }F={}&(\neg x\land\neg y\land z)\lor(\neg x\land y\land z)\\
&\lor(x\land\neg y\land\neg z)\lor(x\land\neg y\land z)\lor(x\land y\land z).
\end{align*}
\[\text{Canonical CNF: }F=(x\lor y\lor z)\land(x\lor\neg y\lor z)\land(\neg x\lor\neg y\lor z).\]''')
add('dms-original','1C','Boolean identity proof',r'''
\begin{align*}
a\lor(\neg a\land b)
&=(a\lor\neg a)\land(a\lor b)&&\text{distributive law}\\
&=1\land(a\lor b)&&\text{complement law}\\
&=a\lor b&&\text{identity law}.
\end{align*}''')
add('dms-original','2A','Integer solutions by inclusion-exclusion',r'''
Set $u=x-1$ and $v=y-2$. Then $u+v+z=9$, with $0\le u,v\le4$ and $z\ge0$. The unrestricted count is $\binom{11}{2}=55$. Violations $u\ge5$ and $v\ge5$ each leave a nonnegative sum of 4 and each contribute $\binom62=15$. Both cannot occur simultaneously because their sum would be at least 10. Therefore
\[\boxed{55-15-15=25}.
\]
As a check, each of the five possible x values can pair with each of the five possible y values; even the maximum sum is $5+6=11\le12$, and each pair fixes a nonnegative z.''')
add('dms-original','2B','42nd lexicographic permutation',r'''
Use zero-based rank $42-1=41$. Factorial block choices are:
'''+table(['Available symbols','Block size','Quotient / remainder','Chosen'],[['0,1,2,3,4','24','41 = 1(24) + 17','1'],['0,2,3,4','6','17 = 2(6) + 5','3'],['0,2,4','2','5 = 2(2) + 1','4'],['0,2','1','1 = 1(1) + 0','2'],['0','1','0 = 0(1) + 0','0']])+r'''Choose the quotient-indexed symbol from the sorted remaining list at each step, with zero-based indices. The result is $\boxed{13420}$.''')
add('dms-original','2C','Arrangements of BALLOON',r'''
There are 7 letters, with L repeated twice and O repeated twice. The number of distinct arrangements is
\[\boxed{\frac{7!}{2!2!}=1260}.
\]
If the two Ls must be adjacent, treat LL as one object. The six objects are LL, B, A, O, O, N, so the count is
\[\boxed{\frac{6!}{2!}=360}.
\]
There is no additional factor for exchanging the identical Ls within their block.''')
add('dms-original','3A','Dijkstra on the undirected graph',r'''Initialize A to 0 and every other tentative distance to infinity. All weights are nonnegative. After each settlement, relax each incident edge.'''+table(['Settled','A','B','C','D','E'],[['Initial','0',r'$\infty$',r'$\infty$',r'$\infty$',r'$\infty$'],['A','0','4','1',r'$\infty$',r'$\infty$'],['C','0','3','1','6','9'],['B','0','3','1','4','9'],['D','0','3','1','4','7'],['E','0','3','1','4','7']])+table(['Destination','Shortest path','Distance'],[['A','A','0'],['B',r'$A\to C\to B$','3'],['C',r'$A\to C$','1'],['D',r'$A\to C\to B\to D$','4'],['E',r'$A\to C\to B\to D\to E$','7']]))
add('dms-original','3B','Connectivity proof',r'''Suppose the graph is disconnected. If a component has s vertices, every vertex in it has degree at most $s-1$. The minimum-degree assumption forces
\[s\ge\delta(G)+1\ge(n+1)/2.
\]
There are at least two components, so their combined size would be at least $n+1$, contradicting the total of n vertices. Hence the graph is connected.''')
add('dms-original','3C','Degree and congruence',r'''For a nonempty simple r-regular graph, its complement is $(n-1-r)$-regular. Self-complementarity gives $r=n-1-r$, hence $\boxed{r=(n-1)/2}$. Thus n is odd. By the handshake lemma, nr is even, so r must be even because n is odd. Writing $r=2t$ gives $n=4t+1$, or $\boxed{n\equiv1\pmod4}$.''')
# Output and coverage validation.
question_build=runpy.run_path(str(OUT.parent/'build.py'))
format_solutions=runpy.run_path(str(OUT.parent/'mcq_format.py'))['format_solutions']
S={name:format_solutions(question_build['formatted_papers'][name],answers) for name,answers in S.items()}
manifest=json.loads((OUT.parent/'manifest.json').read_text())
preamble=r'''\documentclass[11pt,a4paper]{article}
\usepackage[margin=19mm,top=20mm,bottom=20mm]{geometry}
\usepackage{amsmath,amssymb,graphicx,array,fancyhdr,lastpage,textcomp,fancyvrb}
\usepackage{fontspec}
\usepackage[hidelinks]{hyperref}
\setmainfont{texgyreheros-regular.otf}[BoldFont=texgyreheros-bold.otf,ItalicFont=texgyreheros-italic.otf,BoldItalicFont=texgyreheros-bolditalic.otf]
\setmonofont{lmmono10-regular.otf}
\setlength{\parindent}{0pt}\setlength{\parskip}{5pt}
\setlength{\headheight}{14pt}
\pagestyle{fancy}\fancyhf{}
\renewcommand{\headrulewidth}{0.3pt}\renewcommand{\footrulewidth}{0.3pt}
\fancyfoot[L]{\footnotesize by paper.shrit.in\quad |\quad normal}
\fancyfoot[R]{\footnotesize Page \thepage\ of \pageref{LastPage}}
\begin{document}
'''
for m in manifest:
 name=m['file'];qs=S[name];assert len(qs)==m['questionCount'],(name,len(qs))
 title=m['subject'];setname='Set A: Ensemble' if m['set']=='ensemble' else 'Set B: Original'
 header=r'\fancyhead[L]{\small '+title+r'}\fancyhead[R]{\small '+setname+r'}'+'\n'
 header+=r'{\LARGE\bfseries Worked Solutions}\par{\large '+title+r'}\par\textbf{'+setname+r' | CSE Semester 3}\par'+'\n'
 header+=r'Companion to \texttt{'+name+r'.pdf}. Question numbers match that paper. Equivalent correct methods are acceptable. These are independent worked solutions, not an official university marking scheme.\par\medskip\hrule\medskip'+'\n'
 header+=r'Questions 1--5: MCQ answer key, 1 mark each (5 marks total). Questions 6 onward: theory solutions (25 marks total).\par'+'\n'
 body=''
 for label,t,b in qs:body+=r'\noindent\begin{minipage}{\linewidth}\subsection*{'+label+'. '+t+'}\n'+b+'\n'+r'\end{minipage}\par\medskip'+'\n'
 (OUT/(name+'-solutions.tex')).write_text(preamble+header+body+'\n'+r'\end{document}')
(OUT/'coverage.json').write_text(json.dumps({k:[x[0] for x in v] for k,v in S.items()},indent=2))
print('Generated',sum(map(len,S.values())),'worked answers across',len(S),'solution documents')
