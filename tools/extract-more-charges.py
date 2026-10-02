"""Source-specific extraction rules for the expanded flag emblem collection."""
import json,sys,re
from pathlib import Path
from lxml import etree
source=Path(sys.argv[1]);specs=json.loads(Path('assets/charges/catalog-extra.json').read_text())
ns='http://www.w3.org/2000/svg'
def remove_first(parent,n):
    for child in list(parent)[:n]:parent.remove(child)
def retain(parent,indices):
    for i,child in enumerate(list(parent)):
        if i not in indices:parent.remove(child)
def cutout(parent,child):
    mask=etree.Element('{'+ns+'}mask',id='cutout',maskUnits='userSpaceOnUse',x='-1000',y='-1000',width='3000',height='3000')
    etree.SubElement(mask,'{'+ns+'}rect',x='-1000',y='-1000',width='3000',height='3000',fill='white')
    parent.remove(child);child.set('fill','black');mask.append(child);parent.insert(0,mask);parent.set('mask','url(#cutout)')
for code,*_ in specs:
    root=etree.parse(str(source/(code+'.svg'))).getroot()
    group=next((e for e in root if etree.QName(e).localname=='g'),None)
    if code in ['es','pt','me','va','kh','gi','bb','mt']:remove_first(root,2)
    elif code in ['ad','bo','do','sz','ls','gg','ph']:remove_first(root,3)
    elif code in ['md','sm','ec','ao','pg','cy']:remove_first(root,1)
    elif code in ['mx','gt','ni']:
        for e in list(root)[1:4 if code=='mx' else 3]:root.remove(e)
    elif code=='bz':
        for e in list(root)[1:4]:root.remove(e)
    elif code=='sv':remove_first(root,2)
    elif code=='py':remove_first(root,3)
    elif code=='hr':
        remove_first(root,2);p=root[0];parts=re.split(r'z\s*m320',p.get('d'),maxsplit=1);assert len(parts)==2;p.set('d','M320'+parts[1])
    elif code=='rs':remove_first(group,3)
    elif code=='ir':retain(group,[27])
    elif code=='pk':remove_first(group,2)
    elif code=='tr':remove_first(group,1);cutout(group,group[1])
    elif code=='dz':remove_first(root,2)
    elif code=='my':retain(group,[16])
    elif code=='az':remove_first(root,3);cutout(root,root[1])
    elif code=='br':remove_first(group,2)
    elif code=='mz':remove_first(group,6)
    elif code=='ug':retain(group,list(range(6,20)))
    elif code=='zw':remove_first(group,7)
    elif code=='zm':remove_first(group,4)
    elif code=='et':remove_first(group,4)
    elif code=='tw':
        remove_first(group,2);hole=group[1];group.remove(hole);group[0].append(hole);cutout(group[0],hole)
    elif code=='ki':retain(group,list(range(1,19))+list(range(22,27)))
    elif code=='dm':retain(group,[18])
    elif code=='im':remove_first(group,1)
    elif code=='fj':retain(root,[1])
    elif code=='je':remove_first(root,3)
    elif code=='ht':remove_first(root,2);remove_first(root[0],1)
    else:raise ValueError(code)
    if code=='pg':root.remove(root[-1])
    root.attrib.pop('id',None)
    Path('assets/charges/'+code+'.svg').write_bytes(etree.tostring(root))
