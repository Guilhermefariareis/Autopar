import os

file_path = 'style.css'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix thumb centering
old_thumb = """.toggle-thumb {
    position: absolute;
    top: 6px;
    left: 6px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s;
}"""

new_thumb = """.toggle-thumb {
    position: absolute;
    top: 50%;
    left: 6px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    transform: translateY(-50%);
    transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s;
}"""

old_checked = """.toggle-input:checked+.toggle-track .toggle-thumb {
    transform: translateX(44px);
    background: white;
}"""

new_checked = """.toggle-input:checked+.toggle-track .toggle-thumb {
    transform: translate(44px, -50%);
    background: white;
}"""

content = content.replace(old_thumb, new_thumb)
content = content.replace(old_checked, new_checked)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
