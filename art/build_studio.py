"""Run with Blender --background --factory-startup --python art/build_studio.py."""
import bpy
import math
import random
from pathlib import Path
from mathutils import Vector

out = Path(__file__).resolve().parents[1] / "studio" / "models"
out.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
rng = random.Random(1224)
tau = math.tau
sin, cos, pi = math.sin, math.cos, math.pi

def paint(name, rgb, metal=0, rough=.6):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bs = m.node_tree.nodes.get("Principled BSDF")
    for key, value in [("Base Color", (*rgb, 1)), ("Metallic", metal), ("Roughness", rough)]:
        bs.inputs[key].default_value = value
    return m

gold = paint("Antique brass", (.72,.39,.095), .55,.28)
trim = paint("Honey oak", (.36,.16,.052))
wood = paint("Walnut", (.13,.055,.024))
cream = paint("Ivory", (.92,.76,.49))
red = paint("Garnet lacquer", (.54,.029,.045), .24,.25)
blue = paint("Glacier enamel", (.18,.43,.53), .23,.27)
green = paint("Velvet pine", (.026,.145,.10))
sugar = paint("Sugar glaze", (.96,.86,.68), .1,.32)
leaf = [paint("Fir %s" % i, col) for i,col in enumerate([
    (.016,.092,.048),(.026,.145,.078),(.052,.209,.107),(.083,.256,.13)])]
night = paint("Winter sky", (.079,.17,.26))
plaster = paint("Sage wainscot", (.13,.20,.16))
rug = paint("Cranberry wool", (.31,.055,.056))
snow = paint("Moonlit snow", (.63,.74,.76))
ginger = paint("Spiced biscuit", (.59,.235,.068))

def group(name):
    ob = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(ob)
    return ob

def finish(material, parent):
    ob = bpy.context.object
    ob.data.materials.append(material)
    ob.parent = parent
    return ob

def cube(pos, scale, material, parent):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    ob = finish(material,parent)
    ob.dimensions = scale
    return ob

def ball(pos, scale, material, parent):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, location=pos)
    ob = finish(material,parent)
    ob.scale = scale
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob

def cone(pos, r1, r2, h, material, parent, n=32):
    bpy.ops.mesh.primitive_cone_add(vertices=n,radius1=r1,radius2=r2,depth=h,location=pos)
    return finish(material,parent)

def ring(pos, major, minor, material, parent, vertical=False):
    bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=6,location=pos,
        major_radius=major,minor_radius=minor,rotation=(pi/2 if vertical else 0,0,0))
    return finish(material,parent)

def line(points, radius, material, parent):
    cu=bpy.data.curves.new("Cord","CURVE")
    cu.dimensions="3D"
    cu.bevel_depth=radius
    cu.bevel_resolution=1
    spline=cu.splines.new("POLY")
    spline.points.add(len(points)-1)
    for p,xyz in zip(spline.points, points):
        p.co=(*xyz,1)
    ob=bpy.data.objects.new("Cord",cu)
    bpy.context.collection.objects.link(ob)
    cu.materials.append(material)
    ob.parent=parent

def mesh(name, verts, faces, material, parent):
    data=bpy.data.meshes.new(name)
    data.from_pydata(verts,[],faces)
    data.update()
    ob=bpy.data.objects.new(name,data)
    bpy.context.collection.objects.link(ob)
    data.materials.append(material)
    ob.parent=parent
    return ob

def star(parent, center, radius, material):
    x,y,z=center
    edge=[(x+sin(i*pi/5)*radius*(.45 if i%2 else 1),y,
           z+cos(i*pi/5)*radius*(.45 if i%2 else 1)) for i in range(10)]
    mesh("Folded star",edge+[(x,y-radius*.32,z),(x,y+radius*.32,z)],
         [(10,(i+1)%10,i) for i in range(10)]+[(11,i,(i+1)%10) for i in range(10)],material,parent)

def combine(parent):
    parts=list(parent.children)
    bpy.ops.object.select_all(action="DESELECT")
    for ob in parts:
        ob.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.convert(target="MESH")
    bpy.ops.object.join()
    bpy.context.scene.cursor.location=(0,0,0)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)

room=group("Cabin")
cube((0,0,-.20),(18,14,.18),wood,room)
for i in range(19):
    cube(((i-9)*.72,0,-.105),(.711,13,.04),trim if i%4==0 else wood,room)
cube((0,2.65,2),(16,.15,5),plaster,room)
for x in range(-8,9):
    cube((x*.81,2.53,1.2),(.044,.10,2.5),wood,room)
cube((0,2.5,2.42),(16,.18,.10),trim,room)
# An inset picture window with brass mullions, snow, and distant spruce silhouettes.
wx=-1.68
cube((wx,2.42,2.82),(2.52,.11,2.14),night,room)
for k in range(19):
    x=wx+rng.uniform(-1.18,1.18)
    z=rng.uniform(1.84,3.82)
    ball((x,2.34,z),(.012,.008,.012),snow,room)
for i in range(11):
    x=wx+(i-5)*.212
    h=rng.uniform(.26,.64)
    cone((x,2.29,1.77+h/2),.16,0,h,green,room,7)
for x in [wx-1.31,wx,wx+1.31]:
    cube((x,2.23,2.8),(.075,.16,2.28),trim,room)
for z in [1.67,2.77,3.95]:
    cube((wx,2.23,z),(2.7,.16,.073),trim,room)
cube((wx,2.14,1.63),(2.94,.45,.09),cream,room)
# Framed star print on the opposite wall.
cube((2.05,2.38,2.88),(1.20,.13,1.46),gold,room)
cube((2.05,2.28,2.88),(1.10,.05,1.36),green,room)
star(room,(2.05,2.23,2.88),.40,cream)
# A reading lamp beside the window casts a warm pool on the wood.
cube((2.35,.67,.63),(.98,.64,.13),trim,room)
for x in (1.96,2.74):
    for y in (.43,.91):
        cube((x,y,.24),(.078,.078,.69),wood,room)
cone((2.35,.67,.72),.19,.16,.055,gold,room)
cone((2.35,.67,1.03),.032,.032,.62,gold,room)
shade=paint("Linen lampshade",(.87,.56,.25))
shader=shade.node_tree.nodes.get("Principled BSDF")
shader.inputs["Emission Color"].default_value=(1,.53,.18,1)
shader.inputs["Emission Strength"].default_value=.65
cone((2.35,.67,1.43),.31,.15,.39,shade,room,24)
ring((2.35,.67,1.235),.305,.012,gold,room)
ball((wx+.83,2.34,3.52),(.15,.017,.15),cream,room)
combine(room)

tree=group("Evergreen")
cone((0,0,.04),1.75,1.75,.20,wood,tree,96)
cone((0,0,.15),1.72,1.69,.07,trim,tree,96)
cone((0,0,.195),1.51,1.51,.035,rug,tree,96)
ring((0,0,.217),1.44,.012,gold,tree)
ring((0,0,.217),1.37,.009,cream,tree)
cone((0,0,.51),.13,.10,.60,wood,tree)
# Folded, serrated sprays and their side shoots share one mesh per needle colour.
batches=[([],[]) for m in leaf]
def spray(origin, angle, length, breadth, rise, shade):
    verts, faces=batches[shade]
    start=len(verts)
    forward=Vector((cos(angle),sin(angle),0))
    side=Vector((-sin(angle),cos(angle),0))
    for j in range(10):
        t=j/9
        mid=origin+forward*(length*t)
        mid.z += rise*t+.077*sin(pi*t)
        w=breadth*(1-t*.96)*(.70 if j%2 else 1)
        for offset,ridge in [(-w,0),(0,w*.55),(w,0)]:
            p=mid+side*offset
            verts.append((p.x,p.y,p.z+ridge))
        if j:
            a=start+(j-1)*3
            faces.extend([(a,a+3,a+4,a+1),(a+1,a+4,a+5,a+2)])
anchors=[]
for tier in range(12):
    f=tier/12
    height=.87+tier*.214
    radius=1.16*(1-f)**.81
    count=max(6,round(20-13*f))
    for j in range(count):
        angle=tau*(j/count+tier*.153)+rng.uniform(-.045,.045)
        length=radius*rng.uniform(.88,1.06)
        rise=-.16*(1-f)+.025
        base=Vector((0,0,height+rng.uniform(-.042,.042)))
        shade=rng.choice([0,1,1,2])
        spray(base,angle,length,.17*(1-f)+.035,rise,shade)
        for step in range(1,6):
            t=step/7
            p=base+Vector((cos(angle)*length*t,sin(angle)*length*t,rise*t+.06*sin(pi*t)))
            for sign in [-1,1]:
                spray(p,angle+sign*(.77-.37*t),length*(.40-.28*t),
                      (.065+.035*(1-t))*(1-.65*f),.025-.07*t,rng.choice([1,2,2,3]))
        anchors.append([round(length*cos(angle),4),round(base.z+rise,4),round(-length*sin(angle),4)])
spray(Vector((0,0,3.18)),0,.025,.05,.27,2)
for i,(verts,faces) in enumerate(batches):
    mesh("Fir sprays",verts,faces,leaf[i],tree)
for level in range(10):
    f=level/10
    cone((0,0,1.02+level*.227),.78*(1-f)**.82+.07,.23*(1-f),.54,leaf[level%2],tree,19)
combine(tree)
import json
(out/"anchors.json").write_text(json.dumps(anchors,separators=(",",":")))

def cap(g):
    cone((0,0,-.055),.037,.031,.048,gold,g,16)
    ring((0,0,-.012),.025,.006,gold,g,True)

for key,material in [('red',red),('gold',gold),('blue',blue)]:
    g=group("Item_"+key)
    cap(g)
    ball((0,0,-.162),(.105,.105,.108),material,g)
    ring((0,0,-.162),.105,.005,cream,g)
    combine(g)
g=group("Item_bell")
ring((0,0,-.02),.023,.005,gold,g,True)
cone((0,0,-.115),.107,.040,.16,gold,g)
ring((0,0,-.196),.106,.009,cream,g)
ball((0,0,-.209),(.028,.028,.028),wood,g)
combine(g)
g=group("Item_cane")
path=[(-.045+.048*cos(pi-i*pi/12),0,-.065+.048*sin(pi-i*pi/12)) for i in range(13)]
path.extend([(.003,0,-.065-i*.015) for i in range(1,13)])
for i in range(len(path)-1):
    line(path[i:i+2],.020,red if (i//2)%2 else sugar,g)
combine(g)
g=group("Item_bow")
for sign in [-1,1]:
    ob=ball((sign*.073,0,-.042),(.084,.038,.057),red,g)
    ob.rotation_euler.y=sign*-.26
    ob=cube((sign*.045,0,-.123),(.049,.026,.13),red,g)
    ob.rotation_euler.y=sign*-.31
ball((0,-.011,-.042),(.038,.04,.044),gold,g)
combine(g)
g=group("Item_star")
star(g,(0,0,.15),.227,gold)
cone((0,0,.015),.035,.029,.11,gold,g)
combine(g)
g=group("Item_gift-red")
cube((0,0,.14),(.35,.30,.28),red,g)
cube((0,0,.14),(.053,.305,.285),cream,g)
cube((0,0,.14),(.355,.05,.29),cream,g)
for sign in [-1,1]:
    ob=ring((.045*sign,0,.309),.047,.011,gold,g,True)
    ob.scale.z=.57
combine(g)
# Pack reusable models separately so moving an ornament never duplicates the cabin.
for root in [ob for ob in list(bpy.data.objects) if ob.type=="EMPTY"]:
    root.children[0].name=root.name+"_mesh"
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for ob in root.children:
        ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(out/(root.name+".glb")),use_selection=True,
        export_meshopt_compression_enable=True,export_format="GLB",export_cameras=False,export_lights=False,export_yup=True)

# Arrange the library beside the set in the editable master scene.
for i, root in enumerate(sorted((o for o in bpy.data.objects if o.name.startswith("Item_") and o.type=="EMPTY"),key=lambda o:o.name)):
    root.location=(3+i%4*.55,-1,.5+(i//4)*.65)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(Path(__file__).with_name("Snow Window.blend")),compress=True)
