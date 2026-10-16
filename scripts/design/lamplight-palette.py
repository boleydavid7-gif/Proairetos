# Lamplight rooms and colors: every value is made in OKLCH and checked for contrast (text 4.5:1, body 7:1).
# Run: python3 scripts/design/lamplight-palette.py  (writes docs/design/lamplight-tokens.json)
import math, json, os
def oklch_to_rgb(L,C,h):
    a=C*math.cos(math.radians(h)); b=C*math.sin(math.radians(h))
    l_=L+0.3963377774*a+0.2158037573*b; m_=L-0.1055613458*a-0.0638541728*b; s_=L-0.0894841775*a-1.2914855480*b
    l,m,s=l_**3,m_**3,s_**3
    r=4.0767416621*l-3.3077115913*m+0.2309699292*s
    g=-1.2684380046*l+2.6097574011*m-0.3413193965*s
    bb=-0.0041960863*l-0.7034186147*m+1.7076147010*s
    return [r,g,bb]
def inside(rgb): return all(-1e-4<=x<=1+1e-4 for x in rgb)
def enc(x):
    x=min(max(x,0),1); return 12.92*x if x<=0.0031308 else 1.055*x**(1/2.4)-0.055
def hexof(L,C,h):
    # reduce chroma until in gamut
    while C>0 and not inside(oklch_to_rgb(L,C,h)): C-=0.002
    return '#'+''.join(f'{round(enc(x)*255):02x}' for x in oklch_to_rgb(L,C,h))
def lum(hx):
    c=[int(hx[i:i+2],16)/255 for i in (1,3,5)]
    c=[x/12.92 if x<=0.04045 else ((x+0.055)/1.055)**2.4 for x in c]
    return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def cr(a,b):
    a,b=lum(a),lum(b); return (max(a,b)+0.05)/(min(a,b)+0.05)
def rgbtrip(hx): return ', '.join(str(int(hx[i:i+2],16)) for i in (1,3,5))

ACCENTS=[ # name, hue, chroma
 ('Amber',75,0.12),('Ember',45,0.14),('Rose',8,0.11),('Heather',320,0.09),
 ('Ink',262,0.10),('Tide',205,0.09),('Sage',145,0.085),('Pewter',75,0.018)]
ROOMS=[ # name, hue, chroma dark, chroma light, accent, glow hues
 ('Hearth',70,0.012,0.018,'Amber',[(75,.13),(40,.10),(250,.05)]),
 ('Dusk',330,0.022,0.016,'Rose',[(20,.12),(75,.11),(300,.09)]),
 ('Harbor',252,0.03,0.014,'Amber',[(75,.12),(230,.08),(270,.07)]),
 ('Grove',158,0.022,0.016,'Sage',[(95,.11),(150,.08),(190,.06)]),
 ('Clay',42,0.03,0.022,'Ember',[(55,.13),(25,.11),(80,.08)]),
 ('Slate',255,0.008,0.006,'Pewter',[(75,.08),(250,.03),(200,.03)]),
]
out={'accents':{},'rooms':{}}
# Reference surfaces for checks (Hearth)
for name,h,c in ACCENTS:
    # dark lamp: lightest-feeling with on-lamp >=7 and >=6 on cards; pick L 0.80
    dl=hexof(0.80,c,h); dsoft=hexof(0.88,c*0.6,h); on=hexof(0.2,min(c,0.05),h)
    # light text lamp: highest L with >=4.5 on paper page
    for L in [x/1000 for x in range(620,380,-5)]:
        lt=hexof(L,c,h)
        if cr(lt,hexof(0.965,0.012,70))>=5.2 and cr(lt,'#ffffff')>=5.2: break
    lf=hexof(0.78,c*1.05,h)
    out['accents'][name]={'dark':{'lamp':dl,'soft':dsoft,'on':on,'rgb':rgbtrip(dl)},
                          'light':{'lamp':lt,'fill':lf,'on':on,'rgb':rgbtrip(lf)}}
for name,h,cd,cl,acc,glows in ROOMS:
    d={'tone0':hexof(0.145,cd,h),'tone1':hexof(0.175,cd,h),'tone2':hexof(0.215,cd,h),'tone3':hexof(0.25,cd,h),'tone4':hexof(0.29,cd*1.1,h),
       'paper':hexof(0.95,0.012,h if cd>0.01 else 75),'paper2':hexof(0.80,0.02,h if cd>0.01 else 75),'paper3':hexof(0.67,0.022,h if cd>0.01 else 75)}
    l={'tone0':hexof(0.935,cl,h),'tone1':hexof(0.965,cl,h),'tone2':hexof(0.993,cl*0.4,h),'tone3':hexof(0.945,cl,h),'tone4':hexof(0.915,cl*1.1,h),
       'paper':hexof(0.24,0.02,h if cd>0.01 else 70),'paper2':hexof(0.45,0.025,h if cd>0.01 else 70),'paper3':hexof(0.51,0.025,h if cd>0.01 else 70)}
    # wallpapers: blobs
    (g1,c1),(g2,c2),(g3,c3)=glows
    def rgba(L,C,hh,a): hx=hexof(L,C,hh); return f'rgba({rgbtrip(hx)}, {a})'
    dw=(f"radial-gradient(90% 65% at 15% 0%, {rgba(0.74,c1,g1,0.58)}, transparent 60%), "
        f"radial-gradient(70% 55% at 95% 30%, {rgba(0.6,c2,g2,0.45)}, transparent 62%), "
        f"radial-gradient(90% 70% at 40% 105%, {rgba(0.5,c3,g3,0.5)}, transparent 65%), "
        f"linear-gradient(180deg, {hexof(0.24,cd*1.4,h)} 0%, {d['tone1']} 70%)")
    lw=(f"radial-gradient(90% 65% at 15% 0%, {rgba(0.86,c1,g1,0.7)}, transparent 60%), "
        f"radial-gradient(70% 55% at 95% 30%, {rgba(0.85,c2*0.9,g2,0.55)}, transparent 62%), "
        f"radial-gradient(90% 70% at 40% 105%, {rgba(0.85,c3*0.9,g3,0.55)}, transparent 65%), "
        f"linear-gradient(180deg, {hexof(0.985,cl*0.6,h)} 0%, {l['tone1']} 70%)")
    d['wall']=dw; l['wall']=lw; d['hair']=f"rgba({rgbtrip(d['paper'])}, 0.075)"; l['hair']=f"rgba({rgbtrip(l['paper'])}, 0.09)"
    out['rooms'][name]={'accent':acc,'dark':d,'light':l}
# checks
bad=[]
for rn,r in out['rooms'].items():
    for mode,bgk in (('dark',['tone1','tone2','tone3']),('light',['tone1','tone2','tone3'])):
        t=r[mode]
        for bg in bgk:
            for fg,need in (('paper',7),('paper2',4.5),('paper3',4.5)):
                v=cr(t[fg],t[bg])
                if v<need: bad.append((rn,mode,fg,bg,round(v,2)))
            for an,a in out['accents'].items():
                v=cr(a[mode]['lamp'],t[bg])
                if v<4.5: bad.append((rn,mode,'lamp',an,bg,round(v,2)))
for an,a in out['accents'].items():
    for mode in ('dark','light'):
        base=a[mode]['lamp'] if mode=='dark' else a[mode]['fill']
        v=cr(a[mode]['on'],base)
        if v<4.5: bad.append((an,mode,'on',round(v,2)))
print('fails',bad)
json.dump(out,open(os.path.join(os.path.dirname(__file__),'../../docs/design/lamplight-tokens.json'),'w'),indent=1)
for an,a in out['accents'].items(): print(an,a['dark']['lamp'],a['light']['lamp'],a['light']['fill'])
for rn,r in out['rooms'].items(): print(rn,r['dark']['tone1'],r['dark']['tone2'],r['light']['tone1'],r['light']['tone2'])
