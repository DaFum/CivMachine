from __future__ import annotations
import json, re
from pathlib import Path

SRC = Path('/mnt/data/rce_browser_source/civmachine/scripts')
OUT = Path('/mnt/data/rce_browser_v117/src/data/content.generated.json')


def find_balanced(text: str, start: int, open_ch='[', close_ch=']') -> str:
    assert text[start] == open_ch
    depth = 0
    in_str = False
    escape = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            if escape:
                escape = False
            elif ch == '\\':
                escape = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == open_ch:
            depth += 1
        elif ch == close_ch:
            depth -= 1
            if depth == 0:
                return text[start:i+1]
    raise ValueError('unbalanced')


def pyify(expr: str) -> str:
    expr = re.sub(r'\btrue\b', 'True', expr)
    expr = re.sub(r'\bfalse\b', 'False', expr)
    expr = re.sub(r'\bnull\b', 'None', expr)
    return expr


def trait(id, name, description, effects, impossible=False):
    return {'id': id, 'name': name, 'description': description, 'effects': effects, 'impossible': impossible}

def upgrade(id, name, currency, base_cost, growth, max_level, description):
    return {'id': id, 'name': name, 'currency': currency, 'base_cost': base_cost, 'growth': growth, 'max_level': max_level, 'description': description}

def build_option(id, name, description, effects):
    return {'id': id, 'name': name, 'description': description, 'effects': effects}

def choice(label, prediction, effects, follow_up=''):
    return {'label': label, 'prediction': prediction, 'effects': effects, 'follow_up': follow_up}

def event(id, title, body, min_era, max_era, weight, requirements, choices, max_count=2):
    return {'id': id, 'title': title, 'body': body, 'min_era': min_era, 'max_era': max_era, 'weight': weight, 'requirements': requirements, 'choices': choices, 'max_count': max_count}

def path_choice(label, prediction, effects, path_affinity, path_flag_add, path_history, secondary_effects=None):
    return {'label': label, 'prediction': prediction, 'effects': effects, 'follow_up': '', 'path_affinity': path_affinity, 'path_flag_add': path_flag_add, 'path_history': path_history, 'secondary_effects': secondary_effects or {}}

def path_event(id, title, body, path_id, path_phase, min_era, weight, requirements, choices, kind='path'):
    return {'id': id, 'title': title, 'body': body, 'min_era': min_era, 'max_era': 2, 'weight': weight, 'requirements': requirements, 'choices': choices, 'max_count': 1, 'path_id': path_id, 'path_phase': path_phase, 'kind': kind}

ENV = {
    '_trait': trait,
    '_upgrade': upgrade,
    '_build_option': build_option,
    '_choice': choice,
    '_event': event,
    '_path_choice': path_choice,
    '_path_event': path_event,
}


def extract_return_array(text: str, func_name: str):
    marker = f'static func {func_name}()'
    pos = text.index(marker)
    ret = text.index('return [', pos)
    start = text.index('[', ret)
    expr = find_balanced(text, start)
    return eval(pyify(expr), {'__builtins__': {}}, ENV)

content = (SRC / 'content.gd').read_text()
path_text = (SRC / 'path_interventions.gd').read_text()

result = {}
for name in ['traits','machine_upgrades','universe_upgrades','axiom_upgrades','mutations','directives','breeding_matrices']:
    result[name] = extract_return_array(content, name)

# authored base events
pos = content.index('static func events()')
marker = content.index('var authored := [', pos)
start = content.index('[', marker)
base_expr = find_balanced(content, start)
base_events = eval(pyify(base_expr), {'__builtins__': {}}, ENV)
by_id = {e['id']: e for e in base_events}
for m in re.finditer(r'_annotate_path_choice\(authored,\s*"([^"]+)",\s*(\d+),\s*(\{[^\n]+\})\)', content[pos:]):
    event_id, idx, raw = m.groups()
    deltas = eval(pyify(raw), {'__builtins__': {}}, {})
    ev = by_id[event_id]
    ch = ev['choices'][int(idx)]
    ch['path_affinity'] = deltas
    ch['path_history'] = f"{ev['title']} -> {ch['label']}"

path_events = extract_return_array(path_text, 'events')
result['events'] = base_events + path_events

# path definitions
paths_text = (SRC / 'civilization_paths.gd').read_text()
marker = paths_text.index('const PATH_DEFINITIONS :=')
start = paths_text.index('{', marker)
path_def_expr = find_balanced(paths_text, start, '{', '}')
result['path_definitions'] = eval(pyify(path_def_expr), {'__builtins__': {}}, {})

# lore constants
lore = (SRC / 'civilization_lore.gd').read_text()
def extract_const_array(name):
    marker = lore.index(f'const {name} :=')
    start = lore.index('[', marker)
    return eval(pyify(find_balanced(lore, start)), {'__builtins__': {}}, {})
def extract_const_dict(name):
    marker = lore.index(f'const {name} :=')
    start = lore.index('{', marker)
    return eval(pyify(find_balanced(lore, start, '{', '}')), {'__builtins__': {}}, {})
result['lore'] = {
    'species_prefixes': extract_const_array('SPECIES_PREFIXES'),
    'species_suffixes': extract_const_array('SPECIES_SUFFIXES'),
    'faction_prefixes': extract_const_array('FACTION_PREFIXES'),
    'faction_nouns': extract_const_array('FACTION_NOUNS'),
    'faction_endings': extract_const_array('FACTION_ENDINGS'),
    'body_types': extract_const_array('BODY_TYPES'),
    'cultures': extract_const_array('CULTURES'),
    'doctrines': extract_const_array('DOCTRINES'),
    'path_doctrines': extract_const_dict('PATH_DOCTRINES'),
    'path_focus': extract_const_dict('PATH_FOCUS'),
}

OUT.write_text(json.dumps(result, indent=2, ensure_ascii=False))
print(f'wrote {OUT}')
print('traits', len(result['traits']))
print('machine_upgrades', len(result['machine_upgrades']))
print('universe_upgrades', len(result['universe_upgrades']))
print('axiom_upgrades', len(result['axiom_upgrades']))
print('directives', len(result['directives']))
print('matrices', len(result['breeding_matrices']))
print('events', len(result['events']))
print('path_events', len(path_events))
print('paths', len(result['path_definitions']))
