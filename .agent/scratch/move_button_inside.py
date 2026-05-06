import os

# Update index.html
html_file = 'index.html'
with open(html_file, 'r', encoding='utf-8') as f:
    html_content = f.read()

# Current state: button is OUTSIDE reg-panel
old_block = """                    <p id="form-error" class="form-error hide"></p>
                    <div class="reg-footer" style="margin-top: 20px; margin-bottom: 20px;">
                        <button class="btn btn-link" onclick="showScreen('home')" style="font-size: 28px; font-weight: 700; color: #a0a0a0;">Voltar</button>
                    </div>
                </div>
                <button class="btn btn-primary btn-block btn-start-quiz" onclick="submitRegister()">▶ COMEÇAR QUIZ</button>
            </div>
        </div>"""

# Target state: button is INSIDE reg-panel, ABOVE Voltar
new_block = """                    <p id="form-error" class="form-error hide"></p>
                    <button class="btn btn-primary btn-block btn-start-quiz" onclick="submitRegister()">▶ COMEÇAR QUIZ</button>
                    <div class="reg-footer" style="margin-top: 20px; margin-bottom: 10px;">
                        <button class="btn btn-link" onclick="showScreen('home')" style="font-size: 28px; font-weight: 700; color: #a0a0a0;">Voltar</button>
                    </div>
                </div>
            </div>
        </div>"""

html_content = html_content.replace(old_block, new_block)

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html_content)

# Update index2.html
html_file2 = 'index2.html'
if os.path.exists(html_file2):
    with open(html_file2, 'r', encoding='utf-8') as f:
        html2_content = f.read()
    
    old_block2 = """                <p id="form-error" class="form-error hide">⚠️ Preencha nome e telefone para continuar.</p>
                <div class="reg-footer" style="margin-top: 20px; margin-bottom: 20px;">
                    <button class="btn btn-link" onclick="showScreen('home')" style="font-size: 28px; font-weight: 700; color: #a0a0a0;">Voltar</button>
                </div>
            </div>
            <button class="btn btn-primary btn-block btn-start-quiz" onclick="submitRegister()">COMEÇAR QUIZ</button>
        </div>
    </div>"""

    new_block2 = """                <p id="form-error" class="form-error hide">⚠️ Preencha nome e telefone para continuar.</p>
                <button class="btn btn-primary btn-block btn-start-quiz" onclick="submitRegister()">COMEÇAR QUIZ</button>
                <div class="reg-footer" style="margin-top: 20px; margin-bottom: 10px;">
                    <button class="btn btn-link" onclick="showScreen('home')" style="font-size: 28px; font-weight: 700; color: #a0a0a0;">Voltar</button>
                </div>
            </div>
        </div>
    </div>"""

    html2_content = html2_content.replace(old_block2, new_block2)

    with open(html_file2, 'w', encoding='utf-8') as f:
        f.write(html2_content)

# Adjust style.css to ensure the button inside the panel looks good
style_file = 'style.css'
with open(style_file, 'r', encoding='utf-8') as f:
    style_content = f.read()

# Change btn-start-quiz to width 100% since it's now inside the panel which already has width:90%
style_content = style_content.replace(
    ".btn-start-quiz {\n    width: min(92%, 780px);",
    ".btn-start-quiz {\n    width: 100%;"
)

# Fix the totem override too
style_content = style_content.replace(
    "    .btn-start-quiz { \n        margin-top: 50px !important; \n        height: 180px !important; \n        font-size: 65px !important; \n    }",
    "    .btn-start-quiz { \n        width: 100% !important; \n        margin-top: 40px !important; \n        height: 180px !important; \n        font-size: 65px !important; \n    }"
)

with open(style_file, 'w', encoding='utf-8') as f:
    f.write(style_content)
