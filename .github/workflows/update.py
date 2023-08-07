import os, json

def list_files(directory_path):
    files = []
    for entry in os.scandir(directory_path):
        try:
            if entry.is_file():
                for ext in ['.js', '.png', '.html', '.less', '.css']:
                    if ext in entry.path:
                        files.append(entry.path)
                        print(entry.path)
            elif entry.is_dir():
                for fol in ["css", "modules", "themes", "img", "eldorado", "followers", "items", "blueprints", "map", "open-iconic", "lib", "ash", "brejep", "jquery", "lzstring", "requirejs", "src", "core", "game", "components", "common", "level", "player", "sector", "events", "improvements", "tribe", "type", "constants", "data", "elements", "helpers", "ui", "nodes", "common", "level", "player", "sector", "tribe", "systems", "occurrences", "ui", "vos", "text", "lang", "utils", "worldcreator"]:
                    if fol in entry.name:
                        files.extend(list_files(entry.path))
                        print(entry.path)
        except:
            ''
    return files
all_files = list_files('/')
for i in range(len(all_files)):
    all_files[i] = all_files[i].replace('\\', '/')
olddata = open('src/files.json', 'r')
open('src/files.json', 'w').write(json.dumps(all_files))
if olddata.readlines() != open('/src/files.json', 'r').readlines():
    os.system('git config --global user.name "actions"')
    os.system('git config --global user.email ""')
    os.system('git add -A')
    os.system('git commit -m "update list"')
    os.system('git push')
