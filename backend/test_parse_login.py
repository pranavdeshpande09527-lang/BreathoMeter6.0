import re
html = open('login_dump.html', encoding='utf-8').read()
for match in re.finditer(r'<(input|select|button)[^>]+>', html):
    print(match.group(0))
