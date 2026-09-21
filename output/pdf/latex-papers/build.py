from pathlib import Path
import json,re,shutil,subprocess,runpy
ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
format_questions=runpy.run_path(str(OUT/'mcq_format.py'))['format_questions']
papers=json.loads((ROOT/'output/pdf/midsem-selection.json').read_text())
codes={'DA':'CSS 2103','DS':'CSS 2101','DCCN':'CSS 2102','DSCO':'CSS 2104','DMS':'MAT 2101'}
original={
'DA':[
(5,r'For the observations $4,6,6,8,10,14$, calculate the mean, median and population standard deviation. Compute Pearson\textquotesingle s second coefficient of skewness, $3(\bar x-\mathrm{median})/\sigma$, and interpret its sign.'),
(3,r'Find the five-number summary and interquartile range of $3,5,7,8,9,11,13,16,30$. Exclude the median when forming the lower and upper halves. Use the $1.5\,IQR$ rule to identify outliers and sketch a box plot.'),
(2,r'A table contains customer ID, age, monthly income and annual income. Give one suitable treatment for missing ages and explain how you would detect inconsistency between the two income fields.'),
(5,r'A filling machine is claimed to dispense a mean of 500 ml. A random sample of 36 bottles has mean 496 ml. The population standard deviation is known to be 12 ml. Perform a two-sided $z$-test at the 5\% level. State the hypotheses, statistic, decision and conclusion. Use critical values $\pm1.96$.'),
(3,r'Two judges rank six projects. Judge A assigns ranks $(1,2,3,4,5,6)$ and judge B assigns $(2,1,4,3,6,5)$. Calculate Spearman\textquotesingle s rank correlation coefficient and interpret the result.'),
(2,r'Partition $10,12,15,18,20,22,25,28,30,32,35,40$ into three equal-frequency bins. Replace each observation by its bin mean and report the three resulting bin means.'),
(5,r'Test independence between training and passing an assessment using Pearson\textquotesingle s chi-square test at 5\%. Of 60 trained students, 48 pass and 12 fail; of 40 untrained students, 22 pass and 18 fail. Show expected frequencies and the statistic. Use $\chi^2_{0.05,1}=3.841$; do not apply a continuity correction.'),
(3,r'Three independent normal populations have equal variances. Samples are A: $4,5,6$, B: $7,8,9$, C: $10,11,12$. The between-group sum of squares is 54 and within-group sum of squares is 6. Complete the one-way ANOVA degrees of freedom, mean squares and $F$ statistic. Use $F_{0.05;(2,6)}=5.143$ and state your conclusion.'),
(2,r'Distinguish a Type I error from a Type II error in the context of the filling-machine test in Question 2A.')],
'DS':[
(5,r'Define a C structure \texttt{Student} containing a roll number, name and nested \texttt{Date} structure for admission date. Write a function that reads and displays one student. Assume names contain at most 39 characters and no spaces.'),
(3,r'Write a C function that dynamically allocates a contiguous $r\times c$ integer matrix and returns its base pointer, or \texttt{NULL} on failure. Reject nonpositive dimensions. Show how element $(i,j)$ is accessed using pointer arithmetic. Assume the requested size fits in \texttt{size\_t}.'),
(2,r'Explain a dangling pointer and a memory leak using one short C example of each. State how each error can be prevented.'),
(5,r'A singly linked list stores integer values. Define its node structure and write \texttt{void deleteAll(Node **head, int key)} to delete every node whose value equals \texttt{key}. Handle an empty list, consecutive matches and matches at the head. Release deleted nodes.'),
(3,r'Write a C function to reverse a singly linked list in place using three pointers. Return the new head and state its time and auxiliary-space complexity.'),
(2,r'A list initially contains $10\to20\to30$. Insert 5 at the head, insert 25 after 20, then delete the tail. Draw the final list and state how many next links must be traversed to locate its tail from the head.'),
(5,r'Convert \texttt{A+B*(C-D)\^{}E\^{}F} to postfix using a stack. Exponentiation has highest precedence and is right-associative. Show the operator stack and output after each input token, then give the final postfix expression.'),
(3,r'Write a C function to check whether a string containing only \texttt{(}, \texttt{)}, \texttt{[} and \texttt{]} is balanced. Use an array stack of capacity 100 and assume the input has at most 100 characters. Return 1 for balanced and 0 otherwise.'),
(2,r'An editor uses undo and redo stacks. Starting with empty stacks, perform edits A, B and C, then undo twice and redo once. List both stacks from bottom to top. State what happens to the redo stack when a new edit D is made.')],
'DCCN':[
(5,r'A noiseless channel has bandwidth 3 kHz and uses four signal levels. Calculate its Nyquist maximum bit rate. If the same bandwidth has signal-to-noise ratio 31 (linear), calculate the Shannon capacity. Identify the tighter upper bound and explain what it limits.'),
(3,r'Compare ASK, binary FSK and BPSK in terms of the carrier parameter changed and sensitivity to amplitude noise. State one reason to prefer BPSK over ASK in a channel with amplitude disturbances.'),
(2,r'An application generates 900 payload bytes. Each of five layers adds a 20-byte header. Calculate the total transmitted size and the percentage occupied by headers, ignoring trailers.'),
(5,r'Encode data \texttt{1101011011} using CRC generator \texttt{10011}. Show modulo-2 division, the four-bit remainder and the complete transmitted codeword. State the receiver\textquotesingle s check for an error-free received word.'),
(3,r'Draw Manchester and bipolar AMI waveforms for \texttt{10110010}. For Manchester, use low-to-high at mid-bit for 1 and high-to-low for 0. For AMI, assume the last nonzero pulse before this sequence was negative. Label all bit boundaries.'),
(2,r'Explain the different actions of a hub and a learning switch when a frame arrives. For the switch, distinguish known and unknown destination MAC addresses.'),
(5,r'A stop-and-wait link sends 1000-byte data frames at 1 Mbps. One-way propagation delay is 10 ms. ACK transmission and processing times are negligible; no frames are lost. Calculate frame transmission time, time per successful cycle, utilization and useful throughput. Ignore headers.'),
(3,r'A selective-repeat sender sends frames 0, 1, 2 and 3 with window size 4. Frame 1 is lost; frames 0, 2 and 3 arrive and their individual ACKs return before timeout. No new frames are available. State which frames are buffered, which frame is retransmitted and the final in-order delivery sequence. Compare with go-back-N under the same loss, assuming it discards out-of-order frames.'),
(2,r'A shared half-duplex Ethernet link operates at 100 Mbps. The maximum one-way propagation delay is $5\,\mu$s. Ignoring other delays, calculate the minimum frame length required for collision detection in bits and bytes.')],
'DSCO':[
(5,r'Use a four-variable Karnaugh map to minimize $F(A,B,C,D)=\Sigma m(0,2,5,7,8,10,13,15)$. Take A as the most significant bit. Show the groups, obtain a minimal SOP expression and draw a NAND-only implementation.'),
(3,r'Using 5-bit two\textquotesingle s complement, evaluate (i) $11+7$, (ii) $-9+5$, and (iii) $6-13$. Give the binary result, its signed interpretation and whether signed overflow occurs in each case.'),
(2,r'Implement $F(A,B,C)=A\oplus B\oplus C$ using a 4-to-1 multiplexer. Choose A and B as select inputs and specify $I_0,I_1,I_2,I_3$; an inverter is available.'),
(5,r'Design a synchronous two-bit counter with T flip-flops and enable input E. For $E=1$, the state sequence is $00\to01\to10\to11\to00$; for $E=0$, the state holds. Draw the transition table, derive both T-input equations and draw the circuit.'),
(3,r'Write synthesizable Verilog for a four-bit ring counter with positive-edge clock and active-high synchronous reset. Reset must load \texttt{0001}; subsequent clocks rotate the one toward the next more significant bit, wrapping from bit 3 to bit 0.'),
(2,r'Explain why an asynchronous ripple counter can briefly produce incorrect decoded outputs. Contrast its clock connection with that of a synchronous counter.'),
(5,r'Design a two-bit unsigned magnitude comparator for $A=a_1a_0$ and $B=b_1b_0$. Derive Boolean expressions for $A>B$, $A=B$ and $A<B$. Draw a gate-level diagram and verify the outputs for $A=10_2$, $B=01_2$.'),
(3,r'A byte-addressable memory stores 32-bit words. How many words fit in 4 KiB? How many address bits select individual bytes? If a word starts at hexadecimal address \texttt{0x1000}, list the byte addresses it occupies and the starting address of the next word.'),
(2,r'Describe a memory-read operation using the memory address register (MAR), memory data register (MDR) and read control signal. State what changes for a memory-write operation.')],
'DMS':[
(5,r'Let $D_{12}=\{1,2,3,4,6,12\}$ be ordered by divisibility. Draw its Hasse diagram and show that every pair has a meet and join. Find $4\wedge6$ and $4\vee6$. Decide whether this lattice is complemented and justify your answer.'),
(3,r'For $F(x,y,z)=(x\land\neg y)\lor z$, construct the truth table and write the canonical disjunctive normal form and canonical conjunctive normal form. Use variable order $(x,y,z)$.'),
(2,r'Prove the Boolean identity $a\lor(\neg a\land b)=a\lor b$ using distributive and complement laws. Name the laws used.'),
(5,r'Count the integer solutions of $x+y+z=12$ subject to $1\le x\le5$, $2\le y\le6$ and $z\ge0$. Transform to nonnegative variables and use inclusion-exclusion. Show each excluded case.'),
(3,r'Find the 42nd lexicographic permutation of the symbols $0,1,2,3,4$, with \texttt{01234} counted as the first. Show the factorial-block choices.'),
(2,r'How many distinct arrangements of the letters of \texttt{BALLOON} are possible? How many have the two Ls adjacent? Explain how repeated letters are handled.'),
(5,r'Use Dijkstra\textquotesingle s algorithm from A in an undirected weighted graph with vertices A, B, C, D, E and edges AB:4, AC:1, BC:2, BD:1, CD:5, CE:8, DE:3. Show the tentative-distance table after settling each vertex. Give a shortest path and distance from A to every other vertex.'),
(3,r'Prove that a simple graph with $n\ge2$ vertices and minimum degree at least $(n-1)/2$ is connected. Hint: bound the size of each component if the graph were disconnected.'),
(2,r'A simple graph is regular and self-complementary on n vertices. Use degree counting to show its degree is $(n-1)/2$ and then show that $n\equiv1\pmod4$.')]
}
# Plain text is converted to proper LaTeX math symbols, never rasterized.
def tex(s):
    repl={'\\':r'\textbackslash{}','&':r'\&','%':r'\%','$':r'\$','#':r'\#','_':r'\_','{':r'\{','}':r'\}','^':r'\textasciicircum{}','~':r'\textasciitilde{}'}
    uni={'π':r'\(\pi\)','Π':r'\(\Pi\)','δ':r'\(\delta\)','≥':r'\(\ge\)','±':r'\(\pm\)','×':r'\(\times\)','∨':r'\(\lor\)','∧':r'\(\land\)','→':r'\(\to\)','′':"'",'’':"'",'‘':"'",'“':'``','”':"''",'₹':'Rs. ','•':';','⁶':r'\(^{6}\)','⁸':r'\(^{8}\)'}
    for i,c in enumerate('₀₁₂₃₄₅₆₇₈₉'):uni[c]=r'\(_{'+str(i)+r'}\)'
    return ''.join(uni.get(c,repl.get(c,c)) for c in s).replace('\n',r'\par ')
# Clarify under-specified questions while preserving source provenance.
q=papers['DA']['questions']
q[0]['text']+=' Use population standard deviation and Pearson\'s second skewness coefficient. For (iii), assume independent normal samples with equal variances; use a one-way ANOVA at 5%, with critical F(2,9) = 4.256.'
q[1]['text']+=' For quartiles, use medians of the two halves. Use Spearman rank correlation in (iii).'
q[4]['text']+=' Use Pearson chi-square without continuity correction; critical value for 1 degree of freedom is 3.841. State association, not a causal conclusion.'
q[5]['text']+=' Assume independent normal errors with common variance. Include the interaction term. Use critical F values: variety (2,12): 3.885; fertilizer (3,12): 3.490.'
q=papers['DCCN']['questions']
q[1]['text']+=' Assume two bits per cycle of the fundamental square wave; define bandwidth as highest minus lowest retained frequency.'
q[2]['text']+=' For Differential Manchester, use a boundary transition for 0 and none for 1; initial level is negative. A mid-bit transition always occurs.'
q[3]['text']+=' Manchester convention: 1 is low-to-high and 0 is high-to-low at mid-bit.'
q[7]['text']='A sender uses a window of 3 to transmit frames 0, 1 and 2. Frame 1 is lost, while 0 and 2 arrive. ACKs are immediate and never lost; no new frames are available. In go-back-N, discard out-of-order frames and retransmit all outstanding frames at timeout. In selective repeat, buffer out-of-order frames and retransmit only the unacknowledged frame. For each protocol, list retransmissions and calculate useful frames divided by total data transmissions.'
q[8]['text']+=' Count one full round-trip per frame, including the final ACK.'

# Typeset the densest source mathematics directly instead of a plain-text transcription.
papers['DCCN']['questions'][1]['latex']=r'Define data rate and bandwidth. A square wave is approximated by \[s(t)=\frac{4}{\pi}\left[\sin(2\pi\cdot2\cdot10^6t)+\frac13\sin(2\pi\cdot6\cdot10^6t)+\frac15\sin(2\pi\cdot10\cdot10^6t)\right].\] Assume two bits per fundamental cycle and bandwidth equal to highest minus lowest retained frequency. Calculate the data rate and bandwidth. Triple all frequencies and find the new values. Explain how bandwidth affects data rate.'
papers['DSCO']['questions'][1]['latex']=r'Simplify $F(A,B,C,D)=\Pi M(0,3,5,6,8,10)$, with don\textquotesingle t-care terms $d(2,13,14)$, and implement it using NOR gates only. Take A as the most significant bit.'
papers['DSCO']['questions'][2]['latex']=r'Design a 3-bit magnitude comparator for unsigned binary numbers $A=a_2a_1a_0$ and $B=b_2b_1b_0$. Derive the Boolean expressions for $A>B$, $A=B$ and $A<B$, and draw the equivalent logic circuit.'
papers['DMS']['questions'][1]['latex']=r'In a Boolean algebra $(A,\lor,\land,\neg)$, show that (i) every element has a unique complement; (ii) $a\lor(\neg a\land b)=a\lor b$ and $a\land(\neg a\lor b)=a\land b$ for all $a,b\in A$.'
papers['DMS']['questions'][2]['latex']=r'Let $E(x_1,x_2,x_3)=(\neg x_1\land x_2\land\neg x_3)\lor(x_1\land\neg x_2)\lor(x_1\land x_3)$ be a Boolean expression. Write E in both conjunctive normal form (CNF) and disjunctive normal form (DNF).'

# The source graph is versioned beside the LaTeX files for clean-checkout builds.
assert (OUT/'dms-graph.png').is_file(), 'Missing source graph: dms-graph.png'
preamble=r'''\documentclass[11pt,a4paper]{article}
\usepackage[margin=18mm,top=17mm,bottom=19mm]{geometry}
\usepackage{amsmath,amssymb,graphicx,array,fancyhdr,lastpage,textcomp}
\usepackage{fontspec}
\setmainfont{texgyreheros-regular.otf}[BoldFont=texgyreheros-bold.otf,ItalicFont=texgyreheros-italic.otf,BoldItalicFont=texgyreheros-bolditalic.otf]
\setlength{\parindent}{0pt}
\setlength{\parskip}{3pt}
\pagestyle{fancy}\fancyhf{}
\renewcommand{\headrulewidth}{0pt}\renewcommand{\footrulewidth}{0.3pt}
\fancyfoot[L]{\footnotesize by paper.shrit.in\quad |\quad normal}
\fancyfoot[R]{\footnotesize Page \thepage\ of \pageref{LastPage}}
\newcommand{\question}[3]{\par\vspace{8pt}\noindent\begin{minipage}[t]{0.075\linewidth}\textbf{#1)}\end{minipage}\begin{minipage}[t]{0.855\linewidth}#3\end{minipage}\hfill\begin{minipage}[t]{0.055\linewidth}\raggedleft(#2)\end{minipage}\par}
\begin{document}
'''
manifest=[]
formatted_papers={}
for kind in ['ensemble','original']:
 for code,p in papers.items():
  title=p['title']; qs=p['questions'] if kind=='ensemble' else [{'marks':m,'latex':s} for m,s in original[code]]
  name=f'{code.lower()}-{kind}'
  qs=format_questions(name,qs)
  formatted_papers[name]=qs
  assert sum(q['marks'] for q in qs)==30
  header=r'{\LARGE\bfseries Question Paper}\hfill {\small Registration No.: \rule{33mm}{0.3pt}}\par\vspace{8pt}'+'\n'
  header+=r'\begin{center}{\large\bfseries MANIPAL FORMAT | PRACTICE PAPER}\\[6pt]{\bfseries THIRD SEMESTER B.TECH. | MIDSEM PRACTICE}\\[4pt]{\bfseries '+tex(title.upper())+' ['+codes[code]+r']}\\[4pt]{\small COMPUTER SCIENCE AND ENGINEERING}\\[3pt]{\small '+('SET A: ENSEMBLE OF PAST-PAPER QUESTIONS' if kind=='ensemble' else 'SET B: NEWLY AUTHORED QUESTIONS')+r'}\end{center}'+'\n'
  header+=r'\textbf{Marks: 30}\hfill\textbf{Suggested duration: 90 minutes}\par\vspace{3pt}\hrule\vspace{5pt}'+'\n'
  header+=r'{\small\textbf{Answer all questions.} Questions 1--5 are MCQs worth 1 mark each. Select one correct option per MCQ. The remaining questions are theory questions worth 25 marks in total; show working and draw labelled diagrams where appropriate. '+tex(p['scope'])+r'. Independent practice paper; not an official university examination.}\par'+'\n'
  if code=='DA':header+=r'{\small Non-programmable calculator permitted. Use the critical values supplied.}\par'+'\n'
  body=''
  for i,q in enumerate(qs):
   if i==0:body+=r'\medskip\textbf{Section A: Multiple-choice questions (5 marks)}\par'+'\n'
   if i==5:body+=r'\newpage\textbf{Section B: Theory questions (25 marks)}\par'+'\n'
   label=q['number']
   s=q.get('latex') or tex(q['text'])
   if q.get('image'):s+=r'\par\centering\includegraphics[width=0.64\linewidth]{dms-graph.png}'
   body+=r'\question{'+label+'}{'+str(q['marks'])+'}{'+s+'}\n'
  body+=r'\vfill\begin{center}\small End of question paper\end{center}\end{document}'
  (OUT/f'{name}.tex').write_text((preamble.replace('[11pt,a4paper]','[10pt,a4paper]').replace(r'\vspace{8pt}',r'\vspace{6pt}') if kind=='ensemble' and code in ['DS','DCCN'] else preamble)+header+body)
  manifest.append({'file':name,'subject':title,'set':kind,'marks':30,'mcqCount':5,'mcqMarks':5,'theoryMarks':25,'questionCount':len(qs),'sources':[{'question':q['number'],'type':q['type'],'source':q.get('source'),'original':q.get('original')} for q in qs] if kind=='ensemble' else 'Newly authored'})
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
print('Generated 10 LaTeX papers')
