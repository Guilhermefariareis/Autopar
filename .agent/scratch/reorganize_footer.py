import os

# 1. Update index.html
html_file = 'index.html'
with open(html_file, 'r', encoding='utf-8') as f:
    html_content = f.read()

# Mover o fechamento do painel para logo após o erro/lgpd
new_html_structure = """                    <p id="form-error" class="form-error hide"></p>
                </div>
                <button class="btn btn-primary btn-block btn-start-quiz" onclick="submitRegister()">▶ COMEÇAR QUIZ</button>
                <div style="text-align: center; margin-top: 15px;">
                    <button class="btn btn-link" onclick="showScreen('home')" style="font-size: 28px; font-weight: 700; color: #a0a0a0; background: none; border: none; cursor: pointer;">Voltar</button>
                </div>
            </div>
        </div>"""

import re
# Vamos capturar desde o parágrafo de erro até o fim do painel anterior
search_pattern = r'<p id="form-error" class="form-error hide"></p>.*?</div>\s*</div>\s*</div>'
html_content = re.sub(search_pattern, new_html_structure, html_content, flags=re.DOTALL)

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html_content)

# 2. Update index2.html
html_file2 = 'index2.html'
if os.path.exists(html_file2):
    with open(html_file2, 'r', encoding='utf-8') as f:
        html2_content = f.read()
    
    new_html2_structure = """                <p id="form-error" class="form-error hide">⚠️ Preencha nome e telefone para continuar.</p>
            </div>
            <button class="btn btn-primary btn-block btn-start-quiz" onclick="submitRegister()">COMEÇAR QUIZ</button>
            <div style="text-align: center; margin-top: 15px;">
                <button class="btn btn-link" onclick="showScreen('home')" style="font-size: 28px; font-weight: 700; color: #a0a0a0; background: none; border: none; cursor: pointer;">Voltar</button>
            </div>
        </div>
    </div>"""

    html2_content = re.sub(r'<p id="form-error" class="form-error hide">.*?\s*</div>\s*</div>\s*</div>', new_html2_structure, html2_content, flags=re.DOTALL)

    with open(html_file2, 'w', encoding='utf-8') as f:
        f.write(html2_content)

# 3. Update style.css para garantir que o botão fora do painel tenha a largura correta
style_file = 'style.css'
with open(style_file, 'r', encoding='utf-8') as f:
    style_content = f.read()

# Restaurar largura do botão de início fora do painel
style_content = style_content.replace(
    ".btn-start-quiz {\n    width: 100%;",
    ".btn-start-quiz {\n    width: min(92%, 780px);"
)

# Ajuste no totem também
style_content = style_content.replace(
    "    .btn-start-quiz { \n        width: 100% !important;",
    "    .btn-start-quiz { \n        width: 90% !important; \n        max-width: 900px !important;"
)

with open(style_file, 'w', encoding='utf-8') as f:
    f.write(style_content)
