"""Prepare continuous brushwork and timber finishes from the original room illustrations."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps

base=Path(__file__).resolve().parent
assets=base.parent/'assets'
out=base/'textures'
def crop(name,rect):
    source=Image.open(assets/(name+'.webp')).convert('RGB')
    return source.crop(tuple(round(v*source.width/650) for v in rect))

def finish(key, source, rect, tint=None):
    patch=crop(source,rect)
    # Mirrored joins allow a wide wall to carry the original scale of brush marks.
    w,h=patch.size
    tile=Image.new('RGB',(2*w,2*h))
    tile.paste(patch,(0,0));tile.paste(ImageOps.mirror(patch),(w,0))
    tile.paste(ImageOps.flip(tile.crop((0,0,2*w,h))),(0,h))
    tile=tile.resize((1024,512),Image.Resampling.LANCZOS)
    a=np.asarray(tile,dtype=float)
    if tint is not None:
        lum=a.mean(axis=2); a=(lum/lum.mean())[:,:,None]*np.array(tint)
    y,x=np.mgrid[0:512,0:1024]/np.array([511,1023])[:,None,None]
    shade=.88+.13*np.sin(np.pi*y)+.055*np.cos(2*np.pi*x)*np.sin(np.pi*y)
    Image.fromarray(np.clip(a*shade[:,:,None],0,255).astype('uint8')).save(out/(key+'.jpg'),quality=93)

finish('bakery-plaster','bakery',(189,22,474,367))
finish('room-plaster','room',(216,29,493,349))
finish('market-plaster','room',(216,29,493,349),[74,86,97])
for key,src,rect in [('warm-timber','bakery',(176,385,488,423)),('dark-timber','room',(230,381,486,424))]:
    grain=np.asarray(crop(src,rect).resize((640,112),Image.Resampling.LANCZOS),dtype=float)
    target=[112,76,53] if key=='warm-timber' else [97,65,46]
    grain=(grain-grain.mean(axis=(0,1)))*.62+target
    Image.fromarray(np.clip(grain,0,255).astype('uint8')).save(out/(key+'.jpg'),quality=94)
