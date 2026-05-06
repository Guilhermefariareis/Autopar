import urllib.request
import re
import os

url = "https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&display=swap"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'})
with urllib.request.urlopen(req) as response:
    css_content = response.read().decode('utf-8')

urls = re.findall(r'url\((https://[^)]+)\)', css_content)

if not os.path.exists('fonts'):
    os.makedirs('fonts')

for i, font_url in enumerate(set(urls)):
    filename = f"fonts/outfit_{i}.woff2"
    print(f"Downloading {font_url} to {filename}")
    urllib.request.urlretrieve(font_url, filename)
    css_content = css_content.replace(font_url, filename)

with open('fonts.css', 'w', encoding='utf-8') as f:
    f.write(css_content)

print("Fonts downloaded and fonts.css created.")
