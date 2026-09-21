from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
import numpy as np
OUT=Path(__file__).resolve().parent/'figures';OUT.mkdir(exist_ok=True)
plt.rcParams.update({'font.size':11,'pdf.fonttype':42,'axes.spines.top':False,'axes.spines.right':False})
def save(fig,name):
 fig.savefig(OUT/(name+'.pdf'),bbox_inches='tight');plt.close(fig)
def hasse(name,coords,edges):
 fig,ax=plt.subplots(figsize=(4,3.3))
 for a,b in edges:ax.plot([coords[a][0],coords[b][0]],[coords[a][1],coords[b][1]],c='black',lw=1)
 for k,(x,y) in coords.items():ax.text(x,y,str(k),ha='center',va='center',bbox=dict(boxstyle='circle,pad=.3',fc='white',ec='black'))
 ax.set_xlim(-1.8,1.8);ax.set_ylim(-.4,3.5);ax.axis('off');save(fig,name)
hasse('hasse-ensemble',{1:(0,0),2:(-1,1),3:(1,1),12:(-1,2),18:(1,2),36:(0,3)},[(1,2),(1,3),(2,12),(2,18),(3,12),(3,18),(12,36),(18,36)])
hasse('hasse-original',{1:(0,0),2:(-1,1),3:(1,1),4:(-1,2),6:(1,2),12:(0,3)},[(1,2),(1,3),(2,4),(2,6),(3,6),(4,12),(6,12)])
for name,stats in [('box-source',dict(med=63,q1=56,q3=78.5,whislo=42,whishi=97,fliers=[])),('box-original',dict(med=9,q1=6,q3=14.5,whislo=3,whishi=16,fliers=[30]))]:
 fig,ax=plt.subplots(figsize=(6,1.4));ax.bxp([stats],vert=False,showfliers=True);ax.set_yticks([]);ax.set_xlabel('Observation');save(fig,name)
def waves(name,bits,diff=False):
 levels=[];prev=-1
 for b in bits:
  first=prev if b=='1' else -prev
  pair=[first,-first] if diff else ([-1,1] if b=='1' else [1,-1])
  levels+=pair;prev=pair[-1]
 ami=[];pol=-1
 for b in bits:
  if b=='1':pol=-pol;ami.append(pol)
  else:ami.append(0)
 fig,axes=plt.subplots(2,1,figsize=(7,2.8),sharex=True)
 for ax,ys,name2 in zip(axes,[levels,ami],['Differential Manchester' if diff else 'Manchester','Bipolar AMI']):
  step=.5 if len(ys)==2*len(bits) else 1
  xx=np.arange(len(ys)+1)*step;ax.step(xx,ys+[ys[-1]],where='post',c='black',lw=1.5)
  ax.set_yticks([-1,0,1],['-','0','+']);ax.set_ylim(-1.6,1.8);ax.set_title(name2,loc='left',fontsize=10)
  for j,b in enumerate(bits):ax.axvline(j,c='0.8',lw=.5);ax.text(j+.5,1.25,b,ha='center',fontsize=9)
  ax.set_xlim(0,len(bits));ax.set_xticks(range(len(bits)+1));ax.spines['left'].set_visible(False)
 axes[-1].set_xlabel('Bit boundary');fig.tight_layout();save(fig,name)
waves('line-source-3','101000101010',True)
waves('line-source-4','111000101010')
waves('line-original','10110010')
for name,data,edges in [('income',[180,200,210,215,220,230,250,270,300,320,400,480],[180,217.5,285,480]),('cholesterol',[145,155,160,162,165,172,180,190,200,220,240,260],[145,163.5,195,260])]:
 fig,axes=plt.subplots(1,2,figsize=(7,2.4))
 for ax,bins,title in zip(axes,[np.linspace(min(data),max(data),4),edges],['Equal width','Equal frequency']):
  counts,es=np.histogram(data,bins=bins);ax.bar(es[:-1],counts/np.diff(es),width=np.diff(es),align='edge',fc='white',ec='black');ax.set_title(title);ax.set_xlabel('Value');ax.set_ylabel('Count / width')
 fig.tight_layout();save(fig,'bins-'+name)
# Block diagrams use explicit gate names and pin functions.
def block_chain(name,blocks,inputs=None):
 fig,ax=plt.subplots(figsize=(7,2.2));n=len(blocks)
 for i,label in enumerate(blocks):
  x=i*2.6;ax.add_patch(Rectangle((x,0),2,1,fc='white',ec='black'));ax.text(x+1,.5,label,ha='center',va='center',fontsize=10)
  if i<n-1:ax.annotate('',xy=(x+2.6,.5),xytext=(x+2,.5),arrowprops=dict(arrowstyle='->'));ax.text(x+2.3,.7,('Q'+str(i)) if inputs=='ripple' else '',ha='center')
 ax.annotate('',xy=(0,.5),xytext=(-.65,.5),arrowprops=dict(arrowstyle='->'));ax.text(-.7,.75,'CLK' if inputs=='ripple' else 'Inputs',ha='center',fontsize=9)
 ax.set_xlim(-1,n*2.6);ax.set_ylim(-.3,1.4);ax.axis('off');save(fig,name)
block_chain('ripple',['JK FF 0\nJ = K = 1\nfalling edge','JK FF 1\nJ = K = 1\nfalling edge','JK FF 2\nJ = K = 1\nfalling edge','JK FF 3\nJ = K = 1\nfalling edge'],'ripple')
def gate_net(name,rows,output):
 fig,ax=plt.subplots(figsize=(7,max(2.4,len(rows)*.62)))
 for i,(inp,gate) in enumerate(rows):
  y=len(rows)-1-i;ax.text(0,y,inp,ha='right',va='center',fontsize=10);ax.annotate('',xy=(1,y),xytext=(.05,y),arrowprops=dict(arrowstyle='->'))
  ax.add_patch(Rectangle((1,y-.22),1.4,.44,fc='white',ec='black'));ax.text(1.7,y,gate,ha='center',va='center',fontsize=10)
  ax.annotate('',xy=(3.6,y),xytext=(2.4,y),arrowprops=dict(arrowstyle='->'))
 cy=(len(rows)-1)/2;ax.add_patch(Rectangle((3.6,-.3),1.5,len(rows)-.4,fc='white',ec='black'));ax.text(4.35,cy,output,ha='center',va='center',fontsize=10)
 ax.set_xlim(-2,5.3);ax.set_ylim(-.65,len(rows)-.35);ax.axis('off');save(fig,name)
gate_net('nand-xnor',[("B, D",'NAND'),("not B, not D",'NAND')],'NAND\nF')
gate_net('nor-source',[("B, D",'NOR'),("not C, D",'NOR'),("A, B, not C",'NOR'),("not B, C, not D",'NOR')],'NOR\nF')
gate_net('comparator2',[("a1, not b1",'AND'),("e1, a0, not b0",'AND')],'OR\nA > B')
gate_net('comparator3',[("a2, not b2",'AND'),("e2, a1, not b1",'AND'),("e2, e1, a0, not b0",'AND')],'OR\nA > B')
# Synchronous counter: every storage element shares the same clock.
for name,labels in [('counter2',['T0 = E','T1 = E AND q0']),('counter3',['T0 = 1','T1 = q0','T2 = q1 AND q0']),('jk-updown',['J_B = K_B = E','J_A = K_A = E AND (B XNOR F)'])]:
 fig,ax=plt.subplots(figsize=(7,2.3));n=len(labels)
 for i,label in enumerate(labels):
  x=i*3;ax.add_patch(Rectangle((x,0),2.5,1,fc='white',ec='black'));ax.text(x+1.25,.62,label,ha='center',fontsize=9);ax.text(x+1.25,.25,('JK flip-flop' if name=='jk-updown' else 'T flip-flop'),ha='center',fontsize=9)
  ax.plot([x+.3,x+.3],[-.5,0],c='black');ax.annotate('',xy=(x+2.9,.5),xytext=(x+2.5,.5),arrowprops=dict(arrowstyle='->'));ax.text(x+2.8,.72,('B' if i==0 else 'A') if name=='jk-updown' else 'q'+str(i),ha='center')
 ax.plot([-.5,(n-1)*3+.3],[-.5,-.5],c='black');ax.text(-.5,-.75,'Shared CLK',fontsize=9);ax.set_xlim(-.6,n*3);ax.set_ylim(-.9,1.3);ax.axis('off');save(fig,name)
fig,ax=plt.subplots(figsize=(5,2.5));ax.add_patch(Rectangle((1,0),2,3,fc='white',ec='black'))
for i,v in enumerate(['C','not C','not C','C']):
 y=2.7-i*.7;ax.text(0,y,v,ha='right',va='center');ax.plot([.1,1],[y,y],c='black');ax.text(1.1,y,'I'+str(i),va='center')
ax.text(2,1.5,'4:1\nMUX',ha='center');ax.annotate('',xy=(4,1.5),xytext=(3,1.5),arrowprops=dict(arrowstyle='->'));ax.text(4.1,1.5,'F',va='center');ax.text(2,-.5,'Selects: A, B',ha='center');ax.plot([2,2],[-.35,0],c='black');ax.set_xlim(-1.1,4.5);ax.set_ylim(-.8,3.2);ax.axis('off');save(fig,'mux')
print('Generated vector solution diagrams')
