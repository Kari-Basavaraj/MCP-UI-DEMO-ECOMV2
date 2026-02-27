import json, sys

data = json.load(open(sys.argv[1]))
meta = data.get('meta', {})
collections = meta.get('variableCollections', {})
variables = meta.get('variables', {})
print(f'Total collections: {len(collections)}')
print(f'Total variables: {len(variables)}')
print()

for cid, coll in collections.items():
    modes = [(m['modeId'], m['name']) for m in coll.get('modes', [])]
    print(f'=== Collection: {coll["name"]} (id={cid}) ===')
    print(f'  Modes: {modes}')
    var_ids = coll.get('variableIds', [])
    print(f'  Variables: {len(var_ids)}')
    for vid in var_ids:
        v = variables.get(vid, {})
        name = v.get('name', '?')
        rtype = v.get('resolvedType', '?')
        values = v.get('valuesByMode', {})
        vals_summary = {}
        for mid, val in values.items():
            if isinstance(val, dict):
                if 'r' in val:
                    r = val.get('r', 0)
                    g = val.get('g', 0)
                    b = val.get('b', 0)
                    vals_summary[mid] = f'#{int(r*255):02x}{int(g*255):02x}{int(b*255):02x}'
                elif 'id' in val:
                    target = variables.get(val['id'], {}).get('name', val['id'])
                    vals_summary[mid] = f'-> {target}'
                else:
                    vals_summary[mid] = str(val)
            else:
                vals_summary[mid] = val
        # Format mode values with mode names
        mode_map = {m['modeId']: m['name'] for m in coll.get('modes', [])}
        formatted = {mode_map.get(mid, mid): v for mid, v in vals_summary.items()}
        print(f'    {name} ({rtype}): {formatted}')
    print()
