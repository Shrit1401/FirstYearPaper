# CSE semester 3 midsem practice papers

Five 30-mark papers. Suggested 90 minutes each. NSM is provisionally interpreted as end-semester. See each paper for verification gaps.

## Data Analytics

Modules 1-3

PROVISIONAL mapping: the Teams DA folder is empty. Selections cover descriptive statistics, preparation and statistical testing, based on the source CO labels. The two source papers contain no CO2 questions, so full module-2 coverage cannot be claimed. Use statistical tables where needed.

### Q1 (5 marks)

(i) Find the standard deviation and skewness for: 78, 91, 68, 54, 82, 47, 60, 78, 97, 58, 62, 50, 50, 63, 92, 75, 79, 63, 42, 61.
(ii) Give an example of the combining-variables concept in dataset preparation.
(iii) A CMO compares three new cola flavours using ratings from 12 customers on a 1-9 scale. Conduct the appropriate analysis. Ratings: Flavour A: 4, 2, 4, 2; Flavour B: 6, 4, 5, 5; Flavour C: 8, 6, 8, 6.

Source: DA-R, Q3A

### Q2 (5 marks)

(i) Find the elements of a box plot for: 78, 91, 68, 54, 82, 47, 60, 78, 97, 58, 62, 50, 50, 63, 92, 75, 79, 63, 42, 61.
(ii) Why is it sometimes necessary to create subsets from a large dataset before analysis?
(iii) Measure the strength of the relationship between the rankings assigned by two interviewers to candidates A-L. Interviewer 1: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12. Interviewer 2: 1, 2, 4, 3, 6, 5, 8, 7, 10, 9, 12, 11.

Source: DA-M, Q3A

### Q3 (3 marks)

A medical equipment company claims that its new blood test kit has mean accuracy 95%. A random sample of 36 kits has mean accuracy 94.7%, with known population standard deviation 0.02 (accuracy expressed as a proportion). At the 5% significance level, test whether the claim is justified against a two-sided alternative. Critical z-values: ±1.96.

Source: DA-R, Q1B

### Q4 (3 marks)

A hospital laboratory claims that a new COVID testing kit correctly identifies infection 95% of the time. A researcher believes the true accuracy is less than 95%. A sample of 50 test results has mean accuracy 0.93; the known population standard deviation is 0.04. Test the claim at the 5% significance level. Critical z-value: -1.645.

Source: DA-M, Q1B

### Q5 (5 marks)

Test the effectiveness of vaccination in preventing smallpox at the 5% significance level.
Vaccinated: attacked 31, not attacked 469, total 500.
Not vaccinated: attacked 185, not attacked 1315, total 1500.
Overall: attacked 216, not attacked 1784, total 2000.

Source: DA-R, Q2A

### Q6 (5 marks)

Per-acre wheat production (tons) is recorded for three varieties and four fertilizers, with each combination replicated twice. Test whether variety differences and fertilizer differences are significant at the 5% level. Each pair below gives the two replicates, in fertilizer order F1, F2, F3, F4.
Variety 1: (8,9), (9,8), (6,7), (10,11).
Variety 2: (7,6), (8,9), (5,4), (9,10).
Variety 3: (10,9), (11,12), (8,7), (12,13).

Source: DA-M, Q2A

### Q7 (2 marks)

A data analyst is studying the annual income levels (in ₹000s) of 12 employees in a company: [180, 200, 210, 215, 220, 230, 250, 270, 300, 320, 400, 480] Apply both equal-width and equal-frequency binning with 3 bins. Using histogram analysis, discuss which binning approach (equal-width or equal-frequency) provides a better representation of the income distribution and justify your reasoning.

Source: DA-R, Q5C

### Q8 (2 marks)

A data scientist is analysing the following cholesterol level (mg/dL) readings of 12 patients: [145, 155, 160, 162, 165, 172, 180, 190, 200, 220, 240, 260]. Apply equal-width and equal-frequency binning with 3 bins. Using histogram analysis, explain which binning approach (width-based or frequency-based) better represents the data distribution and why.

Source: DA-M, Q5C

## Data Structures

Modules 1-2; module 3 restricted to stacks

PROVISIONAL mapping: no DS channel is visible in the current team. Module 1 is inferred as C structures, pointers and arrays; module 2 as linked lists. Stacks are included provisionally per your instruction. Trees, graphs and queue-specific questions are excluded.

### Q1 (2 marks)

Write a C program to read and display employee details including the date of joining using nested structure. Consider date of joining as nested structure.

Source: DS-M, Q1C

### Q2 (2 marks)

Assume that you are storing marks of students in 3 subjects. Write a C program that: i. Takes the number of students as input. ii. Dynamically allocates a 2D array using pointers. iii. Accepts marks for each subject.Calculates and prints the average marks of each student using only pointer arithmetic.

Source: DS-R, Q2C

### Q3 (2 marks)

Write a C program to dynamically allocate memory for 2D string arrays (array of strings) and perform concatenation using pointers.

Source: DS-M, Q2C

### Q4 (5 marks)

A music streaming service keeps track of songs in a playlist using a singly linked list. Each node stores the following details: SongID (integer), Title (string), Duration (in seconds). Write a C program to perform the following operations: Insert songs into the playlist in the order they are added. Remove all songs whose duration is less than a user-specified value (Use head pointer for performing this operation). Display the updated playlist. Include a main() function to demonstrate all functionalities.

Source: DS-R, Q4A

### Q5 (5 marks)

A mobile app named "MIT-BLR Connect" maintains contact details of alumni in three different modules: i) Add Recent Contacts Module: Displays recently interacted alumni in order of contact - new ones added at the beginning. ii) Traverse Module: Allows viewing alumni details in forward direction. iii) Develop a module to print the data in reverse order. Develop C functions considering singly linked list as the suitable data structure

Source: DS-M, Q4A

### Q6 (5 marks)

A college is developing a simple "Smart Editor" software for its students. In the Smart Editor, students should be able to undo and redo text changes.As a software developer, you are asked to analyze and illustrate how Stacks can be used in this application. Question: i. Explain how a Stack can be used to implement the Undo-Redo feature in the editor.Write short C code snippets for implementation and explain how it will work.

Source: DS-R, Q2A

### Q7 (5 marks)

Write a function to convert an infix expression to postfix. Include the following functions as per the prototype. i) int InStackPrecedence(char op) ; to return the precedence of operator within the stack ii) int IncomingPrecedence(char op); to return the precedence of the incoming operator. iii) void Infix_Postfix(char infix[], char postfix[]); to convert given infix expression to postfix. Main function not required. Note: The infix expression may include ONLY the following operators (listed in the order of their precedence): • ^ (exponentiation) → right associative • * (multiplication), / (division) → left associative • + (addition), - (subtraction) → left associative

Source: DS-M, Q2A

### Q8 (2 marks)

Write a C function bool isDuplicate(char s[]) that detects duplicate parentheses in a given expression using a stack.

Source: DS-M, Q3C

### Q9 (2 marks)

Using the following nested calls, justify why a stack is preferred over a queue in handling function calls. Explain the role of activation records (stack frames).
void fun1() { printf("Inside fun1\n"); }
void fun2() { fun1(); printf("Inside fun2\n"); }
int main() { fun2(); printf("Inside main\n"); }

Source: DS-R, Q3C

## Data Communication and Computer Networks

Modules 1-2

Module boundaries checked against DCCN - Detailed Syllabus.pdf in Teams. Covers signals, modulation, line coding, network devices, layered architecture, error detection, flow control and Ethernet access. Q1 and Q2 are assigned 6 marks each instead of the original 5 to make a 30-mark practice paper.

### Q1 (6 marks)

Compare Amplitude Shift Keying (ASK), Frequency Shift Keying (FSK), and Phase Shift Keying (PSK) in terms of how each modifies the carrier signal, their bandwidth efficiency, and susceptibility to noise. Analyse which technique is most suitable for transmission over a noisy telephone channel and justify your choice.

Source: DCCN-R, Q1A

### Q2 (6 marks)

Define data rate and bandwidth in a composite signal. Approximate a square wave by
s(t) = (4/π)[sin(2π × 2 × 10⁶t) + (1/3)sin(2π × 6 × 10⁶t) + (1/5)sin(2π × 10 × 10⁶t)].
Calculate the data rate and bandwidth. Triple the frequency and calculate the new data rate and bandwidth. Explain how bandwidth affects data rate.

Source: DCCN-M, Q1A

### Q3 (2 marks)

For the given binary data 101000101010, draw the following line coding scheme. (Assume previous pulse was negative) i. Differential Manchester ii.Bipolar AMI

Source: DCCN-R, Q3C

### Q4 (2 marks)

For the given binary data 111000101010, draw the following line coding scheme. (Assume previous pulse was negative) i) Manchester ii) Bipolar AMI

Source: DCCN-M, Q3C

### Q5 (2 marks)

A system has an n-layer protocol hierarchy. Applications generate messages of length M bytes. At each of the layers, an h-byte header is added. What fraction of the network bandwidth is filled with headers?

Source: DCCN-R, Q1C

### Q6 (2 marks)

A company network consists of three departments connected as follows: Sales and HR are connected through a hub, HR and IT are connected through a switch, and the switch is connected to a router for internet access. An employee in Sales sends a file to an employee in IT. Analyse how the hub, switch, and router handle this transmission.

Source: DCCN-M, Q1C

### Q7 (3 marks)

Apply the Cyclic Redundancy Check (CRC) method to the data D = 1010001101 using the generator polynomial P = 11011. Determine the transmitted codeword after performing the CRC encoding process.

Source: DCCN-M, Q1B

### Q8 (3 marks)

Assume that the sender's window size is 3. If we have to send 10 frames in total, and the channel of transmission is such that every 5th transmission is lost (but no ACKs), how many data transmissions (including both original transmissions and any necessary retransmissions) does the sender make in total if:- i. The go-back-N protocol is followed ii. The selective repeat protocol is followed Also, calculate the ratio of the effective number of frames sent to the total number of frames sent in each of the above cases.

Source: DCCN-R, Q1B

### Q9 (2 marks)

Calculate the total time required to transmit 1,000,000 bits using the Stop-and-Wait ARQ protocol when each frame carries 2000 bits, the sender and receiver are 5000 km apart, and the propagation speed is 2 × 10^8 m/s. Ignore transmission, waiting, and processing delays, and assume no frames are lost or damaged

Source: DCCN-R, Q4C

### Q10 (2 marks)

An Ethernet segment has transmission speed 10⁸ bits/second and maximum length 1500 metres. If propagation speed is 3 × 10⁸ metres/second, calculate the minimum frame size in bits required for collision detection.

Source: DCCN-M, Q4C

## Digital Systems and Computer Organization

Modules 1-4; module 5 through memory operations

Digital-system questions selected to match your scope; Teams module 4 lists flip-flops, registers, ripple/ring counters, synchronous counters and Verilog. The module-5 PPT was not visible. Q10 on byte/word addressing is a provisional match to the memory-operations cutoff. No cache, pipelining or assembly-programming questions included.

### Q1 (3 marks)

Represent the following numbers in 5-bit 2's complement form, perform the operation mentioned and state whether overflow occurs or not in each case. i) Add +9 and +12 ii) Add -8 and -9 Subtract -5 from +10

Source: DSCO-M, Q1B

### Q2 (3 marks)

Simplify F(A,B,C,D) = ΠM(0,3,5,6,8,10), with don’t-care terms d(2,13,14), and implement it using NOR gates only.

Source: DSCO-R, Q1B

### Q3 (3 marks)

Design a 3-bit magnitude comparator for unsigned binary numbers A = a₂a₁a₀ and B = b₂b₁b₀. Derive the final Boolean expressions and draw the equivalent logic circuit.

Source: DSCO-R, Q1C

### Q4 (3 marks)

Implement a three-input XOR gate using 4-to-1 multiplexer with a neat diagram.

Source: DSCO-M, Q1C

### Q5 (2 marks)

Draw PLA implementations for the following Boolean expressions:
(i) F = ABC′ + ABC + A′BC + AB′C + AB′C′.
(ii) F1 = A′B + BC′ and F2 = AB′ + A′C.

Source: DSCO-R, Q5C

### Q6 (5 marks)

Design a sequential circuit with two JK flip-flops A and B and two inputs E and F. If E = 0, the circuit remains in the same state regardless of the value of F. When E = 1 and F = 1, the circuit goes through the state transitions from 00 to 01, to 10, to 11, back to 00, and repeats. When E = 1 and F = 0, the circuit goes through the state transitions from 00 to 11, to 10, to 01, back to 00, and repeats.

Source: DSCO-M, Q2A

### Q7 (3 marks)

Design a 3-bit synchronous binary up-counter using T flip-flops. Draw the logic diagram.

Source: DSCO-M, Q2B

### Q8 (3 marks)

Illustrate a 4-bit asynchronous ripple counter with a neat diagram using JK Flip flops and explain the working of the same.

Source: DSCO-R, Q2B

### Q9 (2 marks)

Write behavioral Verilog code that represents an eight-bit ring counter.

Source: DSCO-R, Q2C

### Q10 (3 marks)

Explain the concept of memory addresses in an Instruction Set Architecture. Also, discuss the difference between byte addressing and word addressing.

Source: DSCO-R, Q3B

## Discrete Mathematical Structures

Modules 1-3

PROVISIONAL mapping: no DMS channel is visible. Source CO1-CO3 identify lattices/Boolean algebra, combinatorics and graph theory, assumed here to be modules 1-3. Verify against your current outline. Q9 is assigned 4 marks instead of the source 3. Index filenames say MAT 2125; the actual paper header says MAT 2101, Discrete Mathematical Structures.

### Q1 (4 marks)

Draw the Hasse diagram for A = {1, 2, 3, 12, 18, 36}, ordered by divisibility: a is related to b iff a divides b. Is it a lattice? Justify. List all antichains of length more than one.

Source: DMS-R, Q1A

### Q2 (3 marks)

In a Boolean algebra (A, ∨, ∧, complement), show that:
(i) Every element has a unique complement.
(ii) a ∨ (a′ ∧ b) = a ∨ b and a ∧ (a′ ∨ b) = a ∧ b, for all a,b in A.

Source: DMS-R, Q1B

### Q3 (3 marks)

Let E(x₁,x₂,x₃) = (x₁′ ∧ x₂ ∧ x₃′) ∨ (x₁ ∧ x₂′) ∨ (x₁ ∧ x₃) be a Boolean expression over the two-valued Boolean algebra. Write E in both CNF and DNF.

Source: DMS-R, Q1C

### Q4 (4 marks)

How many ways are there to select a total of 15 items from three types, subject to these limits?
Type A: 1 to 4 items; Type B: 3 to 7 items; Type C: 5 to 10 items.

Source: DMS-R, Q2A

### Q5 (3 marks)

Show that the number of partitions of n with no part smaller than 3 equals the number of partitions of n+3 whose three largest parts are consecutive integers.

Source: DMS-R, Q2B

### Q6 (3 marks)

Find the 75th permutation of the five marks 0, 1, 2, 3, 4 in Fike's order.

Source: DMS-R, Q2C

### Q7 (3 marks)

Show that if G is a regular self-complementary graph of order n, then n = 4t + 1 for some integer t.

Source: DMS-R, Q3B

### Q8 (3 marks)

If G has p vertices and minimum degree δ(G) ≥ (p - 1)/2, prove that G is connected.

Source: DMS-R, Q4B

### Q9 (4 marks)

Use Dijkstra's algorithm to find the shortest paths from v₁ to every other vertex in the directed network below. Show the steps.

Source: DMS-R, Q4C
