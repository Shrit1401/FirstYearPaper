import json,re
from pathlib import Path
rows=json.load(open('public/midsem/archive.json'))
topics={'Differential equations':r'differential equation|ordinary differential|ODE\b','Matrices and eigenvalues':r'eigenvalue|eigenvector|matrix|matrices','Integration':r'integral|integrat','Probability':r'probability|binomial distribution|Poisson','Circuit analysis':r'Kirchhoff|Thevenin|Norton|mesh analysis|nodal analysis','Semiconductors':r'semiconductor|diode|transistor','C programming':r'\bC program|printf|scanf','Linked lists':r'linked list','Stacks and queues':r'\bstack\b|\bqueue\b','Boolean algebra':r'Boolean|Karnaugh|K.map','Computer networks':r'protocol|bandwidth|CRC|network topology','Graphs and relations':r'Dijkstra|partial order|equivalence relation|graph theory'}
results=[]
for title,pattern in topics.items():
 matches=[]
 for row in rows:
  p=json.load(open('public/repeat-v2/papers/'+row['id']+'.json'))
  for q in p['questions']:
   if re.search(pattern,q['markdown'],re.I):matches.append({'paperId':p['id'],'paper':p['name'].replace('(verified)',''),'subject':p['subject'],'number':q['number'],'markdown':q['markdown'],'href':p['href']})
 if matches:results.append({'title':title,'paperCount':len(set(m['paperId'] for m in matches)),'questionCount':len(matches),'examples':matches[:4]})
Path('public/midsem/topics.json').write_text(json.dumps(sorted(results,key=lambda x:-x['paperCount']),ensure_ascii=False,indent=2));print(len(results),'archive topic groups')
