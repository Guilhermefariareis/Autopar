import os

# 1. Update style.css
style_file = 'style.css'
with open(style_file, 'r', encoding='utf-8') as f:
    style_content = f.read()

# Change input bottom border to orange
old_border = "border-bottom: 2px solid rgba(255, 255, 255, 0.15);"
new_border = "border-bottom: 2px solid var(--orange-dark);"
style_content = style_content.replace(old_border, new_border)

# Update reg-footer to push "Voltar" a bit
# We'll just add some spacing to the start button class
start_btn_css = """
.btn-start-quiz {
    width: min(92%, 780px);
    margin-top: 40px;
    box-shadow: 0 10px 30px rgba(255, 69, 0, 0.3);
}

@media (orientation: portrait) and (min-height: 1200px) {
    .btn-start-quiz {
        width: 90%;
        max-width: 980px;
        margin-top: 60px;
    }
}
"""
if ".btn-start-quiz" not in style_content:
    style_content += start_btn_css

with open(style_file, 'w', encoding='utf-8') as f:
    f.write(style_content)

# 2. Update index.html
html_file = 'index.html'
with open(html_file, 'r', encoding='utf-8') as f:
    html_content = f.read()

# Move the COMEÇAR QUIZ button outside reg-panel
old_html = """                    <p id="form-error" class="form-error hide"></p>
                    <button class="btn btn-primary btn-block" onclick="submitRegister()">▶ COMEÇAR QUIZ</button>
                    <button class="btn btn-link" onclick="showScreen('home')">Voltar</button>
                </div>
            </div>
        </div>"""

new_html = """                    <p id="form-error" class="form-error hide"></p>
                    <div class="reg-footer" style="margin-top: 20px; margin-bottom: 20px;">
                        <button class="btn btn-link" onclick="showScreen('home')" style="font-size: 28px; font-weight: 700; color: #a0a0a0;">Voltar</button>
                    </div>
                </div>
                <button class="btn btn-primary btn-block btn-start-quiz" onclick="submitRegister()">▶ COMEÇAR QUIZ</button>
            </div>
        </div>"""

html_content = html_content.replace(old_html, new_html)

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html_content)

# 3. Update index2.html
html_file2 = 'index2.html'
if os.path.exists(html_file2):
    with open(html_file2, 'r', encoding='utf-8') as f:
        html2_content = f.read()
    
    old_html2 = """                <p id="form-error" class="form-error hide">⚠️ Preencha nome e telefone para continuar.</p>
                <button class="btn btn-primary btn-block" onclick="submitRegister()">COMEÇAR QUIZ</button>
                <button class="btn btn-link" onclick="showScreen('home')">Voltar</button>
            </div>
        </div>
    </div>"""

    new_html2 = """                <p id="form-error" class="form-error hide">⚠️ Preencha nome e telefone para continuar.</p>
                <div class="reg-footer" style="margin-top: 20px; margin-bottom: 20px;">
                    <button class="btn btn-link" onclick="showScreen('home')" style="font-size: 28px; font-weight: 700; color: #a0a0a0;">Voltar</button>
                </div>
            </div>
            <button class="btn btn-primary btn-block btn-start-quiz" onclick="submitRegister()">COMEÇAR QUIZ</button>
        </div>
    </div>"""

    html2_content = html2_content.replace(old_html2, new_html2)

    with open(html_file2, 'w', encoding='utf-8') as f:
        f.write(html2_content)

