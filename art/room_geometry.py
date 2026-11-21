"""Closed, furnished rooms around the central decorating area (Blender Z up)."""
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
    trim,wood,honey,plaster,brass,cranberry,pantry,decor=materials
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
        # Match the plaster through the corner. The original painting sits
        # between timber uprights, leaving a return of the same finish on both sides.
        for i in range(4):
            u0,u1=(0,1) if i%2==0 else (1,0)
            panel((-1.5+i)*2.8,half-.012,floor,2.8,ceiling-floor,plaster,(u0,0,u1,1))
        if wall==0:
            panel(0,half-.028,floor,9.48,ceiling-floor,art,(0,.16,1,1))
            for x in (-4.78,4.78):
                box(x,half-.10,2.96,.13,.17,5.54,trim)
        # Skirting and crown mouldings turn every corner at the same elevation.
        for x in (-half+.075,half-.075):
            box(x,half-.078,2.96,.15,.16,5.54,trim)
        for z,d,h,mat in [(.32,.19,.25,wood),(.47,.22,.052,honey),
                          (5.48,.22,.14,trim),(5.38,.19,.055,honey)]:
            box(0,half-d/2,z,11.20,d,h,mat)
        if wall:
            # A pair of graduated evergreen swags bridges each beam and side wall.
            panel(-4.08,5.34,4.53,2.92,.98,decor['garland'],(0,0,1,1))
            panel(4.08,5.34,4.53,2.92,.98,decor['garland'],(1,0,0,1))
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
    panel(-1.35,5.28,2.11,.83,.87,decor['wreath'],(0,0,1,1))
    # Give the painted still life an actual cabinet with recessed compartments,
    # shelf lips, side cheeks and a panelled cupboard below.
    wall=3
    for x in (-1.60,1.60):
        box(x,5.17,1.94,.15,.65,3.48,trim)
    box(0,5.43,1.94,3.31,.15,3.48,wood)
    # The bakery source contains three hand-painted rows of jars, gifts and biscuits.
    rows=[(1.22,.69,(.036,.415,.222,.53)),
                   (2.03,.66,(.035,.543,.222,.64)),
                   (2.81,.68,(.023,.65,.219,.795))]
    if key=='market':
        pantry=art
        rows=[(1.22,.69,(.023,.333,.265,.410)),
              (2.03,.66,(.80,.336,.968,.419)),
              (2.81,.68,(.785,.426,.966,.520))]
    for i,(z,h,uv) in enumerate(rows):
        panel(-.78,5.32,z,1.50,h,pantry,uv)
        panel(.78,5.32,z,1.50,h,pantry,rows[(i+1)%len(rows)][2])
        box(0,5.17,z+h/2,.06,.35,h,trim)
        box(0,5.10,z-.053,3.38,.65,.11,honey)
        box(0,4.78,z-.085,3.40,.07,.042,trim)
    for x in (-.775,.775):
        box(x,5.10,.72,1.49,.54,.97,wood)
        box(x,4.80,.72,1.24,.055,.70,honey)
        box(x+(.51 if x<0 else -.51),4.74,.90,.075,.09,.075,brass)
    box(0,5.11,3.58,3.48,.74,.14,wood)
    box(0,5.11,3.68,3.63,.79,.09,honey)
    for mat,(verts,faces,uv) in batches.items():
        surface(root,mat.name,mat,verts,faces,uv,False)
