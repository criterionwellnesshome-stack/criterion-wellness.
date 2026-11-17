import re,pathlib
b=pathlib.Path(__file__).parent
body=(b/'src/body.html').read_text()
head='''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pile Terminator Tea | Criterion Herbaceuticals (MOCK)</title><meta name="robots" content="noindex">
<style>body{margin:0}</style></head><body>
'''
(b/'landing-page.html').write_text(head+body+'\n</body></html>\n')
(b/'systeme-paste/landing-page-paste.html').write_text('<!-- Paste this whole block into ONE systeme.io Raw HTML element -->\n'+body)
print('built',len(body.encode())//1024,'KB')
