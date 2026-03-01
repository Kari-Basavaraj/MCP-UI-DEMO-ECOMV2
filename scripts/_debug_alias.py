import json

raw = json.load(open('tokens/figma/variables.raw.json'))
data = raw['payload']['meta']
vars_by_id = data['variables']

for vid, v in vars_by_id.items():
    name = v['name'].lower()
    if 'brand' in name and 'background' in name and name.endswith('/default'):
        print(f"Name: {v['name']}")
        print(f"ID: {vid}")
        for mode_id, val in v['valuesByMode'].items():
            if isinstance(val, dict) and val.get('type') == 'VARIABLE_ALIAS':
                ref_id = val['id']
                ref_var = vars_by_id.get(ref_id, {})
                ref_name = ref_var.get('name', '??')
                print(f"  Mode {mode_id}: ALIAS -> {ref_name} ({ref_id})")
                for m2, v2 in ref_var.get('valuesByMode', {}).items():
                    print(f"    resolves to: {v2}")
            else:
                print(f"  Mode {mode_id}: DIRECT = {val}")

# Also find what primitive 800 maps to
print("\n--- Primitive 800 ---")
for vid, v in vars_by_id.items():
    if v['name'] == '800' or v['name'].endswith('/800'):
        print(f"Name: {v['name']} | ID: {vid}")
        for mode_id, val in v['valuesByMode'].items():
            if isinstance(val, dict) and 'r' in val:
                r = round(val['r'] * 255)
                g = round(val['g'] * 255)
                b = round(val['b'] * 255)
                print(f"  Mode {mode_id}: #{r:02x}{g:02x}{b:02x}")
            else:
                print(f"  Mode {mode_id}: {val}")
