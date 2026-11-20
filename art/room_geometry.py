"""Closed, furnished rooms around the central decorating area (Blender Z up)."""
from math import cos, sin, pi
from collections import defaultdict

def furnish(root, key, art, materials, surface):
    batches = defaultdict(lambda: ([], [], []))
    # Rotate local furniture coordinates to face the room from each wall.
    wall = 0
    def point(p):
        x,y,z=p
        return [(x,y,z),(-y,x,z),(-x,-y,z),(y,-x,z)][wall]
    def quad(corners, mat, uv=(0,0,1,1)):
        vs,fs,st=batches[mat]
        i=len(vs); vs.extend(point(p) for p in corners); fs.append(tuple(range(i,i+4)))
        u,v,r,t=uv;st.extend([(u,v),(r,v),(r,t),(u,t)])
    def box(x,y,z,w,d,h,mat):
        l,r=x-w/2,x+w/2; a,b=y-d/2,y+d/2;lo,hi=z-h/2,z+h/2
        for pts in [
            [(l,a,lo),(r,a,lo),(r,a,hi),(l,a,hi)],
            [(r,b,lo),(l,b,lo),(l,b,hi),(r,b,hi)],
            [(r,a,lo),(r,b,lo),(r,b,hi),(r,a,hi)],
            [(l,b,lo),(l,a,lo),(l,a,hi),(l,b,hi)],
            [(l,a,hi),(r,a,hi),(r,b,hi),(l,b,hi)],
            [(l,b,lo),(r,b,lo),(r,a,lo),(l,a,lo)]]:
            quad(pts,mat)
    def panel(x,y,z,w,h,mat,uv):
        quad([(x-w/2,y,z),(x+w/2,y,z),(x+w/2,y,z+h),(x-w/2,y,z+h)],mat,uv)
    def frame(x,y,z,w,h):
        for side in (-1,1):box(x+side*w/2,y,z+h/2,.10,.13,h+.12,trim)
        for level in (z,z+h):box(x,y,level,w+.14,.16,.10,trim)
    def turned(x,y,z,profile,mat,n=18):
        for (h1,r1),(h2,r2) in zip(profile,profile[1:]):
            for i in range(n):
                a=i*2*pi/n;b=(i+1)*2*pi/n
                quad([(x+r1*cos(a),y+r1*sin(a),z+h1),(x+r1*cos(b),y+r1*sin(b),z+h1),
                      (x+r2*cos(b),y+r2*sin(b),z+h2),(x+r2*cos(a),y+r2*sin(a),z+h2)],mat)
    trim,wood,honey,plaster,brass,ivory,cranberry,navy=materials
    half=5.6;floor=.196;ceiling=5.75
    # Individual boards break up the floor grain without stretching a border pixel.
    for j in range(24):
        y=-half+2*half*j/24
        x=-half
        for length in ([1.4,2.8,2.8,2.8,1.4] if j%2 else [2.8]*4):
            box(x+length/2,y+half/24,floor-.045,length-.008,half/12-.006,.09,[wood,honey,wood][(j+round(x))%3])
            x+=length
    box(0,0,floor-.127,11.3,11.3,.13,trim)
    box(0,0,ceiling+.06,11.3,11.3,.12,wood)
    for x in (-4.2,-2.1,0,2.1,4.2):box(x,0,ceiling-.08,.17,11.2,.21,trim)
    for wall in range(4):
        box(0,half+.08,(ceiling+floor)/2,11.38,.16,ceiling-floor+.02,plaster)
        if wall==0:
            panel(0,half-.016,floor,half*2,ceiling-floor,art,(0,.16,1,1))
        else:
            for x in range(-5,6):
                box(x,half-.06,.82,.91,.095,1.22,wood)
                box(x,half-.11,.82,.79,.042,.97,trim)
            box(0,half-.14,1.47,half*2,.21,.11,honey)
        for x in (-half+.08,half-.08):box(x,half-.09,2.96,.18,.22,5.54,trim)
        for z in (.255,5.52):box(0,half-.10,z,11.17,.22,.16,trim)
    # Window seat and picture window on the west wall.
    wall=1
    panes={'room':(.105,.32,.267,.87),'bakery':(.82,.45,.94,.90),'market':(.02,.22,.92,.94)}
    panel(-.55,5.51,1.97,3.65,2.76,art,panes[key])
    frame(-.55,5.43,1.97,3.65,2.76)
    box(-.55,5.40,3.34,.065,.09,2.75,trim)
    box(-.55,5.40,3.42,3.65,.09,.065,trim)
    for x in (-1.93,.83):box(x,5.05,.56,.14,.52,.72,trim)
    box(-.55,5.01,.95,3.4,.76,.16,honey)
    box(-.55,4.99,1.07,3.18,.66,.11,cranberry)
    # A recessed-panel door and a framed seasonal print distinguish the back wall.
    wall=2
    box(-1.35,5.48,1.87,1.88,.14,3.34,wood)
    frame(-1.35,5.37,floor,1.95,3.40)
    for z in (1.04,2.60):
        for x in (-1.80,-.90):box(x,5.365,z,.72,.10,1.28,trim)
    box(-.63,5.265,1.85,.12,.14,.17,brass)
    panel(2.05,5.48,2.15,1.9,1.51,art,panes[key])
    frame(2.05,5.42,2.15,1.9,1.51)
    # Freestanding bookcase with pottery, books and candles.
    wall=3
    for x in (-1.92,1.92):box(x,5.13,1.98,.16,.78,3.58,trim)
    box(0,5.47,1.98,3.89,.12,3.58,wood)
    for level in (.36,1.36,2.42,3.69):box(0,5.08,level,4.06,.85,.13,honey)
    for j in range(9):
        h=.49+.17*sin(2.3*j)
        box(-1.55+j*.20,5.05,.43+h/2,.16,.41,h,[navy,cranberry,ivory][j%3])
        box(-1.55+j*.20,4.837,.52,.15,.018,.03,brass)
    for x,h in [(-1.25,.60),(.38,.46),(1.17,.70)]:
        turned(x,5.0,1.425,[(0,.16),(.12*h,.22),(.62*h,.29),(.84*h,.14),(h,.12),(h,.075)],ivory)
    for x,h in [(-1.26,.48),(-.91,.31),(.80,.54),(1.14,.41)]:
        turned(x,5.04,2.485,[(0,.15),(.045,.15),(.09,.075),(.13,.09)],brass)
        turned(x,5.04,2.61,[(0,.067),(h,.067),(h,.001)],ivory)
    for mat,(verts,faces,uv) in batches.items():
        surface(root,mat.name,mat,verts,faces,uv,False)
