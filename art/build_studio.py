"""Build the painted miniature in Blender and export the interactive pieces."""
from pathlib import Path
import json
import math
import random
import subprocess
import bpy
import numpy as np

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent / "assets"
OUT = HERE.parent / "studio/models"
OUT.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
rng = random.Random(1224)
sin, cos, tau = math.sin, math.cos, math.tau

def group(name):
    obj=bpy.data.objects.new(name,None)
    bpy.context.collection.objects.link(obj)
    return obj

def painted(name,path,cutout=False,metal=0,rough=.84):
    material=bpy.data.materials.new(name)
    material.use_nodes=True
    nodes=material.node_tree.nodes
    shader=nodes.get('Principled BSDF')
    image=bpy.data.images.load(str(path),check_existing=True)
    tex=nodes.new('ShaderNodeTexImage')
    tex.image=image
    tex.extension='EXTEND'
    material.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
    shader.inputs['Roughness'].default_value=rough
    shader.inputs['Metallic'].default_value=metal
    if cutout:
        # Hard coverage avoids sorting entire textured branches against one another.
        clip=nodes.new('ShaderNodeMath')
        clip.operation='GREATER_THAN'
        clip.inputs[1].default_value=.32
        material.node_tree.links.new(tex.outputs['Alpha'],clip.inputs[0])
        material.node_tree.links.new(clip.outputs[0],shader.inputs['Alpha'])
    return material,image

def surface(parent,name,material,verts,faces,coords,smooth=True):
    data=bpy.data.meshes.new(name)
    data.from_pydata(verts,[],faces)
    data.update()
    uv=data.uv_layers.new(name='Paint')
    for loop in data.loops:
        uv.data[loop.index].uv=coords[loop.vertex_index]
    for face in data.polygons:
        face.use_smooth=smooth
    obj=bpy.data.objects.new(name,data)
    bpy.context.collection.objects.link(obj)
    obj.parent=parent
    obj.data.materials.append(material)
    return obj

def pixels(image):
    w,h=image.size
    array=np.empty(w*h*4,dtype=np.float32)
    image.pixels.foreach_get(array)
    return array.reshape(h,w,4)

def strip_faces(cols,rows):
    return [(a,a+1,a+1+cols,a+cols) for j in range(rows-1)
            for i in range(cols-1) for a in [j*cols+i]]

def lathe(parent,name,mat,alpha,y0,y1,width,height,bottom):
    # Each horizontal ring follows the original painted silhouette. Front/back UVs
    # meet at the outermost texels, so the paint wraps continuously around it.
    h,w=alpha.shape
    verts=[];uv=[]
    levels=55
    slices=48
    for j in range(levels):
        f=j/(levels-1)
        v=y0+(y1-y0)*f
        row=np.where(alpha[min(h-1,int(v*h))]>.38)[0]
        if not len(row): left=right=.5
        else: left,right=(row[[0,-1]]+.5)/w
        middle=(left+right)*.5
        radius=max(.001,(right-left)*width*.50)
        for k in range(slices+1):
            a=tau*k/slices
            r=radius
            x=cos(a)
            z=bottom+height*f
            verts.append((r*x,r*sin(a),z))
            uv.append((middle+(right-left)*.488*x,v))
    surface(parent,name,mat,verts,strip_faces(slices+1,levels),uv)

import sys
sys.path.insert(0,str(HERE))
from room_geometry import furnish

def flat(name,rgb):
    material=bpy.data.materials.new(name)
    material.use_nodes=True
    shader=material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value=(*rgb,1)
    shader.inputs['Roughness'].default_value=.87
    return material

def build_room(model,key):
    room=group(model)
    wall,_=painted(key,ASSETS/(key+'.webp'))
    wood,_=painted('Oiled boards',HERE/'textures'/'boards.jpg')
    honey,_=painted('Honey oak',HERE/'textures'/'honey.jpg')
    tint={'room':(.053,.113,.086),'market':(.072,.118,.145),'bakery':(.34,.128,.077)}[key]
    materials=[flat('Walnut',(.102,.043,.021)),wood,honey,flat('Limewash',tint),
        flat('Antique brass',(.55,.34,.10)),flat('Cream glaze',(.69,.56,.37)),
        flat('Oxblood',(.26,.041,.042)),flat('Book cloth',(.043,.091,.103))]
    furnish(room,key,wall,materials,surface)

for model,key in [('Cabin','room'),('Market','market'),('Bakery','bakery')]:
    build_room(model,key)

sites=json.loads((HERE/'hanging-sites.json').read_text())
def build_tree(model,key):
    tree=group(model)
    pine,image=painted(key+' needles',ASSETS/(key+'.webp'),True)
    # Keep the dark brushwork visible where several foliage layers cast shadows.
    nodes=pine.node_tree.nodes
    shader=nodes.get("Principled BSDF")
    tex=next(n for n in nodes if n.type=="TEX_IMAGE")
    pine.node_tree.links.new(tex.outputs["Color"],shader.inputs["Emission Color"])
    shader.inputs["Emission Strength"].default_value=.38
    alpha=pixels(image)[:,:,3]
    # Deeply curved radial layers keep the illustrated needle silhouette intact.
    # Offset the middle of each layer towards its own side of the tree for parallax.
    verts=[];uv=[];faces=[]
    for layer in range(6):
        angle=tau*layer/6
        start=len(verts)
        for j in range(45):
            f=j/44
            v=.084+.914*f
            taper=(1-f)**.79
            for i in range(33):
                u=i/32
                lateral=(u-.5)*2.50
                bulge=.56*taper*max(0,1-(2*u-1)**2)
                x=lateral*cos(angle)-bulge*sin(angle)
                y=lateral*sin(angle)+bulge*cos(angle)
                z=.44+2.98*f+.035*sin(angle*3+f*13)*(1-f)
                verts.append((x,y,z));uv.append((u,v))
        faces.extend(tuple(start+k for k in face) for face in strip_faces(33,45))
    surface(tree,'Layered painted fir',pine,verts,faces,uv)
    lathe(tree,'Woven willow basket',pine,alpha,.003,.085,2.34,.29,.19)
    # Arched outer branch fans add real overlap, depth and irregular tips at every angle.
    batches=[([],[],[]) for _ in range(3)]
    for k,(x,z,front) in enumerate(sites):
        y=-front
        a=math.atan2(y,x)
        r=math.hypot(x,y)
        f=(z-.6)/2.8
        width=.035+.085*(1-f)
        variant=k%3
        verts,uv,faces=batches[variant]
        for fork in [-1,0,1]:
            start=len(verts)
            twist=rng.uniform(-.18,.18)
            turn=fork*.19
            relative=abs(fork)/2
            reach_tip=r*(.99-.13*relative)*rng.uniform(.98,1.035)
            tilt=rng.uniform(-.45,.45)
            for j in range(7):
                t=j/6
                direction=a+turn*t+twist*(1-t)
                reach=r*.24*(1-t)+reach_tip*t
                for i in range(5):
                    side=(i-2)/2
                    spread=side*width*(1.13-.23*relative)
                    zz=z+(.095+.08*(1-f))*(1-t)+.080*sin(t*math.pi)-side*side*.085*(1-f)+tilt*spread+.065*relative
                    verts.append((reach*cos(direction)-spread*sin(direction),
                                  reach*sin(direction)+spread*cos(direction),zz))
                    uv.append((t,(side+1)/2))
            faces.extend(tuple(start+i for i in face) for face in strip_faces(5,7))
    for i,(verts,uv,faces) in enumerate(batches):
        mat,_=painted('Painted needle tips '+str(i),HERE/'textures'/f'spray-{i}.png',True)
        surface(tree,'Branch fans '+str(i),mat,verts,faces,uv)

for model,key in [('Evergreen','pine'),('TallFir','fir'),('SnowSpruce','spruce')]:
    build_tree(model,key)

def puffed(parent,mat,image,width,height,bottom,depth):
    # Two sculpted surfaces follow the alpha outline. The distance to the edge
    # controls thickness through holes and into thin ribbon tails and star points.
    img=pixels(image);h,w=img.shape[:2]
    cols=53;rows=max(25,round(cols*h/w))
    xs=np.linspace(0,w-1,cols).astype(int);ys=np.linspace(0,h-1,rows).astype(int)
    inside=img[ys[:,None],xs,3]>.20
    inside[[0,-1],:]=False;inside[:,[0,-1]]=False
    dist=np.zeros(inside.shape);layer=inside.copy()
    while layer.any():
        dist+=layer
        layer=layer & np.roll(layer,1,0) & np.roll(layer,-1,0) & np.roll(layer,1,1) & np.roll(layer,-1,1)
    rounding=np.sqrt(np.minimum(1,dist/max(1,dist.max())))
    verts=[];uv=[];faces=[];boundary={}
    for side in [-1,1]:
        for j in range(rows):
            v=j/(rows-1)
            for i in range(cols):
                u=i/(cols-1)
                verts.append(((u-.5)*width,side*(.003+depth*rounding[j,i]),bottom+height*v))
                uv.append((u,v))
    n=cols*rows
    for face in strip_faces(cols,rows):
        if not any(inside.flat[i] for i in face):continue
        faces.extend([face,tuple(i+n for i in reversed(face))])
        for a,b in zip(face,face[1:]+face[:1]):
            edge=tuple(sorted([a,b]))
            if edge in boundary:del boundary[edge]
            else:boundary[edge]=(a,b)
    faces.extend((a,a+n,b+n,b) for a,b in boundary.values())
    surface(parent,parent.name+' carving',mat,verts,faces,uv)

catalog=json.loads(subprocess.check_output([
    'node','--input-type=module','-e',
    "import {items} from './scene.js'; console.log(JSON.stringify(items))"
],cwd=HERE.parent))
for key,item in catalog.items():
    obj=group('Item_'+key)
    mat,image=painted('Paint · '+key,ASSETS/(key+'.webp'),True,
        .19 if key in ['gold','bell','star'] else .035,.54 if key in ['red','gold','blue'] else .79)
    w,h=image.size
    height={'gift-red':.37,'star':.45,'bow':.26,'bell':.26}.get(key, .285 if item['category']=='ball' else item['size']*.0047)
    bottom=0 if item['category'] in ['topper','floor'] else -height
    if item['category']=='ball':
        # Preserve the opening in the metal hanging loop on a separate sculpted cap.
        cap=.77
        lathe(obj,'Lacquered glass',mat,pixels(image)[:,:,3],.003,cap,
              height*w/h,height*cap,bottom)
        # Crop alpha for the cap while preserving its UVs using a dedicated relief.
        cap_img=pixels(image)
        cap_img[:int(cap*h),:,:]=0
        temp=bpy.data.images.new('cap stencil',w,h,alpha=True)
        temp.pixels.foreach_set(cap_img.ravel())
        puffed(obj,mat,temp,height*w/h,height,bottom,.024)
        bpy.data.images.remove(temp)
    else:
        puffed(obj,mat,image,height*w/h,height,bottom,{'gift-red':.135,'bell':.077,'star':.06,'bow':.048}.get(key,.10 if item['category']=='floor' else .028))

(OUT/'anchors.json').write_text(json.dumps(sites,separators=(',',':')))
for root in [o for o in bpy.data.objects if o.type=='EMPTY']:
    bpy.ops.object.select_all(action='DESELECT')
    for ob in [root,*root.children]:ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/(root.name+'.glb')),use_selection=True,
        export_format='GLB',export_image_format='AUTO',export_meshopt_compression_enable=True,
        export_lights=False,export_cameras=False)
for i,root in enumerate(sorted((o for o in bpy.data.objects if o.type=='EMPTY' and o.name.startswith('Item_')),key=lambda o:o.name)):
    root.location=(3+i%4*.58,-1,.55+(i//4)*.67)
for i,model in enumerate(['Market','Bakery','TallFir','SnowSpruce']):
    bpy.data.objects[model].location.x=(i+1)*30
bpy.ops.file.pack_all()
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'Snow Window.blend'),compress=True)
