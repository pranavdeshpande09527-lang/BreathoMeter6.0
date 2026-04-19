import re
html = open('assessment_error_dump.html', encoding='utf-8').read()
for m in re.finditer(r'<(button|a)[^>]*>.*?</\1>', html, re.I | re.DOTALL):
    print(m.group(0))
