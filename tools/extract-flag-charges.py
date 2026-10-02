"""Extract flag artwork from locally downloaded flag-icons SVG sources.
Usage: python3 tools/extract-flag-charges.py /path/to/flag-icons/flags/4x3
Then render the extracted SVGs to PNG and crop their transparent margins.
"""
import sys
from pathlib import Path
from lxml import etree
source = Path(sys.argv[1])
dest = Path('assets/charges')
dest.mkdir(parents=True, exist_ok=True)
for code in ['al','lk','bt','gb-wls','ca','kz','sa','hk','mo','ar','uy','kr']:
    root = etree.parse(str(source / (code + '.svg'))).getroot()
    if code in ['al','hk','mo']:
        root.remove(root[0])
    elif code in ['bt','gb-wls','ar','uy']:
        root.remove(root[0]); root.remove(root[0])
    elif code == 'lk':
        for child in list(root)[:-1]: root.remove(child)
    elif code == 'ca':
        root.remove(root[0])
        path = root[0]
        path.set('d', 'M' + path.get('d').split('zM', 1)[1])
    elif code == 'kz':
        root.remove(root[0]); root[0].remove(root[0][-1])
    elif code == 'sa':
        group = root[1]
        sword = group[9]
        sword.set('d', sword.get('d').split('M188.6', 1)[0])
        for child in list(group):
            if child is not sword: group.remove(child)
    elif code == 'kr':
        group = root[1]; group.remove(group[0])
        first = group[0]
        for child in list(first)[:2]: first.remove(child)
        group.remove(group[-1])
    root.attrib.pop('id', None)
    (dest / (code + '.svg')).write_bytes(etree.tostring(root))
