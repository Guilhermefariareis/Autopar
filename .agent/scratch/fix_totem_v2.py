import os

file_path = 'style.css'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Reduce LGPD font size
content = content.replace(
    '.lgpd-toggle-text { font-size: 32px !important; line-height: 1.4 !important; }',
    '.lgpd-toggle-text { font-size: 26px !important; line-height: 1.4 !important; opacity: 0.8; }'
)

# 2. Fix reg-panel width and moldura overflow
content = content.replace(
    '.reg-panel { padding: 100px 60px; border-radius: 40px; width: 95%; }',
    '.reg-panel { padding: 100px 60px; border-radius: 40px; width: 90%; max-width: 980px; box-sizing: border-box; }'
)

# 3. Ensure no overflow on totem
totem_end = """    .lgpd-toggle-row { margin-bottom: 60px !important; }
    .reg-footer { margin-top: 60px !important; }
}"""

totem_fix = """    .lgpd-toggle-row { margin-bottom: 60px !important; }
    .reg-footer { margin-top: 60px !important; }
    #app, body { overflow-x: hidden !important; width: 100% !important; }
}"""

content = content.replace(totem_end, totem_fix)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
