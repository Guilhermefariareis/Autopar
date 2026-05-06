import os

file_path = 'style.css'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Refinar o Totem Vertical para melhor distribuição
# Substituir o bloco de ajustes do totem por algo mais equilibrado

totem_overrides = """
/* AJUSTES MOBILE.HTML PARA TOTEM VERTICAL - DISTRIBUIÇÃO REFINADA */
@media (orientation: portrait) and (min-height: 1200px) {
    .register-content { justify-content: center !important; padding: 40px !important; }
    .reg-panel { 
        padding: 80px 60px !important; 
        width: 90% !important; 
        max-width: 900px !important; 
        min-height: auto !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 20px !important;
    }
    
    .reg-title { font-size: 100px !important; margin-bottom: 10px !important; color: var(--orange) !important; }
    .reg-sub { font-size: 42px !important; margin-bottom: 50px !important; opacity: 0.7; }

    .field-group { 
        margin-bottom: 40px !important; 
        padding: 0 !important; 
        gap: 40px !important; 
        border-bottom: none !important;
    }
    
    .field-icon { 
        min-width: 80px !important; 
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
    }
    
    .field-icon svg { 
        width: 60px !important; 
        height: 60px !important; 
        stroke-width: 2 !important;
    }

    .field-input { 
        font-size: 55px !important; 
        height: 110px !important; 
        padding-top: 40px !important; 
        border-bottom: 3px solid var(--orange) !important;
    }
    
    .field-label { 
        font-size: 45px !important; 
        top: 35px !important; 
    }
    
    .field-input:focus ~ .field-label, 
    .field-input:not(:placeholder-shown) ~ .field-label { 
        top: -10px !important; 
        font-size: 28px !important; 
    }

    .lgpd-toggle-row { margin-top: 30px !important; margin-bottom: 40px !important; }
    .lgpd-toggle-text { font-size: 28px !important; line-height: 1.3 !important; }
    
    .toggle-track { width: 130px !important; height: 70px !important; }
    .toggle-thumb { width: 55px !important; height: 55px !important; }
    
    .reg-footer { margin-top: 30px !important; text-align: center !important; }
    .btn-link { font-size: 45px !important; opacity: 0.6; }

    .btn-start-quiz { 
        margin-top: 50px !important; 
        height: 180px !important; 
        font-size: 65px !important; 
    }
}
"""

# Remover blocos antigos de media query que conflitam
import re
# Vamos procurar os blocos de media query que injetamos antes e substituir
# Nota: Como o arquivo cresceu, vamos apenas anexar ao final com !important para garantir sobreposição, 
# mas o ideal é limpar. Vamos tentar uma substituição limpa dos blocos injetados.

# Localizar o início dos nossos ajustes de totem
search_pattern = r'/\* AJUSTES MOBILE\.HTML PARA TOTEM VERTICAL \*/.*?\n}'
content = re.sub(search_pattern, '', content, flags=re.DOTALL)

search_pattern_2 = r'/\* AJUSTES FINAIS TOTEM \*/.*?\n}'
content = re.sub(search_pattern_2, '', content, flags=re.DOTALL)

# Anexar os novos ajustes consolidados
content += totem_overrides

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
