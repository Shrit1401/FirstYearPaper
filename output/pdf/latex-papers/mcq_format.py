"""Second-year practice format: five one-mark MCQs, then 25 theory marks.

Keep retained question IDs stable so saved practice attempts still refer to the
same content. MCQs are newly authored adaptations with their own IDs.
"""
import re


def mcq(title, prompt, options, answer, explanation):
    assert len(options) == 4 and answer in 'ABCD'
    return dict(title=title, prompt=prompt, options=options, answer=answer,
                explanation=explanation, marks=1, type='mcq')


BANK = {
    'da-ensemble': [
        mcq('Null hypothesis', r'A manufacturer claims a population mean accuracy of 0.95. Which null hypothesis tests this claim?',
            [r'$\mu=0.95$', r'$\bar x=0.95$', r'$\mu\ne0.95$', r'$\mu<0.95$'], 'A',
            r'The null hypothesis specifies the population parameter: $H_0:\mu=0.95$.'),
        mcq('Standard error', r'A population has known standard deviation 0.02. For an independent sample of size 36, what is the standard error of the sample mean?',
            ['0.12', '0.02', r'$0.02/6$', r'$0.02/36$'], 'C',
            r'$SE=\sigma/\sqrt n=0.02/\sqrt{36}=0.02/6$.'),
        mcq('Normal-test statistic', r'With $\bar x=0.947$, $\mu_0=0.95$, $\sigma=0.02$ and $n=36$, what is the $z$ statistic?',
            ['0.90', '-0.90', '-9.00', '9.00'], 'B',
            r'$z=(0.947-0.95)/(0.02/6)=-0.90$.'),
        mcq('Equal-width bins', r'Observations range from 180 to 480. What is the width of each of three equal-width bins?',
            ['60', '150', '300', '100'], 'D',
            r'Bin width is $(480-180)/3=100$.'),
        mcq('Equal-frequency bins', 'Twelve observations are divided into three equal-frequency bins. How many observations are in each bin?',
            ['3', '4', '6', '12'], 'B',
            r'Each bin contains $12/3=4$ observations.'),
    ],
    'da-original': [
        mcq('Arithmetic mean', r'What is the mean of $4,6,6,8,10,14$?',
            ['6', '7', '8', '10'], 'C', r'The sum is 48 and $48/6=8$.'),
        mcq('Median', r'What is the median of $4,6,6,8,10,14$?',
            ['6', '7', '8', '9'], 'B', r'The middle values are 6 and 8, so the median is $(6+8)/2=7$.'),
        mcq('Population variance', r'The six observations $4,6,6,8,10,14$ have mean 8 and squared-deviation sum 64. What is their population variance?',
            [r'$64/6$', r'$64/5$', r'$\sqrt{64/6}$', r'$8$'], 'A',
            r'Population variance divides the squared-deviation sum by $N$: $64/6$.'),
        mcq('Pearson skewness sign', r'A distribution has mean 8, median 7 and positive standard deviation. What is the sign of Pearson\textquotesingle s second skewness coefficient?',
            ['Zero', 'Negative', 'Undefined', 'Positive'], 'D',
            r'$3(\bar x-\mathrm{median})/\sigma=3(8-7)/\sigma>0$.'),
        mcq('Resistance to extremes', 'Which measure of central tendency is generally less affected by an extreme observation?',
            ['Arithmetic mean', 'Median', 'Midrange', 'All equally affected'], 'B',
            'The median depends on the middle ranks and is generally more resistant to extremes.'),
    ],
    'ds-ensemble': [
        mcq('Undo data structure', 'Which data structure directly supports undoing the most recent action first?',
            ['Queue', 'Stack', 'Sorted array', 'Adjacency matrix'], 'B',
            'A stack removes the most recently pushed action first (LIFO).'),
        mcq('First undo', 'Edits A, B and C are pushed in that order onto an undo stack. Which edit does the first undo remove?',
            ['A', 'B', 'All three', 'C'], 'D', 'C is the most recent edit and is at the top of the stack.'),
        mcq('Redo stack order', 'After edits A, B and C, two undo operations transfer actions to a redo stack. What is the redo stack from bottom to top?',
            ['C, B', 'B, C', 'A, B', 'A, C'], 'A',
            'The first undo pushes C onto redo; the second pushes B above C.'),
        mcq('Redo operation', 'The redo stack contains C, B from bottom to top. Which edit is reapplied by one redo operation?',
            ['A', 'C', 'B', 'Both B and C'], 'C', 'Redo pops the top action, B, and puts it back on undo.'),
        mcq('Edit after undo', 'In a conventional two-stack editor, what happens to the redo stack when a new edit is made after an undo?',
            ['It is reversed', 'It is cleared', 'It is unchanged', 'It becomes the undo stack'], 'B',
            'A new edit starts a new editing branch, so the previously undone future actions are discarded.'),
    ],
    'ds-original': [
        mcq('Structure definition', 'Which C keyword defines a structure type?',
            [r'\texttt{class}', r'\texttt{union}', r'\texttt{struct}', r'\texttt{enum}'], 'C',
            r'\texttt{struct} defines a type whose members can hold different kinds of data.'),
        mcq('Nested member access', r'Object \texttt{s} has a nested structure member \texttt{admitted} with an integer member \texttt{year}. How do you access that year?',
            [r'\texttt{s.admitted.year}', r'\texttt{s->admitted.year}', r'\texttt{s.year.admitted}', r'\texttt{s::admitted::year}'], 'A',
            r'For structure objects, each member is accessed with a dot: \texttt{s.admitted.year}.'),
        mcq('String capacity', r'How many non-null characters can a null-terminated string in \texttt{char name[40]} hold?',
            ['40', '41', '38', '39'], 'D', 'One of the 40 positions must hold the terminating null character.'),
        mcq('Safe input width', r'Which \texttt{scanf} format limits a single word to fit in \texttt{char name[40]}, including its null terminator?',
            [r'\texttt{\%40s}', r'\texttt{\%39s}', r'\texttt{\%s}', r'\texttt{\%41s}'], 'B',
            r'\texttt{\%39s} reads at most 39 characters and appends the null terminator.'),
        mcq('Pointer member access', r'If \texttt{p} points to a structure with integer member \texttt{roll}, which expression accesses that member?',
            [r'\texttt{p.roll}', r'\texttt{*p.roll}', r'\texttt{p->roll}', r'\texttt{p::roll}'], 'C',
            r'\texttt{p->roll} is equivalent to \texttt{(*p).roll}.'),
    ],
    'dccn-ensemble': [
        mcq('Layered headers', 'A 900-byte payload passes through five layers, each adding a 20-byte header. With no trailers, what is the transmitted size?',
            ['920 bytes', '1000 bytes', '1020 bytes', '1100 bytes'], 'B',
            r'The total is $900+5(20)=1000$ bytes.'),
        mcq('Header percentage', 'A transmitted unit contains 900 payload bytes and 100 header bytes. What percentage of the total is headers?',
            [r'$9\%$', r'$11.11\%$', r'$90\%$', r'$10\%$'], 'D',
            r'The fraction is $100/(900+100)=0.10=10\%$.'),
        mcq('CRC degree', r'What is the polynomial degree of CRC generator \texttt{10011}?',
            ['3', '5', '4', '2'], 'C', r'The leading term is $x^4$, so the generator has degree 4.'),
        mcq('CRC appended zeros', r'How many zeros are appended to the data before CRC division using generator \texttt{10011}?',
            ['4', '5', '3', '1'], 'A', r'Append as many zeros as the generator degree, which is 4.'),
        mcq('Modulo-2 subtraction', 'Which operation performs subtraction in CRC modulo-2 division?',
            ['AND', 'XOR', 'OR', 'Decimal subtraction'], 'B',
            'Modulo-2 subtraction is XOR, with no carry or borrow.'),
    ],
    'dccn-original': [
        mcq('Nyquist rate', 'A noiseless channel has bandwidth 3 kHz and four signal levels. What is its Nyquist maximum bit rate?',
            ['3 kbps', '6 kbps', '12 kbps', '24 kbps'], 'C',
            r'$R=2B\log_2L=2(3000)\log_2 4=12000$ bps.'),
        mcq('Bits per symbol', 'How many bits can one of four distinct signal levels represent?',
            ['1', '2', '4', '8'], 'B', r'Four levels represent $\log_2 4=2$ bits per symbol.'),
        mcq('Shannon capacity', 'A channel has bandwidth 3 kHz and linear signal-to-noise ratio 31. What is its Shannon capacity?',
            ['15 kbps', '12 kbps', '93 kbps', '30 kbps'], 'A',
            r'$C=B\log_2(1+S/N)=3000\log_2 32=15000$ bps.'),
        mcq('Tighter rate bound', 'For the same channel and signalling scheme, Nyquist gives 12 kbps and Shannon gives 15 kbps. Which is the tighter upper bound?',
            ['15 kbps', '27 kbps', '3 kbps', '12 kbps'], 'D',
            'Both limits must hold, so the smaller upper bound, 12 kbps, is tighter.'),
        mcq('Nyquist bandwidth change', 'Under the noiseless Nyquist model, what happens to the maximum bit rate when bandwidth doubles and the number of levels stays fixed?',
            ['It halves', 'It stays fixed', 'It doubles', 'It quadruples'], 'C',
            r'$R=2B\log_2L$ is directly proportional to $B$ when $L$ is fixed.'),
    ],
    'dsco-ensemble': [
        mcq('Signed range', r'What is the range of 5-bit two\textquotesingle s-complement integers?',
            ['$-15$ to $15$', '$-16$ to $15$', '$-16$ to $16$', '$0$ to $31$'], 'B',
            r'For $n$ bits, the range is $-2^{n-1}$ to $2^{n-1}-1$, giving $-16$ to $15$.'),
        mcq('Negative representation', r'What is the 5-bit two\textquotesingle s-complement representation of $-9$?',
            [r'\texttt{01001}', r'\texttt{11001}', r'\texttt{10110}', r'\texttt{10111}'], 'D',
            r'Invert \texttt{01001} to get \texttt{10110}, then add 1 to obtain \texttt{10111}.'),
        mcq('Signed overflow', r'Which addition overflows the 5-bit two\textquotesingle s-complement range?',
            ['$-9+5$', '$6-13$', '$11+7$', '$-4+3$'], 'C',
            '$11+7=18$ exceeds the maximum signed value 15; the other results lie in range.'),
        mcq('PLA arrays', 'Which arrays are programmable in a programmable logic array (PLA)?',
            ['Both AND and OR', 'Only AND', 'Only OR', 'Neither'], 'A',
            'A PLA has programmable AND and OR arrays for constructing and combining product terms.'),
        mcq('Shared product term', r'A PLA implements $F_1=AB+AC$ and $F_2=AB+BC$. Which product term can be shared?',
            ['$AC$', '$AB$', '$BC$', '$ABC$'], 'B',
            '$AB$ appears in both outputs and can feed both OR connections.'),
    ],
    'dsco-original': [
        mcq('K-map cell count', 'How many cells are in a four-variable Karnaugh map?',
            ['4', '8', '16', '32'], 'C', r'There is one cell per input combination, so $2^4=16$ cells.'),
        mcq('K-map adjacency', 'How many input variables differ between two adjacent Karnaugh-map cells?',
            ['1', '2', '3', '4'], 'A', 'Gray-code ordering makes adjacent cells differ in exactly one variable.'),
        mcq('SOP grouping', 'Which is a valid group size when minimizing a sum-of-products expression on a Karnaugh map?',
            ['3', '5', '6', '8'], 'D', 'Groups contain a power of two cells; 8 is the only power of two listed.'),
        mcq('Function reduction', r'For $F(A,B,C,D)=\Sigma m(0,2,5,7,8,10,13,15)$, with A most significant, which expression is equivalent?',
            [r'$B\oplus D$', r'$\neg B\neg D+BD$', r'$B+D$', r'$BD$'], 'B',
            r'Every listed minterm has $B=D$. Thus $F=\neg B\neg D+BD$, independent of A and C.'),
        mcq('NAND inverter', 'How can a two-input NAND gate act as an inverter for input X?',
            ['Tie both inputs to 0', 'Leave one input open', 'Tie both inputs to X', 'Tie one input to 0'], 'C',
            r'Connecting both inputs to X gives $\neg(X\cdot X)=\neg X$.'),
    ],
    'dms-ensemble': [
        mcq('Complement conditions', r'Which pair of conditions defines a complement $b$ of $a$ in a Boolean algebra?',
            [r'$a\lor b=0,\ a\land b=1$', r'$a\lor b=1,\ a\land b=0$', r'$a\lor b=a,\ a\land b=b$', r'$a=b$'], 'B',
            'A complement joins with the element to give 1 and meets with it to give 0.'),
        mcq('Complement uniqueness', 'How many complements does each element of a Boolean algebra have?',
            ['None', 'At least two', 'Infinitely many', 'Exactly one'], 'D',
            'Complement existence is a Boolean-algebra property, and distributivity gives uniqueness.'),
        mcq('Boolean simplification', r'Which expression equals $a\lor(\neg a\land b)$?',
            [r'$a\lor b$', r'$a\land b$', r'$\neg a\lor b$', r'$a$'], 'A',
            r'Distribution gives $(a\lor\neg a)\land(a\lor b)=1\land(a\lor b)=a\lor b$.'),
        mcq('Disjunctive normal form', 'Which expression is in disjunctive normal form (a disjunction of conjunctions of literals)?',
            [r'$(x\lor y)\land z$', r'$\neg(x\lor y)$', r'$(x\land y)\lor(\neg x\land z)$', r'$(x\lor y)\land(\neg x\lor z)$'], 'C',
            r'$(x\land y)\lor(\neg x\land z)$ is an OR of two AND terms of literals.'),
        mcq('Conjunctive normal form', 'Which expression is in conjunctive normal form (a conjunction of disjunctions of literals)?',
            [r'$(x\land y)\lor z$', r'$(x\lor y)\land(\neg x\lor z)$', r'$\neg(x\land y)$', r'$(x\land y)\lor(\neg x\land z)$'], 'B',
            r'$(x\lor y)\land(\neg x\lor z)$ is an AND of two OR clauses of literals.'),
    ],
    'dms-original': [
        mcq('Bottom of divisor lattice', r'In the divisibility order on $D_{12}=\{1,2,3,4,6,12\}$, what is the least element?',
            ['$0$', '$2$', '$1$', '$12$'], 'C', '1 divides every element of this set.'),
        mcq('Top of divisor lattice', r'In the divisibility order on $D_{12}=\{1,2,3,4,6,12\}$, what is the greatest element?',
            ['$1$', '$12$', '$6$', '$4$'], 'B', 'Every element of the set divides 12.'),
        mcq('Meet of divisors', r'In the divisor lattice $D_{12}$, what is $4\wedge6$?',
            ['$2$', '$4$', '$6$', '$12$'], 'A', r'The meet is the greatest common divisor, $\gcd(4,6)=2$.'),
        mcq('Join of divisors', r'In the divisor lattice $D_{12}$, what is $4\vee6$?',
            ['$2$', '$4$', '$6$', '$12$'], 'D', r'The join is the least common multiple, $\operatorname{lcm}(4,6)=12$.'),
        mcq('Complement existence', r'Which is a complement of 2 in $D_{12}$, with meet given by gcd and join by lcm?',
            ['$3$', '$6$', 'No element', '$12$'], 'C',
            r'A complement c needs $\gcd(2,c)=1$ and $\operatorname{lcm}(2,c)=12$. The only odd divisors, 1 and 3, give lcms 2 and 6; neither works.'),
    ],
}

REPLACED = {
    'da-ensemble': {'3', '7'}, 'da-original': {'1A'},
    'ds-ensemble': {'6'}, 'ds-original': {'1A'},
    'dccn-ensemble': {'5', '7'}, 'dccn-original': {'1A'},
    'dsco-ensemble': {'1', '5'}, 'dsco-original': {'1A'},
    'dms-ensemble': {'2', '3'}, 'dms-original': {'1A'},
}


def remap_references(text, questions):
    labels = {q['source_label']: q['number'] for q in questions if q['type'] == 'theory'}
    # Explicit prose references only. Never rewrite identifiers or numeric data.
    return re.sub(r'(?i)(question |listing for |reversal for )(\d+[A-C]?)(?!\w)',
                  lambda m: m[1] + labels.get(m[2].upper(), m[2]), text)


def format_questions(name, raw):
    questions = []
    for i, entry in enumerate(BANK[name], 1):
        q = dict(entry, number=str(i), id_suffix=f'mcq-{i}')
        q['latex'] = q['prompt'] + r'\par ' + r'\par '.join(
            f'({label}) {option}' for label, option in zip('ABCD', q['options']))
        questions.append(q)
    for i, entry in enumerate(raw):
        label = str(i + 1) if name.endswith('-ensemble') else str(i // 3 + 1) + 'ABC'[i % 3]
        if label in REPLACED[name]:
            continue
        q = dict(entry, type='theory', source_label=label, id_suffix=label.lower(), number=str(len(questions) + 1))
        if name == 'dms-ensemble' and label == '1':
            # This multipart poset question now carries five marks; its complete
            # proof and diagram remain in the corresponding worked solution.
            q['marks'] = 5
        questions.append(q)
    for q in questions:
        for field in ['latex', 'text']:
            if field in q:
                q[field] = remap_references(q[field], questions)
    assert len(questions[:5]) == 5 and all(q['marks'] == 1 for q in questions[:5])
    assert sum(q['marks'] for q in questions[5:]) == 25, name
    assert all(q['type'] == 'theory' for q in questions[5:])
    return questions


def format_solutions(questions, old_solutions):
    old = {label: (title, body) for label, title, body in old_solutions}
    result = []
    for q in questions:
        if q['type'] == 'mcq':
            title = q['title']
            body = r'\textbf{Correct option: (' + q['answer'] + r').} ' + q['explanation']
        else:
            title, body = old[q['source_label']]
            body = remap_references(body, questions)
        result.append((q['number'], title, body))
    return result
