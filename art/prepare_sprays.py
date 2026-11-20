"""Cut three overlapping pine sprays from the project's painted pine illustration."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops

root = Path(__file__).resolve().parent
pine = Image.open(root.parent / "assets/pine.webp").convert("RGBA")
# Each outline follows a differently angled bough from its dark root to its needle tips.
outlines = [
    [(13,465),(104,450),(179,429),(247,410),(226,450),(203,489),(174,507),(154,525),(136,517),(113,535),(95,518),(67,531),(47,509),(16,510)],
    [(0,566),(88,555),(150,531),(237,512),(213,560),(191,597),(177,624),(155,628),(144,642),(119,626),(96,639),(78,628),(46,644),(37,625),(3,616)],
    [(261,629),(309,633),(354,650),(410,641),(455,652),(505,661),(562,659),(562,700),(528,721),(508,710),(494,729),(474,718),(457,731),(436,708),(421,720),(404,699),(389,709),(366,684),(345,696),(320,671),(297,678)],
]
for i, outline in enumerate(outlines):
    mask=Image.new("L",pine.size)
    ImageDraw.Draw(mask).polygon(outline,fill=255)
    mask=mask.filter(ImageFilter.GaussianBlur(2))
    tile=pine.copy()
    tile.putalpha(ImageChops.multiply(mask,pine.getchannel("A")))
    tile=tile.crop(tile.getbbox())
    if i<2: tile=tile.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    tile.save(root / "textures" / f"spray-{i}.png")

# Paint open terminal shoots on a transparent atlas. Branch colour is sampled
# from each extracted bough so sunlit needles and their shaded bases match it.
import math
import random
import numpy as np
for variant in range(3):
    source=np.array(Image.open(root/'textures'/f'spray-{variant}.png'))
    pixels=source[:,:,:3][source[:,:,3]>220]
    pixels=pixels[np.argsort(pixels @ np.array([.24,.62,.14]))]
    def shade(t):
        return tuple(int(c) for c in pixels[int(min(.98,max(.01,t))*(len(pixels)-1))])
    rng=random.Random(841+variant)
    tile=Image.new('RGBA',(600,330))
    ink=ImageDraw.Draw(tile)
    def stem(points,color,width):
        ink.line(points,fill=color,width=width,joint='curve')
    def twig(x,y,angle,length,scale):
        end=(x+math.cos(angle)*length,y+math.sin(angle)*length)
        stem([(x,y),end],shade(.18),max(1,int(scale*3)))
        for j in range(33):
            t=j/33
            cx=x+math.cos(angle)*length*t;cy=y+math.sin(angle)*length*t
            for sign in [-1,1]:
                a=angle+sign*rng.uniform(.42,1.08)
                size=scale*(1-.62*t)*rng.uniform(13,28)
                dx,dy=math.cos(a)*size,math.sin(a)*size
                width=scale*rng.uniform(1.1,2.4)
                c=rng.uniform(.20,.67)+.21*t
                ink.polygon([(cx,cy),(cx+dx*.45-dy/size*width,cy+dy*.45+dx/size*width),(cx+dx,cy+dy),(cx+dx*.46+dy/size*width*.5,cy+dy*.46-dx/size*width*.5)],fill=shade(c))
                if rng.random()<.28:
                    stem([(cx+dx*.56,cy+dy*.56),(cx+dx,cy+dy)],shade(min(.98,c+.18)),1)
    for i in range(38):
        t=i/39
        x=12+535*t;y=167+11*math.sin(t*4+variant)
        for sign in [-1,1]:
            angle=sign*rng.uniform(.58,.99)
            length=(1-t*.83)*rng.uniform(125,168)
            twig(x,y,angle,length,1.10)
            twig(x,y+sign*3,angle*.59,length*.88,1.05)
    twig(458,164,.02,121,.98)
    tile.resize((360,198),Image.Resampling.LANCZOS).save(root/'textures'/f'spray-{variant}.png')
