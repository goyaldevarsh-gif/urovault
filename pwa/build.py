#!/usr/bin/env python3
"""Builds docs/index.html (single file) from pwa/src."""
import pathlib, re
root = pathlib.Path(__file__).parent
src = root / 'src'
css = (src / 'style.css').read_text()
css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
css = re.sub(r'\n\s*\n+', '\n', css)
js = '\n'.join((src / f).read_text() for f in ['core.js', 'ui.js', 'views1.js', 'views2.js', 'views3.js'])
js = js.replace("'use strict';\n", '')
js = "'use strict';\n" + js
html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>UroVault</title>
<meta name="description" content="UroVault - Your Urology Practice, Organised.">
<meta name="theme-color" content="#0F2942">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="UroVault">
<meta name="format-detection" content="telephone=no">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<link rel="manifest" href="manifest.webmanifest">
<style>
{css}
</style>
</head>
<body>
<div id="app"></div>
<noscript>UroVault needs JavaScript.</noscript>
<script>
{js}
</script>
</body>
</html>
'''
out = root.parent / 'docs' / 'index.html'
out.write_text(html)
print('wrote', out, len(html)//1024, 'KB')
