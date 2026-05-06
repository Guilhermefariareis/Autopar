import os

# Update index.html
html_file = 'index.html'
with open(html_file, 'r', encoding='utf-8') as f:
    html_content = f.read()

# Substituir showScreen('home') por resetApp() no botão Voltar
html_content = html_content.replace(
    'onclick="showScreen(\'home\')"',
    'onclick="resetApp()"'
)

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html_content)

# Update index2.html
html_file2 = 'index2.html'
if os.path.exists(html_file2):
    with open(html_file2, 'r', encoding='utf-8') as f:
        html2_content = f.read()
    
    html2_content = html2_content.replace(
        'onclick="showScreen(\'home\')"',
        'onclick="resetApp()"'
    )

    with open(html_file2, 'w', encoding='utf-8') as f:
        f.write(html2_content)
