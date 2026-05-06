import os

# Reverter index.html para o estado "bonito" mas com o botão acima do Voltar
html_file = 'index.html'
with open(html_file, 'r', encoding='utf-8') as f:
    html_content = f.read()

# Novo bloco: Painel termina após LGPD/Erro, botão e voltar ficam fora (ou ambos dentro, mas com estilo corrigido)
# Vou tentar colocar AMBOS dentro do painel, mas garantindo que o painel se ajuste e não mude a estética dos campos.

new_html_corrected = """                    <p id="form-error" class="form-error hide"></p>
                    <div style="margin-top: 30px;">
                        <button class="btn btn-primary btn-block btn-start-quiz" onclick="submitRegister()" style="width: 100%; margin-bottom: 20px;">▶ COMEÇAR QUIZ</button>
                        <button class="btn btn-link" onclick="showScreen('home')" style="font-size: 28px; font-weight: 700; color: #a0a0a0; width: 100%; text-align: center; display: block; margin-top: 10px;">Voltar</button>
                    </div>
                </div>
            </div>
        </div>"""

# Substituir o bloco atual (que tem o botão e o voltar)
import re
search_pattern = r'<p id="form-error" class="form-error hide"></p>.*?</div>\s*</div>\s*</div>'
html_content = re.sub(search_pattern, new_html_corrected, html_content, flags=re.DOTALL)

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html_content)

# Mesma coisa para index2.html
html_file2 = 'index2.html'
if os.path.exists(html_file2):
    with open(html_file2, 'r', encoding='utf-8') as f:
        html2_content = f.read()
    
    new_html2_corrected = """                <p id="form-error" class="form-error hide">⚠️ Preencha nome e telefone para continuar.</p>
                <div style="margin-top: 30px;">
                    <button class="btn btn-primary btn-block btn-start-quiz" onclick="submitRegister()" style="width: 100%; margin-bottom: 20px;">COMEÇAR QUIZ</button>
                    <button class="btn btn-link" onclick="showScreen('home')" style="font-size: 28px; font-weight: 700; color: #a0a0a0; width: 100%; text-align: center; display: block; margin-top: 10px;">Voltar</button>
                </div>
            </div>
        </div>
    </div>"""
    
    html2_content = re.sub(r'<p id="form-error" class="form-error hide">.*?\s*</div>\s*</div>\s*</div>', new_html2_corrected, html2_content, flags=re.DOTALL)
    
    with open(html_file2, 'w', encoding='utf-8') as f:
        f.write(html2_content)

# Ajustar style.css para o botão start-quiz voltar a ter a sombra e o estilo que ele tinha fora do painel
style_file = 'style.css'
with open(style_file, 'r', encoding='utf-8') as f:
    style_content = f.read()

# Garantir que .btn-start-quiz tenha o estilo de "botão de destaque"
style_content = style_content.replace(
    ".btn-start-quiz {\n    width: 100%;",
    ".btn-start-quiz {\n    width: 100%;\n    height: 120px;\n    font-size: 42px;\n    border-radius: 60px;\n    margin-top: 20px;"
)

with open(style_file, 'w', encoding='utf-8') as f:
    f.write(style_content)
